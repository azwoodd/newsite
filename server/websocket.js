const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const { query } = require('./config/db');

// Initialize WebSocket server
const initWebSocket = (server) => {
  const wss = new WebSocket.Server({ 
    server,
    path: '/ws/helpdesk'
  });
  
  console.log('WebSocket server initialized');
  
  // Store active connections
  const clients = new Map();
  const adminClients = new Map();
  
  // Connection handler
  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    
    // Set initial connection state
    ws.isAlive = true;
    ws.userId = null;
    ws.isAdmin = false;
    ws.isAuthenticated = false;
    
    // Ping to keep connection alive
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    // Message handler
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        console.log('WebSocket message received:', data.type);
        
        // Handle different message types
        switch (data.type) {
          case 'authenticate':
            // Authenticate the connection
            if (data.data && data.data.token) {
              try {
                // Verify JWT token
                const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_dev';
                console.log('Verifying token with secret:', JWT_SECRET ? '[SECRET PRESENT]' : '[SECRET MISSING]');
                
                const decoded = jwt.verify(
                  data.data.token, 
                  JWT_SECRET
                );
                
                // Set user ID and admin status
                ws.userId = decoded.id;
                ws.isAdmin = decoded.role === 'admin';
                ws.isAuthenticated = true;
                
                console.log(`User authenticated: ${ws.userId}, isAdmin: ${ws.isAdmin}`);
                
                // Save connection in appropriate map
                if (ws.isAdmin) {
                  adminClients.set(ws.userId, ws);
                  
                  // Update admin's last active timestamp in database
                  await query(
                    'UPDATE users SET last_active = NOW() WHERE id = ?',
                    [ws.userId]
                  );
                  
                  // Broadcast admin online status to all user clients
                  broadcastAdminStatus(true);
                } else {
                  clients.set(ws.userId, ws);
                }
                
                // Send acknowledgment
                ws.send(JSON.stringify({
                  type: 'auth_success',
                  userId: ws.userId,
                  isAdmin: ws.isAdmin
                }));
              } catch (err) {
                console.error('Authentication error:', err);
                ws.send(JSON.stringify({
                  type: 'auth_error',
                  message: 'Invalid authentication token'
                }));
              }
            } else {
              console.error('Authentication failed: Missing token');
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'Missing authentication token'
              }));
            }
            break;
            
          case 'message':
            // Handle new message from user
            if (!ws.isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }
            
            // Validate message data
            if (!data.data || !data.data.content || !data.data.conversationId) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Invalid message data'
              }));
              return;
            }
            
            // Handle message with high priority
            handleMessageFast(ws, data.data);
            break;
            
          case 'ticket_status':
            // Handle ticket status update (admin only)
            if (!ws.isAuthenticated || !ws.isAdmin) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized'
              }));
              return;
            }
            
            try {
              const { ticketId, status } = data.data;
              
              // Update ticket status
              await query(
                'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
                [status, ticketId]
              );
              
              // Notify the ticket owner
              const tickets = await query(
                'SELECT user_id FROM support_tickets WHERE id = ?',
                [ticketId]
              );
              
              if (tickets.length > 0) {
                const userId = tickets[0].user_id;
                const userWs = clients.get(userId);
                
                if (userWs && userWs.readyState === WebSocket.OPEN) {
                  userWs.send(JSON.stringify({
                    type: 'ticket_status',
                    ticketId,
                    status
                  }));
                }
              }
              
              // Broadcast to other admins
              for (const [adminId, adminWs] of adminClients.entries()) {
                if (adminId !== ws.userId && adminWs.readyState === WebSocket.OPEN) {
                  adminWs.send(JSON.stringify({
                    type: 'ticket_status',
                    ticketId,
                    status
                  }));
                }
              }
            } catch (err) {
              console.error('Error updating ticket status:', err);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Error updating ticket status'
              }));
            }
            break;
            
          case 'assign_ticket':
            // Handle ticket assignment (admin only)
            if (!ws.isAuthenticated || !ws.isAdmin) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized'
              }));
              return;
            }
            
            try {
              const { ticketId, assignedTo } = data.data;
              
              // Update ticket assignment
              await query(
                'UPDATE support_tickets SET assigned_to = ?, status = "in_progress", updated_at = NOW() WHERE id = ?',
                [assignedTo, ticketId]
              );
              
              // Get assigned admin name
              let assignedName = null;
              if (assignedTo) {
                const admins = await query(
                  'SELECT name FROM users WHERE id = ?',
                  [assignedTo]
                );
                
                if (admins.length > 0) {
                  assignedName = admins[0].name;
                }
              }
              
              // Broadcast to all admins
              for (const [adminId, adminWs] of adminClients.entries()) {
                if (adminWs.readyState === WebSocket.OPEN) {
                  adminWs.send(JSON.stringify({
                    type: 'ticket_assigned',
                    ticketId,
                    assignedTo,
                    assignedName
                  }));
                }
              }
            } catch (err) {
              console.error('Error assigning ticket:', err);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Error assigning ticket'
              }));
            }
            break;
            
          case 'admin_status':
            // Handle admin status update (admin only)
            if (!ws.isAuthenticated || !ws.isAdmin) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Unauthorized'
              }));
              return;
            }
            
            try {
              const { isOnline } = data.data;
              
              // Update admin status in database
              await query(
                'UPDATE users SET last_active = NOW() WHERE id = ?',
                [ws.userId]
              );
              
              // Broadcast admin status to all users
              broadcastAdminStatus(isOnline);
            } catch (err) {
              console.error('Error updating admin status:', err);
            }
            break;
            
          case 'mark_read':
            // Mark messages as read
            if (!ws.isAuthenticated) {
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Not authenticated'
              }));
              return;
            }
            
            try {
              const { ticketId } = data.data;
              
              // Mark messages as read based on who is marking them
              if (ws.isAdmin) {
                // Admin is marking user messages as read
                await query(
                  'UPDATE ticket_messages SET is_read = 1 WHERE ticket_id = ? AND is_admin = 0 AND is_read = 0',
                  [ticketId]
                );
              } else {
                // User is marking admin messages as read
                await query(
                  'UPDATE ticket_messages SET is_read = 1 WHERE ticket_id = ? AND is_admin = 1 AND is_read = 0',
                  [ticketId]
                );
                
                // Clear new message flag on ticket
                await query(
                  'UPDATE support_tickets SET has_new_message = 0 WHERE id = ?',
                  [ticketId]
                );
              }
            } catch (err) {
              console.error('Error marking messages as read:', err);
            }
            break;
            
          case 'ping':
            // Simple ping to keep connection alive
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
            
          default:
            console.log('Unknown message type:', data.type);
        }
      } catch (err) {
        console.error('Error processing WebSocket message:', err);
      }
    });
    
    // Handle connection close
    ws.on('close', async () => {
      console.log(`WebSocket connection closed for user ${ws.userId}`);
      
      if (ws.userId) {
        if (ws.isAdmin) {
          adminClients.delete(ws.userId);
          
          // If this was the last admin, update status
          if (adminClients.size === 0) {
            broadcastAdminStatus(false);
          }
        } else {
          clients.delete(ws.userId);
        }
      }
    });
    
    // Handle errors
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });
  
  // Optimized message handling function
  const handleMessageFast = async (ws, data) => {
    try {
      const ticketId = data.conversationId;
      const content = data.content;
      
      // Check if ticket exists and user has access - do this in parallel with other operations
      const ticketCheckPromise = query(
        'SELECT * FROM support_tickets WHERE id = ? AND (user_id = ? OR ? = 1)',
        [ticketId, ws.userId, ws.isAdmin ? 1 : 0]
      );
      
      // Get user name - also in parallel
      const userNamePromise = query(
        'SELECT name FROM users WHERE id = ?',
        [ws.userId]
      );
      
      // Start saving message to database immediately
      const messagePromise = query(
        `INSERT INTO ticket_messages (
          ticket_id, user_id, message, is_admin, is_read
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          ticketId,
          ws.userId,
          content,
          ws.isAdmin ? 1 : 0, // is_admin
          0 // not read
        ]
      );
      
      // Wait for ticket check before proceeding
      const tickets = await ticketCheckPromise;
      
      if (tickets.length === 0) {
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Ticket not found or access denied'
        }));
        return;
      }
      
      // Wait for message to be saved - we need the ID
      const messageResult = await messagePromise;
      const messageId = messageResult.insertId;
      
      // Get user name result
      const users = await userNamePromise;
      const userName = users.length > 0 ? users[0].name : 'Unknown User';
      
      // Create message object for broadcasting - immediately after we have the message ID
      const newMessage = {
        id: messageId,
        ticket_id: ticketId,
        user_id: ws.userId,
        user_name: userName,
        message: content,
        is_admin: ws.isAdmin,
        is_read: false,
        created_at: new Date()
      };
      
      // Send to the appropriate recipient(s) immediately
      if (ws.isAdmin) {
        // Admin to user
        const userId = tickets[0].user_id;
        const userWs = clients.get(userId);
        
        if (userWs && userWs.readyState === WebSocket.OPEN) {
          userWs.send(JSON.stringify({
            type: 'message',
            conversationId: ticketId,
            message: newMessage
          }));
        }
      } else {
        // User to admin(s)
        // If the ticket is assigned, send only to that admin for faster delivery
        if (tickets[0].assigned_to) {
          const adminWs = adminClients.get(tickets[0].assigned_to);
          
          if (adminWs && adminWs.readyState === WebSocket.OPEN) {
            adminWs.send(JSON.stringify({
              type: 'message',
              conversationId: ticketId,
              message: newMessage
            }));
          }
        } else {
          // Otherwise, broadcast to all admins in parallel
          for (const [adminId, adminWs] of adminClients.entries()) {
            if (adminWs.readyState === WebSocket.OPEN) {
              // Don't wait for it, just send
              try {
                adminWs.send(JSON.stringify({
                  type: 'message',
                  conversationId: ticketId,
                  message: newMessage
                }));
              } catch (err) {
                console.error(`Error sending to admin ${adminId}:`, err);
              }
            }
          }
        }
      }
      
      // Update ticket status in parallel (after the message is delivered)
      if (ws.isAdmin) {
        // Don't await this - do it in the background
        query(
          'UPDATE support_tickets SET status = ?, has_new_message = 1, updated_at = NOW() WHERE id = ?',
          ['open', ticketId]
        ).catch(err => {
          console.error('Error updating ticket status:', err);
        });
      } else {
        // Don't await this either
        query(
          'UPDATE support_tickets SET status = ?, updated_at = NOW() WHERE id = ?',
          ['awaiting_reply', ticketId]
        ).catch(err => {
          console.error('Error updating ticket status:', err);
        });
      }
      
      // Send confirmation to sender
      ws.send(JSON.stringify({
        type: 'message_sent',
        conversationId: ticketId,
        messageId: messageId
      }));
    } catch (err) {
      console.error('Error in handleMessageFast:', err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Error processing message'
      }));
    }
  };
  
  // Broadcast admin online status to all user clients
  const broadcastAdminStatus = async (isOnline) => {
    try {
      // Get the most recent admin last active time
      const lastActive = await query(
        `SELECT last_active FROM users 
        WHERE role = 'admin' 
        ORDER BY last_active DESC 
        LIMIT 1`
      );
      
      const lastActiveTime = lastActive.length > 0 ? lastActive[0].last_active : null;
      
      // Broadcast to all user clients
      for (const [userId, client] of clients.entries()) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: 'admin_status',
            isOnline,
            lastActiveTime
          }));
        }
      }
    } catch (err) {
      console.error('Error broadcasting admin status:', err);
    }
  };
  
  // Interval to check for dead connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        return ws.terminate();
      }
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000); // Check every 30 seconds
  
  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  return wss;
};

module.exports = { initWebSocket };