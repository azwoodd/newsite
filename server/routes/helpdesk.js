const express = require('express');
const router = express.Router();
const helpdeskController = require('../controllers/helpdeskController');
const authMiddleware = require('../middleware/auth');

// USER ROUTES
// Apply authentication middleware to individual routes
router.post('/user/tickets', authMiddleware.authenticateUser, helpdeskController.createTicket);
router.get('/user/tickets', authMiddleware.authenticateUser, helpdeskController.getUserTickets);
router.get('/user/tickets/:id', authMiddleware.authenticateUser, helpdeskController.getTicketDetails);
router.post('/user/tickets/:id/messages', authMiddleware.authenticateUser, helpdeskController.addMessage);
router.put('/user/tickets/:id/close', authMiddleware.authenticateUser, helpdeskController.closeTicket);
router.put('/user/tickets/:id/reopen', authMiddleware.authenticateUser, helpdeskController.reopenTicket);

// Get admin online status (public endpoint)
router.get('/admin-status', helpdeskController.getAdminStatus);

// ADMIN ROUTES
// Apply admin authentication middleware to individual routes
router.get('/admin/tickets', authMiddleware.authenticateAdmin, helpdeskController.getAllTickets);
router.get('/admin/tickets/:id', authMiddleware.authenticateAdmin, helpdeskController.getTicketDetailsAdmin);
router.post('/admin/tickets/:id/messages', authMiddleware.authenticateAdmin, helpdeskController.addAdminReply);
router.put('/admin/tickets/:id/status', authMiddleware.authenticateAdmin, helpdeskController.updateTicketStatus);
router.put('/admin/tickets/:id/assign', authMiddleware.authenticateAdmin, helpdeskController.assignTicket);
router.put('/admin/tickets/:id/read', authMiddleware.authenticateAdmin, helpdeskController.markAsRead);
router.put('/admin/update-activity', authMiddleware.authenticateAdmin, helpdeskController.updateAdminActivity);

module.exports = router;