import { useState, useEffect } from 'react';
import { adminAffiliateService } from '../../services/affiliateService';

// Affiliate Status Badge Component
const StatusBadge = ({ status }) => {
  const getStatusStyles = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-500/20 text-green-300 border-green-500/20';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/20';
      case 'denied':
        return 'bg-red-500/20 text-red-300 border-red-500/20';
      case 'suspended':
        return 'bg-gray-500/20 text-gray-300 border-gray-500/20';
      default:
        return 'bg-white/20 text-white border-white/20';
    }
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(status)}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

// Promo Code Management Component
const PromoCodeManager = () => {
  const [promoCodes, setPromoCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    discountAmount: '',
    isPercentage: true,
    maxUses: '',
    maxUsesPerUser: '1',
    startsAt: '',
    expiresAt: ''
  });

  const fetchPromoCodes = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAffiliateService.getAllPromoCodes({
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      
      const codes = response?.data?.codes || [];
      setPromoCodes(codes);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError(err.message);
      setPromoCodes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleCreateCode = async () => {
    // Validation
    if (!formData.code || !formData.name || !formData.discountAmount) {
      setError('Please fill in all required fields');
      return;
    }

    const discountValue = parseFloat(formData.discountAmount);
    if (isNaN(discountValue) || discountValue <= 0) {
      setError('Discount amount must be a positive number');
      return;
    }

    if (formData.isPercentage && discountValue > 100) {
      setError('Percentage discount cannot exceed 100%');
      return;
    }

    setCreateLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await adminAffiliateService.createDiscountCode({
        code: formData.code.toUpperCase(),
        name: formData.name,
        discountAmount: discountValue,
        isPercentage: formData.isPercentage,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : 0,
        maxUsesPerUser: formData.maxUsesPerUser ? parseInt(formData.maxUsesPerUser) : 1,
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null
      });
      
      setSuccess('Discount code created successfully!');
      setShowCreateForm(false);
      setFormData({
        code: '',
        name: '',
        discountAmount: '',
        isPercentage: true,
        maxUses: '',
        maxUsesPerUser: '1',
        startsAt: '',
        expiresAt: ''
      });
      await fetchPromoCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const handleToggleCode = async (codeId, currentStatus) => {
    try {
      await adminAffiliateService.updatePromoCode(codeId, {
        isActive: !currentStatus
      });
      await fetchPromoCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCode = async (codeId) => {
    if (!confirm('Are you sure you want to delete this promo code?')) return;
    
    try {
      await adminAffiliateService.deletePromoCode(codeId);
      await fetchPromoCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold font-secondary">Promo Codes</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors"
        >
          <i className="fas fa-plus mr-2"></i>
          Create Discount Code
        </button>
      </div>

      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500 rounded-lg p-4">
          <i className="fas fa-check-circle mr-2"></i>
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          {promoCodes.length === 0 ? (
            <div className="p-8 text-center text-light-muted">
              <i className="fas fa-tag text-4xl mb-4 opacity-50"></i>
              <p>No promo codes found. Create your first discount code!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Discount</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Usage</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.map((code) => (
                    <tr key={code.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <span className="font-mono text-accent">{code.code}</span>
                      </td>
                      <td className="px-4 py-3">{code.name}</td>
                      <td className="px-4 py-3">
                        {code.is_percentage 
                          ? `${code.discount_amount}%`
                          : `$${code.discount_amount}`
                        }
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs ${code.type === 'affiliate' ? 'text-purple-400' : 'text-blue-400'}`}>
                          {code.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {code.max_uses > 0 
                          ? `${code.current_uses}/${code.max_uses}`
                          : code.current_uses
                        }
                      </td>
                      <td className="px-4 py-3">
                        {code.is_active ? (
                          <span className="text-green-400">Active</span>
                        ) : (
                          <span className="text-gray-400">Inactive</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          {code.type !== 'affiliate' && (
                            <>
                              <button
                                onClick={() => handleToggleCode(code.id, code.is_active)}
                                className="text-sm text-accent hover:text-accent-alt"
                              >
                                {code.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDeleteCode(code.id)}
                                className="text-sm text-romantic hover:text-romantic-light"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Code Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark border border-white/10 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-4">Create Discount Code</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  placeholder="e.g., SAVE20"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., 20% Off First Order"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Discount Type *</label>
                <div className="flex space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.isPercentage}
                      onChange={() => setFormData({ ...formData, isPercentage: true })}
                      className="mr-2"
                    />
                    Percentage
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.isPercentage}
                      onChange={() => setFormData({ ...formData, isPercentage: false })}
                      className="mr-2"
                    />
                    Fixed Amount
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Discount Amount * {formData.isPercentage ? '(%)' : '($)'}
                </label>
                <input
                  type="number"
                  value={formData.discountAmount}
                  onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                  placeholder={formData.isPercentage ? "e.g., 20" : "e.g., 10"}
                  min="0"
                  max={formData.isPercentage ? "100" : undefined}
                  step="0.01"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Uses (0 = unlimited)</label>
                <input
                  type="number"
                  value={formData.maxUses}
                  onChange={(e) => setFormData({ ...formData, maxUses: e.target.value })}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Uses Per User</label>
                <input
                  type="number"
                  value={formData.maxUsesPerUser}
                  onChange={(e) => setFormData({ ...formData, maxUsesPerUser: e.target.value })}
                  placeholder="1"
                  min="1"
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Start Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.startsAt}
                  onChange={(e) => setFormData({ ...formData, startsAt: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expiry Date (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateCode}
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
                >
                  {createLoading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Creating...
                    </>
                  ) : (
                    'Create Code'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Affiliate Management Component
const AffiliateManager = () => {
  const [affiliates, setAffiliates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAffiliateService.getAllAffiliates({
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      
      const affiliatesData = response?.data?.affiliates || [];
      setAffiliates(affiliatesData);
    } catch (err) {
      console.error('Error fetching affiliates:', err);
      setError(err.message);
      setAffiliates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const handleStatusChange = async (affiliateId, newStatus) => {
    try {
      await adminAffiliateService.updateAffiliateStatus(affiliateId, newStatus);
      await fetchAffiliates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleApprove = async (affiliateId) => {
    try {
      await adminAffiliateService.approveAffiliate(affiliateId, {
        commissionRate: 10,
        adminNotes: 'Approved via admin dashboard'
      });
      await fetchAffiliates();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeny = async (affiliateId) => {
    try {
      await adminAffiliateService.denyAffiliate(affiliateId, {
        denialReason: 'Application does not meet current requirements',
        allowReapplication: true
      });
      await fetchAffiliates();
    } catch (err) {
      setError(err.message);
    }
  };

  const viewAffiliateDetails = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setShowDetails(true);
  };

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold font-secondary">Affiliate Applications</h3>

      {error && (
        <div className="bg-romantic/10 border border-romantic rounded-lg p-4">
          <i className="fas fa-exclamation-circle mr-2"></i>
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          {affiliates.length === 0 ? (
            <div className="p-8 text-center text-light-muted">
              <i className="fas fa-handshake text-4xl mb-4 opacity-50"></i>
              <p>No affiliate applications found. Applications will appear here when users apply.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr className="text-left">
                    <th className="px-4 py-3 font-medium">Affiliate</th>
                    <th className="px-4 py-3 font-medium">Code</th>
                    <th className="px-4 py-3 font-medium">Commission</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Applied</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {affiliates.map((affiliate) => (
                    <tr key={affiliate.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium">{affiliate.name}</div>
                          <div className="text-sm text-light-muted">{affiliate.email}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {affiliate.affiliate_code ? (
                          <span className="font-mono text-accent">{affiliate.affiliate_code}</span>
                        ) : (
                          <span className="text-light-muted">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">{affiliate.commission_rate}%</td>
                      <td className="px-4 py-3">${affiliate.balance?.toFixed(2) || '0.00'}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={affiliate.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-light-muted">
                        {new Date(affiliate.application_date || affiliate.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => viewAffiliateDetails(affiliate)}
                            className="text-sm text-accent hover:text-accent-alt"
                          >
                            View
                          </button>
                          {affiliate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(affiliate.id)}
                                className="text-sm text-green-400 hover:text-green-300"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeny(affiliate.id)}
                                className="text-sm text-romantic hover:text-romantic-light"
                              >
                                Deny
                              </button>
                            </>
                          )}
                          {affiliate.status === 'approved' && (
                            <button
                              onClick={() => handleStatusChange(affiliate.id, 'suspended')}
                              className="text-sm text-romantic hover:text-romantic-light"
                            >
                              Suspend
                            </button>
                          )}
                          {affiliate.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(affiliate.id, 'approved')}
                              className="text-sm text-green-400 hover:text-green-300"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Affiliate Details Modal */}
      {showDetails && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark border border-white/10 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Affiliate Details</h3>
              <button
                onClick={() => {
                  setShowDetails(false);
                  setSelectedAffiliate(null);
                }}
                className="text-white/50 hover:text-white"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-light-muted">Name</p>
                  <p className="font-medium">{selectedAffiliate.name}</p>
                </div>
                <div>
                  <p className="text-sm text-light-muted">Email</p>
                  <p className="font-medium">{selectedAffiliate.email}</p>
                </div>
                <div>
                  <p className="text-sm text-light-muted">Status</p>
                  <StatusBadge status={selectedAffiliate.status} />
                </div>
                <div>
                  <p className="text-sm text-light-muted">Commission Rate</p>
                  <p className="font-medium">{selectedAffiliate.commission_rate}%</p>
                </div>
              </div>

              {selectedAffiliate.content_platforms && (
                <div>
                  <p className="text-sm text-light-muted mb-2">Content Platforms</p>
                  <div className="bg-white/5 rounded p-3">
                    {JSON.parse(selectedAffiliate.content_platforms).map((platform, idx) => (
                      <span key={idx} className="inline-block bg-accent/20 text-accent px-3 py-1 rounded-full text-sm mr-2 mb-2">
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedAffiliate.audience_info && (
                <div>
                  <p className="text-sm text-light-muted mb-2">Audience Info</p>
                  <div className="bg-white/5 rounded p-3">
                    <p className="text-sm">{selectedAffiliate.audience_info}</p>
                  </div>
                </div>
              )}

              {selectedAffiliate.promotion_strategy && (
                <div>
                  <p className="text-sm text-light-muted mb-2">Promotion Strategy</p>
                  <div className="bg-white/5 rounded p-3">
                    <p className="text-sm">{selectedAffiliate.promotion_strategy}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent">${selectedAffiliate.total_earnings?.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-light-muted">Total Earned</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">{selectedAffiliate.total_conversions || 0}</p>
                  <p className="text-sm text-light-muted">Conversions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {selectedAffiliate.conversion_rate?.toFixed(1) || '0.0'}%
                  </p>
                  <p className="text-sm text-light-muted">Conv. Rate</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Admin Affiliate Panel Component
const AdminAffiliatePanel = () => {
  const [activeTab, setActiveTab] = useState('affiliates');

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-2 font-secondary">Affiliate Management</h2>
        <p className="text-light-muted">
          Manage affiliate applications, discount codes, and track performance.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('affiliates')}
          className={`pb-2 px-1 border-b-2 transition-colors ${
            activeTab === 'affiliates'
              ? 'border-accent text-accent'
              : 'border-transparent text-light-muted hover:text-white'
          }`}
        >
          Affiliates
        </button>
        <button
          onClick={() => setActiveTab('codes')}
          className={`pb-2 px-1 border-b-2 transition-colors ${
            activeTab === 'codes'
              ? 'border-accent text-accent'
              : 'border-transparent text-light-muted hover:text-white'
          }`}
        >
          Promo Codes
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'affiliates' ? <AffiliateManager /> : <PromoCodeManager />}
    </div>
  );
};

export default AdminAffiliatePanel;