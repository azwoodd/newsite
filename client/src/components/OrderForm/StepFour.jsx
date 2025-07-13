import { useState, useEffect } from 'react';
import CheckoutForm from './CheckoutForm';
import { affiliateService } from '../../services/affiliateService';

const StepFour = ({ formData, setFormData, prevStep, onSubmit, loading, error, calculateTotalPrice }) => {
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoError, setPromoError] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validatedPromoData, setValidatedPromoData] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    // Check URL parameters for affiliate code
    const urlParams = new URLSearchParams(window.location.search);
    const refCode = urlParams.get('ref');
    
    if (refCode) {
      // Store in localStorage for later use
      localStorage.setItem('affiliate_ref', refCode);
      
      // Track click event
      affiliateService.trackEvent(refCode, 'click', null, sessionStorage.getItem('session_id') || generateSessionId());
    }
    
    // Check for stored affiliate code
    const storedRef = localStorage.getItem('affiliate_ref');
    if (storedRef && !promoCode) {
      setPromoCode(storedRef);
      validatePromoCode(storedRef);
    }
  }, []);

  // Helper function to generate session ID
  const generateSessionId = () => {
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('session_id', sessionId);
    return sessionId;
  };

  // Function to validate promo code
  const validatePromoCode = async (code = promoCode) => {
    if (!code) {
      setPromoError('Please enter a promo code');
      return;
    }

    setIsValidating(true);
    setPromoError('');

    try {
      const orderTotal = calculateTotalPrice();
      const response = await affiliateService.validatePromoCode(code, orderTotal);
      
      if (response.data) {
        setPromoDiscount(response.data.discount_amount);
        setValidatedPromoData(response.data);
        setPromoError('');
        
        // Update form data with promo code info
        setFormData({
          ...formData,
          used_promo_code: response.data.code,
          promo_discount_amount: response.data.discount_amount,
          referring_affiliate_id: response.data.affiliate_id
        });
      }
    } catch (error) {
      setPromoError(error.message || 'Invalid promo code');
      setPromoDiscount(0);
      setValidatedPromoData(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Function to remove promo code
  const removePromoCode = () => {
    setPromoCode('');
    setPromoDiscount(0);
    setPromoError('');
    setValidatedPromoData(null);
    setFormData({
      ...formData,
      used_promo_code: null,
      promo_discount_amount: 0,
      referring_affiliate_id: null
    });
  };

  const PromoCodeSection = () => (
    <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
      <h3 className="text-lg font-semibold mb-3">Promo Code</h3>
      
      {!validatedPromoData ? (
        <div className="space-y-3">
          <div className="flex space-x-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              className="flex-1 px-4 py-2 bg-white/5 border border-white/20 rounded-lg focus:outline-none focus:border-accent"
              disabled={isValidating}
            />
            <button
              onClick={() => validatePromoCode()}
              disabled={isValidating || !promoCode}
              className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50"
            >
              {isValidating ? (
                <i className="fas fa-spinner fa-spin"></i>
              ) : (
                'Apply'
              )}
            </button>
          </div>
          
          {promoError && (
            <p className="text-sm text-romantic">
              <i className="fas fa-exclamation-circle mr-1"></i>
              {promoError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div>
              <p className="font-medium text-green-400">
                {validatedPromoData.name}
              </p>
              <p className="text-sm text-light-muted">
                {validatedPromoData.is_percentage 
                  ? `${validatedPromoData.percentage}% off`
                  : `$${validatedPromoData.discount_amount} off`
                }
              </p>
            </div>
            <button
              onClick={removePromoCode}
              className="text-romantic hover:text-romantic-light transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Order Summary Item Component
  const SummaryItem = ({ label, value }) => (
    <div className="flex justify-between mb-2">
      <span className="text-light-muted">{label}</span>
      <span>{value}</span>
    </div>
  );

  // Order Summary Component
  const OrderSummary = () => {
    const subtotal = calculateTotalPrice();
    const finalTotal = Math.max(0, subtotal - promoDiscount);
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        
        {promoDiscount > 0 && (
          <div className="flex justify-between text-green-400">
            <span>Discount:</span>
            <span>-${promoDiscount.toFixed(2)}</span>
          </div>
        )}
        
        <div className="border-t border-white/20 pt-2">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-accent">${finalTotal.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  const getAddonPrice = (addonType) => {
    switch (addonType) {
      case 'lyric-sheet':
        return { name: 'Digital Lyric Sheet', price: 14.99 };
      case 'instrumental':
        return { name: 'Instrumental Version', price: 35 };
      case 'expedited':
        return { name: 'Expedited Delivery', price: 29.99 };
      case 'physical-cd':
        return { name: 'Physical CD', price: 34.99 };
      case 'physical-vinyl':
        return { name: 'Vinyl Record', price: 119.99 };
      case 'extended':
        return { name: 'Extended Song Length', price: 49.99 };
      case 'streaming':
        return { name: 'Streaming Release', price: 34.99 };
      default:
        return null;
    }
  };

  // Check if an addon is included in the selected package
  const isAddonIncludedInPackage = (addonType) => {
    // Check if instrumental version is included in Signature or Masterpiece packages
    if (addonType === 'instrumental' && (formData.package === 'deluxe' || formData.package === 'premium')) {
      return true;
    }
    
    // Check if lyric sheet is included in Masterpiece package
    if (addonType === 'lyric-sheet' && formData.package === 'premium') {
      return true;
    }
    
    return false;
  };

  const calculateSubtotal = () => {
    const packagePrice = getPackageDetails().price;
    let addonsTotal = 0;

    if (formData.addons && formData.addons.length > 0) {
      addonsTotal = formData.addons.reduce((total, addon) => {
        // Skip addons already included in the package
        if (isAddonIncludedInPackage(addon)) {
          return total;
        }
        
        const addonPrice = getAddonPrice(addon);
        return total + (addonPrice ? addonPrice.price : 0);
      }, 0);
    }

    return packagePrice + addonsTotal;
  };

  const calculateDiscount = () => {
    if (discountCode && discountAmount > 0) {
      return (calculateSubtotal() * (discountAmount / 100)).toFixed(2);
    }
    return 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const discount = parseFloat(calculateDiscount());
    return (subtotal - discount).toFixed(2);
  };

  const getPackageDetails = () => {
    // This should be defined based on your package structure
    const packages = {
      basic: { name: 'Basic Package', price: 99 },
      standard: { name: 'Standard Package', price: 149 },
      deluxe: { name: 'Deluxe Package', price: 199 },
      premium: { name: 'Premium Package', price: 299 }
    };
    return packages[formData.package] || packages.basic;
  };

  const packageDetails = getPackageDetails();
  const subtotal = calculateSubtotal();
  const discount = calculateDiscount();
  const total = calculateTotal();
  
  // Get included addons based on package
  const getIncludedAddons = () => {
    const includedAddons = [];
    
    if (formData.package === 'deluxe' || formData.package === 'premium') {
      includedAddons.push({
        name: 'Instrumental Version',
        price: 35
      });
    }
    
    if (formData.package === 'premium') {
      includedAddons.push({
        name: 'Digital Lyric Sheet',
        price: 14.99
      });
    }
    
    return includedAddons;
  };
  
  const includedAddons = getIncludedAddons();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // NEW FUNCTION: Handle the initial order form submission
  const handleSubmitOrderInfo = async () => {
    // Validate required fields
    if (!formData.customerName || !formData.customerEmail) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Show payment form after validation passes
    setShowPaymentForm(true);
  };

  const handleSuccessfulPayment = (paymentResult) => {
    setPaymentSuccess(true);
    
    // If there's an orderId, store it
    if (paymentResult && paymentResult.orderId) {
      setOrderId(paymentResult.orderId);
    }
    
    // Call the parent onSubmit function if provided
    if (onSubmit) onSubmit(paymentResult);
  };

  return (
    <div>
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mr-4 flex-shrink-0">
          <i className="fas fa-user"></i>
        </div>
        <h3 className="text-2xl font-semibold">Complete Your Order</h3>
      </div>

      <p className="text-light-muted mb-8">
        Review your order and provide your contact information.
      </p>

      <OrderSummary />

      <PromoCodeSection />

      {paymentSuccess ? (
        // Success message after payment
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fas fa-check text-2xl text-white"></i>
          </div>
          <h3 className="text-2xl font-bold mb-4">Payment Successful!</h3>
          <p className="text-light-muted mb-6">
            Thank you for your order. We'll start working on your custom song right away.
            You'll receive a confirmation email shortly.
          </p>
          <button
            type="button"
            onClick={() => window.location.href = '/dashboard'}
            className="px-8 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-accent/10 transition-colors duration-300"
          >
            View Order Status
          </button>
        </div>
      ) : !showPaymentForm ? (
        // PART 1: Customer Info Form (shown first)
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label htmlFor="customer-name" className="block mb-2 font-medium">
                Your Name *
              </label>
              <input
                type="text"
                id="customer-name"
                name="customerName"
                value={formData.customerName || ''}
                onChange={handleInputChange}
                placeholder="Your full name"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                required
              />
            </div>

            <div>
              <label htmlFor="customer-email" className="block mb-2 font-medium">
                Email Address *
              </label>
              <input
                type="email"
                id="customer-email"
                name="customerEmail"
                value={formData.customerEmail || ''}
                onChange={handleInputChange}
                placeholder="For order confirmation and delivery"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                required
              />
            </div>

            <div>
              <label htmlFor="customer-phone" className="block mb-2 font-medium">
                Phone Number
              </label>
              <input
                type="tel"
                id="customer-phone"
                name="customerPhone"
                value={formData.customerPhone || ''}
                onChange={handleInputChange}
                placeholder="Optional"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
              />
            </div>

            <div>
              <label htmlFor="additional-requests" className="block mb-2 font-medium">
                Special Instructions (Optional)
              </label>
              <textarea
                id="additional-requests"
                name="additionalRequests"
                value={formData.additionalRequests || ''}
                onChange={handleInputChange}
                placeholder="Anything else we should know?"
                rows="2"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
              ></textarea>
            </div>
          </div>

          {error && (
            <div className="bg-romantic/10 border border-romantic rounded-lg p-4 mb-6">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}

          <div className="flex justify-between mb-8">
            <button
              type="button"
              onClick={prevStep}
              className="px-8 py-3 bg-transparent border border-white/20 text-light font-semibold rounded-full hover:bg-white/10 hover:border-white/30 transition-colors duration-300 group"
            >
              <i className="fas fa-arrow-left mr-2"></i> Back
            </button>

            <button
              type="button"
              onClick={handleSubmitOrderInfo}
              disabled={loading}
              className="px-8 py-3 bg-accent text-dark font-semibold rounded-full hover:bg-accent-alt transition-colors duration-300"
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Processing...
                </>
              ) : (
                <>
                  Complete Order
                </>
              )}
            </button>
          </div>
        </>
      ) : (
        // PART 2: Payment Form (shown after clicking Complete Order)
        <CheckoutForm
          formData={formData}
          discountAmount={promoDiscount}
          onSuccessfulPayment={handleSuccessfulPayment}
        />
      )}
    </div>
  );
};

export default StepFour;