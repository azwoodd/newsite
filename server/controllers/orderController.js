const { pool } = require('../config/db');
const validator = require('../utils/validator');

// Helper function for executing queries without prepared statements
const executeQuery = async (connection, sql, params = []) => {
  return await connection.query(sql, params);
};

// Get workflow stage based on status
const getWorkflowStage = (status) => {
  console.log(`Getting workflow stage for status: ${status}`);
  
  // Normalize the status
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  
  switch(normalizedStatus) {
    case 'pending': return 1;
    case 'in_production': return 2;
    case 'lyrics_review': return 3;
    case 'song_production': return 4; // Make sure this is 4 for Song Creation
    case 'song_review': return 5;
    case 'completed': return 6;
    case 'ready_for_review': return 3; // Legacy support, default to lyrics_review
    default: 
      console.log(`Unknown status: ${status}, defaulting to stage 1`);
      return 1;
  }
};

// Validate and apply promo code
const validateAndApplyPromoCode = async (connection, promoCode, orderTotal, userId) => {
  if (!promoCode) {
    return { isValid: false, discount: 0, codeId: null };
  }

  // Get promo code details
  const [codeRows] = await connection.query(`
    SELECT 
      pc.*,
      a.commission_rate,
      a.user_id as affiliate_user_id,
      a.status as affiliate_status
    FROM promo_codes pc
    LEFT JOIN affiliates a ON pc.affiliate_id = a.id
    WHERE pc.code = ? AND pc.is_active = TRUE
  `, [promoCode.toUpperCase()]);

  if (codeRows.length === 0) {
    throw new Error('Invalid or inactive promo code');
  }

  const code = codeRows[0];

  // Check if code has expired
  if (code.expires_at && new Date() > new Date(code.expires_at)) {
    throw new Error('This promo code has expired');
  }

  // Check if code hasn't started yet
  if (code.starts_at && new Date() < new Date(code.starts_at)) {
    throw new Error('This promo code is not yet active');
  }

  // Check usage limits
  if (code.max_uses > 0 && code.current_uses >= code.max_uses) {
    throw new Error('This promo code has reached its usage limit');
  }

  // Check per-user limits (if user is provided)
  if (userId && code.max_uses_per_user > 0) {
    const [userUsage] = await connection.query(
      'SELECT COUNT(*) as usage_count FROM promo_code_usage WHERE code_id = ? AND user_id = ?',
      [code.id, userId]
    );
    
    if (userUsage[0].usage_count >= code.max_uses_per_user) {
      throw new Error('You have already used this promo code the maximum number of times');
    }
  }

  // Check if user is trying to use their own affiliate code
  if (code.type === 'affiliate' && code.affiliate_user_id === userId) {
    throw new Error('You cannot use your own affiliate code');
  }

  // Calculate discount
  let discountAmount;
  if (code.is_percentage) {
    discountAmount = Math.round((orderTotal * code.discount_amount / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(code.discount_amount, orderTotal);
  }

  return {
    isValid: true,
    discount: discountAmount,
    codeId: code.id,
    affiliateId: code.affiliate_id,
    codeType: code.type,
    codeName: code.name
  };
};

// Record promo code usage
const recordPromoCodeUsage = async (connection, codeId, userId, orderId, discountApplied) => {
  // Insert usage record
  await connection.query(`
    INSERT INTO promo_code_usage (code_id, user_id, order_id, discount_applied)
    VALUES (?, ?, ?, ?)
  `, [codeId, userId, orderId, discountApplied]);

  // Update code usage count
  await connection.query(
    'UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?',
    [codeId]
  );
};

// Create a new order with proper transaction handling
exports.createOrder = async (req, res) => {
  // Get a connection from the pool
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const userId = req.user.id;
    const {
      packageType,
      totalPrice,
      songPurpose,
      recipientName,
      emotion,
      provideLyrics,
      lyrics,
      songTheme,
      personalStory,
      musicStyle,
      showInGallery,
      additionalNotes,
      addons,
      payment,
      customer,
      promoCode // New: promo code field
    } = req.body;
    
    console.log('Order data received:', req.body);
    
    // Map frontend package names to database enum values
    let dbPackageType;
    switch(packageType) {
      case 'basic': dbPackageType = 'essential'; break;
      case 'deluxe': dbPackageType = 'signature'; break;
      case 'premium': dbPackageType = 'masterpiece'; break;
      default: dbPackageType = 'signature'; // Default fallback
    }
    
    // Generate order number
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `ORD-${timestamp}-${random}`;
    
    // Start transaction - using the connection directly
    await connection.beginTransaction();
    
    try {
      // Validate and apply promo code if provided
      let promoCodeData = { isValid: false, discount: 0, codeId: null };
      let finalTotalPrice = totalPrice;
      
      if (promoCode && promoCode.trim()) {
        try {
          promoCodeData = await validateAndApplyPromoCode(connection, promoCode.trim(), totalPrice, userId);
          
          if (promoCodeData.isValid) {
            finalTotalPrice = Math.max(0, totalPrice - promoCodeData.discount);
            console.log(`Promo code applied: ${promoCode}, discount: $${promoCodeData.discount}, final total: $${finalTotalPrice}`);
          }
        } catch (promoError) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: promoError.message
          });
        }
      }

      // Step 1: Insert the order with minimal required fields
      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_number, user_id, package_type, total_price, status, workflow_stage,
          used_promo_code, promo_discount_amount, referring_affiliate_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          dbPackageType,
          finalTotalPrice, // Use final price after discount
          'pending',
          1, // Initial workflow stage
          promoCodeData.isValid ? promoCode.trim().toUpperCase() : null,
          promoCodeData.discount || 0,
          promoCodeData.affiliateId || null
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // Step 2: Update other details in separate queries
      await connection.query(
        `UPDATE orders SET
          song_purpose = ?,
          recipient_name = ?,
          emotion = ?
        WHERE id = ?`,
        [
          songPurpose || null,
          recipientName || null,
          emotion || null,
          orderId
        ]
      );
      
      await connection.query(
        `UPDATE orders SET
          provide_lyrics = ?,
          lyrics = ?,
          song_theme = ?,
          personal_story = ?
        WHERE id = ?`,
        [
          provideLyrics ? 1 : 0,
          lyrics || null,
          songTheme || null,
          personalStory || null,
          orderId
        ]
      );
      
      await connection.query(
        `UPDATE orders SET
          music_style = ?,
          show_in_gallery = ?,
          additional_notes = ?,
          payment_status = ?,
          lyrics_revisions = 0,
          song_revisions = 0,
          allow_more_revisions = 0,
          lyrics_approved = 0
        WHERE id = ?`,
        [
          musicStyle || null,
          showInGallery ? 1 : 0,
          additionalNotes || null,
          'pending',
          orderId
        ]
      );
      
      // Step 3: Insert addons if any
      if (addons && addons.length > 0) {
        for (const addon of addons) {
          if (addon.type && addon.price) {
            await connection.query(
              'INSERT INTO order_addons (order_id, addon_type, price) VALUES (?, ?, ?)',
              [orderId, addon.type, addon.price]
            );
          }
        }
      }
      
      // Step 4: Store customer information if provided
      if (customer) {
        await connection.query(
          `UPDATE orders SET 
            customer_name = ?, 
            customer_email = ?
          WHERE id = ?`,
          [
            customer.name || null,
            customer.email || null,
            orderId
          ]
        );
        
        if (customer.address || customer.city || customer.postcode || customer.country) {
          await connection.query(
            `UPDATE orders SET 
              customer_address = ?,
              customer_city = ?,
              customer_postcode = ?,
              customer_country = ?
            WHERE id = ?`,
            [
              customer.address || null,
              customer.city || null,
              customer.postcode || null,
              customer.country || null,
              orderId
            ]
          );
        }
      }

      // Step 5: Record promo code usage if applicable
      if (promoCodeData.isValid) {
        await recordPromoCodeUsage(connection, promoCodeData.codeId, userId, orderId, promoCodeData.discount);
        
        // Track referral event for affiliate codes
        if (promoCodeData.codeType === 'affiliate') {
          const userAgent = req.get('User-Agent');
          const ipAddress = req.ip || req.connection.remoteAddress;
          
          await connection.query(`
            INSERT INTO referral_events (
              code_id, user_id, ip_address, user_agent, event_type, 
              order_id, conversion_value
            ) VALUES (?, ?, ?, ?, 'purchase', ?, ?)
          `, [
            promoCodeData.codeId,
            userId,
            ipAddress,
            userAgent || null,
            orderId,
            finalTotalPrice
          ]);
        }
      }
      
      // Commit the transaction
      await connection.commit();
      
      // Return success response with order details
      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        order: {
          id: orderId,
          orderNumber,
          packageType: dbPackageType,
          originalPrice: totalPrice,
          finalPrice: finalTotalPrice,
          discountApplied: promoCodeData.discount,
          promoCode: promoCodeData.isValid ? promoCode.trim().toUpperCase() : null,
          status: 'pending'
        }
      });
    } catch (error) {
      // Rollback the transaction in case of error
      if (connection) await connection.rollback();
      
      console.error('Transaction error:', error.message);
      throw error;
    }
  } catch (error) {
    console.error('Create order error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error while creating order: ' + error.message,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    // Release the connection back to the pool
    if (connection) connection.release();
  }
};

// Update order status - using connection-level transactions
exports.updateOrderStatus = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const { status, paymentId, paymentStatus } = req.body;
    const userId = req.user.id;
    
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
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    await connection.beginTransaction();
    
    try {
      // Calculate workflow stage based on status
      const workflowStage = getWorkflowStage(status);
      
      // Update order status and workflow stage
      await connection.query(
        'UPDATE orders SET status = ?, workflow_stage = ? WHERE id = ?',
        [status, workflowStage, orderId]
      );
      
      // If payment ID provided, store it
      if (paymentId) {
        const [existingPayment] = await connection.query(
          'SELECT * FROM payment_transactions WHERE order_id = ?',
          [orderId]
        );
        
        if (existingPayment.length > 0) {
          // Update existing payment record
          await connection.query(
            'UPDATE payment_transactions SET transaction_id = ?, status = ? WHERE order_id = ?',
            [paymentId, paymentStatus || 'completed', orderId]
          );
        } else {
          // Create new payment record
          await connection.query(
            'INSERT INTO payment_transactions (order_id, transaction_id, provider, amount, currency, status) VALUES (?, ?, ?, ?, ?, ?)',
            [orderId, paymentId, 'stripe', orders[0].total_price, 'gbp', paymentStatus || 'completed']
          );
        }
        
        // Update payment status in orders table
        await connection.query(
          'UPDATE orders SET payment_id = ?, payment_status = ? WHERE id = ?',
          [paymentId, 'paid', orderId]
        );

        // Process affiliate commission if order used a promo code and payment succeeded
        if (paymentStatus === 'paid' || paymentStatus === 'completed') {
          const order = orders[0];
          if (order.referring_affiliate_id) {
            try {
              // Get promo code ID for commission processing
              const [promoCodeRows] = await connection.query(
                'SELECT id FROM promo_codes WHERE code = ? AND affiliate_id = ?',
                [order.used_promo_code, order.referring_affiliate_id]
              );

              if (promoCodeRows.length > 0) {
                const { processCommission } = require('./affiliateController');
                await processCommission(orderId);
                console.log(`Affiliate commission processed for order ${orderId}`);
              }
            } catch (commissionError) {
              console.error('Error processing affiliate commission:', commissionError);
              // Don't fail the order update if commission processing fails
            }
          }
        }
      }
      
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        orderId,
        status
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating order status: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const userId = req.user.id;
    
    // Get orders with addons and promo code information
    const [orders] = await connection.query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM songs WHERE order_id = o.id) as song_versions_count,
        o.lyrics_revisions,
        o.song_revisions,
        o.allow_more_revisions,
        o.lyrics_approved,
        o.workflow_stage,
        o.used_promo_code,
        o.promo_discount_amount,
        pc.name as promo_code_name,
        pc.type as promo_code_type
      FROM orders o 
      LEFT JOIN promo_codes pc ON o.used_promo_code = pc.code
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC`,
      [userId]
    );
    
    // Get addons for each order
    for (const order of orders) {
      const [addons] = await connection.query(
        'SELECT * FROM order_addons WHERE order_id = ?',
        [order.id]
      );
      
      // Format order status for frontend
      order.status = order.status.replace(/_/g, ' ').replace(
        /\b\w/g, char => char.toUpperCase()
      );
      
      order.addons = addons;
      
      // Get song versions if available
      if (order.song_versions_count > 0) {
        const [songs] = await connection.query(
          'SELECT id, version, title, file_path, is_selected, is_downloaded, uploaded_at FROM songs WHERE order_id = ?',
          [order.id]
        );
        
        order.songVersions = songs.map(song => ({
          ...song,
          url: `/uploads/songs/${song.file_path.split('/').pop()}`
        }));
      } else {
        order.songVersions = [];
      }
      
      // Get payment info
      const [payments] = await connection.query(
        'SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
        [order.id]
      );
      
      if (payments.length > 0) {
        order.payment = payments[0];
      }
      
      // Convert package_type to frontend format
      switch(order.package_type) {
        case 'essential': order.package_type = 'basic'; break;
        case 'signature': order.package_type = 'deluxe'; break;
        case 'masterpiece': order.package_type = 'premium'; break;
      }

      // Add promo code information for display
      if (order.used_promo_code) {
        order.promoCodeInfo = {
          code: order.used_promo_code,
          name: order.promo_code_name,
          type: order.promo_code_type,
          discount: order.promo_discount_amount
        };
      }
    }
    
    res.status(200).json({
      success: true,
      orders
    });
  } catch (error) {
    console.error('Get user orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching orders: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get single order by ID
exports.getOrderById = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const userId = req.user.id;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      `SELECT o.*, 
        pc.name as promo_code_name,
        pc.type as promo_code_type
      FROM orders o
      LEFT JOIN promo_codes pc ON o.used_promo_code = pc.code
      WHERE o.id = ? AND o.user_id = ?`,
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    const order = orders[0];
    
    // Get addons
    const [addons] = await connection.query(
      'SELECT * FROM order_addons WHERE order_id = ?',
      [orderId]
    );
    
    order.addons = addons;
    
    // Get song versions if available
    const [songs] = await connection.query(
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
    
    // Get payment info
    const [payments] = await connection.query(
      'SELECT * FROM payment_transactions WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    );
    
    if (payments.length > 0) {
      order.payment = payments[0];
    }
    
    // Convert package_type to frontend format
    switch(order.package_type) {
      case 'essential': order.package_type = 'basic'; break;
      case 'signature': order.package_type = 'deluxe'; break;
      case 'masterpiece': order.package_type = 'premium'; break;
    }

    // Add promo code information for display
    if (order.used_promo_code) {
      order.promoCodeInfo = {
        code: order.used_promo_code,
        name: order.promo_code_name,
        type: order.promo_code_type,
        discount: order.promo_discount_amount
      };
    }
    
    res.status(200).json({
      success: true,
      order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching order: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Select a song version
exports.selectSongVersion = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { orderId, songId } = req.params;
    const userId = req.user.id;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if any version has been downloaded already
    const [downloadedSongs] = await connection.query(
      'SELECT * FROM songs WHERE order_id = ? AND is_downloaded = 1',
      [orderId]
    );
    
    if (downloadedSongs.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'You have already downloaded a version of this song'
      });
    }
    
    // Check if song exists and belongs to the order
    const [songs] = await connection.query(
      'SELECT * FROM songs WHERE id = ? AND order_id = ?',
      [songId, orderId]
    );
    
    if (songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Song version not found'
      });
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      // First unselect all versions
      await connection.query(
        'UPDATE songs SET is_selected = 0 WHERE order_id = ?',
        [orderId]
      );
      
      // Then select the requested version
      await connection.query(
        'UPDATE songs SET is_selected = 1 WHERE id = ?',
        [songId]
      );
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: 'Song version selected successfully'
      });
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Select song version error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while selecting song version: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Download a song - Updated to allow repeated downloads
exports.downloadSong = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const { orderId, songId } = req.params;
    const userId = req.user.id;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if song exists, belongs to the order, and is selected
    const [songs] = await connection.query(
      'SELECT * FROM songs WHERE id = ? AND order_id = ? AND is_selected = 1',
      [songId, orderId]
    );
    
    if (songs.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Selected song version not found'
      });
    }
    
    const song = songs[0];
    
    await connection.beginTransaction();
    
    try {
      // Mark song as downloaded if not already
      if (!song.is_downloaded) {
        await connection.query(
          'UPDATE songs SET is_downloaded = 1 WHERE id = ?',
          [songId]
        );
      
        // Update order status to completed and workflow stage to 6
        await connection.query(
          'UPDATE orders SET status = ?, workflow_stage = ? WHERE id = ?',
          ['completed', 6, orderId]
        );
      }
      
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: 'Song ready for download',
        downloadUrl: `/uploads/songs/${song.file_path.split('/').pop()}`
      });
    } catch (error) {
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Download song error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing download: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Approve lyrics or request changes
exports.approveLyrics = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const userId = req.user.id;
    const { feedback, approved } = req.body;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is in appropriate status
    if (!['lyrics_review', 'ready_for_review'].includes(orders[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Order is not ready for lyrics review'
      });
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      if (approved) {
        // Mark lyrics as approved and move to song production
        await connection.query(
          'UPDATE orders SET lyrics_approved = 1, status = ?, workflow_stage = ? WHERE id = ?',
          ['song_production', 4, orderId] // Move to Song Production stage (4)
        );
        
        // Record the feedback in revision history
        if (feedback) {
          await connection.query(
            'INSERT INTO order_revisions (order_id, type, comment, user_id, user_type) VALUES (?, ?, ?, ?, ?)',
            [orderId, 'lyrics_approved', feedback, userId, 'customer']
          );
        }
      } else {
        // Not approved, request changes
        if (!feedback) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Feedback is required when requesting changes'
          });
        }
        
        // Increment lyrics revision count and move back to In Production
        await connection.query(
          'UPDATE orders SET lyrics_revisions = lyrics_revisions + 1, status = ?, workflow_stage = ? WHERE id = ?',
          ['in_production', 2, orderId] // Move back to In Production stage (2)
        );
        
        // Record the change request in revision history
        await connection.query(
          'INSERT INTO order_revisions (order_id, type, comment, user_id, user_type) VALUES (?, ?, ?, ?, ?)',
          [orderId, 'lyrics_change_request', feedback, userId, 'customer']
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: approved ? 'Lyrics approved successfully' : 'Lyrics change request submitted successfully'
      });
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Lyrics approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing lyrics approval: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Approve song or request changes
exports.approveSong = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const userId = req.user.id;
    const { feedback, approved, selectedVersionId } = req.body;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Check if order is in appropriate status
    if (!['song_review', 'ready_for_review'].includes(orders[0].status)) {
      return res.status(400).json({
        success: false,
        message: 'Order is not ready for song review'
      });
    }
    
    // Begin transaction
    await connection.beginTransaction();
    
    try {
      if (approved) {
        // Ensure a version is selected
        if (!selectedVersionId) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Please select a song version'
          });
        }
        
        // First unselect all versions
        await connection.query(
          'UPDATE songs SET is_selected = 0 WHERE order_id = ?',
          [orderId]
        );
        
        // Then select the requested version
        await connection.query(
          'UPDATE songs SET is_selected = 1 WHERE id = ? AND order_id = ?',
          [selectedVersionId, orderId]
        );
        
        // Move to Completed status (6)
        await connection.query(
          'UPDATE orders SET status = ?, workflow_stage = ? WHERE id = ?',
          ['completed', 6, orderId]
        );
        
        // Record the feedback in revision history
        if (feedback) {
          await connection.query(
            'INSERT INTO order_revisions (order_id, type, comment, user_id, user_type) VALUES (?, ?, ?, ?, ?)',
            [orderId, 'song_approved', feedback, userId, 'customer']
          );
        }
      } else {
        // Not approved, request changes
        if (!feedback) {
          await connection.rollback();
          return res.status(400).json({
            success: false,
            message: 'Feedback is required when requesting changes'
          });
        }
        
        // Increment song revision count and move back to Song Production
        await connection.query(
          'UPDATE orders SET song_revisions = song_revisions + 1, status = ?, workflow_stage = ? WHERE id = ?',
          ['song_production', 4, orderId] // Move back to Song Production (4)
        );
        
        // Record the change request in revision history
        await connection.query(
          'INSERT INTO order_revisions (order_id, type, comment, user_id, user_type) VALUES (?, ?, ?, ?, ?)',
          [orderId, 'song_change_request', feedback, userId, 'customer']
        );
      }
      
      // Commit transaction
      await connection.commit();
      
      res.status(200).json({
        success: true,
        message: approved ? 'Song approved successfully' : 'Song change request submitted successfully'
      });
    } catch (error) {
      // Rollback transaction in case of error
      await connection.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Song approval error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing song approval: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};

// Get revision history for an order
exports.getRevisionHistory = async (req, res) => {
  let connection;
  
  try {
    connection = await pool.getConnection();
    
    const orderId = req.params.id;
    const userId = req.user.id;
    
    // Check if order exists and belongs to the user
    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }
    
    // Get revision history
    const [revisions] = await connection.query(
      `SELECT r.*, 
        CASE 
          WHEN r.user_type = 'admin' THEN 'Administrator'
          ELSE 'You'
        END as user_display_name
      FROM order_revisions r
      WHERE r.order_id = ?
      ORDER BY r.created_at DESC`,
      [orderId]
    );
    
    res.status(200).json({
      success: true,
      revisions
    });
  } catch (error) {
    console.error('Get revision history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching revision history: ' + error.message
    });
  } finally {
    if (connection) connection.release();
  }
};