import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { helpdeskService } from '../services/api';
import webSocketService from '../utils/websocket';

// Message Component
const Message = ({ message, isUser }) => {
  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div 
        className={`max-w-[85%] py-2 px-4 rounded-lg ${
          isUser 
            ? 'bg-accent/20 text-white rounded-tr-none' 
            : 'bg-white/10 text-white rounded-tl-none'
        }`}
      >
        {message.message}
        <div className="text-xs text-white/50 mt-1 text-right">
          {formatTime(message.created_at)}
          {message.is_auto_response && <span className="ml-2">(Auto)</span>}
        </div>
      </div>
    </div>
  );
};

// Admin Status Indicator
const AdminStatusIndicator = ({ isOnline }) => {
  return (
    <div className="flex items-center mb-4">
      <div className={`w-3 h-3 rounded-full mr-2 ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
      <span className="text-sm">
        {isOnline ? 'Support is online' : 'Support may be delayed'}
      </span>
    </div>
  );
};

// Create Ticket Form
const CreateTicketForm = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
    priority: 'medium',
    category: 'other'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white/5 rounded-lg p-4">
      <h3 className="text-lg font-semibold mb-4">Create New Support Ticket</h3>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Subject</label>
        <input
          type="text"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          placeholder="Brief description of your issue"
          required
          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
        />
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">Message</label>
        <textarea
          name="message"
          value={formData.message}
          onChange={handleChange}
          placeholder="Describe your issue in detail"
          required
          rows="4"
          className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent resize-none"
        ></textarea>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-1">Priority</label>
          <select
            name="priority"
            value={formData.priority}
            onChange={handleChange}
            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
          >
            <option value="billing">Billing</option>
            <option value="technical">Technical</option>
            <option value="order">Order</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-white/20 rounded-lg hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors flex items-center"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            'Submit Ticket'
          )}
        </button>
      </div>
    </form>
  );
};

// Ticket List Item Component
const TicketItem = ({ ticket, active, onClick }) => {
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 1) {
      return 'Today, ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/20 text-blue-300';
      case 'awaiting_reply':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'in_progress':
        return 'bg-purple-500/20 text-purple-300';
      case 'resolved':
        return 'bg-green-500/20 text-green-300';
      case 'closed':
        return 'bg-gray-500/20 text-gray-300';
      default:
        return 'bg-white/20 text-white';
    }
  };

  return (
    <div 
      className={`p-3 border-b border-white/10 cursor-pointer ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
      onClick={() => onClick(ticket.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="font-medium">{ticket.subject}</div>
        <div className="text-xs text-light-muted">
          {formatDate(ticket.updated_at)}
        </div>
      </div>
      
      <div className="flex justify-between items-center">
        <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
          {ticket.status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}
        </div>
        
        {ticket.unread_count > 0 && (
          <div className="bg-accent text-dark rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
            {ticket.unread_count}
          </div>
        )}
      </div>
    </div>
  );
};

const HelpDeskWidget = () => {
  const { currentUser } = useAuth();
  const [view, setView] = useState('list'); // list, chat, create
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [adminStatus, setAdminStatus] = useState({ isOnline: false });
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Connect to WebSocket
  useEffect(() => {
    if (!currentUser) return;
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found for WebSocket connection');
      setError('Authentication error. Please try logging in again.');
      return;
    }
    
    // Connect to WebSocket
    webSocketService.connect(token, currentUser.id, false)
      .then(() => {
        console.log('WebSocket connected successfully');
        setWsConnected(true);
        
        // Start ping interval to keep connection alive
        webSocketService.startPingInterval();
      })
      .catch(error => {
        console.error('Failed to connect to WebSocket:', error);
        setError('Failed to establish connection with support server.');
      });
    
    // Cleanup function
    return () => {
      webSocketService.stopPingInterval();
    };
  }, [currentUser]);
  
  // WebSocket message handler
  const handleWsMessage = useCallback((data) => {
    console.log('WebSocket message received in component:', data);
    
    switch (data.type) {
      case 'message':
        // Add message to chat if it belongs to the active ticket
        if (activeTicket && data.conversationId === activeTicket.id) {
          // Check if this is a duplicate message (we might have added it optimistically)
          const isDuplicate = messages.some(msg => 
            (msg.id && msg.id === data.message.id) || 
            (msg.message === data.message.message && 
             Math.abs(new Date(msg.created_at) - new Date(data.message.created_at)) < 5000)
          );
          
          if (!isDuplicate) {
            setMessages(prev => [...prev, data.message]);
          }
          
          // If this is the active ticket, mark message as read
          webSocketService.send('mark_read', {
            ticketId: activeTicket.id
          });
        }
        
        // Update ticket list
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === data.conversationId) {
            return {
              ...ticket,
              last_message: data.message.message,
              last_message_at: data.message.created_at,
              unread_count: activeTicket && activeTicket.id === data.conversationId ? 0 : (ticket.unread_count || 0) + 1
            };
          }
          return ticket;
        }));
        break;
        
      case 'admin_status':
        setAdminStatus({
          isOnline: data.isOnline,
          lastActiveTime: data.lastActiveTime
        });
        break;
        
      case 'ticket_status':
        // Update ticket status
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === data.ticketId) {
            return { ...ticket, status: data.status };
          }
          return ticket;
        }));
        
        // If this is the active ticket, update its status
        if (activeTicket && activeTicket.id === data.ticketId) {
          setActiveTicket(prev => ({ ...prev, status: data.status }));
        }
        break;
        
      case 'message_sent':
        // Message confirmation - update sending state
        setSendingMessage(false);
        break;
        
      case 'auth_success':
        setWsConnected(true);
        break;
        
      case 'error':
        console.error('WebSocket error:', data.message);
        setError(data.message);
        break;
    }
  }, [activeTicket, messages]);
  
  // Set up WebSocket event listeners
  useEffect(() => {
    webSocketService.addEventListener('message', handleWsMessage);
    
    webSocketService.addEventListener('connect', () => {
      setWsConnected(true);
    });
    
    webSocketService.addEventListener('disconnect', () => {
      setWsConnected(false);
    });
    
    // Cleanup
    return () => {
      webSocketService.removeEventListener('message', handleWsMessage);
      webSocketService.removeEventListener('connect', () => {});
      webSocketService.removeEventListener('disconnect', () => {});
    };
  }, [handleWsMessage]);
  
  // Update active ticket WebSocket listener
  useEffect(() => {
    // If active ticket changes, mark messages as read
    if (activeTicket && webSocketService.isConnected) {
      webSocketService.send('mark_read', {
        ticketId: activeTicket.id
      });
    }
  }, [activeTicket]);
  
  // Fetch tickets on component mount
  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      checkAdminStatus();
    }
  }, [currentUser]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Fetch admin online status
  const checkAdminStatus = async () => {
    try {
      const res = await helpdeskService.getAdminStatus();
      setAdminStatus({
        isOnline: res.data.isAdminOnline,
        lastActiveTime: res.data.lastActiveTime
      });
    } catch (error) {
      console.error('Error checking admin status:', error);
    }
  };
  
  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await helpdeskService.getUserTickets();
      if (res.data.success !== false) {
        setTickets(res.data.tickets || []);
      } else {
        setError(res.data.message || 'Failed to load tickets');
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setError('Failed to load tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch ticket details
  const fetchTicketDetails = async (ticketId) => {
    try {
      setLoading(true);
      const res = await helpdeskService.getTicketDetails(ticketId);
      if (res.data.success !== false) {
        setActiveTicket(res.data.ticket);
        setMessages(res.data.ticket.messages || []);
        setView('chat');
      } else {
        setError(res.data.message || 'Failed to load ticket details');
      }
    } catch (error) {
      console.error('Error fetching ticket details:', error);
      setError('Failed to load ticket details. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Create new ticket
  const handleCreateTicket = async (formData) => {
    try {
      setLoading(true);
      const res = await helpdeskService.createTicket(formData);
      
      if (res.data.success !== false) {
        // Add new ticket to list
        setTickets(prev => [res.data.ticket, ...prev]);
        
        // Fetch the new ticket details to open the chat
        await fetchTicketDetails(res.data.ticket.id);
        
        // Reset form and go to chat view
        setView('chat');
      } else {
        setError(res.data.message || 'Failed to create ticket');
      }
    } catch (error) {
      console.error('Error creating ticket:', error);
      setError('Failed to create ticket. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Send message
  const handleSendMessage = async () => {
    if (!activeTicket || !inputValue.trim()) return;
    
    try {
      setSendingMessage(true);
      
      // Add message to UI immediately (optimistic update)
      const tempMessage = {
        id: `temp-${Date.now()}`, // Temporary ID
        ticket_id: activeTicket.id,
        user_id: currentUser.id,
        user_name: currentUser.name,
        message: inputValue.trim(),
        is_admin: false,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      // Save the message content and clear input immediately
      const messageText = inputValue.trim();
      setInputValue('');
      
      // Try to send via WebSocket first
      let sent = false;
      if (webSocketService.isConnected) {
        sent = webSocketService.send('message', {
          conversationId: activeTicket.id,
          content: messageText
        });
      }
      
      // Fall back to REST API if WebSocket fails
      if (!sent) {
        const res = await helpdeskService.addMessage(activeTicket.id, messageText);
        
        if (res.data.success === false) {
          throw new Error(res.data.message || 'Failed to send message');
        }
      }
      
      // Update the ticket in the list with the new message
      setTickets(prev => prev.map(ticket => {
        if (ticket.id === activeTicket.id) {
          return {
            ...ticket,
            last_message: messageText,
            last_message_at: new Date().toISOString()
          };
        }
        return ticket;
      }));
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message
      setMessages(prev => prev.filter(m => m.id !== `temp-${Date.now()}`));
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Close ticket
  const handleCloseTicket = async () => {
    try {
      const res = await helpdeskService.closeTicket(activeTicket.id);
      
      if (res.data.success !== false) {
        // Update ticket in state
        setActiveTicket(prev => ({ ...prev, status: 'closed' }));
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === activeTicket.id) {
            return { ...ticket, status: 'closed' };
          }
          return ticket;
        }));
      } else {
        setError(res.data.message || 'Failed to close ticket');
      }
    } catch (error) {
      console.error('Error closing ticket:', error);
      setError('Failed to close ticket. Please try again.');
    }
  };
  
  // Reopen ticket
  const handleReopenTicket = async () => {
    try {
      const res = await helpdeskService.reopenTicket(activeTicket.id);
      
      if (res.data.success !== false) {
        // Update ticket in state
        setActiveTicket(prev => ({ ...prev, status: 'open' }));
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === activeTicket.id) {
            return { ...ticket, status: 'open' };
          }
          return ticket;
        }));
      } else {
        setError(res.data.message || 'Failed to reopen ticket');
      }
    } catch (error) {
      console.error('Error reopening ticket:', error);
      setError('Failed to reopen ticket. Please try again.');
    }
  };
  
  // Handle key press in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Get number of unread messages across all tickets
  const getTotalUnreadCount = () => {
    return tickets.reduce((total, ticket) => total + (ticket.unread_count || 0), 0);
  };
  
  // Get ticket status display name
  const getStatusName = (status) => {
    return status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase());
  };
  
  // Create a new ticket button
  const CreateTicketButton = () => (
    <button
      onClick={() => setView('create')}
      className="bg-accent text-dark rounded-lg px-4 py-2 font-medium hover:bg-accent-alt transition-colors flex items-center"
    >
      <i className="fas fa-plus mr-2"></i>
      New Ticket
    </button>
  );

  if (!currentUser) {
    return (
      <div className="bg-white/5 rounded-lg p-6 text-center">
        <p>Please log in to access support.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-lg border border-white/10 h-full">
      {/* Header Bar */}
      <div className="p-4 border-b border-white/10 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-xl font-semibold font-secondary">Help Desk</h2>
          {getTotalUnreadCount() > 0 && (
            <div className="ml-2 bg-accent text-dark rounded-full h-5 w-5 flex items-center justify-center text-xs font-medium">
              {getTotalUnreadCount()}
            </div>
          )}
        </div>
        
        {view === 'list' && <CreateTicketButton />}
        
        {view === 'chat' && (
          <button
            onClick={() => setView('list')}
            className="text-light-muted hover:text-white transition-colors"
          >
            <i className="fas fa-chevron-left mr-1"></i>
            Back to List
          </button>
        )}
        
        {view === 'create' && (
          <button
            onClick={() => setView('list')}
            className="text-light-muted hover:text-white transition-colors"
          >
            <i className="fas fa-times mr-1"></i>
            Cancel
          </button>
        )}
      </div>
      
      {/* Connection Status */}
      {!wsConnected && (
        <div className="mx-4 mt-4 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-md text-sm text-yellow-300 flex items-center">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Waiting for real-time connection...
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-2 bg-romantic/10 border border-romantic rounded-md text-sm">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
          <button 
            onClick={() => setError(null)} 
            className="float-right text-light-muted hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}
      
      {/* Main Content */}
      <div className="p-4">
        {/* Loading Indicator */}
        {loading && (
          <div className="flex justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-accent"></div>
          </div>
        )}
        
        {/* Ticket List View */}
        {view === 'list' && !loading && (
          <div>
            {tickets.length === 0 ? (
              <div className="text-center p-8">
                <p className="text-light-muted mb-4">You don't have any support tickets yet.</p>
                <CreateTicketButton />
              </div>
            ) : (
              <div className="divide-y divide-white/10 max-h-[60vh] overflow-y-auto">
                {tickets.map(ticket => (
                  <TicketItem 
                    key={ticket.id} 
                    ticket={ticket} 
                    active={activeTicket?.id === ticket.id}
                    onClick={fetchTicketDetails}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Create Ticket View */}
        {view === 'create' && (
          <CreateTicketForm 
            onSubmit={handleCreateTicket} 
            onCancel={() => setView('list')} 
            loading={loading}
          />
        )}
        
        {/* Chat View */}
        {view === 'chat' && activeTicket && (
          <div>
            {/* Ticket Info */}
            <div className="mb-4 p-3 bg-white/5 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold">{activeTicket.subject}</h3>
                <div className={`text-xs px-2 py-1 rounded-full ${
                  activeTicket.status === 'open' ? 'bg-blue-500/20 text-blue-300' :
                  activeTicket.status === 'awaiting_reply' ? 'bg-yellow-500/20 text-yellow-300' :
                  activeTicket.status === 'in_progress' ? 'bg-purple-500/20 text-purple-300' :
                  activeTicket.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                  'bg-gray-500/20 text-gray-300'
                }`}>
                  {getStatusName(activeTicket.status)}
                </div>
              </div>
              
              <div className="text-sm text-light-muted mb-2">
                <span className="mr-4">Created: {new Date(activeTicket.created_at).toLocaleDateString()}</span>
                <span>Priority: {activeTicket.priority.charAt(0).toUpperCase() + activeTicket.priority.slice(1)}</span>
              </div>
              
              <AdminStatusIndicator isOnline={adminStatus.isOnline} />
              
              {/* Ticket Actions */}
              <div className="mt-2 flex justify-end space-x-2">
                {(activeTicket.status === 'closed' || activeTicket.status === 'resolved') ? (
                  <button
                    onClick={handleReopenTicket}
                    className="text-xs px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full hover:bg-blue-500/30 transition-colors"
                  >
                    <i className="fas fa-redo-alt mr-1"></i>
                    Reopen Ticket
                  </button>
                ) : (
                  <button
                    onClick={handleCloseTicket}
                    className="text-xs px-3 py-1 bg-gray-500/20 text-gray-300 rounded-full hover:bg-gray-500/30 transition-colors"
                  >
                    <i className="fas fa-times-circle mr-1"></i>
                    Close Ticket
                  </button>
                )}
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="h-[40vh] overflow-y-auto p-3 bg-white/5 rounded-lg">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full text-light-muted">
                  <p>No messages yet.</p>
                </div>
              ) : (
                <div>
                  {messages.map((message, index) => (
                    <Message
                      key={message.id || index}
                      message={message}
                      isUser={!message.is_admin}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            
            {/* Input Area - disabled if ticket is closed */}
            <div className="mt-4">
              <div className="flex">
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    activeTicket.status === 'closed' || activeTicket.status === 'resolved'
                      ? "This ticket is closed. Reopen it to send a message."
                      : "Type your message here..."
                  }
                  disabled={activeTicket.status === 'closed' || activeTicket.status === 'resolved' || sendingMessage}
                  rows="3"
                  className="flex-grow p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent resize-none disabled:opacity-60 disabled:cursor-not-allowed"
                ></textarea>
                
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || activeTicket.status === 'closed' || activeTicket.status === 'resolved' || sendingMessage}
                  className="ml-2 bg-accent text-dark rounded-lg px-4 self-end hover:bg-accent-alt transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {sendingMessage ? (
                    <i className="fas fa-spinner fa-spin"></i>
                  ) : (
                    <i className="fas fa-paper-plane"></i>
                  )}
                </button>
              </div>
              
              {(activeTicket.status === 'closed' || activeTicket.status === 'resolved') && (
                <div className="mt-2 text-xs text-center text-light-muted">
                  This ticket is closed. Reopen it to send a message.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpDeskWidget;