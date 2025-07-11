import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import AdminWorkflowIndicator from './AdminWorkflowIndicator';
import RevisionHistory from './RevisionHistory';

// Track the maximum number of revisions allowed
const MAX_REVISIONS = 5;

const OrdersList = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState('desc');
  const [isMobile, setIsMobile] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  
  // Song upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [songVersionAData, setSongVersionAData] = useState({
    version: 'A',
    title: ''
  });
  const [songVersionBData, setSongVersionBData] = useState({
    version: 'B',
    title: ''
  });
  
  // Lyrics management states
  const [lyricsContent, setLyricsContent] = useState('');
  const [lyricsUploading, setLyricsUploading] = useState(false);
  const [lyricsRevisionCount, setLyricsRevisionCount] = useState(0);
  const [songRevisionCount, setSongRevisionCount] = useState(0);
  const [allowMoreRevisions, setAllowMoreRevisions] = useState(false);
  
  // Status transition states
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState(null);
  const [confirmStatusChange, setConfirmStatusChange] = useState(false);
  
  // Refs for file inputs and forms
  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);
  const formRefA = useRef(null);
  const formRefB = useRef(null);
  const debugPanelRef = useRef(null);

  // Function to add to debug log
  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugLog(prev => [...prev, { timestamp, message, type }]);
    
    // Scroll to bottom of debug panel
    if (debugPanelRef.current) {
      setTimeout(() => {
        debugPanelRef.current.scrollTop = debugPanelRef.current.scrollHeight;
      }, 100);
    }
  };

  // Check if mobile on mount and on resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Check on mount
    checkIfMobile();
    
    // Add resize listener
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);
  
  // Fetch all orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      addDebugLog('Fetching all orders...');
      const response = await adminService.getAllOrders();
      setOrders(response.data.orders);
      addDebugLog(`Successfully fetched ${response.data.orders.length} orders`, 'success');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again later.');
      addDebugLog(`Error fetching orders: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Format status for display
  const formatStatusLabel = (status) => {
    switch(status) {
      case 'pending': return 'Pending';
      case 'in_production': return 'In Production';
      case 'lyrics_review': return 'Lyrics Review';
      case 'song_production': return 'Song Production';
      case 'song_review': return 'Song Review';
      case 'completed': return 'Completed';
      default: return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  // Select an order to display details
  const selectOrder = async (orderId) => {
    if (selectedOrder === orderId) {
      setSelectedOrder(null);
      setOrderDetails(null);
      return;
    }
    
    try {
      setLoading(true);
      setSelectedOrder(orderId);
      addDebugLog(`Fetching details for order ${orderId}...`);
      
      // Fetch order details
      const response = await adminService.getOrderDetails(orderId);
      const orderData = response.data.order;
      
      // Initialize revision counters
      setLyricsRevisionCount(orderData.lyrics_revisions || 0);
      setSongRevisionCount(orderData.song_revisions || 0);
      setAllowMoreRevisions(orderData.allow_more_revisions || false);
      
      // Set lyrics content if available
      setLyricsContent(orderData.lyrics || orderData.system_generated_lyrics || '');
      
      setOrderDetails(orderData);
      addDebugLog(`Successfully fetched details for order ${orderId}`, 'success');
      
      // Reset song upload forms
      setSongVersionAData({
        version: 'A',
        title: `${getSongPurposeText(orderData.song_purpose)} Song (Version A)`
      });
      
      setSongVersionBData({
        version: 'B',
        title: `${getSongPurposeText(orderData.song_purpose)} Song (Version B)`
      });
      
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details. Please try again.');
      addDebugLog(`Error fetching order details: ${err.message}`, 'error');
      setSelectedOrder(null);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort orders
  const filteredOrders = orders
    .filter(order => {
      // Apply status filter
      if (filter !== 'all' && order.status.toLowerCase().replace(' ', '_') !== filter) {
        return false;
      }
      
      // Apply search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          order.order_number.toLowerCase().includes(searchLower) ||
          order.user_name.toLowerCase().includes(searchLower) ||
          order.user_email.toLowerCase().includes(searchLower) ||
          (order.recipient_name && order.recipient_name.toLowerCase().includes(searchLower)) ||
          (order.song_purpose && order.song_purpose.toLowerCase().includes(searchLower))
        );
      }
      
      return true;
    })
    .sort((a, b) => {
      // Sort orders
      let comparison = 0;
      
      if (sortField === 'created_at') {
        comparison = new Date(b.created_at) - new Date(a.created_at);
      } else if (sortField === 'status') {
        comparison = a.status.localeCompare(b.status);
      } else if (sortField === 'user_name') {
        comparison = a.user_name.localeCompare(b.user_name);
      } else if (sortField === 'package_type') {
        comparison = a.package_type.localeCompare(b.package_type);
      } else if (sortField === 'song_purpose') {
        // Handle possible null values
        const aPurpose = a.song_purpose || '';
        const bPurpose = b.song_purpose || '';
        comparison = aPurpose.localeCompare(bPurpose);
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  // Handle sort change
  const handleSort = (field) => {
    if (sortField === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by the new field in ascending order
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Initiate status change
  const initiateStatusChange = (orderId, newStatus) => {
    // Get the current status of the order
    const order = orders.find(o => o.id === orderId);
    if (!order) {
      addDebugLog(`Order ${orderId} not found`, 'error');
      return;
    }

    // Get normalized status
    const currentStatus = order.status.toLowerCase().replace(/\s+/g, '_');
    
    // Check if we're trying to set the same status
    if (currentStatus === newStatus) {
      setError(`Order is already in ${formatStatusLabel(newStatus)} status.`);
      addDebugLog(`Prevented redundant status change: ${currentStatus} to ${newStatus}`, 'warning');
      return;
    }
    
    // Store the pending status update
    setPendingStatusUpdate({ orderId, newStatus });
    setConfirmStatusChange(true);
    addDebugLog(`Initiating status change for order ${orderId} to ${formatStatusLabel(newStatus)}...`);
  };
  
  // Confirm and execute status change
  const confirmAndExecuteStatusChange = async () => {
    if (!pendingStatusUpdate) return;
    
    const { orderId, newStatus } = pendingStatusUpdate;
    
    try {
      setLoading(true);
      addDebugLog(`Confirming status change for order ${orderId} to ${formatStatusLabel(newStatus)}...`);
      
      // Prepare additional metadata based on status transition
      const statusData = {
        status: newStatus
      };
      
      // Add appropriate metadata for specific status transitions
      if (newStatus === 'lyrics_review') {
        // When transitioning to lyrics review, ensure we have lyrics to review
        if (!orderDetails.system_generated_lyrics && !orderDetails.lyrics) {
          addDebugLog('No lyrics found, cannot transition to Lyrics Review', 'error');
          setError('Please add lyrics before setting status to Lyrics Review');
          setConfirmStatusChange(false);
          setPendingStatusUpdate(null);
          setLoading(false);
          return;
        }
      } else if (newStatus === 'song_production') {
        // When moving to song production, mark lyrics as approved
        statusData.lyricsApproved = true;
      }
      
      await adminService.updateOrderStatus(orderId, statusData);
      
      // Show success message
      setSuccessMessage(`Order status updated to ${formatStatusLabel(newStatus)}`);
      addDebugLog(`Successfully updated order ${orderId} status to ${formatStatusLabel(newStatus)}`, 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh orders
      fetchOrders();
      
      // If we have the order details open, refresh those too
      if (selectedOrder === orderId) {
        const response = await adminService.getOrderDetails(orderId);
        setOrderDetails(response.data.order);
      }
    } catch (err) {
      console.error('Error updating order status:', err);
      
      // Extract the error message from the response if available
      const errorMessage = err.response?.data?.message || 'Failed to update order status. Please try again.';
      setError(errorMessage);
      addDebugLog(`Error updating order status: ${errorMessage}`, 'error');
      
      // Log additional details if available
      if (err.response?.data?.error) {
        addDebugLog(`Error details: ${err.response.data.error}`, 'error');
      }
    } finally {
      setLoading(false);
      setConfirmStatusChange(false);
      setPendingStatusUpdate(null);
    }
  };
  
  // Cancel status change
  const cancelStatusChange = () => {
    addDebugLog('Status change cancelled by user', 'info');
    setConfirmStatusChange(false);
    setPendingStatusUpdate(null);
  };

  // Handle lyrics updates
  const handleLyricsSubmit = async (orderId) => {
    if (!lyricsContent.trim()) {
      setError('Please enter lyrics content before submitting');
      return;
    }
    
    try {
      setLyricsUploading(true);
      addDebugLog(`Submitting lyrics for order ${orderId}...`);
      
      // Upload lyrics to the server
      await adminService.updateOrderLyrics(orderId, {
        lyrics: lyricsContent,
        status: 'lyrics_review',
      });
      
      // Show success message
      setSuccessMessage('Lyrics submitted successfully');
      addDebugLog(`Successfully submitted lyrics for order ${orderId}`, 'success');
      
      // Refresh order details
      const response = await adminService.getOrderDetails(orderId);
      setOrderDetails(response.data.order);
      
      // Also refresh the order list
      fetchOrders();
      
    } catch (err) {
      console.error('Error submitting lyrics:', err);
      setError('Failed to submit lyrics. Please try again.');
      addDebugLog(`Error submitting lyrics: ${err.message}`, 'error');
    } finally {
      setLyricsUploading(false);
    }
  };

  // Handle song version A data change
  const handleSongVersionAChange = (e) => {
    const { name, value } = e.target;
    setSongVersionAData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle song version B data change
  const handleSongVersionBChange = (e) => {
    const { name, value } = e.target;
    setSongVersionBData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Simulate upload progress
  const simulateUploadProgress = () => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 95) {
        clearInterval(interval);
        progress = 95;
      }
      setUploadProgress(Math.min(Math.round(progress), 95));
    }, 300);
    
    return () => clearInterval(interval);
  };

  // Upload song version A
  const handleUploadSongVersionA = async (orderId) => {
    // Prevent default form submission
    if (formRefA.current) {
      formRefA.current.preventDefault?.();
    }
    
    const file = fileInputRefA.current.files[0];
    if (!file) {
      setError(`Please select an audio file to upload for Version A`);
      return;
    }
    
    if (!songVersionAData.version || !songVersionAData.title) {
      setError(`Please provide both version and title for Version A`);
      return;
    }
    
    // Check if max revisions reached and not overridden
    if (songRevisionCount >= MAX_REVISIONS && !allowMoreRevisions) {
      setError(`Maximum number of song revisions (${MAX_REVISIONS}) reached. Use the override toggle if needed.`);
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      const stopProgressSimulation = simulateUploadProgress();
      addDebugLog(`Uploading song version A for order ${orderId}...`);
      
      // Create form data
      const formData = new FormData();
      formData.append('songFile', file);
      formData.append('version', songVersionAData.version);
      formData.append('title', songVersionAData.title);
      formData.append('revisionCount', songRevisionCount + 1);
      
      // Upload song
      await adminService.uploadSongVersion(orderId, formData);
      
      // Update revision count
      setSongRevisionCount(prev => prev + 1);
      
      // Complete progress
      stopProgressSimulation();
      setUploadProgress(100);
      
      // Show success message
      setSuccessMessage(`Song version ${songVersionAData.version} uploaded successfully!`);
      addDebugLog(`Successfully uploaded song version A for order ${orderId}`, 'success');
      
      // Clear form
      if (fileInputRefA.current) {
        fileInputRefA.current.value = '';
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh orders and details
      fetchOrders();
      if (selectedOrder === orderId) {
        const response = await adminService.getOrderDetails(orderId);
        setOrderDetails(response.data.order);
      }
    } catch (err) {
      console.error('Error uploading song:', err);
      setError('Failed to upload song. Please try again.');
      addDebugLog(`Error uploading song version A: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };
  
  // Upload song version B
  const handleUploadSongVersionB = async (orderId) => {
    // Prevent default form submission
    if (formRefB.current) {
      formRefB.current.preventDefault?.();
    }
    
    const file = fileInputRefB.current.files[0];
    if (!file) {
      setError(`Please select an audio file to upload for Version B`);
      return;
    }
    
    if (!songVersionBData.version || !songVersionBData.title) {
      setError(`Please provide both version and title for Version B`);
      return;
    }
    
    // Check if max revisions reached and not overridden
    if (songRevisionCount >= MAX_REVISIONS && !allowMoreRevisions) {
      setError(`Maximum number of song revisions (${MAX_REVISIONS}) reached. Use the override toggle if needed.`);
      return;
    }
    
    try {
      setUploading(true);
      setUploadProgress(0);
      const stopProgressSimulation = simulateUploadProgress();
      addDebugLog(`Uploading song version B for order ${orderId}...`);
      
      // Create form data
      const formData = new FormData();
      formData.append('songFile', file);
      formData.append('version', songVersionBData.version);
      formData.append('title', songVersionBData.title);
      formData.append('revisionCount', songRevisionCount + 1);
      
      // Upload song
      await adminService.uploadSongVersion(orderId, formData);
      
      // Update revision count
      setSongRevisionCount(prev => prev + 1);
      
      // Complete progress
      stopProgressSimulation();
      setUploadProgress(100);
      
      // Show success message
      setSuccessMessage(`Song version ${songVersionBData.version} uploaded successfully!`);
      addDebugLog(`Successfully uploaded song version B for order ${orderId}`, 'success');
      
      // Clear form
      if (fileInputRefB.current) {
        fileInputRefB.current.value = '';
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh orders and details
      fetchOrders();
      if (selectedOrder === orderId) {
        const response = await adminService.getOrderDetails(orderId);
        setOrderDetails(response.data.order);
      }
    } catch (err) {
      console.error('Error uploading song:', err);
      setError('Failed to upload song. Please try again.');
      addDebugLog(`Error uploading song version B: ${err.message}`, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Handle song version deletion
  const handleDeleteSongVersion = async (orderId, songId) => {
    if (!window.confirm('Are you sure you want to delete this song version?')) {
      return;
    }
    
    try {
      setLoading(true);
      addDebugLog(`Deleting song version ${songId} for order ${orderId}...`);
      await adminService.deleteSongVersion(orderId, songId);
      
      // Show success message
      setSuccessMessage('Song version deleted successfully!');
      addDebugLog(`Successfully deleted song version ${songId}`, 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
      // Refresh orders and details
      fetchOrders();
      if (selectedOrder === orderId) {
        const response = await adminService.getOrderDetails(orderId);
        setOrderDetails(response.data.order);
      }
    } catch (err) {
      console.error('Error deleting song version:', err);
      setError('Failed to delete song version. Please try again.');
      addDebugLog(`Error deleting song version: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle allowing more revisions
  const toggleAllowMoreRevisions = async (orderId) => {
    try {
      setLoading(true);
      addDebugLog(`${allowMoreRevisions ? 'Disabling' : 'Enabling'} extra revisions for order ${orderId}...`);
      
      await adminService.updateOrderRevisions(orderId, {
        allowMoreRevisions: !allowMoreRevisions
      });
      
      // Update local state
      setAllowMoreRevisions(!allowMoreRevisions);
      
      // Show success message
      setSuccessMessage(`Extra revisions ${!allowMoreRevisions ? 'enabled' : 'disabled'}`);
      addDebugLog(`Successfully ${!allowMoreRevisions ? 'enabled' : 'disabled'} extra revisions`, 'success');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      
    } catch (err) {
      console.error('Error updating revision settings:', err);
      setError('Failed to update revision settings. Please try again.');
      addDebugLog(`Error updating revision settings: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Render order status badge
  const renderStatusBadge = (status) => {
    let statusColor;
    
    switch(status) {
      case 'Pending':
        statusColor = 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
        break;
      case 'In Production':
        statusColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        break;
      case 'Lyrics Review':
        statusColor = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
        break;
      case 'Song Production':
        statusColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
        break;
      case 'Song Review':
        statusColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        break;
      case 'Ready for Review':
        statusColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
        break;
      case 'Completed':
        statusColor = 'bg-green-500/20 text-green-300 border-green-500/30';
        break;
      default:
        statusColor = 'bg-white/20 text-white border-white/30';
    }
    
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
        {status}
      </span>
    );
  };

  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Get song purpose display text
  const getSongPurposeText = (purpose) => {
    if (!purpose) return 'Not specified';
    
    // Convert snake_case or kebab-case to Title Case
    return purpose
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Debug panel component
  const DebugPanel = () => (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-deep border border-white/10 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 bg-dark">
          <h3 className="text-xl font-bold">Debug Panel</h3>
          <button 
            onClick={() => setShowDebugPanel(false)}
            className="p-2 text-light-muted hover:text-white"
          >
            <i className="fas fa-times"></i>
          </button>
        </div>
        
        <div ref={debugPanelRef} className="p-4 h-[60vh] overflow-y-auto">
          {debugLog.map((log, idx) => (
            <div 
              key={idx} 
              className={`p-2 mb-2 rounded text-sm font-mono ${
                log.type === 'error' 
                  ? 'bg-romantic/10 text-romantic' 
                  : log.type === 'success'
                    ? 'bg-green-500/10 text-green-400'
                    : 'bg-white/5 text-light-muted'
              }`}
            >
              <span className="text-accent/80 mr-2">[{log.timestamp}]</span>
              {log.message}
            </div>
          ))}
        </div>
        
        <div className="p-4 border-t border-white/10 flex justify-between">
          <button
            onClick={() => setDebugLog([])}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded"
          >
            Clear Log
          </button>
          
          <button
            onClick={() => setShowDebugPanel(false)}
            className="px-4 py-2 bg-accent hover:bg-accent-alt text-dark rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );

  // Status Change Confirmation Modal
  const StatusChangeConfirmation = () => {
    if (!pendingStatusUpdate) return null;
    
    const { orderId, newStatus } = pendingStatusUpdate;
    const currentStatus = orderDetails?.status?.toLowerCase().replace(/\s+/g, '_') || 'unknown';
    
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className="bg-deep border border-white/10 rounded-lg w-full max-w-md">
          <div className="p-6">
            <h3 className="text-xl font-bold mb-4">Confirm Status Change</h3>
            <p className="mb-4">
              Are you sure you want to change the order status from{' '}
              <span className="font-semibold text-accent">{formatStatusLabel(currentStatus)}</span> to{' '}
              <span className="font-semibold text-accent">{formatStatusLabel(newStatus)}</span>?
            </p>
            
            {/* Status transition description */}
            <div className="mb-4 p-4 bg-white/5 rounded-lg">
              <p className="text-sm text-light-muted">
                <i className="fas fa-info-circle mr-2"></i>
                {newStatus === 'pending' && 'This will mark the order as newly received.'}
                {newStatus === 'in_production' && 'This will mark the order as being processed by the team.'}
                {newStatus === 'lyrics_review' && 'This will send the lyrics to the customer for review.'}
                {newStatus === 'song_production' && 'This will mark lyrics as approved and move to song creation.'}
                {newStatus === 'song_review' && 'This will notify the customer that song versions are ready for review.'}
                {newStatus === 'completed' && 'This will mark the order as complete.'}
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={cancelStatusChange}
                className="flex-1 py-2 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={confirmAndExecuteStatusChange}
                className="flex-1 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col ${isMobile ? '' : 'lg:flex-row'} w-full gap-4`}>
      {/* Debug Panel Toggle Button */}
      <button
        onClick={() => setShowDebugPanel(true)}
        className="fixed bottom-4 right-4 z-40 bg-accent text-dark p-3 rounded-full shadow-lg hover:bg-accent-alt transition-colors"
        title="Show Debug Panel"
      >
        <i className="fas fa-bug"></i>
      </button>
      
      {/* Show Debug Panel if enabled */}
      {showDebugPanel && <DebugPanel />}
      
      {/* Show Status Change Confirmation if needed */}
      {confirmStatusChange && <StatusChangeConfirmation />}
      
      {/* Left column - Order List */}
      <div className={`w-full ${selectedOrder && !isMobile ? 'lg:w-1/3' : 'lg:w-full'} overflow-hidden transition-all duration-300`}>
        <div className={`flex ${isMobile ? 'flex-col' : 'justify-between'} items-start lg:items-center mb-6 gap-4`}>
          <h1 className="text-3xl font-bold font-secondary">Orders</h1>
          
          <div className={`flex ${isMobile ? 'flex-col w-full' : 'items-center'} gap-4`}>
            <div className="relative w-full lg:w-auto">
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full py-2 pl-10 pr-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              />
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-light-muted"></i>
            </div>
            
            <select
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="w-full lg:w-auto py-2 px-4 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="in_production">In Production</option>
              <option value="lyrics_review">Lyrics Review</option>
              <option value="song_production">Song Production</option>
              <option value="song_review">Song Review</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
        
        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <i className="fas fa-check-circle text-green-400 mr-2"></i>
              {successMessage}
            </div>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="text-white/70 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {/* Error Message */}
        {error && (
          <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6 flex items-center justify-between">
            <div>
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-white/70 hover:text-white"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        )}
        
        {/* Loading Indicator */}
        {loading && !orderDetails && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        )}
        
        {/* Orders Table */}
        {!loading && (
          <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
            {isMobile ? (
              // Mobile view - card-based layout
              <div className="divide-y divide-white/10">
                {filteredOrders.length === 0 ? (
                  <div className="py-8 text-center text-light-muted px-4">
                    No orders found.
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className={`p-4 ${selectedOrder === order.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{order.order_number}</div>
                          <div className="text-xs text-light-muted">{formatDate(order.created_at)}</div>
                        </div>
                        {renderStatusBadge(order.status)}
                      </div>
                      
                      <div className="mb-3">
                        <div>{order.user_name}</div>
                        <div className="text-xs text-light-muted">{order.user_email}</div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="text-xs text-light-muted">
                          <span className="capitalize">{order.package_type}</span>
                          {order.song_purpose && (
                            <span> • {getSongPurposeText(order.song_purpose)}</span>
                          )}
                        </div>
                        
                        <button
                          onClick={() => selectOrder(order.id)}
                          className={`px-4 py-1.5 text-sm ${
                            selectedOrder === order.id
                              ? 'bg-accent text-dark'
                              : 'bg-transparent border border-accent text-accent hover:bg-accent/10'
                          } rounded-lg transition-colors`}
                        >
                          {selectedOrder === order.id ? 'Selected' : 'View'}
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Desktop view - table layout
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-white/10">
                      <th className="py-3 px-4 text-left">
                        <button
                          className="flex items-center focus:outline-none"
                          onClick={() => handleSort('order_number')}
                        >
                          Order #
                          {sortField === 'order_number' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <button
                          className="flex items-center focus:outline-none"
                          onClick={() => handleSort('user_name')}
                        >
                          Customer
                          {sortField === 'user_name' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-left hidden md:table-cell">
                        <button
                          className="flex items-center focus:outline-none"
                          onClick={() => handleSort('song_purpose')}
                        >
                          Purpose
                          {sortField === 'song_purpose' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-left hidden lg:table-cell">
                        <button
                          className="flex items-center focus:outline-none"
                          onClick={() => handleSort('package_type')}
                        >
                          Package
                          {sortField === 'package_type' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-left">
                        <button
                          className="flex items-center focus:outline-none"
                          onClick={() => handleSort('status')}
                        >
                          Status
                          {sortField === 'status' && (
                            <i className={`fas fa-sort-${sortDirection === 'asc' ? 'up' : 'down'} ml-2`}></i>
                          )}
                        </button>
                      </th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-light-muted">
                          No orders found.
                        </td>
                      </tr>
                    ) : (
                      filteredOrders.map((order) => (
                        <tr 
                          key={order.id} 
                          className={`border-t border-white/10 hover:bg-white/5 ${selectedOrder === order.id ? 'bg-white/10' : ''}`}
                        >
                          <td className="py-3 px-4">{order.order_number}</td>
                          <td className="py-3 px-4">
                            <div>{order.user_name}</div>
                            <div className="text-xs text-light-muted">{order.user_email}</div>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div>{getSongPurposeText(order.song_purpose)}</div>
                            {order.recipient_name && (
                              <div className="text-xs text-light-muted">
                                For: {order.recipient_name}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 capitalize hidden lg:table-cell">{order.package_type}</td>
                          <td className="py-3 px-4">{renderStatusBadge(order.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => selectOrder(order.id)}
                              className={`px-4 py-2 ${
                                selectedOrder === order.id
                                  ? 'bg-accent text-dark'
                                  : 'bg-transparent border border-accent text-accent hover:bg-accent/10'
                              } rounded-lg transition-colors`}
                            >
                              {selectedOrder === order.id ? 'Selected' : 'View'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Right column - Order Details */}
      {selectedOrder && orderDetails && (
        <div className={`w-full ${isMobile ? '' : 'lg:w-2/3'} overflow-auto`}>
          <div className="bg-white/5 rounded-lg border border-white/10 p-4 lg:p-6">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
              <h2 className="text-2xl font-bold font-secondary">Order Details</h2>
              
              <div className="flex items-center gap-2">
                {renderStatusBadge(orderDetails.status)}
                
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 text-light-muted hover:text-white"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>
            
            {/* Add the Workflow Indicator */}
            <AdminWorkflowIndicator 
              status={orderDetails.status} 
              lyricsApproved={orderDetails.lyrics_approved === 1} 
              hasSongVersions={orderDetails.songVersions && orderDetails.songVersions.length > 0} 
            />
            
            {/* Basic Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">Order Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-light-muted">Order Number:</span>
                    <span className="font-medium">{orderDetails.order_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Date:</span>
                    <span>{formatDate(orderDetails.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Package:</span>
                    <span className="capitalize">{orderDetails.package_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Total Price:</span>
                    <span>£{orderDetails.total_price}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Versions:</span>
                    <span>{orderDetails.songVersions?.length || 0} / 2</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">Customer Information</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-light-muted">Name:</span>
                    <span>{orderDetails.user_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Email:</span>
                    <span>{orderDetails.user_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Gallery Consent:</span>
                    <span className={orderDetails.show_in_gallery ? 'text-green-300' : 'text-romantic'}>
                      {orderDetails.show_in_gallery ? 'Granted' : 'Not granted'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Lyrics Revisions:</span>
                    <span>{lyricsRevisionCount} / {MAX_REVISIONS}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Song Revisions:</span>
                    <span>{songRevisionCount} / {MAX_REVISIONS}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Addons & Song Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-8">
              <div>
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">Add-ons</h3>
                {orderDetails.addons && orderDetails.addons.length > 0 ? (
                  <ul className="space-y-2">
                    {orderDetails.addons.map((addon, index) => (
                      <li key={index} className="flex items-center">
                        <i className="fas fa-check-circle text-accent mr-2"></i>
                        <span className="capitalize">{addon.addon_type.replace('-', ' ')}</span>
                        <span className="ml-auto text-accent">£{addon.price}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-light-muted text-center h-full flex items-center justify-center">
                    No add-ons selected
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">Song Details</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-light-muted">Purpose:</span>
                    <span>{getSongPurposeText(orderDetails.song_purpose)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Recipient:</span>
                    <span>{orderDetails.recipient_name || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Emotion:</span>
                    <span className="capitalize">{orderDetails.emotion || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Music Style:</span>
                    <span className="capitalize">{(orderDetails.music_style || '').replace(/-/g, ' ')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-light-muted">Provided Lyrics:</span>
                    <span>{orderDetails.provide_lyrics ? 'Yes' : 'No'}</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Customer's Story/Lyrics Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">
                {orderDetails.provide_lyrics ? 'Customer Provided Lyrics' : 'Customer Story'}
              </h3>
              
              {orderDetails.provide_lyrics && orderDetails.lyrics ? (
                <div className="bg-white/5 rounded p-4 whitespace-pre-wrap mb-4">
                  {orderDetails.lyrics}
                </div>
              ) : (
                <>
                  {orderDetails.song_theme && (
                    <div className="mb-4">
                      <div className="text-sm text-light-muted mb-1">Song Theme:</div>
                      <div className="bg-white/5 rounded p-4 whitespace-pre-wrap">
                        {orderDetails.song_theme}
                      </div>
                    </div>
                  )}
                  
                  {orderDetails.personal_story && (
                    <div className="mb-4">
                      <div className="text-sm text-light-muted mb-1">Personal Story:</div>
                      <div className="bg-white/5 rounded p-4 whitespace-pre-wrap">
                        {orderDetails.personal_story}
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {orderDetails.additional_notes && (
                <div>
                  <div className="text-sm text-light-muted mb-1">Additional Notes:</div>
                  <div className="bg-white/5 rounded p-4 whitespace-pre-wrap">
                    {orderDetails.additional_notes}
                  </div>
                </div>
              )}
            </div>
            
            {/* Update Status Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">
                Workflow
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status Update */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium mb-3">Update Order Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                    {['pending', 'in_production', 'lyrics_review', 'song_production', 'song_review', 'completed'].map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => initiateStatusChange(orderDetails.id, status)}
                          className={`p-2 text-center text-sm rounded-lg transition-colors ${
                            orderDetails.status.toLowerCase().replace(' ', '_') === status
                              ? 'bg-accent/20 border border-accent text-white'
                              : 'bg-white/5 border border-white/10 text-light-muted hover:bg-white/10'
                          }`}
                        >
                          {formatStatusLabel(status)}
                        </button>
                      )
                    )}
                  </div>
                  
                  <div className="text-sm text-light-muted flex items-start">
                    <i className="fas fa-info-circle mt-0.5 mr-2"></i>
                    <span>Status changes require confirmation and are communicated to the customer.</span>
                  </div>
                </div>
                
                {/* Revision Override */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium mb-3">Revision Settings</h4>
                  
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm">Allow More Than {MAX_REVISIONS} Revisions:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={allowMoreRevisions}
                        onChange={() => toggleAllowMoreRevisions(orderDetails.id)}
                      />
                      <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent/50"></div>
                    </label>
                  </div>
                  
                  <div className="text-sm text-light-muted flex items-start">
                    <i className="fas fa-info-circle mt-0.5 mr-2"></i>
                    <span>Enable this if the customer needs additional revision rounds beyond the standard {MAX_REVISIONS}.</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Lyrics Generation Section */}
            <div className="mb-8">
  <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">
    Lyrics Management
  </h3>
  
  <div className="bg-white/5 rounded-lg p-4 border border-white/10 mb-4">
    <h4 className="font-medium mb-3">Create/Edit Lyrics</h4>
    
    <textarea
      className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent mb-4"
      rows="8"
      placeholder="Enter song lyrics here..."
      value={lyricsContent}
      onChange={(e) => setLyricsContent(e.target.value)}
    ></textarea>
    
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="text-sm text-light-muted">
        Revision: {lyricsRevisionCount} / {allowMoreRevisions ? '∞' : MAX_REVISIONS}
      </div>
      
      <button
        onClick={() => handleLyricsSubmit(orderDetails.id)}
        disabled={lyricsUploading || (!allowMoreRevisions && lyricsRevisionCount >= MAX_REVISIONS)}
        className={`px-6 py-2 ${
          lyricsUploading || (!allowMoreRevisions && lyricsRevisionCount >= MAX_REVISIONS)
            ? 'bg-gray-500 cursor-not-allowed'
            : 'bg-accent hover:bg-accent-alt'
        } text-dark rounded-lg transition-colors`}
      >
        {lyricsUploading ? (
          <><i className="fas fa-spinner fa-spin mr-2"></i> Submitting...</>
        ) : (
          <><i className="fas fa-paper-plane mr-2"></i> Submit Lyrics</>
        )}
      </button>
    </div>
    
    <div className="text-sm text-light-muted mt-4 flex items-start">
      <i className="fas fa-info-circle mt-0.5 mr-2"></i>
      <span>Submit lyrics for customer review. This changes the order status to "Lyrics Review" so the customer can approve them before song creation.</span>
    </div>
  </div>
  
  {/* Add this new section for lyrics revision history */}
  <div className="bg-white/5 rounded-lg p-4 border border-white/10">
    <h4 className="font-medium mb-3">
      <i className="fas fa-history mr-2 text-accent/80"></i>
      Lyrics Revision History
    </h4>
    <div className="text-sm text-light-muted mb-3">
      View customer feedback and revision notes for lyrics
    </div>
    
    <RevisionHistory orderId={orderDetails.id} revisionType="lyrics" />
  </div>
</div>


            
            {/* Song Upload Sections - Responsive layout */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">
                Song Uploads
              </h3>
              
              {/* Check revision limit */}
              {!allowMoreRevisions && songRevisionCount >= MAX_REVISIONS && (
                <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-4">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <span>Maximum number of song revisions reached ({MAX_REVISIONS}). Use the override toggle to allow more revisions.</span>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Song Version A Upload */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium mb-3">Upload Song Version A</h4>
                  
                  <form ref={formRefA} onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block mb-2 text-sm">Version</label>
                        <input
                          type="text"
                          name="version"
                          value={songVersionAData.version}
                          onChange={handleSongVersionAChange}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                          disabled={true} // Keep as "A"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm">Title</label>
                        <input
                          type="text"
                          name="title"
                          value={songVersionAData.title}
                          onChange={handleSongVersionAChange}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm">Audio File (MP3, WAV, M4A, AAC)</label>
                        <input
                          type="file"
                          ref={fileInputRefA}
                          accept=".mp3,.wav,.m4a,.aac"
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleUploadSongVersionA(orderDetails.id)}
                      disabled={uploading || (!allowMoreRevisions && songRevisionCount >= MAX_REVISIONS)}
                      className={`w-full p-3 rounded-lg ${
                        uploading || (!allowMoreRevisions && songRevisionCount >= MAX_REVISIONS)
                          ? 'bg-gray-500 text-white/50 cursor-not-allowed'
                          : 'bg-accent text-dark hover:bg-accent-alt'
                      } transition-colors`}
                    >
                      {uploading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i> Uploading...</>
                      ) : (
                        <><i className="fas fa-cloud-upload-alt mr-2"></i> Upload Version A</>
                      )}
                    </button>
                  </form>
                </div>
                
                {/* Song Version B Upload */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="font-medium mb-3">Upload Song Version B</h4>
                  
                  <form ref={formRefB} onSubmit={(e) => e.preventDefault()}>
                    <div className="space-y-4 mb-4">
                      <div>
                        <label className="block mb-2 text-sm">Version</label>
                        <input
                          type="text"
                          name="version"
                          value={songVersionBData.version}
                          onChange={handleSongVersionBChange}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                          disabled={true} // Keep as "B"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm">Title</label>
                        <input
                          type="text"
                          name="title"
                          value={songVersionBData.title}
                          onChange={handleSongVersionBChange}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                      
                      <div>
                        <label className="block mb-2 text-sm">Audio File (MP3, WAV, M4A, AAC)</label>
                        <input
                          type="file"
                          ref={fileInputRefB}
                          accept=".mp3,.wav,.m4a,.aac"
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent"
                        />
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleUploadSongVersionB(orderDetails.id)}
                      disabled={uploading || (!allowMoreRevisions && songRevisionCount >= MAX_REVISIONS)}
                      className={`w-full p-3 rounded-lg ${
                        uploading || (!allowMoreRevisions && songRevisionCount >= MAX_REVISIONS)
                          ? 'bg-gray-500 text-white/50 cursor-not-allowed'
                          : 'bg-accent text-dark hover:bg-accent-alt'
                      } transition-colors`}
                    >
                      {uploading ? (
                        <><i className="fas fa-spinner fa-spin mr-2"></i> Uploading...</>
                      ) : (
                        <><i className="fas fa-cloud-upload-alt mr-2"></i> Upload Version B</>
                      )}
                    </button>
                  </form>
                </div>
              </div>
              
              {uploading && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-accent transition-all duration-200"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-light-muted mt-4 flex items-start">
                <i className="fas fa-info-circle mt-0.5 mr-2"></i>
                <span>Upload two versions of the song and then change the status to "Song Review" so the customer can select their preferred version.</span>
              </div>
            </div>
            
            {/* Uploaded Song Versions - Responsive layout */}
            {orderDetails.songVersions && orderDetails.songVersions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 pb-2 border-b border-white/20">
                  Uploaded Song Versions
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {orderDetails.songVersions.map((song) => (
                    <div 
                      key={song.id} 
                      className={`p-4 rounded-lg ${
                        song.is_selected ? 'bg-accent/10 border-2 border-accent' : 'bg-white/5 border border-white/10'
                      }`}
                    >
                      <div className="flex justify-between mb-3">
                        <h4 className="font-semibold">
                          Version {song.version}: {song.title}
                        </h4>
                        <div className="flex items-center">
                          {song.is_selected && (
                            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full mr-2">
                              Selected
                            </span>
                          )}
                          {song.is_downloaded && (
                            <span className="text-xs bg-green-500/20 text-green-300 px-2 py-1 rounded-full">
                              Downloaded
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-xs text-light-muted mb-3">
                        Uploaded on {formatDate(song.uploaded_at)}
                      </div>
                      
                      <audio
                        src={song.url}
                        controls
                        className="w-full mb-3"
                      ></audio>
                      
                      <div className="flex justify-between">
                        <a
                          href={song.url}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:underline text-sm"
                        >
                          <i className="fas fa-download mr-1"></i> Download
                        </a>
                        
                        <button
                          onClick={() => handleDeleteSongVersion(orderDetails.id, song.id)}
                          className="text-romantic hover:underline text-sm"
                          disabled={song.is_downloaded}
                        >
                          <i className="fas fa-trash-alt mr-1"></i> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>


                
                {/* Explanation */}
                <div className="mt-4 p-4 bg-white/5 rounded-lg text-sm text-light-muted border border-white/10">
                  <p className="flex items-start">
                    <i className="fas fa-info-circle mt-0.5 mr-2"></i>
                    Once the customer selects and downloads a version, they can no longer select a different version.
                    After they've chosen, upload any additional deliverables they've purchased (instrumental, lyric sheet, etc.).
                  </p>
                </div>
              </div>
            )}

                            {/* Add this new section for Song revision history */}
                <div className="bg-white/5 rounded-lg p-4 border border-white/10">
    <h4 className="font-medium mb-3">
      <i className="fas fa-history mr-2 text-accent/80"></i>
      Song Revision History
    </h4>
    <div className="text-sm text-light-muted mb-3">
      View customer feedback and revision notes for Songs
    </div>
    
    <RevisionHistory orderId={orderDetails.id} revisionType="songs" />
  </div>


            
            {/* Mobile back button at the bottom for better UX */}
            {isMobile && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-6 py-2 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  <i className="fas fa-arrow-left mr-2"></i> Back to Orders List
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersList;