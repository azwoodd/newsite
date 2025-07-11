// client/src/components/Dashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/api';
import { useMusicPlayer } from './GlobalMusicPlayer';
import HelpDeskWidget from './HelpDeskWidget';
import LyricsReviewPanel from './LyricsReviewPanel';
import SongReviewPanel from './SongReviewPanel';
import AffiliatePanel from './AffiliatePanel';

// Order Status Component
const OrderStatus = ({ status }) => {
  let statusColor;
  
  switch(status) {
    case 'Pending':
      statusColor = 'bg-yellow-500/20 text-yellow-300';
      break;
    case 'In Production':
      statusColor = 'bg-blue-500/20 text-blue-300';
      break;
    case 'Ready for Review':
    case 'Lyrics Review':
    case 'Song Review':
      statusColor = 'bg-purple-500/20 text-purple-300';
      break;
    case 'Completed':
      statusColor = 'bg-green-500/20 text-green-300';
      break;
    default:
      statusColor = 'bg-white/20 text-white';
  }
  
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
      {status}
    </span>
  );
};

// Success Message Component
const SuccessMessage = ({ message, orderNumber, onClose }) => {
  useEffect(() => {
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      onClose();
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  return (
    <div className="fixed top-20 left-0 right-0 z-50 flex justify-center px-4">
      <div className="bg-green-500/80 text-white px-6 py-3 rounded-full shadow-lg backdrop-blur-sm flex items-center max-w-md">
        <i className="fas fa-check-circle mr-3 text-xl"></i>
        <span className="flex-grow">{message.replace('#null', orderNumber ? `#${orderNumber}` : '')}</span>
        <button onClick={onClose} className="ml-4 text-white hover:text-green-200 transition-colors">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

// OrderWorkflow Component - Visual representation of order status
const OrderWorkflow = ({ order }) => {
  // Define workflow steps - ensure these exactly match admin's steps
  const steps = [
    { id: 'pending', label: 'Order Received', icon: 'clipboard-check' },
    { id: 'in_production', label: 'In Production', icon: 'pen-nib' },
    { id: 'lyrics_review', label: 'Lyrics Review', icon: 'file-alt' },
    { id: 'song_production', label: 'Song Creation', icon: 'music' }, // Changed from "Song Production" to "Song Creation"
    { id: 'song_review', label: 'Song Review', icon: 'headphones' },
    { id: 'completed', label: 'Completed', icon: 'check-circle' }
  ];
  
  // Determine current step based on order status and properties
  let currentStepIndex = 0;
  
  // If we have workflow_stage, use it directly (1-indexed, so subtract 1 for zero-indexed array)
  if (order.workflow_stage) {
    currentStepIndex = Math.min(Math.max(0, order.workflow_stage - 1), 5);
  } else {
    // Otherwise, determine from status and other properties
    const status = order.status.toLowerCase().replace(/\s+/g, '_');
    
    switch(status) {
      case 'pending': 
        currentStepIndex = 0; 
        break;
      case 'in_production': 
        currentStepIndex = 1; 
        break;
      case 'lyrics_review': 
        currentStepIndex = 2; 
        break;
      case 'song_production': 
        currentStepIndex = 3; 
        break;
      case 'song_review': 
        currentStepIndex = 4; 
        break;
      case 'completed': 
        currentStepIndex = 5; 
        break;
      case 'ready_for_review': // Legacy status support
        if (!order.lyrics_approved) {
          currentStepIndex = 2; // Lyrics review
        } else if (!order.songVersions || order.songVersions.length === 0) {
          currentStepIndex = 3; // Song production
        } else {
          currentStepIndex = 4; // Song review
        }
        break;
      default:
        currentStepIndex = 0;
    }
  }
  
  return (
    <div className="mb-6 pb-4 border-b border-white/10">
      {/* Progress Bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <div 
          className="absolute top-0 left-0 h-full bg-accent transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Status Steps */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex flex-col items-center ${
              index <= currentStepIndex ? 'text-accent' : 'text-light-muted opacity-50'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 
              ${index <= currentStepIndex ? 'bg-accent/20 border border-accent' : 'bg-white/5 border border-white/20'}`}
            >
              <i className={`fas fa-${step.icon} text-xs`}></i>
            </div>
            <span className="text-xs">{step.label}</span>
          </div>
        ))}
      </div>
      
      {/* Current Status Message */}
      <div className="mt-4 text-center text-sm">
        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent">
          {steps[currentStepIndex].label}
        </span>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard = () => {
  const { currentUser, logout, updateOrder } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTrack } = useMusicPlayer();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('orders'); // Possible values: 'orders', 'helpdesk', 'affiliate'
  const [isReviewingLyrics, setIsReviewingLyrics] = useState(false);
  const [isReviewingSong, setIsReviewingSong] = useState(false);
  const [currentLyrics, setCurrentLyrics] = useState('');
  const [currentSongVersions, setCurrentSongVersions] = useState([]);
  const [reviewOrderId, setReviewOrderId] = useState(null);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [lyricsRevisionCount, setLyricsRevisionCount] = useState(0);
  const [songRevisionCount, setSongRevisionCount] = useState(0);
  const [maxRevisions, setMaxRevisions] = useState(5);
  const [debugLog, setDebugLog] = useState([]);
  
  // Function to add debug logs (for development/admin only)
  const addDebugLog = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    setDebugLog(prev => [...prev, { 
      timestamp: new Date().toISOString(), 
      message, 
      type 
    }]);
  };
  
  useEffect(() => {
    // Show success message if redirected from order form
    if (location.state?.orderSuccess) {
      setSuccessMessage(`Order #${location.state.orderNumber || ''} has been created successfully!`);
    }
    
    // Fetch user orders
    fetchOrders();
  }, [location.state]);
  
  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true);
      addDebugLog('Fetching user orders...');
      const response = await orderService.getUserOrders();
      setOrders(response.data.orders);
      addDebugLog(`Successfully fetched ${response.data.orders.length} orders`, 'success');
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load your orders. Please try again later.');
      addDebugLog(`Error fetching orders: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle selecting a song version
  const handleSelectVersion = async (orderId, versionId) => {
    try {
      // Check if any version in this order has already been downloaded
      const order = orders.find(o => o.id === orderId);
      const anyVersionDownloaded = order?.songVersions?.some(v => v.is_downloaded);
      
      // Only allow selection if no version has been downloaded yet
      if (!anyVersionDownloaded) {
        setLoading(true);
        addDebugLog(`Selecting song version ${versionId} for order ${orderId}...`);
        const result = await updateOrder(orderId, { selectedVersion: versionId });
        
        if (result.success) {
          // Refresh orders
          const response = await orderService.getUserOrders();
          setOrders(response.data.orders);
          setSuccessMessage('Song version selected successfully!');
          addDebugLog(`Successfully selected song version ${versionId}`, 'success');
          
          // If we're in the song review modal, update the current song versions
          if (isReviewingSong && reviewOrderId === orderId) {
            const updatedOrder = response.data.orders.find(o => o.id === orderId);
            if (updatedOrder) {
              setCurrentSongVersions(updatedOrder.songVersions);
            }
          }
        } else {
          setError(result.message);
          addDebugLog(`Error selecting version: ${result.message}`, 'error');
        }
      }
    } catch (err) {
      console.error('Error selecting version:', err);
      setError('Failed to select song version. Please try again.');
      addDebugLog(`Error selecting version: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
// Handle downloading a song version - show in completed section only
const handleDownloadVersion = async (orderId, versionId) => {
  try {
    setLoading(true);
    addDebugLog(`Downloading song version ${versionId} for order ${orderId}...`);
    
    // Call the API to mark song as downloaded
    const result = await orderService.downloadSong(orderId, versionId);
    
    if (result.data.success) {
      // Get download URL from API response
      const downloadUrl = result.data.downloadUrl;
      
      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setSuccessMessage('Your song is being downloaded!');
      addDebugLog(`Successfully downloaded song version ${versionId}`, 'success');
      
      // Refresh orders to update UI
      await fetchOrders();
    } else {
      throw new Error(result.data.message || 'Failed to download song');
    }
  } catch (err) {
    console.error('Error downloading song:', err);
    setError('Failed to download song. Please try again.');
    addDebugLog(`Error downloading song: ${err.message}`, 'error');
  } finally {
    setLoading(false);
  }
};
  
  // Check if any version in this order has been downloaded
  const isAnyVersionDownloaded = (order) => {
    return order.songVersions?.some(version => version.is_downloaded);
  };
  
  // Handle lyrics review
  const handleLyricsReview = (order) => {
    setIsReviewingLyrics(true);
    setIsReviewingSong(false);
    setCurrentLyrics(order.system_generated_lyrics || '');
    setReviewOrderId(order.id);
    setLyricsRevisionCount(order.lyrics_revisions || 0);
    addDebugLog(`Opening lyrics review for order ${order.id}`);
  };
  
  // Handle song review
  const handleSongReview = (order) => {
    setIsReviewingSong(true);
    setIsReviewingLyrics(false);
    setCurrentSongVersions(order.songVersions);
    setReviewOrderId(order.id);
    setSongRevisionCount(order.song_revisions || 0);
    addDebugLog(`Opening song review for order ${order.id}`);
  };
  
// Handle lyrics approval
const handleLyricsApprove = async (feedback) => {
  try {
    setIsSubmittingReview(true);
    addDebugLog(`Approving lyrics for order ${reviewOrderId}...`);
    
    // Call the API endpoint to approve lyrics
    const result = await orderService.approveLyrics(reviewOrderId, { 
      feedback,
      approved: true
    });
    
    if (result.data.success) {
      setSuccessMessage('Lyrics approved successfully!');
      setIsReviewingLyrics(false);
      addDebugLog(`Successfully approved lyrics for order ${reviewOrderId}`, 'success');
      
      // Refresh orders to update UI with new status
      await fetchOrders();
    } else {
      throw new Error(result.data.message || 'Failed to approve lyrics');
    }
  } catch (err) {
    console.error('Error approving lyrics:', err);
    setError('Failed to approve lyrics. Please try again.');
    addDebugLog(`Error approving lyrics: ${err.message}`, 'error');
  } finally {
    setIsSubmittingReview(false);
  }
};

// Handle lyrics change request
const handleLyricsChangeRequest = async (feedback) => {
  if (!feedback || feedback.trim() === '') {
    setError('Please provide feedback on what changes you would like to the lyrics.');
    return;
  }
  
  // Check if reached max revisions
  if (lyricsRevisionCount >= maxRevisions) {
    setError(`You've reached the maximum number of revision requests (${maxRevisions}). Please contact support for assistance.`);
    return;
  }
  
  try {
    setIsSubmittingReview(true);
    addDebugLog(`Requesting lyrics changes for order ${reviewOrderId}...`);
    
    // Call the API endpoint to request changes
    const result = await orderService.approveLyrics(reviewOrderId, { 
      feedback,
      approved: false
    });
    
    if (result.data.success) {
      setSuccessMessage('Change request submitted successfully!');
      setIsReviewingLyrics(false);
      addDebugLog(`Successfully submitted lyrics change request for order ${reviewOrderId}`, 'success');
      
      // Refresh orders to update UI
      await fetchOrders();
    } else {
      throw new Error(result.data.message || 'Failed to submit change request');
    }
  } catch (err) {
    console.error('Error submitting lyrics changes:', err);
    setError('Failed to submit change request. Please try again.');
    addDebugLog(`Error submitting lyrics changes: ${err.message}`, 'error');
  } finally {
    setIsSubmittingReview(false);
  }
};

// Handle song approval
const handleSongApprove = async (feedback, versionId) => {
  try {
    setIsSubmittingReview(true);
    addDebugLog(`Approving song version ${versionId} for order ${reviewOrderId}...`);
    
    if (!versionId) {
      setError('Please select a version to approve.');
      setIsSubmittingReview(false);
      return;
    }
    
    // First select the version if not already selected
    const selectedVersion = currentSongVersions.find(v => v.id === versionId);
    if (!selectedVersion || !selectedVersion.is_selected) {
      await orderService.selectSongVersion(reviewOrderId, versionId);
    }
    
    // Then approve the song
    const result = await orderService.approveSong(reviewOrderId, {
      feedback,
      approved: true,
      selectedVersionId: versionId
    });
    
    if (result.data.success) {
      setSuccessMessage('Song approved successfully! You can now download it from your dashboard.');
      setIsReviewingSong(false);
      addDebugLog(`Successfully approved song for order ${reviewOrderId}`, 'success');
      
      // Refresh orders to update UI with new status (should be Completed)
      await fetchOrders();
    } else {
      throw new Error(result.data.message || 'Failed to approve song');
    }
  } catch (err) {
    console.error('Error approving song:', err);
    setError('Failed to approve song. Please try again.');
    addDebugLog(`Error approving song: ${err.message}`, 'error');
  } finally {
    setIsSubmittingReview(false);
  }
};

// Handle song change request
const handleSongChangeRequest = async (feedback) => {
  if (!feedback || feedback.trim() === '') {
    setError('Please provide feedback on what changes you would like to the song.');
    return;
  }
  
  // Check if reached max revisions
  if (songRevisionCount >= maxRevisions) {
    setError(`You've reached the maximum number of revision requests (${maxRevisions}). Please contact support for assistance.`);
    return;
  }
  
  try {
    setIsSubmittingReview(true);
    addDebugLog(`Requesting song changes for order ${reviewOrderId}...`);
    
    // Call the API endpoint to request changes - only send feedback, not version
    const result = await orderService.approveSong(reviewOrderId, {
      feedback,
      approved: false
    });
    
    if (result.data.success) {
      setSuccessMessage('Song change request submitted successfully!');
      setIsReviewingSong(false);
      addDebugLog(`Successfully submitted song change request for order ${reviewOrderId}`, 'success');
      
      // Refresh orders to update UI
      await fetchOrders();
    } else {
      throw new Error(result.data.message || 'Failed to submit change request');
    }
  } catch (err) {
    console.error('Error submitting song changes:', err);
    setError('Failed to submit change request. Please try again.');
    addDebugLog(`Error submitting song changes: ${err.message}`, 'error');
  } finally {
    setIsSubmittingReview(false);
  }
};

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
  };
  
  // Toggle expanded order view (for mobile)
  const toggleOrderExpand = (orderId) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };
  
  // Get workflow step for an order (for UI guidance)
  const getOrderWorkflowStep = (order) => {
    if (order.status === 'Pending') {
      return {
        step: 1,
        message: 'Your order is being reviewed by our team.',
        icon: 'clipboard-check'
      };
    } else if (order.status === 'In Production') {
      return {
        step: 2,
        message: 'We\'re working on your lyrics and song composition.',
        icon: 'pen-nib'
      };
    } else if ((order.status === 'Ready for Review' || order.status === 'Lyrics Review') && 
               order.system_generated_lyrics && !order.lyrics_approved) {
      return {
        step: 3,
        message: 'Lyrics are ready for your review.',
        icon: 'file-alt'
      };
    } else if (order.status === 'Ready for Review' && order.lyrics_approved && (!order.songVersions || order.songVersions.length === 0)) {
      return {
        step: 4,
        message: 'Your song is being produced based on approved lyrics.',
        icon: 'music'
      };
    } else if ((order.status === 'Ready for Review' || order.status === 'Song Review') && 
               order.lyrics_approved && order.songVersions && order.songVersions.length > 0) {
      return {
        step: 5,
        message: 'Song versions are ready for your review.',
        icon: 'headphones'
      };
    } else if (order.status === 'Completed') {
      return {
        step: 6,
        message: 'Your song is complete! You can download it anytime.',
        icon: 'check-circle'
      };
    }
    
    return {
      step: 0,
      message: 'Processing your order...',
      icon: 'spinner'
    };
  };
  
  // Navigation handlers for "Create Song" buttons
  const handleCreateNewSong = (e) => {
    e.preventDefault();
    
    // Navigate to homepage first
    navigate('/');
    
    // Wait for navigation to complete, then scroll to form
    setTimeout(() => {
      const orderForm = document.getElementById('order-form');
      if (orderForm) {
        orderForm.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  };
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-deep">
        <div className="text-center">
          <p className="mb-4">You must be logged in to view this page.</p>
          <Link to="/login" className="btn px-6 py-2 border-2 border-accent rounded-full hover:bg-accent/10 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-dark to-deep pb-24">
      {/* Success Message */}
      {successMessage && (
        <SuccessMessage 
          message={successMessage} 
          orderNumber={location.state?.orderNumber}
          onClose={() => setSuccessMessage(null)} 
        />
      )}
      
      {/* Header */}
      <header className="bg-dark/80 backdrop-blur-md shadow-md py-4 sticky top-0 z-30">
        <div className="container-custom flex flex-wrap gap-y-3 justify-between items-center">
          {/* Back button */}
          <Link to="/" className="text-sm px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
            <i className="fas fa-arrow-left mr-2"></i>
            Back to Main Site
          </Link>
          
          <div className="font-secondary flex items-center">
            <i className="fas fa-music text-accent mr-2"></i>
            <span className="text-xl sm:text-2xl font-bold">Dashboard</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-light-muted hidden sm:inline">
              Welcome, {currentUser.name}
            </span>
            
            {currentUser.role === 'admin' && (
              <Link 
                to="/admin"
                className="text-sm px-4 py-2 border border-accent text-accent rounded-full hover:bg-accent/10 transition-colors flex items-center"
              >
                <i className="fas fa-crown mr-2"></i>
                Admin Panel
              </Link>
            )}
            
            <button 
              onClick={handleLogout}
              className="text-sm px-4 py-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
            >
              <i className="fas fa-sign-out-alt mr-2"></i>
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container-custom py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 font-secondary">Your Dashboard</h1>
          <p className="text-light-muted">
            Manage your custom song orders, participate in our affiliate program, and get support when you need it.
          </p>
        </div>
        
        {/* Error Message */}
        {error && (
          <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
            <div className="flex justify-between items-start">
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
          </div>
        )}
        
        {/* Loading Indicator */}
        {loading && activeTab === 'orders' && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        )}
        
        {/* Lyrics Review Modal */}
        {isReviewingLyrics && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-deep border border-white/10 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-deep z-10">
                <h2 className="text-2xl font-bold font-secondary">Lyrics Review</h2>
                <button
                  onClick={() => setIsReviewingLyrics(false)}
                  className="text-2xl text-light-muted hover:text-white transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="p-6">
                <LyricsReviewPanel 
                  lyrics={currentLyrics}
                  onApprove={handleLyricsApprove}
                  onRequestChanges={handleLyricsChangeRequest}
                  isSubmitting={isSubmittingReview}
                  revisionCount={lyricsRevisionCount}
                  maxRevisions={maxRevisions}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Song Review Modal */}
        {isReviewingSong && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-deep border border-white/10 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b border-white/10 sticky top-0 bg-deep z-10">
                <h2 className="text-2xl font-bold font-secondary">Song Review</h2>
                <button
                  onClick={() => setIsReviewingSong(false)}
                  className="text-2xl text-light-muted hover:text-white transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="p-6">
                <SongReviewPanel 
                  songVersions={currentSongVersions}
                  onApprove={handleSongApprove}
                  onRequestChanges={handleSongChangeRequest}
                  isSubmitting={isSubmittingReview}
                  onSelectVersion={(versionId) => handleSelectVersion(reviewOrderId, versionId)}
                  onDownload={(versionId) => handleDownloadVersion(reviewOrderId, versionId)}
                  anyVersionDownloaded={currentSongVersions.some(v => v.is_downloaded)}
                  revisionCount={songRevisionCount}
                  maxRevisions={maxRevisions}
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Dashboard Content */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main Content Area */}
            <div className="md:col-span-2">
              {activeTab === 'orders' ? (
                <>
                  <h2 className="text-2xl font-bold mb-6 font-secondary">Your Orders</h2>
                  
                  {orders.length === 0 ? (
                    <div className="bg-white/5 rounded-lg p-8 text-center">
                      <p className="text-light-muted mb-4">You don't have any orders yet.</p>
                      <button 
                        onClick={handleCreateNewSong}
                        className="px-6 py-3 bg-accent text-dark rounded-full font-medium hover:bg-accent-alt transition-colors"
                      >
                        Create Your First Song
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {orders.map((order) => {
                        // Check if any version in this order has been downloaded
                        const anyVersionDownloaded = isAnyVersionDownloaded(order);
                        const isExpanded = expandedOrder === order.id;
                        const workflowStep = getOrderWorkflowStep(order);
                        
                        return (
                          <div key={order.id} className="bg-white/5 rounded-lg p-4 sm:p-6 border border-white/10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-4 border-b border-white/10 gap-2">
                              <div>
                                <h3 className="font-bold text-lg sm:text-xl mb-1 font-secondary">Order #{order.order_number}</h3>
                                <p className="text-xs sm:text-sm text-light-muted">
                                  <span className="capitalize">{order.package_type}</span> Package • 
                                  Ordered on {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <OrderStatus status={order.status} />
                                
                                <button 
                                  className="sm:hidden p-2 text-light-muted rounded-full hover:bg-white/10 transition-colors"
                                  onClick={() => toggleOrderExpand(order.id)}
                                  aria-label={isExpanded ? "Collapse" : "Expand"}
                                >
                                  <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
                                </button>
                              </div>
                            </div>
                            
                            {/* Order Workflow Visualization */}
                            <OrderWorkflow order={order} />
                            
                            {/* Mobile collapsed/expanded view */}
                            <div className={`sm:block ${isExpanded ? 'block' : 'hidden'}`}>
                              {/* Lyrics Review for Ready for Review status */}
                              {((order.status === 'Ready for Review' || order.status === 'Lyrics Review') && 
                                order.system_generated_lyrics && !order.lyrics_approved) && (
                                <div className="mt-4 mb-6">
                                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                                    <h4 className="font-semibold mb-3">Lyrics Ready for Review</h4>
                                    <p className="text-sm mb-4">
                                      We've created lyrics for your song based on your requirements.
                                      Please review them and either approve or request changes (up to 5 revisions).
                                    </p>
                                    <button
                                      onClick={() => handleLyricsReview(order)}
                                      className="px-4 py-2 bg-accent text-dark text-sm rounded-lg hover:bg-accent-alt transition-colors"
                                    >
                                      <i className="fas fa-file-alt mr-2"></i>
                                      Review Lyrics
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Song Review for Ready for Review with approved lyrics */}
                              {((order.status === 'Ready for Review' || order.status === 'Song Review') && 
                                order.lyrics_approved && order.songVersions && order.songVersions.length > 0) && (
                                <div className="mt-4 mb-6">
                                  <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
                                    <h4 className="font-semibold mb-3">Song Versions Ready for Review</h4>
                                    <p className="text-sm mb-4">
                                      We've created multiple versions of your song! Please listen to each version,
                                      select your favorite, and provide feedback.
                                    </p>
                                    <button
                                      onClick={() => handleSongReview(order)}
                                      className="px-4 py-2 bg-accent text-dark text-sm rounded-lg hover:bg-accent-alt transition-colors"
                                    >
                                      <i className="fas fa-headphones mr-2"></i>
                                      Review Song Versions
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Display song versions if "Ready for Review" (with lyrics approved) or "Completed" */}
                              {((order.status === 'Ready for Review' || order.status === 'Song Review') && 
                               order.lyrics_approved && order.songVersions && order.songVersions.length > 0 && !anyVersionDownloaded) && (
                                <div className="mt-4">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-semibold">Your Song</h4>
                                    
                                    <button
                                      onClick={() => handleSongReview(order)}
                                      className="px-4 py-1 bg-accent text-dark text-sm rounded-lg hover:bg-accent-alt transition-colors"
                                    >
                                      <i className="fas fa-headphones mr-2"></i>
                                      Review Songs
                                    </button>
                                  </div>
                                </div>
                              )}
                              
                              {/* Downloaded Song (for Completed status) */}
{order.status === 'Completed' && order.songVersions && order.songVersions.length > 0 && (
  <div className="mt-4">
    <div className="bg-accent/10 p-4 rounded-lg">
      <h4 className="font-semibold mb-3">Your Completed Song</h4>
      <p className="text-sm mb-4">
        Your song is complete and ready for download. You can download it anytime
        from your dashboard.
      </p>
      
      {/* Find the selected song version */}
      {order.songVersions.filter(v => v.is_selected).map(song => (
        <div key={song.id} className="bg-white/10 p-4 rounded-lg">
          <h5 className="font-medium mb-2">{song.title}</h5>
          <audio
            controls
            src={song.url}
            className="w-full mb-3"
          ></audio>
          <button
            onClick={() => handleDownloadVersion(order.id, song.id)}
            className="px-4 py-2 bg-accent text-dark text-sm rounded-lg hover:bg-accent-alt transition-colors inline-flex items-center"
          >
            <i className="fas fa-download mr-2"></i>
            {song.is_downloaded ? 'Download Again' : 'Download Your Song'}
          </button>
        </div>
      ))}
    </div>
  </div>
)}
                              
                              {/* If order is still in production */}
                              {(order.status === 'Pending' || order.status === 'In Production') && (
                                <div className="mt-4 text-center py-6">
                                  <div className="animate-pulse flex flex-col items-center">
                                    <i className="fas fa-music text-4xl text-accent/50 mb-4"></i>
                                    <p className="text-light-muted">
                                      {order.status === 'In Production' ? 
                                        "We're crafting your song! Check back soon to hear your song versions." :
                                        "Your order is being reviewed by our team."}
                                    </p>
                                  </div>
                                </div>
                              )}
                              
                              {/* No versions yet but status is Ready for Review */}
                              {order.status === 'Ready for Review' && (!order.songVersions || order.songVersions.length === 0) && order.lyrics_approved && (
                                <div className="mt-4 text-center py-6">
                                  <div className="animate-pulse flex flex-col items-center">
                                    <i className="fas fa-music text-4xl text-accent/50 mb-4"></i>
                                    <p className="text-light-muted">
                                      Your song versions are being prepared and will be available soon!
                                    </p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              ) : activeTab === 'helpdesk' ? (
                // Helpdesk Tab Content
                <HelpDeskWidget />
              ) : (
                // Affiliate Tab Content
                <AffiliatePanel />
              )}
            </div>
            
            {/* Sidebar */}
            <div className="hidden md:block">
              <div className="bg-white/5 rounded-lg p-6 border border-white/10 sticky top-24">
                <h3 className="font-bold text-xl mb-4 font-secondary">Dashboard</h3>
                
                <nav className="space-y-2">
                  <button
                    onClick={() => setActiveTab('orders')}
                    className={`flex items-center p-3 rounded-lg transition-colors w-full text-left ${
                      activeTab === 'orders' 
                        ? 'bg-accent/10 text-white' 
                        : 'hover:bg-white/10 text-light-muted'
                    }`}
                  >
                    <i className={`fas fa-music w-8 ${activeTab === 'orders' ? 'text-accent' : ''}`}></i>
                    <span>My Orders</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('helpdesk')}
                    className={`flex items-center p-3 rounded-lg transition-colors w-full text-left ${
                      activeTab === 'helpdesk' 
                        ? 'bg-accent/10 text-white' 
                        : 'hover:bg-white/10 text-light-muted'
                    }`}
                  >
                    <i className={`fas fa-headset w-8 ${activeTab === 'helpdesk' ? 'text-accent' : ''}`}></i>
                    <span>Help Desk</span>
                  </button>
                  
                  <button
                    onClick={() => setActiveTab('affiliate')}
                    className={`flex items-center p-3 rounded-lg transition-colors w-full text-left ${
                      activeTab === 'affiliate' 
                        ? 'bg-accent/10 text-white' 
                        : 'hover:bg-white/10 text-light-muted'
                    }`}
                  >
                    <i className={`fas fa-handshake w-8 ${activeTab === 'affiliate' ? 'text-accent' : ''}`}></i>
                    <span>Affiliate Program</span>
                  </button>
                  
                  <Link to="/" className="flex items-center p-3 hover:bg-white/10 rounded-lg transition-colors">
                    <i className="fas fa-home w-8"></i>
                    <span>Homepage</span>
                  </Link>
                  <button onClick={handleCreateNewSong} className="flex items-center p-3 hover:bg-white/10 rounded-lg transition-colors w-full text-left">
                    <i className="fas fa-plus w-8"></i>
                    <span>Create New Song</span>
                  </button>
                  <Link to="/showcase" className="flex items-center p-3 hover:bg-white/10 rounded-lg transition-colors">
                    <i className="fas fa-headphones w-8"></i>
                    <span>Song Gallery</span>
                  </Link>
                  <Link to="/profile" className="flex items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                    <i className="fas fa-user-cog w-8"></i>
                    <span>Profile Settings</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center p-3 hover:bg-white/10 rounded-lg transition-colors w-full text-left"
                  >
                    <i className="fas fa-sign-out-alt w-8"></i>
                    <span>Sign Out</span>
                  </button>
                </nav>
                
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h3 className="font-bold text-lg mb-3">Need Help?</h3>
                  <p className="text-sm text-light-muted mb-4">
                    Have questions or need assistance with your order?
                  </p>
                  <button 
                    onClick={() => setActiveTab('helpdesk')}
                    className="flex items-center text-accent hover:underline"
                  >
                    <i className="fas fa-headset mr-2"></i>
                    Contact Support
                  </button>
                </div>
              </div>
            </div>
            
            {/* Mobile bottom navbar - Updated to add space for music player */}
            <div className={`md:hidden fixed bottom-0 left-0 w-full bg-dark/80 backdrop-blur-md border-t border-white/10 z-30 ${currentTrack ? 'mb-[90px]' : ''}`}>
              <div className="flex justify-around py-2">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`flex flex-col items-center p-2 ${activeTab === 'orders' ? 'text-accent' : 'text-light-muted'}`}
                >
                  <i className="fas fa-music text-lg"></i>
                  <span className="text-xs mt-1">Orders</span>
                </button>
                <button
                  onClick={() => setActiveTab('helpdesk')}
                  className={`flex flex-col items-center p-2 ${activeTab === 'helpdesk' ? 'text-accent' : 'text-light-muted'}`}
                >
                  <i className="fas fa-headset text-lg"></i>
                  <span className="text-xs mt-1">Help</span>
                </button>
                <button
                  onClick={() => setActiveTab('affiliate')}
                  className={`flex flex-col items-center p-2 ${activeTab === 'affiliate' ? 'text-accent' : 'text-light-muted'}`}
                >
                  <i className="fas fa-handshake text-lg"></i>
                  <span className="text-xs mt-1">Affiliate</span>
                </button>
                <button onClick={handleCreateNewSong} className="flex flex-col items-center p-2 text-light-muted">
                  <i className="fas fa-plus text-lg"></i>
                  <span className="text-xs mt-1">New Song</span>
                </button>
                <Link to="/profile" className="flex flex-col items-center p-2 text-light-muted">
                  <i className="fas fa-user text-lg"></i>
                  <span className="text-xs mt-1">Profile</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;