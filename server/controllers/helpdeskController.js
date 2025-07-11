const { query } = require('../config/db');

// Create a new support ticket
exports.createTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      subject,
      message,
      priority = 'medium',
      category = 'other',
      orderId
    } = req.body;
    
    // Validate required fields
    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Subject and message are required'
      });
    }
    
    // Create ticket in database
    const ticketResult = await query(
      `INSERT INTO support_tickets (
        user_id, subject, status, priority, category, order_id
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        subject,
        'open',
        priority,
        category,
        orderId || null
      ]
    );
    
    const ticketId = ticketResult.insertId;
    
    // Add first message to ticket
    await query(
      `INSERT INTO ticket_messages (
        ticket_id, user_id, message, is_admin, is_read
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        ticketId,
        userId,
        message,
        0, // 0 = not admin
        0  // 0 = not read
      ]
    );
    
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      ticket: {
        id: ticketId,
        subject,
        status: 'open',
        priority,
        category,
        orderId: orderId || null
      }
    });
  } catch (error) {
    console.error('Create support ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating support ticket'
    });
  }
};

// Get all tickets for a user
exports.getUserTickets = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get tickets with latest message
    const tickets = await query(
      `SELECT t.*, 
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
        (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id) as last_message_at,
        (SELECT message FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT is_admin FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_from_admin,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id AND is_admin = 1 AND is_read = 0) as unread_count
      FROM support_tickets t 
      WHERE t.user_id = ? 
      ORDER BY t.status = 'open' DESC, t.updated_at DESC`,
      [userId]
    );
    
    res.status(200).json({
      success: true,
      tickets
    });
  } catch (error) {
    console.error('Get user tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching support tickets'
    });
  }
};

// Get single ticket with messages
exports.getTicketDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;
    
    // Check if ticket exists and belongs to the user
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    const ticket = tickets[0];
    
    // Get messages
    const messages = await query(
      `SELECT m.*, u.name as user_name 
      FROM ticket_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC`,
      [ticketId]
    );
    
    // Get related order if exists
    let orderDetails = null;
    if (ticket.order_id) {
      const orders = await query(
        'SELECT * FROM orders WHERE id = ?',
        [ticket.order_id]
      );
      
      if (orders.length > 0) {
        orderDetails = orders[0];
      }
    }
    
    // Mark any unread admin messages as read
    await query(
      'UPDATE ticket_messages SET is_read = 1 WHERE ticket_id = ? AND is_admin = 1 AND is_read = 0',
      [ticketId]
    );
    
    // Clear new message flag on ticket
    await query(
      'UPDATE support_tickets SET has_new_message = 0 WHERE id = ?',
      [ticketId]
    );
    
    res.status(200).json({
      success: true,
      ticket: {
        ...ticket,
        messages,
        orderDetails
      }
    });
  } catch (error) {
    console.error('Get ticket details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ticket details'
    });
  }
};

// Add message to ticket
exports.addMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    // Check if ticket exists and belongs to the user
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Add message
    const messageResult = await query(
      `INSERT INTO ticket_messages (
        ticket_id, user_id, message, is_admin, is_read
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        ticketId,
        userId,
        message,
        0, // not admin
        0  // not read yet
      ]
    );
    
    // Update ticket status and timestamp
    await query(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      ['awaiting_reply', ticketId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Message added successfully',
      ticketMessage: {
        id: messageResult.insertId,
        user_id: userId,
        message,
        is_admin: false,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Add ticket message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding message'
    });
  }
};

// Close a ticket
exports.closeTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;
    
    // Check if ticket exists and belongs to the user
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Close ticket
    await query(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      ['closed', ticketId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Ticket closed successfully'
    });
  } catch (error) {
    console.error('Close ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while closing ticket'
    });
  }
};

// Reopen a ticket
exports.reopenTicket = async (req, res) => {
  try {
    const userId = req.user.id;
    const ticketId = req.params.id;
    
    // Check if ticket exists and belongs to the user
    const tickets = await query(
      'SELECT * FROM support_tickets WHERE id = ? AND user_id = ?',
      [ticketId, userId]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Reopen ticket
    await query(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      ['open', ticketId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Ticket reopened successfully'
    });
  } catch (error) {
    console.error('Reopen ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while reopening ticket'
    });
  }
};

// Get admin online status
exports.getAdminStatus = async (req, res) => {
  try {
    // Check if any admin was active in the last 15 minutes
    const admins = await query(
      `SELECT COUNT(*) as count FROM users 
      WHERE role = 'admin' AND last_active > DATE_SUB(NOW(), INTERVAL 15 MINUTE)`
    );
    
    // Get the most recent admin last active time
    const lastActive = await query(
      `SELECT last_active FROM users 
      WHERE role = 'admin' 
      ORDER BY last_active DESC 
      LIMIT 1`
    );
    
    const isAdminOnline = admins[0].count > 0;
    const lastActiveTime = lastActive.length > 0 ? lastActive[0].last_active : null;
    
    res.status(200).json({
      success: true,
      isAdminOnline,
      lastActiveTime
    });
  } catch (error) {
    console.error('Get admin status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while checking admin status'
    });
  }
};

// ADMIN CONTROLLERS

// Get all tickets (admin only)
exports.getAllTickets = async (req, res) => {
  try {
    console.log('Getting all tickets for admin:', req.user);
    
    // Check if support_tickets table exists
    const tables = await query(`SHOW TABLES LIKE 'support_tickets'`);
    if (tables.length === 0) {
      console.log('Creating support_tickets table');
      // Create the tables if they don't exist
      await query(`
        CREATE TABLE IF NOT EXISTS support_tickets (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          subject VARCHAR(255) NOT NULL,
          status ENUM('open', 'awaiting_reply', 'in_progress', 'resolved', 'closed') NOT NULL DEFAULT 'open',
          priority ENUM('low', 'medium', 'high') NOT NULL DEFAULT 'medium',
          category VARCHAR(50) NOT NULL DEFAULT 'other',
          order_id INT,
          assigned_to INT,
          has_new_message BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          FOREIGN KEY (assigned_to) REFERENCES users(id)
        )
      `);
      
      await query(`
        CREATE TABLE IF NOT EXISTS ticket_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ticket_id INT NOT NULL,
          user_id INT NOT NULL,
          message TEXT NOT NULL,
          is_admin BOOLEAN NOT NULL DEFAULT FALSE,
          is_read BOOLEAN NOT NULL DEFAULT FALSE,
          is_auto_response BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (ticket_id) REFERENCES support_tickets(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);
      
      // Return empty results since tables were just created
      return res.status(200).json({
        success: true,
        tickets: [],
        stats: {
          total_tickets: 0,
          active_tickets: 0,
          resolved_tickets: 0,
          unread_messages: 0
        }
      });
    }
    
    // Get all tickets with user info
    const tickets = await query(
      `SELECT t.*, 
        u.name as user_name, 
        u.email as user_email,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id) as message_count,
        (SELECT MAX(created_at) FROM ticket_messages WHERE ticket_id = t.id) as last_message_at,
        (SELECT message FROM ticket_messages WHERE ticket_id = t.id ORDER BY created_at DESC LIMIT 1) as last_message,
        (SELECT COUNT(*) FROM ticket_messages WHERE ticket_id = t.id AND is_admin = 0 AND is_read = 0) as unread_count,
        (SELECT name FROM users WHERE id = t.assigned_to) as assigned_to_name
      FROM support_tickets t 
      JOIN users u ON t.user_id = u.id
      ORDER BY 
        FIELD(t.status, 'awaiting_reply', 'open', 'in_progress', 'resolved', 'closed'),
        t.updated_at DESC`
    );
    
    // Get summary statistics
    const stats = await query(`
      SELECT 
        COUNT(*) as total_tickets,
        SUM(CASE WHEN status IN ('open', 'awaiting_reply', 'in_progress') THEN 1 ELSE 0 END) as active_tickets,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_tickets,
        (SELECT COUNT(*) FROM ticket_messages WHERE is_admin = 0 AND is_read = 0) as unread_messages
      FROM support_tickets
    `);
    
    res.status(200).json({
      success: true,
      tickets,
      stats: stats[0]
    });
  } catch (error) {
    console.error('Admin get all tickets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching tickets: ' + error.message
    });
  }
};

// Get ticket details (admin only)
exports.getTicketDetailsAdmin = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Get ticket with user info
    const tickets = await query(
      `SELECT t.*, u.name as user_name, u.email as user_email
      FROM support_tickets t
      JOIN users u ON t.user_id = u.id
      WHERE t.id = ?`,
      [ticketId]
    );
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    const ticket = tickets[0];
    
    // Get messages
    const messages = await query(
      `SELECT m.*, u.name as user_name 
      FROM ticket_messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.ticket_id = ?
      ORDER BY m.created_at ASC`,
      [ticketId]
    );
    
    // Get related order if exists
    let orderDetails = null;
    if (ticket.order_id) {
      const orders = await query(
        `SELECT o.*, u.name as user_name, u.email as user_email
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?`,
        [ticket.order_id]
      );
      
      if (orders.length > 0) {
        orderDetails = orders[0];
      }
    }
    
    // Mark all customer messages as read
    await query(
      'UPDATE ticket_messages SET is_read = 1 WHERE ticket_id = ? AND is_admin = 0 AND is_read = 0',
      [ticketId]
    );
    
    res.status(200).json({
      success: true,
      ticket: {
        ...ticket,
        messages,
        orderDetails
      }
    });
  } catch (error) {
    console.error('Admin get ticket details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching ticket details'
    });
  }
};

// Admin reply to ticket
exports.addAdminReply = async (req, res) => {
  try {
    const adminId = req.user.id;
    const ticketId = req.params.id;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message is required'
      });
    }
    
    // Check if ticket exists
    const tickets = await query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Add message
    const messageResult = await query(
      `INSERT INTO ticket_messages (
        ticket_id, user_id, message, is_admin, is_read
      ) VALUES (?, ?, ?, ?, ?)`,
      [
        ticketId,
        adminId,
        message,
        1, // is admin
        0  // not read yet by user
      ]
    );
    
    // Update ticket status, set has_new_message flag, and update timestamp
    await query(
      'UPDATE support_tickets SET status = ?, has_new_message = 1, updated_at = NOW() WHERE id = ?',
      ['open', ticketId]
    );
    
    res.status(201).json({
      success: true,
      message: 'Reply added successfully',
      ticketMessage: {
        id: messageResult.insertId,
        user_id: adminId,
        message,
        is_admin: true,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Admin reply error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding reply'
    });
  }
};

// Update ticket status (admin only)
exports.updateTicketStatus = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['open', 'in_progress', 'awaiting_reply', 'resolved', 'closed'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value'
      });
    }
    
    // Check if ticket exists
    const tickets = await query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // Update ticket status
    await query(
      'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, ticketId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Ticket status updated successfully'
    });
  } catch (error) {
    console.error('Update ticket status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating ticket status'
    });
  }
};

// Assign ticket to admin/agent
exports.assignTicket = async (req, res) => {
  try {
    const ticketId = req.params.id;
    const { assignedTo } = req.body;
    
    // Check if ticket exists
    const tickets = await query('SELECT * FROM support_tickets WHERE id = ?', [ticketId]);
    
    if (tickets.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found'
      });
    }
    
    // If assignedTo is null, unassign the ticket
    if (assignedTo === null) {
      await query(
        'UPDATE support_tickets SET assigned_to = NULL, updated_at = NOW() WHERE id = ?',
        [ticketId]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Ticket unassigned successfully'
      });
    }
    
    // Check if assignedTo is a valid admin user
    const admins = await query(
      'SELECT * FROM users WHERE id = ? AND role = "admin"',
      [assignedTo]
    );
    
    if (admins.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid admin user'
      });
    }
    
    // Assign ticket
    await query(
      'UPDATE support_tickets SET assigned_to = ?, status = "in_progress", updated_at = NOW() WHERE id = ?',
      [assignedTo, ticketId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Ticket assigned successfully',
      assignedTo: {
        id: admins[0].id,
        name: admins[0].name
      }
    });
  } catch (error) {
    console.error('Assign ticket error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning ticket'
    });
  }
};

// Mark conversation as read (admin)
exports.markAsRead = async (req, res) => {
  try {
    const ticketId = req.params.id;
    
    // Mark all customer messages as read
    await query(
      'UPDATE ticket_messages SET is_read = 1 WHERE ticket_id = ? AND is_admin = 0 AND is_read = 0',
      [ticketId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking messages as read'
    });
  }
};

// Update admin activity timestamp
exports.updateAdminActivity = async (req, res) => {
  try {
    const adminId = req.user.id;
    console.log('Updating admin activity for user:', adminId);
    
    // Update last active timestamp
    await query(
      'UPDATE users SET last_active = NOW() WHERE id = ?',
      [adminId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Admin activity updated'
    });
  } catch (error) {
    console.error('Update admin activity error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating activity'
    });
  }
};