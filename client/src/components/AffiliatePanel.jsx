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

  const handleSubmit = async () => {
    // Validation
    if (!formData.audienceInfo || !formData.promotionStrategy || formData.contentPlatforms.filter(p => p.trim()).length === 0) {
      setError('Please fill in all required fields');
      return;
    }

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

      <div className="space-y-6">
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
              />
              {index > 0 && (
                <button
                  onClick={() => removePlatform(index)}
                  className="ml-2 p-2 text-romantic hover:bg-romantic/20 rounded transition-colors"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addPlatform}
            className="text-sm text-accent hover:text-accent-alt transition-colors"
          >
            <i className="fas fa-plus mr-1"></i>
            Add Another Platform
          </button>
        </div>

        {/* Audience Info */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Describe Your Audience *
          </label>
          <textarea
            value={formData.audienceInfo}
            onChange={(e) => setFormData({ ...formData, audienceInfo: e.target.value })}
            placeholder="Tell us about your audience size, demographics, and engagement levels"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent h-32 resize-none"
          />
        </div>

        {/* Promotion Strategy */}
        <div>
          <label className="block text-sm font-medium mb-2">
            How Will You Promote SongSculptors? *
          </label>
          <textarea
            value={formData.promotionStrategy}
            onChange={(e) => setFormData({ ...formData, promotionStrategy: e.target.value })}
            placeholder="Describe your content strategy and how you'll integrate our service"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent h-32 resize-none"
          />
        </div>

        {/* Portfolio Links */}
        <div>
          <label className="block text-sm font-medium mb-2">
            Portfolio Links (Optional)
          </label>
          <textarea
            value={formData.portfolioLinks}
            onChange={(e) => setFormData({ ...formData, portfolioLinks: e.target.value })}
            placeholder="Share links to your content (one per line)"
            className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent h-20 resize-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full px-6 py-3 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
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
      </div>
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
    ? `${window.location.origin}?ref=${affiliate.affiliate_code}`
    : '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <h3 className="text-xl font-bold mb-4 font-secondary">Affiliate Dashboard</h3>
        
        {error && (
          <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-4">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}

        {/* Affiliate Code Section */}
        <div className="mb-6">
          <p className="text-sm text-light-muted mb-2">Your Affiliate Code</p>
          <div className="flex items-center space-x-4">
            <div className="flex-1 bg-dark/50 rounded-lg px-4 py-3 font-mono text-accent text-lg">
              {affiliate.affiliate_code}
            </div>
            <button
              onClick={() => setShowRegenerateConfirm(true)}
              className="px-4 py-3 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              title="Regenerate Code"
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        {/* Shareable Link */}
        <div className="mb-6">
          <p className="text-sm text-light-muted mb-2">Your Referral Link</p>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={shareableLink}
              readOnly
              className="flex-1 px-4 py-2 bg-dark/50 border border-white/20 rounded-lg text-sm"
            />
            <button
              onClick={copyToClipboard}
              className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
            >
              <i className="fas fa-copy mr-2"></i>
              {copySuccess ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-sm text-light-muted">Current Balance</p>
            <p className="text-2xl font-bold text-accent">${affiliate.balance.toFixed(2)}</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-sm text-light-muted">Total Earned</p>
            <p className="text-2xl font-bold">${stats.total_earnings.toFixed(2)}</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-sm text-light-muted">Conversion Rate</p>
            <p className="text-2xl font-bold">{stats.conversion_rate}%</p>
          </div>
          <div className="bg-dark/50 rounded-lg p-4">
            <p className="text-sm text-light-muted">Total Clicks</p>
            <p className="text-2xl font-bold">{stats.total_clicks}</p>
          </div>
        </div>

        {/* Payout Button */}
        {stats.can_request_payout && (
          <div className="mt-6">
            <button
              onClick={() => setShowPayoutForm(true)}
              className="w-full px-6 py-3 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
            >
              <i className="fas fa-money-check-alt mr-2"></i>
              Request Payout (${affiliate.balance.toFixed(2)} available)
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white/5 rounded-lg p-6 border border-white/10">
        <div className="flex space-x-4 border-b border-white/10 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-accent text-accent'
                : 'border-transparent text-light-muted hover:text-white'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'commissions'
                ? 'border-accent text-accent'
                : 'border-transparent text-light-muted hover:text-white'
            }`}
          >
            Commissions
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-2 px-1 border-b-2 transition-colors ${
              activeTab === 'activity'
                ? 'border-accent text-accent'
                : 'border-transparent text-light-muted hover:text-white'
            }`}
          >
            Activity
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-3xl font-bold text-accent mb-2">{stats.total_conversions}</p>
                <p className="text-sm text-light-muted">Total Sales</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold mb-2">{stats.total_signups}</p>
                <p className="text-sm text-light-muted">Sign-ups</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400 mb-2">${stats.pending_earnings.toFixed(2)}</p>
                <p className="text-sm text-light-muted">Pending Earnings</p>
              </div>
            </div>

            <div className="bg-dark/30 rounded-lg p-4">
              <h4 className="font-medium mb-2">Commission Details</h4>
              <p className="text-sm text-light-muted">
                You earn {affiliate.commission_rate}% commission on all sales made through your referral link.
                Commissions are held for 14 days before becoming available for payout.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <div className="space-y-4">
            {recent_commissions.length === 0 ? (
              <p className="text-center text-light-muted py-8">No commissions yet. Share your link to start earning!</p>
            ) : (
              recent_commissions.map((commission) => (
                <div key={commission.id} className="bg-dark/30 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">Order #{commission.order_number}</p>
                      <p className="text-sm text-light-muted">
                        {commission.customer_name} • {new Date(commission.order_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-light-muted">{commission.package_type} Package</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-400">${commission.amount.toFixed(2)}</p>
                      <p className="text-sm text-light-muted">
                        {commission.status === 'paid' ? (
                          <span className="text-green-400">Paid</span>
                        ) : (
                          <span className="text-yellow-400">Pending</span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-4">
            {recent_events.length === 0 ? (
              <p className="text-center text-light-muted py-8">No activity yet. Share your link to get started!</p>
            ) : (
              recent_events.map((event) => (
                <div key={event.id} className="bg-dark/30 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        event.event_type === 'click' ? 'bg-blue-500/20 text-blue-400' :
                        event.event_type === 'signup' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        <i className={`fas ${
                          event.event_type === 'click' ? 'fa-mouse-pointer' :
                          event.event_type === 'signup' ? 'fa-user-plus' :
                          'fa-shopping-cart'
                        }`}></i>
                      </div>
                      <div>
                        <p className="font-medium">
                          {event.event_type === 'click' ? 'Link Click' :
                           event.event_type === 'signup' ? 'New Sign-up' :
                           'Purchase'}
                        </p>
                        <p className="text-sm text-light-muted">
                          {event.referred_user_name || 'Anonymous'} • {new Date(event.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {event.event_type === 'purchase' && event.conversion_value > 0 && (
                      <p className="text-green-400 font-medium">${event.conversion_value.toFixed(2)}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Regenerate Code Confirmation Modal */}
      {showRegenerateConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Regenerate Affiliate Code?</h3>
            <p className="text-light-muted mb-6">
              This will create a new affiliate code. Your old code and links will stop working.
              You can only regenerate your code once every 24 hours.
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
                  'Regenerate Code'
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

      {/* Request Payout Modal */}
      {showPayoutForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark border border-white/10 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold mb-4">Request Payout</h3>
            <p className="text-light-muted mb-6">
              You have <span className="text-accent font-bold">${affiliate.balance.toFixed(2)}</span> available for payout.
              Minimum payout amount is <span className="font-bold">${affiliate.payout_threshold.toFixed(2)}</span>.
              This will be processed within 3-5 business days.
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

  const fetchAffiliateStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await affiliateService.getStatus();
      setAffiliateStatus(response.data);
      
      // If approved, get dashboard data
      if (response.data && response.data.status === 'approved') {
        const dashboardResponse = await affiliateService.getDashboard();
        setDashboardData(dashboardResponse.data);
      }
    } catch (err) {
      console.error('Affiliate Panel Error:', err);
      setError(err.message);
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
      <div className="bg-romantic/10 border border-romantic rounded-lg p-6">
        <i className="fas fa-exclamation-circle mr-2"></i>
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Not an affiliate yet */}
      {!affiliateStatus?.isAffiliate && affiliateStatus?.canApply && (
        <AffiliateApplication onApplicationSubmitted={handleApplicationSubmitted} />
      )}

      {/* Pending application */}
      {affiliateStatus?.status === 'pending' && (
        <div className="bg-accent/10 border border-accent rounded-lg p-6">
          <h3 className="font-bold text-accent mb-2">
            <i className="fas fa-clock mr-2"></i>
            Application Under Review
          </h3>
          <p className="text-light-muted">
            Thank you for applying to our affiliate program! We're reviewing your application and will email you within 2-3 business days with our decision.
          </p>
        </div>
      )}

      {/* Denied application */}
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
          {affiliateStatus.next_allowed_application_date && new Date() < new Date(affiliateStatus.next_allowed_application_date) && (
            <p className="text-sm text-light-muted">
              You may reapply after {new Date(affiliateStatus.next_allowed_application_date).toLocaleDateString()}.
            </p>
          )}
          {affiliateStatus.canApply && (
            <div className="mt-4">
              <AffiliateApplication onApplicationSubmitted={handleApplicationSubmitted} />
            </div>
          )}
        </div>
      )}

      {/* Approved - show dashboard */}
      {affiliateStatus?.status === 'approved' && dashboardData && (
        <AffiliateDashboard 
          affiliateData={dashboardData} 
          onRegenerateCode={handleDataRefresh}
        />
      )}

      {/* Suspended account */}
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