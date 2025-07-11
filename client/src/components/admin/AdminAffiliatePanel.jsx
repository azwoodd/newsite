// client/src/components/admin/AdminAffiliatePanel.jsx - FIXED VERSION
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
      
      // SAFE: Handle if response.data.codes is undefined
      const codes = response?.data?.codes || [];
      setPromoCodes(codes);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError(err.message);
      setPromoCodes([]); // SET SAFE DEFAULT
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoCodes();
  }, []);

  const handleCreateCode = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    setError(null);

    try {
      await adminAffiliateService.createDiscountCode({
        code: formData.code.toUpperCase(),
        name: formData.name,
        discountAmount: parseFloat(formData.discountAmount),
        isPercentage: formData.isPercentage,
        maxUses: formData.maxUses ? parseInt(formData.maxUses) : 0,
        maxUsesPerUser: parseInt(formData.maxUsesPerUser),
        startsAt: formData.startsAt || null,
        expiresAt: formData.expiresAt || null
      });

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

  const handleToggleCode = async (codeId, currentActive) => {
    try {
      await adminAffiliateService.updatePromoCode(codeId, {
        isActive: !currentActive
      });
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

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
        </div>
      ) : (
        <div className="bg-white/5 rounded-lg border border-white/10 overflow-hidden">
          {promoCodes.length === 0 ? (
            <div className="p-8 text-center text-light-muted">
              <i className="fas fa-tags text-4xl mb-4 opacity-50"></i>
              <p>No promo codes found. Create your first discount code to get started!</p>
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
                    <th className="px-4 py-3 font-medium">Uses</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promoCodes.map((code) => (
                    <tr key={code.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="px-4 py-3 font-mono font-bold text-accent">{code.code}</td>
                      <td className="px-4 py-3">{code.name}</td>
                      <td className="px-4 py-3">
                        {code.is_percentage ? `${code.discount_amount}%` : `$${code.discount_amount}`}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          code.type === 'affiliate' 
                            ? 'bg-blue-500/20 text-blue-300' 
                            : 'bg-purple-500/20 text-purple-300'
                        }`}>
                          {code.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {code.current_uses} / {code.max_uses || '∞'}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={code.is_active ? 'approved' : 'suspended'} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleCode(code.id, code.is_active)}
                          className={`px-3 py-1 rounded text-xs transition-colors ${
                            code.is_active
                              ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                              : 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
                          }`}
                        >
                          {code.is_active ? 'Deactivate' : 'Activate'}
                        </button>
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
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-deep border border-white/10 rounded-lg w-full max-w-md">
            <div className="flex justify-between items-center p-6 border-b border-white/10">
              <h3 className="text-xl font-bold">Create Discount Code</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-light-muted hover:text-white"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleCreateCode} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="WELCOME10"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Welcome Discount"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded focus:outline-none focus:border-accent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Discount *</label>
                  <input
                    type="number"
                    value={formData.discountAmount}
                    onChange={(e) => setFormData({ ...formData, discountAmount: e.target.value })}
                    placeholder="10"
                    step="0.01"
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded focus:outline-none focus:border-accent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Type</label>
                  <select
                    value={formData.isPercentage}
                    onChange={(e) => setFormData({ ...formData, isPercentage: e.target.value === 'true' })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded focus:outline-none focus:border-accent"
                  >
                    <option value="true">Percentage (%)</option>
                    <option value="false">Fixed Amount ($)</option>
                  </select>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 px-4 py-2 bg-accent text-dark rounded hover:bg-accent-alt transition-colors disabled:opacity-50"
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
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 border border-white/20 rounded hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
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

  const fetchAffiliates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await adminAffiliateService.getAllAffiliates({
        limit: 50,
        sortBy: 'created_at',
        sortOrder: 'DESC'
      });
      
      // SAFE: Handle if response.data.affiliates is undefined
      const affiliatesData = response?.data?.affiliates || [];
      setAffiliates(affiliatesData);
    } catch (err) {
      console.error('Error fetching affiliates:', err);
      setError(err.message);
      setAffiliates([]); // SET SAFE DEFAULT
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
                      <td className="px-4 py-3">
                        <StatusBadge status={affiliate.status} />
                      </td>
                      <td className="px-4 py-3 text-sm text-light-muted">
                        {new Date(affiliate.application_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-2">
                          {affiliate.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(affiliate.id)}
                                className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/30 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleDeny(affiliate.id)}
                                className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs hover:bg-red-500/30 transition-colors"
                              >
                                Deny
                              </button>
                            </>
                          )}
                          {affiliate.status === 'approved' && (
                            <button
                              onClick={() => handleStatusChange(affiliate.id, 'suspended')}
                              className="px-3 py-1 bg-red-500/20 text-red-300 rounded text-xs hover:bg-red-500/30 transition-colors"
                            >
                              Suspend
                            </button>
                          )}
                          {affiliate.status === 'suspended' && (
                            <button
                              onClick={() => handleStatusChange(affiliate.id, 'approved')}
                              className="px-3 py-1 bg-green-500/20 text-green-300 rounded text-xs hover:bg-green-500/30 transition-colors"
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