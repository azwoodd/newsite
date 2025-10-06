// client/src/components/AffiliatePanel.jsx - COMPLETE FILE WITH ALL ORIGINAL FUNCTIONALITY + FIXES
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { affiliateService } from '../services/affiliateService';
import PayoutRequestForm from './PayoutRequestForm';
import AffiliateProgramInfo from './AffiliateProgramInfo';

// Affiliate Application Component
const AffiliateApplication = ({ onApplicationSubmitted }) => {
  const [formData, setFormData] = useState({
    content_platforms: [],
    audience_info: '',
    promotion_strategy: '',
    portfolio_links: []
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const platformOptions = [
    'YouTube',
    'Instagram',
    'TikTok',
    'Twitter',
    'Facebook',
    'LinkedIn',
    'Blog/Website',
    'Podcast',
    'Newsletter',
    'Other'
  ];

  const handlePlatformChange = (platform) => {
    setFormData(prev => ({
      ...prev,
      content_platforms: prev.content_platforms.includes(platform)
        ? prev.content_platforms.filter(p => p !== platform)
        : [...prev.content_platforms, platform]
    }));
  };

  const addPortfolioLink = () => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: [...prev.portfolio_links, '']
    }));
  };

  const updatePortfolioLink = (index, value) => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.map((link, i) => i === index ? value : link)
    }));
  };

  const removePortfolioLink = (index) => {
    setFormData(prev => ({
      ...prev,
      portfolio_links: prev.portfolio_links.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.content_platforms.length === 0) {
      setError('Please select at least one content platform');
      return;
    }
    
    if (!formData.audience_info.trim() || !formData.promotion_strategy.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await affiliateService.submitApplication({
        ...formData,
        portfolio_links: formData.portfolio_links.filter(link => link.trim())
      });
      
      onApplicationSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 border border-white/20 rounded-lg p-6">
      <h3 className="font-bold text-xl mb-4 font-secondary">Join Our Affiliate Program</h3>
      <p className="text-light-muted mb-6">
        Earn commissions by promoting SongSculptors! Share your unique link and earn 10% on every sale you generate.
      </p>

      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block font-medium mb-3">Content Platforms *</label>
          <p className="text-sm text-light-muted mb-3">Select all platforms where you create content:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {platformOptions.map(platform => (
              <label key={platform} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.content_platforms.includes(platform)}
                  onChange={() => handlePlatformChange(platform)}
                  className="rounded bg-white/10 border-white/20 text-accent focus:ring-accent"
                />
                <span className="text-sm">{platform}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block font-medium mb-2">
            Audience Information *
          </label>
          <p className="text-sm text-light-muted mb-3">
            Tell us about your audience size, demographics, and engagement rates:
          </p>
          <textarea
            value={formData.audience_info}
            onChange={(e) => setFormData(prev => ({ ...prev, audience_info: e.target.value }))}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent resize-none"
            rows="4"
            placeholder="e.g., 50k followers on Instagram, primarily music lovers aged 18-35, average 5% engagement rate..."
          />
        </div>

        <div>
          <label className="block font-medium mb-2">
            Promotion Strategy *
          </label>
          <p className="text-sm text-light-muted mb-3">
            How do you plan to promote SongSculptors to your audience?
          </p>
          <textarea
            value={formData.promotion_strategy}
            onChange={(e) => setFormData(prev => ({ ...prev, promotion_strategy: e.target.value }))}
            className="w-full p-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent resize-none"
            rows="4"
            placeholder="e.g., Product reviews, story features, dedicated posts about custom songs, integration into music-related content..."
          />
        </div>

        <div>
          <label className="block font-medium mb-2">
            Portfolio Links (Optional)
          </label>
          <p className="text-sm text-light-muted mb-3">
            Share links to your best content or media kit:
          </p>
          
          {formData.portfolio_links.map((link, index) => (
            <div key={index} className="flex space-x-2 mb-2">
              <input
                type="url"
                value={link}
                onChange={(e) => updatePortfolioLink(index, e.target.value)}
                className="flex-1 p-3 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => removePortfolioLink(index)}
                className="px-3 py-2 text-romantic hover:text-romantic-light"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addPortfolioLink}
            className="text-accent hover:text-accent-alt text-sm"
          >
            <i className="fas fa-plus mr-1"></i>
            Add Link
          </button>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-accent text-dark font-medium rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <i className="fas fa-spinner fa-spin mr-2"></i>
              Submitting Application...
            </>
          ) : (
            'Submit Application'
          )}
        </button>
      </form>
    </div>
  );
};

// Affiliate Dashboard Component
const AffiliateDashboard = ({ affiliateData, onRegenerateCode }) => {
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showPayoutForm, setShowPayoutForm] = useState(false);
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [copySuccess, setCopySuccess] = useState(false);

  const { affiliate, stats, recent_commissions, recent_events } = affiliateData;

  const handleRegenerateCode = async () => {
    setError(null);
    setIsRegenerating(true);

    try {
      await affiliateService.regenerateCode();
      onRegenerateCode();
      setShowRegenerateConfirm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRegenerating(false);
    }
  };

const handlePayoutRequest = async (paymentDetails) => {  // ✅ NEW - accepts paymentDetails
  setError(null);
  setIsRequestingPayout(true);

  try {
    await affiliateService.requestPayout({
      paymentMethod: paymentDetails.paymentMethod,
      stripeEmail: paymentDetails.stripeEmail,
      fullName: paymentDetails.fullName,
      accountHolderName: paymentDetails.accountHolderName,
      bankName: paymentDetails.bankName,
      accountNumber: paymentDetails.accountNumber,
      sortCode: paymentDetails.sortCode
    });
    
    setSuccess(`Payout request submitted! You'll receive £${affiliate.balance.toFixed(2)} within ${
      paymentDetails.paymentMethod === 'stripe' ? '3-5' : '5-7'
    } business days.`);
    setShowPayoutForm(false);
    onRegenerateCode();
  } catch (err) {
    setError(err.message);
  } finally {
    setIsRequestingPayout(false);
  }
};

  const shareableLink = affiliate.affiliate_code 
    ? `https://songsculptors.com/?ref=${affiliate.affiliate_code}`
    : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  return (
  <div className="space-y-6">
    {/* Success Display */}
    {success && (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
        <i className="fas fa-check-circle mr-2"></i>
        {success}
      </div>
    )}

    {/* Error Display */}
    {error && (
      <div className="bg-romantic/10 border border-romantic rounded-lg p-4">
        <i className="fas fa-exclamation-circle mr-2"></i>
        {error}
      </div>
    )}

    <div className="bg-white/5 border border-white/20 rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-bold font-secondary">
              <i className="fas fa-chart-line mr-2 text-accent"></i>
              Affiliate Dashboard
            </h3>
            <p className="text-light-muted">Welcome back, {affiliate.name}!</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-accent">£{affiliate.balance.toFixed(2)}</div>
            <div className="text-sm text-light-muted">Available Balance</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-xl font-bold">{stats.total_clicks}</div>
            <div className="text-sm text-light-muted">Total Clicks</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-xl font-bold">{stats.total_conversions}</div>
            <div className="text-sm text-light-muted">Conversions</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-xl font-bold">{stats.conversion_rate}%</div>
            <div className="text-sm text-light-muted">Conversion Rate</div>
          </div>
          <div className="bg-white/5 rounded-lg p-4 text-center">
            <div className="text-xl font-bold">£{stats.total_earnings.toFixed(2)}</div>
            <div className="text-sm text-light-muted">Total Earned</div>
          </div>
        </div>

        {/* Affiliate Link */}
        <div className="bg-white/5 rounded-lg p-4 mb-6">
          <h4 className="font-medium mb-3">Your Affiliate Link</h4>
          <div className="flex space-x-2">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="flex-1 p-3 bg-white/10 border border-white/20 rounded-lg font-mono text-sm"
            />
            <button
              onClick={handleCopyLink}
              className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
            >
              {copySuccess ? (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Copied!
                </>
              ) : (
                <>
                  <i className="fas fa-copy mr-2"></i>
                  Copy
                </>
              )}
            </button>
          </div>
          <div className="flex justify-between items-center mt-3">
            <span className="text-sm text-light-muted">
              Code: <span className="font-mono text-accent">{affiliate.affiliate_code}</span>
            </span>
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="text-sm text-accent hover:text-accent-alt"
            >
              <i className="fas fa-refresh mr-1"></i>
              Regenerate Code
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={() => setShowPayoutForm(true)}
            disabled={!stats.can_request_payout}
            className="flex-1 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <i className="fas fa-dollar-sign mr-2"></i>
            Request Payout
          </button>
          <button
            onClick={() => setActiveTab(activeTab === 'commissions' ? 'overview' : 'commissions')}
            className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
          >
            <i className="fas fa-history mr-2"></i>
            View History
          </button>
        </div>
      </div>

      <div className="mt-6">
  <AffiliateProgramInfo isCompact />
</div>

      {/* Commission History */}
      {activeTab === 'commissions' && (
        <div className="bg-white/5 border border-white/20 rounded-lg p-6">
          <h4 className="font-bold mb-4">Recent Commissions</h4>
          {recent_commissions.length === 0 ? (
            <div className="text-center py-8 text-light-muted">
              <i className="fas fa-chart-line text-4xl mb-4 opacity-50"></i>
              <p>No commissions yet. Start promoting your link!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="text-left border-b border-white/10">
                  <tr>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">Order</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_commissions.map((commission) => (
                    <tr key={commission.id} className="border-b border-white/5">
                      <td className="py-3">{new Date(commission.created_at).toLocaleDateString()}</td>
                      <td className="py-3">{commission.order_number || `#${commission.order_id}`}</td>
                      <td className="py-3 font-mono">£{commission.amount}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          commission.status === 'paid' 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {commission.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}



      {/* Regenerate Code Confirmation */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark border border-white/20 rounded-lg p-6 max-w-md mx-4">
            <h4 className="font-bold mb-4">Regenerate Affiliate Code?</h4>
            <p className="text-light-muted mb-6">
              This will generate a new affiliate code. Your old link will stop working. 
              This action can only be done once per day.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
                className="flex-1 px-4 py-2 bg-romantic text-white rounded-lg hover:bg-romantic-alt transition-colors disabled:opacity-50"
              >
                {isRegenerating ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Regenerating...
                  </>
                ) : (
                  'Yes, Regenerate'
                )}
              </button>
              <button
                onClick={() => setShowRegenerateConfirm(false)}
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

{/* Payout Form Modal */}
      {showPayoutForm && (
        <PayoutRequestForm
          availableBalance={parseFloat(affiliate.balance || 0)}
          onSubmit={handlePayoutRequest}
          onCancel={() => setShowPayoutForm(false)}
          isLoading={isRequestingPayout}
        />
      )}
    </div>
  );
};

// 🔧 FIXED: Main Affiliate Panel Component with comprehensive error handling and debugging
const AffiliatePanel = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [affiliateStatus, setAffiliateStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);

const fetchAffiliateStatus = async () => {
  try {
    setLoading(true);
    setError(null);
    
    console.log('[DEBUG] Fetching affiliate status...');
    
    const response = await affiliateService.getStatus();
    
    console.log('[DEBUG] Affiliate status response:', response);
    
    // 🔧 FIX: Handle Axios response structure properly
    let statusData = null;
    let debugData = {
      responseReceived: !!response,
      responseStructure: response ? Object.keys(response) : [],
      timestamp: new Date().toISOString()
    };
    
    // Handle Axios response object
    if (response?.data?.data) {
      statusData = response.data.data;
      debugData.dataPath = 'response.data.data';
    } else if (response?.data?.success !== undefined) {
      statusData = response.data;
      debugData.dataPath = 'response.data';
    } else if (response?.data) {
      statusData = response.data;
      debugData.dataPath = 'response.data (fallback)';
    } else if (response?.success !== undefined) {
      statusData = response;
      debugData.dataPath = 'response (direct)';
    } else {
      debugData.dataPath = 'no valid data found';
      debugData.fullResponse = response;
      console.warn('[DEBUG] Could not find status data in response:', response);
    }
    
    debugData.statusData = statusData;
    debugData.isAffiliate = statusData?.isAffiliate;
    debugData.status = statusData?.status;
    debugData.canApply = statusData?.canApply;
    
    console.log('[DEBUG] Processed status data:', statusData);
    
    setAffiliateStatus(statusData);
    setDebugInfo(debugData);
    
    // If approved, get dashboard data
    if (statusData && statusData.status === 'approved') {
      console.log('[DEBUG] User is approved affiliate, fetching dashboard...');
      try {
        const dashboardResponse = await affiliateService.getDashboard();
        console.log('[DEBUG] Dashboard response:', dashboardResponse);
        
        let dashData = null;
        if (dashboardResponse?.data?.data) {
          dashData = dashboardResponse.data.data;
        } else if (dashboardResponse?.data) {
          dashData = dashboardResponse.data;
        } else if (dashboardResponse) {
          dashData = dashboardResponse;
        }
        
        setDashboardData(dashData);
        debugData.dashboardLoaded = !!dashData;
      } catch (dashErr) {
        console.error('[DEBUG] Dashboard fetch error:', dashErr);
        debugData.dashboardError = dashErr.message;
      }
    }
    
    setDebugInfo(debugData);
    
  } catch (err) {
    console.error('Affiliate Panel Error:', err);
    setError(err.message || 'Failed to load affiliate information');
    
    setDebugInfo({
      error: err.message,
      errorDetails: err,
      timestamp: new Date().toISOString(),
      stackTrace: err.stack
    });
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    if (currentUser) {
      fetchAffiliateStatus();
    }
  }, [currentUser]);

  const handleApplicationSubmitted = () => {
    console.log('[DEBUG] Application submitted, refreshing status...');
    fetchAffiliateStatus();
  };

  const handleDataRefresh = () => {
    console.log('[DEBUG] Data refresh requested...');
    fetchAffiliateStatus();
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  // Show error state with debug info and retry option
  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
          <div className="flex items-center mb-2">
            <i className="fas fa-exclamation-circle mr-2 text-romantic"></i>
            <span className="font-semibold">Error Loading Affiliate Panel</span>
          </div>
          <p className="text-light-muted mb-4">{error}</p>
          <button
            onClick={fetchAffiliateStatus}
            className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
          >
            <i className="fas fa-refresh mr-2"></i>
            Try Again
          </button>
        </div>
        
        {/* Debug info for development */}
        {process.env.NODE_ENV === 'development' && debugInfo && (
          <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 text-sm">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <pre className="text-xs text-gray-300 overflow-auto max-h-64">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  }

  // 🔧 FIX: Better handling of affiliate status data with all possible states
  console.log('[DEBUG] Rendering with affiliateStatus:', affiliateStatus);

  return (
    <div className="space-y-6">
      {/* Debug panel for development */}
      {process.env.NODE_ENV === 'development' && debugInfo && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-sm">
          <h4 className="font-bold mb-2">Affiliate Panel Debug:</h4>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <strong>User:</strong> {currentUser?.name || 'Unknown'}
            </div>
            <div>
              <strong>Status Data:</strong> {affiliateStatus ? 'Loaded' : 'None'}
            </div>
            <div>
              <strong>Is Affiliate:</strong> {affiliateStatus?.isAffiliate ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Can Apply:</strong> {affiliateStatus?.canApply ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Status:</strong> {affiliateStatus?.status || 'None'}
            </div>
            <div>
              <strong>Has Application:</strong> {affiliateStatus?.hasApplication ? 'Yes' : 'No'}
            </div>
            <div>
              <strong>Dashboard:</strong> {debugInfo.dashboardLoaded ? 'Loaded' : 'Not loaded'}
            </div>
            <div>
              <strong>Last Updated:</strong> {new Date(debugInfo.timestamp).toLocaleTimeString()}
            </div>
          </div>
          <button
            onClick={fetchAffiliateStatus}
            className="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-xs"
          >
            <i className="fas fa-refresh mr-1"></i>
            Refresh Debug
          </button>
        </div>
      )}

      {(!affiliateStatus?.isAffiliate || !affiliateStatus?.hasApplication) && affiliateStatus?.canApply && (
  <>
    {/* Program info ABOVE the join form (non-affiliates) */}
    <AffiliateProgramInfo />

    {/* Join form */}
    <div className="mt-6">
      <AffiliateApplication onApplicationSubmitted={handleApplicationSubmitted} />
    </div>
  </>
)}

      {/* Pending application */}
      {affiliateStatus?.status === 'pending' && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6">
          <h3 className="font-bold text-accent mb-2">
            <i className="fas fa-clock mr-2"></i>
            Application Under Review
          </h3>
          <p className="text-light-muted">
            Thank you for applying to our affiliate program! Your application is currently being reviewed by our team.
            We'll notify you via email once a decision has been made.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-light-muted">Applied:</span>
              <p className="font-medium">
                {affiliateStatus.application_date 
                  ? new Date(affiliateStatus.application_date).toLocaleDateString()
                  : 'Recently'
                }
              </p>
            </div>
            <div>
              <span className="text-light-muted">Status:</span>
              <p className="font-medium text-accent">Under Review</p>
            </div>
          </div>
        </div>
      )}

      {/* Rejected application */}
      {affiliateStatus?.status === 'rejected' && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
          <h3 className="font-bold text-romantic mb-2">
            <i className="fas fa-times-circle mr-2"></i>
            Application Not Approved
          </h3>
          <p className="text-light-muted mb-4">
            Unfortunately, your affiliate application was not approved at this time.
          </p>
          {affiliateStatus.denial_reason && (
            <div className="bg-white/5 rounded p-3 mb-4">
              <p className="text-sm"><strong>Reason:</strong> {affiliateStatus.denial_reason}</p>
            </div>
          )}
          {affiliateStatus?.canApply && (
            <p className="text-light-muted">You may submit a new application.</p>
          )}
        </div>
      )}

      {/* Suspended affiliate */}
      {affiliateStatus?.status === 'suspended' && (
        <div className="bg-gray-500/10 border border-gray-500 rounded-lg p-6">
          <h3 className="font-bold text-gray-400 mb-2">
            <i className="fas fa-pause-circle mr-2"></i>
            Account Suspended
          </h3>
          <p className="text-light-muted">
            Your affiliate account has been temporarily suspended. Please contact support for more information.
          </p>
        </div>
      )}

      {/* Approved affiliate - show dashboard */}
      {affiliateStatus?.status === 'approved' && dashboardData && (
        <AffiliateDashboard 
          affiliateData={dashboardData} 
          onRegenerateCode={handleDataRefresh} 
        />
      )}

      {/* Approved but no dashboard data */}
      {affiliateStatus?.status === 'approved' && !dashboardData && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6">
          <h3 className="font-bold text-accent mb-2">
            <i className="fas fa-check-circle mr-2"></i>
            Welcome to the Affiliate Program!
          </h3>
          <p className="text-light-muted mb-4">
            Your affiliate application has been approved! We're setting up your dashboard...
          </p>
          <button
            onClick={handleDataRefresh}
            className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
          >
            <i className="fas fa-refresh mr-2"></i>
            Load Dashboard
          </button>
        </div>
      )}

      {/* No status data at all - fallback state */}
      {!affiliateStatus && (
        <div className="bg-white/5 border border-white/20 rounded-lg p-6 text-center">
          <i className="fas fa-users text-4xl mb-4 opacity-50"></i>
          <h3 className="font-bold mb-2">Affiliate Program</h3>
          <p className="text-light-muted mb-4">
            Loading affiliate information...
          </p>
          <button
            onClick={fetchAffiliateStatus}
            className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
          >
            <i className="fas fa-refresh mr-2"></i>
            Reload
          </button>
        </div>
      )}
    </div>
  );
};

export default AffiliatePanel;