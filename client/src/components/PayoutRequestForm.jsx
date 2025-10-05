// client/src/components/PayoutRequestForm.jsx
import { useState } from 'react';

/**
 * Payout Request Form Component
 * Collects payment information for affiliate payouts via Stripe
 * Dark theme with gold accents matching SongSculptors branding
 */
const PayoutRequestForm = ({ 
  availableBalance, 
  onSubmit, 
  onCancel, 
  isLoading = false 
}) => {
  const [formData, setFormData] = useState({
    paymentMethod: 'stripe', // stripe or bank_transfer
    stripeEmail: '',
    confirmStripeEmail: '',
    fullName: '',
    // Bank details (if needed as backup)
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    sortCode: '',
    agreeTerms: false
  });

  const [errors, setErrors] = useState({});
  const [showBankDetails, setShowBankDetails] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Full name validation
    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (formData.paymentMethod === 'stripe') {
      // Stripe email validation
      if (!formData.stripeEmail.trim()) {
        newErrors.stripeEmail = 'Stripe email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.stripeEmail)) {
        newErrors.stripeEmail = 'Please enter a valid email address';
      }

      // Confirm email
      if (formData.stripeEmail !== formData.confirmStripeEmail) {
        newErrors.confirmStripeEmail = 'Email addresses must match';
      }
    } else if (formData.paymentMethod === 'bank_transfer') {
      // Bank details validation
      if (!formData.accountHolderName.trim()) {
        newErrors.accountHolderName = 'Account holder name is required';
      }
      if (!formData.bankName.trim()) {
        newErrors.bankName = 'Bank name is required';
      }
      if (!formData.accountNumber.trim()) {
        newErrors.accountNumber = 'Account number is required';
      }
      if (!formData.sortCode.trim()) {
        newErrors.sortCode = 'Sort code is required';
      }
    }

    // Terms agreement
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = 'You must agree to the terms and conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A1A] border border-[#C4A064]/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-2xl font-bold text-white font-secondary mb-1">
              Request Payout
            </h3>
            <p className="text-white/60 text-sm">
              Available balance: <span className="text-[#C4A064] font-semibold">£{availableBalance.toFixed(2)}</span>
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-white/50 hover:text-white transition-colors"
            disabled={isLoading}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Information Box */}
        <div className="bg-[#C4A064]/10 border border-[#C4A064]/30 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <i className="fas fa-info-circle text-[#C4A064] mt-1 mr-3"></i>
            <div className="text-sm text-white/80 leading-relaxed">
              <p className="font-semibold mb-2">Payout Information:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Payouts are processed via Stripe within 3-5 business days</li>
                <li>Minimum payout threshold: £10.00</li>
                <li>Commission must be at least 14 days old to be eligible</li>
                <li>All payments are made in GBP (£)</li>
              </ul>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-2">
              Full Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-white/5 border ${
                errors.fullName ? 'border-red-400' : 'border-white/10'
              } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none transition-colors`}
              placeholder="Enter your full legal name"
              disabled={isLoading}
            />
            {errors.fullName && (
              <p className="text-red-400 text-sm mt-1">{errors.fullName}</p>
            )}
          </div>

          {/* Payment Method Selection */}
          <div>
            <label className="block text-sm font-medium text-white/90 mb-3">
              Payment Method <span className="text-red-400">*</span>
            </label>
            <div className="space-y-3">
              {/* Stripe Option */}
              <div
                onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'stripe' }))}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.paymentMethod === 'stripe'
                    ? 'border-[#C4A064] bg-[#C4A064]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="stripe"
                  checked={formData.paymentMethod === 'stripe'}
                  onChange={handleChange}
                  className="mr-3 accent-[#C4A064]"
                />
                <div className="flex-1">
                  <div className="flex items-center">
                    <i className="fab fa-stripe text-[#635BFF] text-2xl mr-3"></i>
                    <div>
                      <p className="font-semibold text-white">Stripe Payout (Recommended)</p>
                      <p className="text-sm text-white/60">Fast, secure, automatic processing</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bank Transfer Option */}
              <div
                onClick={() => {
                  setFormData(prev => ({ ...prev, paymentMethod: 'bank_transfer' }));
                  setShowBankDetails(true);
                }}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                  formData.paymentMethod === 'bank_transfer'
                    ? 'border-[#C4A064] bg-[#C4A064]/10'
                    : 'border-white/10 bg-white/5 hover:border-white/20'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="bank_transfer"
                  checked={formData.paymentMethod === 'bank_transfer'}
                  onChange={handleChange}
                  className="mr-3 accent-[#C4A064]"
                />
                <div className="flex-1">
                  <div className="flex items-center">
                    <i className="fas fa-university text-[#C4A064] text-2xl mr-3"></i>
                    <div>
                      <p className="font-semibold text-white">Bank Transfer</p>
                      <p className="text-sm text-white/60">Manual processing, 5-7 business days</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stripe Email Fields */}
          {formData.paymentMethod === 'stripe' && (
            <>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Stripe Account Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="stripeEmail"
                  value={formData.stripeEmail}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.stripeEmail ? 'border-red-400' : 'border-white/10'
                  } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none transition-colors`}
                  placeholder="your.email@example.com"
                  disabled={isLoading}
                />
                {errors.stripeEmail && (
                  <p className="text-red-400 text-sm mt-1">{errors.stripeEmail}</p>
                )}
                <p className="text-white/50 text-xs mt-1">
                  This is the email associated with your Stripe account
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Confirm Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="confirmStripeEmail"
                  value={formData.confirmStripeEmail}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.confirmStripeEmail ? 'border-red-400' : 'border-white/10'
                  } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none transition-colors`}
                  placeholder="Confirm your email"
                  disabled={isLoading}
                />
                {errors.confirmStripeEmail && (
                  <p className="text-red-400 text-sm mt-1">{errors.confirmStripeEmail}</p>
                )}
              </div>
            </>
          )}

          {/* Bank Details Fields */}
          {formData.paymentMethod === 'bank_transfer' && showBankDetails && (
            <div className="space-y-4 border border-white/10 rounded-lg p-4 bg-white/5">
              <p className="text-sm text-white/70 mb-3">
                <i className="fas fa-exclamation-triangle text-yellow-400 mr-2"></i>
                Bank transfers are processed manually and may take 5-7 business days
              </p>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Account Holder Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="accountHolderName"
                  value={formData.accountHolderName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.accountHolderName ? 'border-red-400' : 'border-white/10'
                  } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none`}
                  placeholder="As it appears on your bank account"
                  disabled={isLoading}
                />
                {errors.accountHolderName && (
                  <p className="text-red-400 text-sm mt-1">{errors.accountHolderName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">
                  Bank Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="bankName"
                  value={formData.bankName}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-white/5 border ${
                    errors.bankName ? 'border-red-400' : 'border-white/10'
                  } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none`}
                  placeholder="e.g., Barclays, HSBC, Lloyds"
                  disabled={isLoading}
                />
                {errors.bankName && (
                  <p className="text-red-400 text-sm mt-1">{errors.bankName}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Account Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border ${
                      errors.accountNumber ? 'border-red-400' : 'border-white/10'
                    } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none`}
                    placeholder="8 digits"
                    maxLength="8"
                    disabled={isLoading}
                  />
                  {errors.accountNumber && (
                    <p className="text-red-400 text-sm mt-1">{errors.accountNumber}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">
                    Sort Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="sortCode"
                    value={formData.sortCode}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-white/5 border ${
                      errors.sortCode ? 'border-red-400' : 'border-white/10'
                    } rounded-lg text-white placeholder-white/40 focus:border-[#C4A064] focus:outline-none`}
                    placeholder="XX-XX-XX"
                    maxLength="8"
                    disabled={isLoading}
                  />
                  {errors.sortCode && (
                    <p className="text-red-400 text-sm mt-1">{errors.sortCode}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Terms and Conditions */}
          <div className="flex items-start">
            <input
              type="checkbox"
              name="agreeTerms"
              checked={formData.agreeTerms}
              onChange={handleChange}
              className="mt-1 mr-3 accent-[#C4A064]"
              disabled={isLoading}
            />
            <label className="text-sm text-white/80">
              I confirm that the payment information provided is accurate and I understand that:
              <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
                <li>Payouts are processed within 3-5 business days for Stripe</li>
                <li>Bank transfers may take 5-7 business days</li>
                <li>I am responsible for any taxes on affiliate earnings</li>
                <li>False information may result in payout delays or account suspension</li>
              </ul>
            </label>
          </div>
          {errors.agreeTerms && (
            <p className="text-red-400 text-sm">{errors.agreeTerms}</p>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 border border-white/20 rounded-lg text-white hover:bg-white/5 transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-3 bg-gradient-to-r from-[#C4A064] to-[#D4B074] text-black font-semibold rounded-lg hover:shadow-lg hover:shadow-[#C4A064]/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : (
                <>
                  <i className="fas fa-check mr-2"></i>
                  Submit Payout Request
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PayoutRequestForm;