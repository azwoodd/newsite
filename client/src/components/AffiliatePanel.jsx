// client/src/components/AffiliatePanel.jsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { affiliateService } from '../services/affiliateService';
import { useAuth } from '../context/AuthContext';

// Affiliate Application Component
const AffiliateApplication = ({ onApplicationSubmitted }) => {
  const [formData, setFormData] = useState({
    contentPlatforms: [''],
    audienceInfo: '',
    promotionStrategy: '',
    portfolioLinks: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handlePlatformChange = (index, value) => {
    const newPlatforms = [...formData.contentPlatforms];
    newPlatforms[index] = value;
    setFormData({ ...formData, contentPlatforms: newPlatforms });
  };

  const addPlatform = () => {
    setFormData({
      ...formData,
      contentPlatforms: [...formData.contentPlatforms, '']
    });
  };

  const removePlatform = (index) => {
    const newPlatforms = formData.contentPlatforms.filter((_, i) => i !== index);
    setFormData({ ...formData, contentPlatforms: newPlatforms });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const applicationData = {
        content_platforms: formData.contentPlatforms.filter(p => p.trim()),
        audience_info: formData.audienceInfo,
        promotion_strategy: formData.promotionStrategy,
        portfolio_links: formData.portfolioLinks
      };

      await affiliateService.submitApplication(applicationData);
      onApplicationSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/5 rounded-lg p-6 border border-white/10">
      <h3 className="text-xl font-bold mb-4 font-secondary">Apply to Become an Affiliate</h3>
      
      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Content Platforms */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Content Platforms *
          </label>
          {formData.contentPlatforms.map((platform, index) => (
            <div key={index} className="flex items-center mb-2">
              <input
                type="text"
                value={platform}
                onChange={(e) => handlePlatformChange(index, e.target.value)}
                placeholder="e.g., Instagram, YouTube, TikTok, Blog"
                className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                required={index === 0}
              />
              {index > 0 && (
                <button
                  type="button"
                  onClick={() => removePlatform(index)}
                  className="ml-2 p-2 text-romantic hover:text-red-400 transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addPlatform}
            className="text-accent hover:text-accent-alt transition-colors text-sm"
          >
            <i className="fas fa-plus mr-1"></i>
            Add Platform
          </button>
        </div>

        {/* Audience Info */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Audience Information *
          </label>
          <textarea
            value={formData.audienceInfo}
            onChange={(e) => setFormData({ ...formData, audienceInfo: e.target.value })}
            placeholder="Describe your audience size, demographics, and engagement rates..."
            rows="4"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
            required
          />
        </div>

        {/* Promotion Strategy */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Promotion Strategy *
          </label>
          <textarea
            value={formData.promotionStrategy}
            onChange={(e) => setFormData({ ...formData, promotionStrategy: e.target.value })}
            placeholder="How do you plan to promote SongSculptors to your audience?"
            rows="4"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
            required
          />
        </div>

        {/* Portfolio Links */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Portfolio Links
          </label>
          <textarea
            value={formData.portfolioLinks}
            onChange={(e) => setFormData({ ...formData, portfolioLinks: e.target.value })}
            placeholder="Links to your content, media kit, or previous collaborations (one per line)..."
            rows="3"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-accent text-dark rounded-lg font-medium hover:bg-accent-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

  const { affiliate, stats } = affiliateData;

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

  const handleRequestPayout = async () => {
    if (!stats.can_request_payout) return;
    
    setError(null);
    setIsRequestingPayout(true);

    try {
      await affiliateService.requestPayout(affiliate.balance);
      onRegenerateCode(); // Refresh data
      setShowPayoutForm(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsRequestingPayout(false);
    }
  };

  const shareableLink = affiliate.affiliate_code 
    ? `https://songsculptors.com?ref=${affiliate.affiliate_code}`
    : null;

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-muted text-sm">Total Earnings</p>
              <p className="text-2xl font-bold text-accent">${stats.total_earnings || 0}</p>
            </div>
            <i className="fas fa-dollar-sign text-accent text-xl"></i>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-muted text-sm">Pending Balance</p>
              <p className="text-2xl font-bold text-yellow-400">${affiliate.balance || 0}</p>
            </div>
            <i className="fas fa-clock text-yellow-400 text-xl"></i>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-muted text-sm">Total Clicks</p>
              <p className="text-2xl font-bold">{stats.total_clicks || 0}</p>
            </div>
            <i className="fas fa-mouse-pointer text-blue-400 text-xl"></i>
          </div>
        </div>

        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-light-muted text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-400">{stats.conversion_rate || 0}%</p>
            </div>
            <i className="fas fa-chart-line text-green-400 text-xl"></i>
          </div>
        </div>
      </div>

      {/* Affiliate Code Section */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4 font-secondary">Your Affiliate Code</h3>
        
        {affiliate.affiliate_code ? (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="flex-1 px-4 py-2 bg-white/10 rounded-lg font-mono text-lg">
                {affiliate.affiliate_code}
              </div>
              <button
                onClick={() => copyToClipboard(affiliate.affiliate_code)}
                className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
              >
                <i className="fas fa-copy mr-2"></i>
                Copy
              </button>
            </div>

            {shareableLink && (
              <div className="space-y-2">
                <p className="text-sm text-light-muted">Shareable Link:</p>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 px-4 py-2 bg-white/10 rounded-lg text-sm break-all">
                    {shareableLink}
                  </div>
                  <button
                    onClick={() => copyToClipboard(shareableLink)}
                    className="px-4 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
                  >
                    <i className="fas fa-copy mr-2"></i>
                    Copy
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <p className="text-sm text-light-muted">
                Commission Rate: <span className="text-accent font-medium">{affiliate.commission_rate}%</span>
              </p>
              <button
                onClick={() => setShowRegenerateConfirm(true)}
                className="text-sm text-light-muted hover:text-white transition-colors"
              >
                <i className="fas fa-sync-alt mr-1"></i>
                Regenerate Code
              </button>
            </div>
          </div>
        ) : (
          <p className="text-light-muted">Your affiliate code will appear here once approved.</p>
        )}
      </div>

      {/* Payout Section */}
      {stats.can_request_payout && (
        <div className="bg-white/5 rounded-lg p-6 border border-white/10">
          <h3 className="text-xl font-bold mb-4 font-secondary">Request Payout</h3>
          <p className="text-light-muted mb-4">
            You have ${affiliate.balance} available for payout (minimum $50.00 required).
          </p>
          <button
            onClick={() => setShowPayoutForm(true)}
            className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
          >
            <i className="fas fa-money-bill-wave mr-2"></i>
            Request Payout
          </button>
        </div>
      )}

      {/* Modals */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-deep border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Regenerate Affiliate Code?</h3>
            <p className="text-light-muted mb-6">
              This will deactivate your current code and create a new one. 
              You can only do this once per 24 hours.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleRegenerateCode}
                disabled={isRegenerating}
                className="flex-1 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
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

      {showPayoutForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-deep border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Request Payout</h3>
            <p className="text-light-muted mb-6">
              Request a payout of ${affiliate.balance}? This will be processed within 3-5 business days.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleRequestPayout}
                disabled={isRequestingPayout}
                className="flex-1 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
              >
                {isRequestingPayout ? (
                  <>
                    <i className="fas fa-spinner fa-spin mr-2"></i>
                    Processing...
                  </>
                ) : (
                  'Request Payout'
                )}
              </button>
              <button
                onClick={() => setShowPayoutForm(false)}
                className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Affiliate Panel Component
const AffiliatePanel = () => {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [affiliateStatus, setAffiliateStatus] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [debugInfo, setDebugInfo] = useState('');

  const fetchAffiliateStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo('Fetching affiliate status...');
      
      const response = await affiliateService.getStatus();
      setDebugInfo(`Status response: ${JSON.stringify(response.data)}`);
      setAffiliateStatus(response.data);
      
      // If approved, get dashboard data
      if (response.data && response.data.status === 'approved') {
        setDebugInfo('User is approved, fetching dashboard data...');
        const dashboardResponse = await affiliateService.getDashboard();
        setDebugInfo(`Dashboard response: ${JSON.stringify(dashboardResponse.data)}`);
        setDashboardData(dashboardResponse.data);
      }
    } catch (err) {
      console.error('Affiliate Panel Error:', err);
      setError(err.message);
      setDebugInfo(`Error: ${err.message}`);
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
    fetchAffiliateStatus();
  };

  const handleDataRefresh = () => {
    fetchAffiliateStatus();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
            <button 
              onClick={fetchAffiliateStatus}
              className="text-white/70 hover:text-white"
            >
              <i className="fas fa-redo"></i>
            </button>
          </div>
        </div>
        
        {/* Debug Info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="font-bold mb-2">Debug Info:</h4>
            <pre className="text-xs text-light-muted">{debugInfo}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 font-secondary">Affiliate Program</h2>
        <p className="text-light-muted">
          Earn money by referring customers to SongSculptors. Get paid for every successful order!
        </p>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h4 className="font-bold mb-2">Debug Info:</h4>
          <pre className="text-xs text-light-muted">
            Status: {affiliateStatus?.status || 'No status'}{'\n'}
            Has Dashboard Data: {dashboardData ? 'Yes' : 'No'}{'\n'}
            {debugInfo}
          </pre>
        </div>
      )}

      {!affiliateStatus && (
        <AffiliateApplication onApplicationSubmitted={handleApplicationSubmitted} />
      )}

      {affiliateStatus?.status === 'pending' && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-6">
          <h3 className="font-bold text-yellow-400 mb-2">
            <i className="fas fa-clock mr-2"></i>
            Application Under Review
          </h3>
          <p className="text-light-muted">
            Your affiliate application is being reviewed. We'll email you within 2-3 business days with our decision.
          </p>
        </div>
      )}

      {affiliateStatus?.status === 'denied' && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
          <h3 className="font-bold text-romantic mb-2">
            <i className="fas fa-times-circle mr-2"></i>
            Application Denied
          </h3>
          <p className="text-light-muted mb-4">
            Unfortunately, your affiliate application was not approved at this time.
          </p>
          {affiliateStatus.denial_reason && (
            <p className="text-sm text-light-muted mb-4">
              <strong>Reason:</strong> {affiliateStatus.denial_reason}
            </p>
          )}
          {affiliateStatus.next_allowed_application_date && (
            <p className="text-sm text-light-muted">
              You may reapply after {new Date(affiliateStatus.next_allowed_application_date).toLocaleDateString()}.
            </p>
          )}
        </div>
      )}

      {affiliateStatus?.status === 'approved' && dashboardData && (
        <AffiliateDashboard 
          affiliateData={dashboardData} 
          onRegenerateCode={handleDataRefresh}
        />
      )}

      {affiliateStatus?.status === 'suspended' && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
          <h3 className="font-bold text-romantic mb-2">
            <i className="fas fa-ban mr-2"></i>
            Account Suspended
          </h3>
          <p className="text-light-muted">
            Your affiliate account has been suspended. Please contact support for more information.
          </p>
        </div>
      )}
    </div>
  );
};

export default AffiliatePanel;