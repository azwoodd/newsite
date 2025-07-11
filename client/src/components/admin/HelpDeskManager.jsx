import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import adminHelpdeskService from '../../services/adminHelpdeskService';
import webSocketService from '../../utils/websocket';

// Conversation item component
const ConversationItem = ({ ticket, isActive, onClick, unreadCount, currentUser }) => {
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffHours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
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
      className={`p-3 border-b border-white/10 cursor-pointer transition-colors ${
        isActive ? 'bg-accent/10' : 'hover:bg-white/5'
      }`}
      onClick={() => onClick(ticket.id)}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium truncate max-w-[70%]">{ticket.subject}</div>
        <div className="text-xs text-light-muted flex-shrink-0">
          {formatTimestamp(ticket.last_message_at || ticket.updated_at)}
        </div>
      </div>
      
      <div className="text-sm text-light-muted truncate mb-2">{ticket.last_message || 'No messages yet'}</div>
      
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className={`text-xs px-2 py-1 rounded-full ${getStatusColor(ticket.status)}`}>
            {ticket.status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}
          </div>
          
          {ticket.assigned_to && (
            <div className="text-xs px-2 py-1 bg-accent/20 text-accent rounded-full">
              <i className="fas fa-user-check mr-1"></i>
              {ticket.assigned_to === currentUser?.id ? 'You' : ticket.assigned_to_name}
            </div>
          )}
        </div>
        
        {unreadCount > 0 && (
          <div className="bg-accent text-dark text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </div>
    </div>
  );
};

// Message component
const Message = ({ message, currentUserId }) => {
  const isAdmin = message.is_admin;
  
  // Format timestamp
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  return (
    <div className={`flex ${isAdmin ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-[75%] p-3 rounded-lg ${
          isAdmin 
            ? 'bg-accent/20 text-white rounded-tr-none' 
            : 'bg-white/10 text-white rounded-tl-none'
        }`}
      >
        <div className="text-xs text-white/50 mb-1">
          {message.user_name} {message.is_auto_response && <span>(Auto)</span>}
        </div>
        <div className="mb-1">{message.message}</div>
        <div className="text-xs text-white/50 text-right">
          {formatTimestamp(message.created_at)}
        </div>
      </div>
    </div>
  );
};

// Quick reply component
const QuickReply = ({ text, onClick }) => {
  return (
    <button
      onClick={() => onClick(text)}
      className="px-3 py-1 bg-white/10 rounded-full text-sm hover:bg-white/20 transition-colors mr-2 mb-2"
    >
      {text}
    </button>
  );
};

// Main component
const HelpDeskManager = () => {
  const { currentUser } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [filter, setFilter] = useState('active');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [stats, setStats] = useState({
    totalTickets: 0,
    activeTickets: 0,
    resolvedTickets: 0,
    unreadMessages: 0
  });
  const messagesEndRef = useRef(null);
  const ticketsPollingRef = useRef(null);
  
  // Preset quick replies
  const quickReplies = [
    "Hi there! How can I help you today?",
    "Thanks for reaching out. I'm looking into your ticket now.",
    "Your song is in progress and should be ready in about 2-3 days.",
    "We've received your feedback and are making adjustments to your song.",
    "Is there anything else I can help you with?"
  ];
  
  // Handlers for WebSocket events
  const handleWsMessage = useCallback((data) => {
    console.log('WebSocket message received in admin component:', data);
    
    switch (data.type) {
      case 'message':
        // Add message to chat if it belongs to the active ticket
        if (activeTicket && data.conversationId === activeTicket.id) {
          // Check if message is already in the list (for deduplication)
          const isDuplicate = messages.some(msg => 
            (msg.id && msg.id === data.message.id) || 
            (msg.message === data.message.message && 
             Math.abs(new Date(msg.created_at) - new Date(data.message.created_at)) < 5000)
          );
          
          if (!isDuplicate) {
            console.log('Adding message to active ticket chat:', data.message);
            setMessages(prev => [...prev, data.message]);
          }
          
          // If this is the active ticket, mark message as read
          webSocketService.send('mark_read', {
            ticketId: activeTicket.id
          });
        }
        
        // Update ticket list - this happens even if it's not the active ticket
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === data.conversationId) {
            console.log('Updating ticket in list with new message:', ticket.id);
            return {
              ...ticket,
              last_message: data.message.message,
              last_message_at: data.message.created_at,
              unread_count: activeTicket && activeTicket.id === data.conversationId ? 0 : (ticket.unread_count || 0) + 1
            };
          }
          return ticket;
        }));
        
        // Update stats
        setStats(prev => ({
          ...prev,
          unreadMessages: prev.unreadMessages + (activeTicket?.id === data.conversationId ? 0 : 1)
        }));
        
        // Scroll to bottom if it's the active ticket
        if (activeTicket && data.conversationId === activeTicket.id) {
          setTimeout(() => {
            if (messagesEndRef.current) {
              messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
            }
          }, 50);
        }
        break;
        
      case 'ticket_assigned':
        // Update ticket assignment
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === data.ticketId) {
            console.log('Updating ticket assignment:', ticket.id, data.assignedTo);
            return {
              ...ticket,
              assigned_to: data.assignedTo,
              assigned_to_name: data.assignedName
            };
          }
          return ticket;
        }));
        
        // If this is the active ticket, update its assignment
        if (activeTicket && activeTicket.id === data.ticketId) {
          console.log('Updating active ticket assignment:', data.assignedTo);
          setActiveTicket(prev => ({
            ...prev,
            assigned_to: data.assignedTo,
            assigned_to_name: data.assignedName
          }));
        }
        break;
        
      case 'ticket_status':
        // Update ticket status
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === data.ticketId) {
            console.log('Updating ticket status:', ticket.id, data.status);
            return { ...ticket, status: data.status };
          }
          return ticket;
        }));
        
        // If this is the active ticket, update its status
        if (activeTicket && activeTicket.id === data.ticketId) {
          console.log('Updating active ticket status:', data.status);
          setActiveTicket(prev => ({ ...prev, status: data.status }));
        }
        break;
        
      case 'auth_success':
        console.log('WebSocket auth successful, online status:', isOnline);
        setWsConnected(true);
        
        // Send admin status update after successful auth
        webSocketService.send('admin_status', {
          isOnline: isOnline
        });
        break;
        
      case 'message_sent':
        // Message confirmation - update sending state
        setSendingMessage(false);
        break;
        
      case 'error':
        console.error('WebSocket error message:', data.message);
        break;
    }
  }, [activeTicket, messages, isOnline]);
  
  const handleWsConnect = useCallback(() => {
    console.log('WebSocket connected');
    setWsConnected(true);
  }, []);
  
  const handleWsDisconnect = useCallback(() => {
    console.log('WebSocket disconnected');
    setWsConnected(false);
  }, []);
  
  // Connect to WebSocket on component mount
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') return;
    
    console.log('Admin HelpDeskManager: Connecting to WebSocket as admin');
    
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('No token found for WebSocket connection');
      setError('Authentication error. Please try logging in again.');
      return;
    }
    
    // Register event listeners for WebSocket
    webSocketService.addEventListener('message', handleWsMessage);
    webSocketService.addEventListener('connect', handleWsConnect);
    webSocketService.addEventListener('disconnect', handleWsDisconnect);
    
    // Connect to WebSocket
    webSocketService.connect(token, currentUser.id, true)
      .catch(error => {
        console.error('Failed to connect to WebSocket as admin:', error);
        setError('Failed to establish connection with support server.');
      });
    
    // Clean up event listeners on unmount
    return () => {
      webSocketService.removeEventListener('message', handleWsMessage);
      webSocketService.removeEventListener('connect', handleWsConnect);
      webSocketService.removeEventListener('disconnect', handleWsDisconnect);
    };
  }, [currentUser, handleWsMessage, handleWsConnect, handleWsDisconnect]);
  
  // Update active ticket WebSocket listener
  useEffect(() => {
    // If active ticket changes, mark messages as read
    if (activeTicket && webSocketService.isConnected) {
      console.log('Marking messages as read for ticket:', activeTicket.id);
      webSocketService.send('mark_read', {
        ticketId: activeTicket.id
      });
    }
  }, [activeTicket]);
  
  // Set up polling for tickets as a fallback
  useEffect(() => {
    // Function to poll for tickets
    const pollTickets = async () => {
      try {
        console.log('Polling for tickets...');
        const res = await adminHelpdeskService.getAllTickets();
        if (res.data.success !== false) {
          setTickets(res.data.tickets || []);
          setStats({
            totalTickets: res.data.stats.total_tickets,
            activeTickets: res.data.stats.active_tickets,
            resolvedTickets: res.data.stats.resolved_tickets,
            unreadMessages: res.data.stats.unread_messages
          });
        }
      } catch (err) {
        console.error('Error polling tickets:', err);
      }
    };
    
    // Set up polling interval (every 15 seconds)
    ticketsPollingRef.current = setInterval(pollTickets, 15000);
    
    // Clean up on unmount
    return () => {
      if (ticketsPollingRef.current) {
        clearInterval(ticketsPollingRef.current);
      }
    };
  }, []);
  
  // Fetch tickets on component mount
  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      fetchTickets();
      updateAdminActivity();
    }
  }, [currentUser]);
  
  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Update online status
  useEffect(() => {
    if (webSocketService.isConnected) {
      console.log('Sending admin status update:', isOnline);
      webSocketService.send('admin_status', {
        isOnline
      });
    }
    
    updateAdminActivity();
  }, [isOnline]);
  
  // Update admin activity
  const updateAdminActivity = async () => {
    try {
      console.log('Updating admin activity with token:', localStorage.getItem('token') ? 'Token exists' : 'No token');
      const response = await adminHelpdeskService.updateActivity();
      console.log('Admin activity updated:', response.data);
    } catch (err) {
      console.error('Error updating admin activity:', err);
    }
  };
  
  // Fetch tickets
  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      console.log('Fetching all tickets...');
      const res = await adminHelpdeskService.getAllTickets();
      
      if (res.data.success !== false) {
        console.log('Tickets fetched successfully:', res.data.tickets?.length || 0);
        setTickets(res.data.tickets || []);
        
        // Update stats
        setStats({
          totalTickets: res.data.stats.total_tickets,
          activeTickets: res.data.stats.active_tickets,
          resolvedTickets: res.data.stats.resolved_tickets,
          unreadMessages: res.data.stats.unread_messages
        });
      } else {
        setError(res.data.message || 'Failed to load tickets');
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setError('Error fetching tickets. Please check your connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch ticket details
  const fetchTicketDetails = async (ticketId) => {
    try {
      setIsLoading(true);
      console.log('Fetching ticket details:', ticketId);
      const res = await adminHelpdeskService.getTicketDetails(ticketId);
      
      if (res.data.success !== false) {
        console.log('Ticket details fetched successfully:', res.data.ticket);
        setActiveTicket(res.data.ticket);
        setMessages(res.data.ticket.messages || []);
        
        // Mark as read
        await adminHelpdeskService.markAsRead(ticketId);
        
        // Update unread count in tickets list
        setTickets(prev => prev.map(ticket => {
          if (ticket.id === ticketId) {
            return { ...ticket, unread_count: 0 };
          }
          return ticket;
        }));
        
        // Update total unread count in stats
        const unreadCount = tickets.find(t => t.id === ticketId)?.unread_count || 0;
        setStats(prev => ({
          ...prev,
          unreadMessages: Math.max(0, prev.unreadMessages - unreadCount)
        }));
      } else {
        setError(res.data.message || 'Failed to load ticket details');
      }
    } catch (err) {
      console.error('Error fetching ticket details:', err);
      setError('Error loading ticket details. Please try again.');
    } finally {
      setIsLoading(false);
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
        is_admin: true,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, tempMessage]);
      
      const messageText = inputValue.trim();
      setInputValue(''); // Clear input immediately
      
      // Try to send via WebSocket first
      let messageSent = false;
      if (webSocketService.isConnected) {
        console.log('Sending message via WebSocket:', messageText);
        messageSent = webSocketService.send('message', {
          conversationId: activeTicket.id,
          content: messageText
        });
      }
      
      // Fallback to REST API if WebSocket failed
      if (!messageSent) {
        console.log('WebSocket not connected, sending message via REST API');
        const res = await adminHelpdeskService.addReply(activeTicket.id, messageText);
        
        if (res.data.success === false) {
          throw new Error(res.data.message || 'Failed to send message');
        }
      }
      
      // Update ticket in list
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
      
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      
      // Remove the optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== `temp-${Date.now()}`));
    } finally {
      setSendingMessage(false);
    }
  };
  
  // Update ticket status
  const handleUpdateStatus = async (status) => {
    if (!activeTicket) return;
    
    try {
      // Optimistic update
      const oldStatus = activeTicket.status;
      
      // Update in UI first
      setActiveTicket(prev => ({ ...prev, status }));
      setTickets(prev => prev.map(ticket => {
        if (ticket.id === activeTicket.id) {
          return { ...ticket, status };
        }
        return ticket;
      }));
      
      // Also update the stats
      if ((status === 'resolved' || status === 'closed') && 
          (oldStatus !== 'resolved' && oldStatus !== 'closed')) {
        setStats(prev => ({
          ...prev,
          activeTickets: Math.max(0, prev.activeTickets - 1),
          resolvedTickets: prev.resolvedTickets + 1
        }));
      } else if ((status !== 'resolved' && status !== 'closed') && 
                (oldStatus === 'resolved' || oldStatus === 'closed')) {
        setStats(prev => ({
          ...prev,
          activeTickets: prev.activeTickets + 1,
          resolvedTickets: Math.max(0, prev.resolvedTickets - 1)
        }));
      }
      
      // Try WebSocket first
      let statusUpdated = false;
      if (webSocketService.isConnected) {
        statusUpdated = webSocketService.send('ticket_status', {
          ticketId: activeTicket.id,
          status
        });
      }
      
      // Fallback to REST API
      if (!statusUpdated) {
        const res = await adminHelpdeskService.updateTicketStatus(activeTicket.id, status);
        
        if (res.data.success === false) {
          // Rollback on error
          setError(res.data.message || 'Failed to update ticket status');
          setActiveTicket(prev => ({ ...prev, status: oldStatus }));
          setTickets(prev => prev.map(ticket => {
            if (ticket.id === activeTicket.id) {
              return { ...ticket, status: oldStatus };
            }
            return ticket;
          }));
        }
      }
    } catch (err) {
      console.error('Error updating ticket status:', err);
      setError('Failed to update ticket status. Please try again.');
    }
  };
  
  // Assign ticket to self
  const handleAssignToSelf = async () => {
    if (!activeTicket) return;
    
    try {
      // Optimistic update
      setActiveTicket(prev => ({
        ...prev,
        assigned_to: currentUser.id,
        assigned_to_name: currentUser.name,
        status: 'in_progress'
      }));
      
      setTickets(prev => prev.map(ticket => {
        if (ticket.id === activeTicket.id) {
          return {
            ...ticket,
            assigned_to: currentUser.id,
            assigned_to_name: currentUser.name,
            status: 'in_progress'
          };
        }
        return ticket;
      }));
      
      // Try WebSocket first
      let assignmentSent = false;
      if (webSocketService.isConnected) {
        assignmentSent = webSocketService.send('assign_ticket', {
          ticketId: activeTicket.id,
          assignedTo: currentUser.id,
          assignedName: currentUser.name
        });
      }
      
      // Fallback to REST API
      if (!assignmentSent) {
        const res = await adminHelpdeskService.assignTicket(activeTicket.id, currentUser.id);
        
        if (res.data.success === false) {
          // Revert on error
          setError(res.data.message || 'Failed to assign ticket');
          setActiveTicket(prev => ({
            ...prev,
            assigned_to: null,
            assigned_to_name: null
          }));
          
          setTickets(prev => prev.map(ticket => {
            if (ticket.id === activeTicket.id) {
              return {
                ...ticket,
                assigned_to: null,
                assigned_to_name: null
              };
            }
            return ticket;
          }));
        }
      }
    } catch (err) {
      console.error('Error assigning ticket:', err);
      setError('Failed to assign ticket. Please try again.');
    }
  };
  
  // Unassign ticket
  const handleUnassignTicket = async () => {
    if (!activeTicket) return;
    
    try {
      // Optimistic update
      setActiveTicket(prev => ({
        ...prev,
        assigned_to: null,
        assigned_to_name: null,
        status: 'open'
      }));
      
      setTickets(prev => prev.map(ticket => {
        if (ticket.id === activeTicket.id) {
          return {
            ...ticket,
            assigned_to: null,
            assigned_to_name: null,
            status: 'open'
          };
        }
        return ticket;
      }));
      
      // Try WebSocket first
      let unassignmentSent = false;
      if (webSocketService.isConnected) {
        unassignmentSent = webSocketService.send('assign_ticket', {
          ticketId: activeTicket.id,
          assignedTo: null
        });
      }
      
      // Fallback to REST API
      if (!unassignmentSent) {
        const res = await adminHelpdeskService.assignTicket(activeTicket.id, null);
        
        if (res.data.success === false) {
          // Revert on error
          setError(res.data.message || 'Failed to unassign ticket');
        }
      }
    } catch (err) {
      console.error('Error unassigning ticket:', err);
      setError('Failed to unassign ticket. Please try again.');
    }
  };
  
  // Handle key press in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // Handle quick reply selection
  const handleQuickReply = (text) => {
    setInputValue(text);
    // Focus the input field
    document.getElementById('message-input')?.focus();
  };
  
  // Filter tickets
  const filteredTickets = tickets.filter(ticket => {
    // Apply status filter
    if (filter === 'active' && ['closed', 'resolved'].includes(ticket.status)) {
      return false;
    }
    
    if (filter === 'resolved' && !['closed', 'resolved'].includes(ticket.status)) {
      return false;
    }
    
    if (filter === 'assigned' && !ticket.assigned_to) {
      return false;
    }
    
    if (filter === 'unassigned' && ticket.assigned_to) {
      return false;
    }
    
    if (filter === 'assigned_to_me' && ticket.assigned_to !== currentUser?.id) {
      return false;
    }
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        ticket.subject?.toLowerCase().includes(searchLower) ||
        ticket.user_name?.toLowerCase().includes(searchLower) ||
        ticket.user_email?.toLowerCase().includes(searchLower) ||
        ticket.last_message?.toLowerCase().includes(searchLower)
      );
    }
    
    return true;
  });

  // If not admin, show message
  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="text-center p-10">
        <h2 className="text-xl mb-4">Admin Access Required</h2>
        <p>You must be an admin to access the helpdesk management panel.</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold font-secondary">Help Desk</h1>
        
        <div className="flex items-center">
          <label className="flex items-center cursor-pointer mr-6">
            <span className="mr-2">Status:</span>
            <div className="relative inline-block w-12 h-6 transition duration-200 ease-in-out rounded-full">
              <input
                type="checkbox"
                className="absolute w-6 h-6 opacity-0 z-10 cursor-pointer"
                checked={isOnline}
                onChange={() => setIsOnline(!isOnline)}
              />
              <div className={`w-full h-full rounded-full transition-all duration-300 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div 
                className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full shadow transform transition-transform duration-300 ${
                  isOnline ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </div>
            <span className="ml-2">{isOnline ? 'Online' : 'Offline'}</span>
          </label>
          
          <div className="flex items-center">
            <button
              onClick={fetchTickets}
              className="mr-3 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors text-light-muted hover:text-white"
              title="Refresh tickets"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
            
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors mr-3"
            >
              <option value="all">All Tickets</option>
              <option value="active">Active Only</option>
              <option value="resolved">Resolved Only</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
              <option value="assigned_to_me">Assigned to Me</option>
            </select>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="py-2 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-light-muted"></i>
            </div>
          </div>
        </div>
      </div>
      
      {/* Connection status indicator */}
      <div className={`mb-4 py-2 px-4 rounded-lg text-sm flex items-center ${
        wsConnected ? 'bg-green-500/10 text-green-300' : 'bg-yellow-500/10 text-yellow-300'
      }`}>
        <div className={`w-2 h-2 rounded-full mr-2 ${wsConnected ? 'bg-green-400' : 'bg-yellow-400'}`}></div>
        <span>
          {wsConnected 
            ? 'Real-time connection established' 
            : 'Waiting for real-time connection...'}
        </span>
      </div>
      
      {/* Display error message if any */}
      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <i className="fas fa-exclamation-circle mr-2 mt-1 text-romantic"></i>
            <div className="flex-1">
              <p>{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-light-muted hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
      
      {/* Dashboard statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-light-muted text-sm mb-1">Total Tickets</div>
          <div className="text-2xl font-bold">{stats.totalTickets}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-light-muted text-sm mb-1">Active Tickets</div>
          <div className="text-2xl font-bold">{stats.activeTickets}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-light-muted text-sm mb-1">Resolved Tickets</div>
          <div className="text-2xl font-bold">{stats.resolvedTickets}</div>
        </div>
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="text-light-muted text-sm mb-1">Unread Messages</div>
          <div className="text-2xl font-bold">{stats.unreadMessages}</div>
        </div>
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="fixed inset-0 bg-dark/50 flex items-center justify-center z-50">
          <div className="bg-white/5 p-6 rounded-lg border border-white/10 flex items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mr-3"></div>
            <span>Loading...</span>
          </div>
        </div>
      )}
      
      {/* Chat interface */}
      <div className="flex flex-1 bg-white/5 rounded-lg border border-white/10 overflow-hidden min-h-[60vh]">
        {/* Tickets list */}
        <div className="w-1/3 border-r border-white/10">
          {/* Conversations header */}
          <div className="p-3 bg-white/10 border-b border-white/10">
            <h2 className="font-semibold">Support Tickets</h2>
          </div>
          
          {/* Tickets list */}
          <div className="overflow-y-auto" style={{ height: 'calc(60vh - 48px)' }}>
            {isLoading && filteredTickets.length === 0 ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="text-center text-light-muted p-8">
                No tickets found
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <ConversationItem
                  key={ticket.id}
                  ticket={ticket}
                  isActive={activeTicket?.id === ticket.id}
                  onClick={fetchTicketDetails}
                  unreadCount={ticket.unread_count || 0}
                  currentUser={currentUser}
                />
              ))
            )}
          </div>
        </div>
        
        {/* Messages area */}
        <div className="w-2/3 flex flex-col">
          {activeTicket ? (
            <>
              {/* Chat header */}
              <div className="p-3 bg-white/10 border-b border-white/10 flex justify-between items-center">
                <div>
                  <h2 className="font-semibold">{activeTicket.subject}</h2>
                  <div className="text-xs text-light-muted flex items-center">
                    <span className="mr-3">{activeTicket.user_name} ({activeTicket.user_email})</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      activeTicket.status === 'open' ? 'bg-blue-500/20 text-blue-300' :
                      activeTicket.status === 'awaiting_reply' ? 'bg-yellow-500/20 text-yellow-300' :
                      activeTicket.status === 'in_progress' ? 'bg-purple-500/20 text-purple-300' :
                      activeTicket.status === 'resolved' ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {activeTicket.status.replace('_', ' ').replace(/\b\w/g, char => char.toUpperCase())}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {/* Ticket Actions Dropdown */}
                  <div className="relative group">
                    <button className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 transition-colors">
                      <i className="fas fa-ellipsis-v"></i>
                    </button>
                    
                    <div className="absolute right-0 top-full mt-1 w-48 bg-dark border border-white/10 rounded-lg shadow-lg z-10 hidden group-hover:block">
                      <div className="py-1">
                        {!activeTicket.assigned_to ? (
                          <button
                            onClick={handleAssignToSelf}
                            className="w-full text-left px-4 py-2 hover:bg-white/5"
                          >
                            <i className="fas fa-user-check mr-2"></i>
                            Assign to Me
                          </button>
                        ) : activeTicket.assigned_to === currentUser?.id ? (
                          <button
                            onClick={handleUnassignTicket}
                            className="w-full text-left px-4 py-2 hover:bg-white/5"
                          >
                            <i className="fas fa-user-times mr-2"></i>
                            Unassign
                          </button>
                        ) : (
                          <div className="px-4 py-2 text-light-muted">
                            <i className="fas fa-user-tag mr-2"></i>
                            Assigned to {activeTicket.assigned_to_name}
                          </div>
                        )}
                        
                        <div className="border-t border-white/10 my-1"></div>
                        
                        {/* Status Update Options */}
                        <button
                          onClick={() => handleUpdateStatus('open')}
                          className={`w-full text-left px-4 py-2 hover:bg-white/5 ${activeTicket.status === 'open' ? 'text-blue-300' : ''}`}
                          disabled={activeTicket.status === 'open'}
                        >
                          <i className="fas fa-envelope-open mr-2"></i>
                          Mark as Open
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus('in_progress')}
                          className={`w-full text-left px-4 py-2 hover:bg-white/5 ${activeTicket.status === 'in_progress' ? 'text-purple-300' : ''}`}
                          disabled={activeTicket.status === 'in_progress'}
                        >
                          <i className="fas fa-spinner mr-2"></i>
                          Mark In Progress
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus('resolved')}
                          className={`w-full text-left px-4 py-2 hover:bg-white/5 ${activeTicket.status === 'resolved' ? 'text-green-300' : ''}`}
                          disabled={activeTicket.status === 'resolved'}
                        >
                          <i className="fas fa-check-circle mr-2"></i>
                          Mark Resolved
                        </button>
                        
                        <button
                          onClick={() => handleUpdateStatus('closed')}
                          className={`w-full text-left px-4 py-2 hover:bg-white/5 ${activeTicket.status === 'closed' ? 'text-gray-300' : ''}`}
                          disabled={activeTicket.status === 'closed'}
                        >
                          <i className="fas fa-times-circle mr-2"></i>
                          Close Ticket
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Messages area */}
              <div 
                className="flex-grow p-4 overflow-y-auto"
                style={{ height: 'calc(60vh - 48px - 130px - 55px)' }}
              >
                {isLoading ? (
                  <div className="flex justify-center items-center h-full">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="text-center text-light-muted h-full flex flex-col justify-center">
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <Message 
                        key={message.id || index} 
                        message={message} 
                        currentUserId={currentUser?.id}
                      />
                    ))}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              
              {/* Quick replies */}
              <div className="px-4 py-3 border-t border-white/10 flex flex-wrap">
                {quickReplies.map((reply, index) => (
                  <QuickReply 
                    key={index} 
                    text={reply} 
                    onClick={handleQuickReply} 
                  />
                ))}
              </div>
              
              {/* Input area */}
              <div className="p-3 border-t border-white/10">
                <div className="flex items-center">
                  <textarea
                    id="message-input"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-grow bg-white/10 border border-white/20 rounded-lg p-2 resize-none text-white focus:outline-none focus:border-accent transition-colors"
                    rows="2"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim() || sendingMessage}
                    className={`ml-2 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      inputValue.trim() && !sendingMessage
                        ? 'bg-accent text-dark hover:bg-accent-alt' 
                        : 'bg-white/10 text-white/50 cursor-not-allowed'
                    }`}
                  >
                    {sendingMessage ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-light-muted">
              <div className="text-center">
                <i className="fas fa-comments text-4xl mb-3"></i>
                <p>Select a ticket to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HelpDeskManager;