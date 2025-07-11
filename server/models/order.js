// server/models/order.js
const { query } = require('../config/db');

class Order {
  /**
   * Generate a unique order number
   * @returns {Promise<string>} A unique order number
   */
  static async generateOrderNumber() {
    const prefix = 'ORD';
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const orderNumber = `${prefix}-${timestamp}-${random}`;
    
    // Check if this number already exists (very unlikely but let's be safe)
    const existingOrders = await query('SELECT id FROM orders WHERE order_number = ?', [orderNumber]);
    
    if (existingOrders.length > 0) {
      // If exists, generate a new one recursively
      return this.generateOrderNumber();
    }
    
    return orderNumber;
  }

  /**
   * Create a new order
   * @param {Object} orderData - The order data
   * @returns {Promise<Object>} The created order
   */
  static async create(orderData) {
    const {
      userId,
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
      addons
    } = orderData;
    
    // Generate order number
    const orderNumber = await this.generateOrderNumber();
    
    // Begin transaction
    await query('START TRANSACTION');
    
    try {
      // Insert order
      const orderResult = await query(
        `INSERT INTO orders (
          order_number, user_id, package_type, total_price, status,
          song_purpose, recipient_name, emotion, provide_lyrics, lyrics, 
          song_theme, personal_story, music_style, show_in_gallery, additional_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderNumber,
          userId,
          packageType,
          totalPrice,
          'pending',
          songPurpose,
          recipientName,
          emotion,
          provideLyrics ? 1 : 0,
          lyrics || null,
          songTheme,
          personalStory,
          musicStyle,
          showInGallery ? 1 : 0,
          additionalNotes
        ]
      );
      
      const orderId = orderResult.insertId;
      
      // Insert addons if any
      if (addons && addons.length > 0) {
        for (const addon of addons) {
          await query(
            'INSERT INTO order_addons (order_id, addon_type, price) VALUES (?, ?, ?)',
            [orderId, addon.type, addon.price]
          );
        }
      }
      
      // Commit transaction
      await query('COMMIT');
      
      return {
        id: orderId,
        orderNumber,
        packageType,
        totalPrice,
        status: 'pending'
      };
    } catch (error) {
      // Rollback transaction in case of error
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Get all orders for a user
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} Array of user orders
   */
  static async getUserOrders(userId) {
    // Get orders with addons
    const orders = await query(
      `SELECT o.*, 
        (SELECT COUNT(*) FROM songs WHERE order_id = o.id) as song_versions_count
      FROM orders o 
      WHERE o.user_id = ? 
      ORDER BY o.created_at DESC`,
      [userId]
    );
    
    // Get addons for each order
    for (const order of orders) {
      const addons = await query(
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
        const songs = await query(
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
    }
    
    return orders;
  }

  /**
   * Get a single order by ID
   * @param {number} orderId - The order ID
   * @param {number} userId - The user ID (for validation)
   * @returns {Promise<Object|null>} The order object or null if not found
   */
  static async getById(orderId, userId) {
    // Check if order exists and belongs to the user
    const orders = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return null;
    }
    
    const order = orders[0];
    
    // Get addons
    const addons = await query(
      'SELECT * FROM order_addons WHERE order_id = ?',
      [orderId]
    );
    
    order.addons = addons;
    
    // Get song versions if available
    const songs = await query(
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
    
    return order;
  }

  /**
   * Select a song version
   * @param {number} orderId - The order ID
   * @param {number} songId - The song ID to select
   * @param {number} userId - The user ID (for validation)
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  static async selectSongVersion(orderId, songId, userId) {
    // Check if order exists and belongs to the user
    const orders = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return false;
    }
    
    // Check if any version has been downloaded already
    const downloadedSongs = await query(
      'SELECT * FROM songs WHERE order_id = ? AND is_downloaded = 1',
      [orderId]
    );
    
    if (downloadedSongs.length > 0) {
      return false;
    }
    
    // Check if song exists and belongs to the order
    const songs = await query(
      'SELECT * FROM songs WHERE id = ? AND order_id = ?',
      [songId, orderId]
    );
    
    if (songs.length === 0) {
      return false;
    }
    
    // Begin transaction
    await query('START TRANSACTION');
    
    try {
      // First unselect all versions
      await query(
        'UPDATE songs SET is_selected = 0 WHERE order_id = ?',
        [orderId]
      );
      
      // Then select the requested version
      await query(
        'UPDATE songs SET is_selected = 1 WHERE id = ?',
        [songId]
      );
      
      // Commit transaction
      await query('COMMIT');
      
      return true;
    } catch (error) {
      // Rollback transaction in case of error
      await query('ROLLBACK');
      throw error;
    }
  }

  /**
   * Mark a song as downloaded
   * @param {number} orderId - The order ID
   * @param {number} songId - The song ID to download
   * @param {number} userId - The user ID (for validation)
   * @returns {Promise<Object|null>} The download URL or null if unsuccessful
   */
  static async downloadSong(orderId, songId, userId) {
    // Check if order exists and belongs to the user
    const orders = await query(
      'SELECT * FROM orders WHERE id = ? AND user_id = ?',
      [orderId, userId]
    );
    
    if (orders.length === 0) {
      return null;
    }
    
    // Check if song exists, belongs to the order, and is selected
    const songs = await query(
      'SELECT * FROM songs WHERE id = ? AND order_id = ? AND is_selected = 1',
      [songId, orderId]
    );
    
    if (songs.length === 0) {
      return null;
    }
    
    const song = songs[0];
    
    // Mark song as downloaded
    await query(
      'UPDATE songs SET is_downloaded = 1 WHERE id = ?',
      [songId]
    );
    
    return {
      downloadUrl: `/uploads/songs/${song.file_path.split('/').pop()}`
    };
  }

  /**
   * Get all orders (admin function)
   * @returns {Promise<Array>} Array of all orders
   */
  static async getAllOrders() {
    // Get all orders with user info and counts
    return await query(
      `SELECT 
        o.*,
        u.name as user_name,
        u.email as user_email,
        (SELECT COUNT(*) FROM songs WHERE order_id = o.id) as song_versions_count
      FROM orders o
      JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC`
    );
  }

  /**
   * Get order details (admin function)
   * @param {number} orderId - The order ID
   * @returns {Promise<Object|null>} The order object or null if not found
   */
  static async getOrderDetails(orderId) {
    // Get order details with user info
    const orders = await query(
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
      return null;
    }
    
    const order = orders[0];
    
    // Get addons
    const addons = await query(
      'SELECT * FROM order_addons WHERE order_id = ?',
      [orderId]
    );
    
    order.addons = addons;
    
    // Get song versions
    const songs = await query(
      'SELECT id, version, title, file_path, is_selected, is_downloaded, uploaded_at FROM songs WHERE order_id = ?',
      [orderId]
    );
    
    order.songVersions = songs.map(song => ({
      ...song,
      url: `/uploads/songs/${song.file_path.split('/').pop()}`
    }));
    
    return order;
  }

  /**
   * Update order status (admin function)
   * @param {number} orderId - The order ID
   * @param {string} status - The new status
   * @returns {Promise<boolean>} True if successful, false otherwise
   */
  static async updateStatus(orderId, status) {
    // Validate status
    const validStatuses = ['pending', 'in_production', 'ready_for_review', 'completed'];
    
    if (!validStatuses.includes(status)) {
      return false;
    }
    
    // Check if order exists
    const orderCheck = await query('SELECT id FROM orders WHERE id = ?', [orderId]);
    
    if (orderCheck.length === 0) {
      return false;
    }
    
    // Update order status
    await query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, orderId]
    );
    
    return true;
  }
}

module.exports = Order;