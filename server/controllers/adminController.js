const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');
const { Parser } = require('json2csv');

// Helper function to validate status transitions with enhanced flexibility
const isValidStatusTransition = (currentStatus, newStatus) => {
  // Define valid transitions with more flexibility
  const validTransitions = {
    'pending': ['in_production', 'lyrics_review', 'song_production', 'song_review', 'completed'],
    'in_production': ['pending', 'lyrics_review', 'song_production', 'song_review', 'completed'],
    'lyrics_review': ['pending', 'in_production', 'song_production', 'song_review', 'completed'],
    'song_production': ['pending', 'in_production', 'lyrics_review', 'song_review', 'completed'],
    'song_review': ['pending', 'in_production', 'lyrics_review', 'song_production', 'completed'],
    'completed': ['pending', 'in_production', 'lyrics_review', 'song_production', 'song_review'],
    
    // Legacy status handling - allow transitions from "ready_for_review" to any state
    'ready_for_review': ['pending', 'in_production', 'lyrics_review', 'song_production', 'song_review', 'completed']
  };
  
  // Normalize status by removing spaces and making lowercase
  const normalizedCurrentStatus = currentStatus.toLowerCase().replace(/\s+/g, '_');
  
  // Check if this is a valid transition
  return validTransitions[normalizedCurrentStatus]?.includes(newStatus) || false;
};

// Get workflow stage based on status
const getWorkflowStage = (status) => {
  switch(status) {
    case 'pending': return 1;
    case 'in_production': return 2;
    case 'lyrics_review': return 3;
    case 'song_production': return 4;
    case 'song_review': return 5;
    case 'completed': return 6;
    case 'ready_for_review': return 3; // Legacy support, default to lyrics_review
    default: return 1;
  }
};

// Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    // Get all orders with user info and counts
    const [orders] = await pool.query(
      `SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM songs WHERE order_id = o.id) as song_versions_count,
        o.lyrics_revisions,
        o.song_revisions,
        o.allow_more_revisions,
        o.lyrics_approved
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC`
    );
    
    // Format order status for frontend
    orders.forEach(order => {
      order.status = order.status.replace(/_/g, ' ').replace(
        /\b\w/g, char => char.toUpperCase()
      );
    });
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Admin get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get detailed order by ID
exports.getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Get order details with user info
    const [orders] = await pool.query(
      `SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?`,
      [orderId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Get addons
    const [addons] = await pool.query(
      'SELECT * FROM order_addons WHERE order_id = ?',
      [orderId]
    );
    
    order.addons = addons;
    
    // Get song versions
    const [songs] = await pool.query(
      'SELECT id, version, title, file_path, is_selected, is_downloaded, uploaded_at FROM songs WHERE order_id = ?',
      [orderId]
    );
    
    order.songVersions = songs.map(song => ({
      ...song,
      url: `/uploads/songs/${song.file_path.split('/').pop()}`
    }));
    
    // Format order status for frontend
    order.status = order.status.replace(/_/g, ' ').replace(
      /\b\w/g, char => char.toUpperCase()
    );
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Admin get order details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update order status with enhanced workflow - FIXED VERSION
exports.updateOrderStatus = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const { status, lyricsApproved } = req.body;
    
    // Validate status
    const validStatuses = [
      'pending', 
      'in_production', 
      'lyrics_review', 
      'song_production', 
      'song_review', 
      'completed'
    ];
    
    if (!validStatuses.includes(status)) {
      console.log(`Invalid status value: ${status}`);
      return res.status(400).json({
        success: false,
        message: `Invalid status value: ${status}. Valid statuses are: ${validStatuses.join(', ')}`
      });
    }
    
    // Check if order exists
    const [orderCheck] = await connection.query('SELECT id, status FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      console.log(`Order not found: ${orderId}`);
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Normalize current status by removing spaces and making lowercase
    const currentStatus = orderCheck[0].status.toLowerCase().replace(/\s+/g, '_');
    console.log(`Current order status: ${currentStatus}, attempting to change to: ${status}`);
    
    // Check status transition (more flexible now)
    if (!isValidStatusTransition(currentStatus, status)) {
      console.log(`Invalid status transition from ${currentStatus} to ${status}`);
      connection.release();
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${currentStatus} to ${status}`
      });
    }
    
    // Begin transaction using connection method
    await connection.beginTransaction();
    
    try {
      // Calculate workflow stage based on status
      let workflowStage;
      switch(status) {
        case 'pending': workflowStage = 1; break;
        case 'in_production': workflowStage = 2; break;
        case 'lyrics_review': workflowStage = 3; break;
        case 'song_production': workflowStage = 4; break; // Ensure this is 4 for Song Creation
        case 'song_review': workflowStage = 5; break;
        case 'completed': workflowStage = 6; break;
        default: workflowStage = 1;
      }
      
      console.log(`Updating order ${orderId} to status: ${status}, workflow stage: ${workflowStage}`);
      
      // Update order status and workflow stage
      await connection.query(
        'UPDATE orders SET status = ?, workflow_stage = ? WHERE id = ?',
        [status, workflowStage, orderId]
      );
      
      // If transitioning to song_production, mark lyrics as approved
      if (status === 'song_production' || lyricsApproved) {
        console.log(`Setting lyrics_approved = 1 for order ${orderId}`);
        await connection.query(
          'UPDATE orders SET lyrics_approved = 1 WHERE id = ?',
          [orderId]
        );
      }
      
      // Commit the transaction
      await connection.commit();
      console.log(`Successfully updated order ${orderId} status to ${status}`);
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully'
      });
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      console.error(`Transaction error for order ${orderId}:`, error);
      throw error;
    } finally {
      // Always release the connection
      connection.release();
    }
  } catch (error) {
    console.error('Admin update order status error:', error);
    if (connection) connection.release();
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Update order lyrics
// Updated updateOrderLyrics function
exports.updateOrderLyrics = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const { lyrics, status } = req.body;
    
    console.log(`Updating lyrics for order ${orderId}`);
    
    // Check if order exists
    const [orderCheck] = await connection.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      console.log(`Order not found: ${orderId}`);
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order with lyrics but DO NOT change revision count
    await connection.query(
      'UPDATE orders SET system_generated_lyrics = ?, status = ? WHERE id = ?',
      [lyrics, status, orderId]
    );
    
    // Also update workflow_stage based on status
    const workflowStage = getWorkflowStage(status);
    await connection.query(
      'UPDATE orders SET workflow_stage = ? WHERE id = ?',
      [workflowStage, orderId]
    );
    
    console.log(`Successfully updated lyrics for order ${orderId}`);
    
    res.status(200).json({
      success: true,
      message: 'Lyrics updated successfully'
    });
  } catch (error) {
    console.error('Admin update order lyrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating lyrics: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// Update order revision settings
exports.updateOrderRevisions = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const { allowMoreRevisions } = req.body;
    
    console.log(`Updating revision settings for order ${orderId}: allowMoreRevisions=${allowMoreRevisions}`);
    
    // Check if order exists
    const [orderCheck] = await connection.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      console.log(`Order not found: ${orderId}`);
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Update order revision settings
    await connection.query(
      'UPDATE orders SET allow_more_revisions = ? WHERE id = ?',
      [allowMoreRevisions ? 1 : 0, orderId]
    );
    
    console.log(`Successfully updated revision settings for order ${orderId}`);
    
    res.status(200).json({
      success: true,
      message: 'Revision settings updated successfully'
    });
  } catch (error) {
    console.error('Admin update revision settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating revision settings: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    if (connection) connection.release();
  }
};

// Upload song version
exports.uploadSongVersion = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const { version, title } = req.body;
    
    console.log(`Uploading song version for order ${orderId}: version=${version}, title=${title}`);
    
    // Check if order exists
    const [orderCheck] = await connection.query('SELECT id, status, song_revisions FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      console.log(`Order not found: ${orderId}`);
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Validate file upload
    if (!req.file) {
      console.log('No file uploaded');
      connection.release();
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Get file path
      const filePath = req.file.path.replace(/\\/g, '/');
      const relativePath = filePath.split('/uploads/')[1];
      
      console.log(`File uploaded to: ${filePath}`);
      
      // Save to database
      await connection.query(
        'INSERT INTO songs (order_id, version, title, file_path) VALUES (?, ?, ?, ?)',
        [orderId, version, title, `songs/${req.file.filename}`]
      );
      
      // Check if this is a new revision or the initial upload
      // If there are already 2 versions for this order, then this is a revision
      const [songCount] = await connection.query(
        'SELECT COUNT(*) as count FROM songs WHERE order_id = ?',
        [orderId]
      );
      
      // If there are now more than 2 songs, it counts as a revision
      // 1 = First upload of version A or B
      // 2 = Second upload of version A or B (initial complete set)
      // 3+ = Revisions to either version, so increment the counter
      if (songCount[0].count > 2) {
        // Only increment if not currently 0 (first time sending both versions)
        if (orderCheck[0].song_revisions > 0) {
          // Every 2 songs uploaded counts as 1 revision (A and B versions)
          const revisionsToAdd = Math.floor((songCount[0].count - 2) / 2);
          const newRevisionCount = Math.max(1, revisionsToAdd);  // At least 1 revision
          
          await connection.query(
            'UPDATE orders SET song_revisions = ? WHERE id = ?',
            [newRevisionCount, orderId]
          );
          
          console.log(`Updated song revision count to ${newRevisionCount}`);
        } else {
          // First time revisions, set to 1
          await connection.query(
            'UPDATE orders SET song_revisions = 1 WHERE id = ?',
            [orderId]
          );
        }
      }
      
      // Update order status to song_review if not already
      if (orderCheck[0].status !== 'song_review' && 
          orderCheck[0].status !== 'completed') {
        await connection.query(
          'UPDATE orders SET status = ?, workflow_stage = 5 WHERE id = ?',
          ['song_review', orderId]
        );
      }
      
      await connection.commit();
      
      console.log(`Successfully uploaded song version for order ${orderId}`);
      
      res.status(201).json({
        success: true,
        message: 'Song version uploaded successfully',
        filePath: `/uploads/songs/${req.file.filename}`
      });
    } catch (error) {
      await connection.rollback();
      console.error(`Transaction error for order ${orderId}:`, error);
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Admin upload song version error:', error);
    if (connection) connection.release();
    res.status(500).json({
      success: false,
      message: 'Server error while uploading song version: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Delete song version
exports.deleteSongVersion = async (req, res) => {
  try {
    const { orderId, songId } = req.params;
    
    console.log(`Deleting song version ${songId} for order ${orderId}`);
    
    // Check if song exists and belongs to the order
    const [songs] = await pool.query(
      'SELECT * FROM songs WHERE id = ? AND order_id = ?',
      [songId, orderId]
    );
    
    if (songs.length === 0) {
      console.log(`Song version not found: ${songId}`);
      return res.status(404).json({
        success: false,
        message: 'Song version not found'
      });
    }
    
    const song = songs[0];
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '../uploads', song.file_path);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log(`Deleted file: ${filePath}`);
    } else {
      console.log(`File not found: ${filePath}`);
    }
    
    // Delete from database
    await pool.query('DELETE FROM songs WHERE id = ?', [songId]);
    
    console.log(`Successfully deleted song version ${songId} for order ${orderId}`);
    
    res.status(200).json({
      success: true,
      message: 'Song version deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete song version error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting song version: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Get all newsletter signups
exports.getNewsletterSignups = async (req, res) => {
  try {
    const [signups] = await pool.query(
      'SELECT * FROM newsletter_signups ORDER BY subscribed_at DESC'
    );
    
    res.status(200).json({
      success: true,
      signups
    });
  } catch (error) {
    console.error('Admin get newsletter signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching newsletter signups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Export newsletter signups as CSV
exports.exportNewsletterSignups = async (req, res) => {
  try {
    const [signups] = await pool.query(
      'SELECT email, subscribed_at FROM newsletter_signups ORDER BY subscribed_at DESC'
    );
    
    if (signups.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No newsletter signups found'
      });
    }
    
    // Convert to CSV
    const fields = ['email', 'subscribed_at'];
    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(signups);
    
    // Send as file download
    res.header('Content-Type', 'text/csv');
    res.attachment('newsletter_signups.csv');
    res.send(csv);
  } catch (error) {
    console.error('Admin export newsletter signups error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while exporting newsletter signups',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get showcase items
exports.getShowcaseItems = async (req, res) => {
  try {
    const [items] = await pool.query(
      'SELECT * FROM showcase_items ORDER BY created_at DESC'
    );
    
    res.status(200).json({
      success: true,
      showcaseItems: items
    });
  } catch (error) {
    console.error('Admin get showcase items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching showcase items',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add showcase item
exports.addShowcaseItem = async (req, res) => {
  try {
    const { title, description, author, genre, category, featured } = req.body;
    
    // Validate required fields
    if (!title || !description || !author || !genre || !category) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Validate file uploads
    if (!req.files || !req.files.image || !req.files.audio) {
      return res.status(400).json({
        success: false,
        message: 'Both image and audio files are required'
      });
    }
    
    // Get file paths
    const imagePath = req.files.image[0].path.replace(/\\/g, '/').split('/uploads/')[1];
    const audioPath = req.files.audio[0].path.replace(/\\/g, '/').split('/uploads/')[1];
    
    // Save to database
    const [result] = await pool.query(
      `INSERT INTO showcase_items (
        title, description, image_path, audio_path, 
        author, genre, category, featured
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        imagePath,
        audioPath,
        author,
        genre,
        category,
        featured ? 1 : 0
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Showcase item added successfully',
      showcaseItem: {
        id: result.insertId,
        title,
        description,
        imagePath: `/uploads/${imagePath}`,
        audioPath: `/uploads/${audioPath}`,
        author,
        genre,
        category,
        featured: featured ? true : false
      }
    });
  } catch (error) {
    console.error('Admin add showcase item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding showcase item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update showcase item
exports.updateShowcaseItem = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const itemId = req.params.id;
    const { title, description, author, genre, category, featured } = req.body;
    
    // Check if item exists
    const [items] = await connection.query('SELECT * FROM showcase_items WHERE id = ?', [itemId]);
    
    if (items.length === 0) {
      connection.release();
      return res.status(404).json({
        success: false,
        message: 'Showcase item not found'
      });
    }
    
    const item = items[0];
    
    // Prepare update query parts
    let updateQuery = 'UPDATE showcase_items SET ';
    const updateValues = [];
    
    // Add fields to update
    if (title) {
      updateQuery += 'title = ?, ';
      updateValues.push(title);
    }
    
    if (description) {
      updateQuery += 'description = ?, ';
      updateValues.push(description);
    }
    
    if (author) {
      updateQuery += 'author = ?, ';
      updateValues.push(author);
    }
    
    if (genre) {
      updateQuery += 'genre = ?, ';
      updateValues.push(genre);
    }
    
    if (category) {
      updateQuery += 'category = ?, ';
      updateValues.push(category);
    }
    
    if (featured !== undefined) {
      updateQuery += 'featured = ?, ';
      updateValues.push(featured ? 1 : 0);
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // Handle file uploads
      if (req.files) {
        if (req.files.image) {
          // Delete old image
          const oldImagePath = path.join(__dirname, '../uploads', item.image_path);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
          
          // Update with new image
          const imagePath = req.files.image[0].path.replace(/\\/g, '/').split('/uploads/')[1];
          updateQuery += 'image_path = ?, ';
          updateValues.push(imagePath);
        }
        
        if (req.files.audio) {
          // Delete old audio
          const oldAudioPath = path.join(__dirname, '../uploads', item.audio_path);
          if (fs.existsSync(oldAudioPath)) {
            fs.unlinkSync(oldAudioPath);
          }
          
          // Update with new audio
          const audioPath = req.files.audio[0].path.replace(/\\/g, '/').split('/uploads/')[1];
          updateQuery += 'audio_path = ?, ';
          updateValues.push(audioPath);
        }
      }
      
      // Remove trailing comma and add WHERE clause
      updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
      updateValues.push(itemId);
      
      // Update in database
      await connection.query(updateQuery, updateValues);
      
      // Commit the transaction
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: 'Showcase item updated successfully'
      });
    } catch (error) {
      // Rollback in case of error
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Admin update showcase item error:', error);
    if (connection) connection.release();
    res.status(500).json({
      success: false,
      message: 'Server error while updating showcase item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete showcase item
exports.deleteShowcaseItem = async (req, res) => {
  try {
    const itemId = req.params.id;
    
    // Check if item exists
    const [items] = await pool.query('SELECT * FROM showcase_items WHERE id = ?', [itemId]);
    
    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Showcase item not found'
      });
    }
    
    const item = items[0];
    
    // Delete image file
    const imagePath = path.join(__dirname, '../uploads', item.image_path);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
    
    // Delete audio file
    const audioPath = path.join(__dirname, '../uploads', item.audio_path);
    if (fs.existsSync(audioPath)) {
      fs.unlinkSync(audioPath);
    }
    
    // Delete from database
    await pool.query('DELETE FROM showcase_items WHERE id = ?', [itemId]);
    
    res.status(200).json({
      success: true,
      message: 'Showcase item deleted successfully'
    });
  } catch (error) {
    console.error('Admin delete showcase item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting showcase item',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get revision history for an order
exports.getOrderRevisionHistory = async (req, res) => {
  try {
    const orderId = req.params.id;
    
    // Check if order exists
    const [orderCheck] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get revision history with more debugging info
    console.log(`Fetching revision history for order ${orderId}`);
    
    // More inclusive query that gets ALL revisions for this order
    const [revisions] = await pool.query(
      `SELECT 
        r.*, 
        CASE 
          WHEN r.user_type = 'admin' THEN 'Administrator'
          ELSE u.name
        END as user_display_name,
        u.email as user_email
      FROM order_revisions r
      LEFT JOIN users u ON r.user_id = u.id
      WHERE r.order_id = ?
      ORDER BY r.created_at DESC`,
      [orderId]
    );
    
    console.log(`Found ${revisions.length} revisions for order ${orderId}`);
    
    // Log the actual revisions for debugging
    revisions.forEach((revision, index) => {
      console.log(`Revision ${index + 1}: Type=${revision.type}, User=${revision.user_display_name}, UserType=${revision.user_type}`);
    });
    
    res.status(200).json({
      success: true,
      revisions
    });
  } catch (error) {
    console.error('Admin get revision history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revision history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Add revision note
// Add revision note
exports.addRevisionNote = async (req, res) => {
  try {
    const orderId = req.params.id;
    const { type, comment, revisionType } = req.body;
    const userId = req.user.id;
    
    // Validate input
    if (!type || !comment || !revisionType) {
      return res.status(400).json({
        success: false,
        message: 'Type, comment, and revisionType are required'
      });
    }
    
    // Check if order exists
    const [orderCheck] = await pool.query('SELECT id FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Insert revision note with revision_type
    await pool.query(
      'INSERT INTO order_revisions (order_id, type, comment, user_id, user_type, revision_type) VALUES (?, ?, ?, ?, ?, ?)',
      [orderId, type, comment, userId, 'admin', revisionType]
    );
    
    res.status(201).json({
      success: true,
      message: 'Revision note added successfully'
    });
  } catch (error) {
    console.error('Admin add revision note error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding revision note',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};