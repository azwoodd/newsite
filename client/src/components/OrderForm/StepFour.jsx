import { useState, useEffect } from 'react';
import CheckoutForm from './CheckoutForm';

// Order Summary Item Component
const SummaryItem = ({ label, value }) => (
  <div className="flex justify-between mb-2">
    <span className="text-light-muted">{label}</span>
    <span>{value}</span>
  </div>
);

// Order Summary Component
const OrderSummary = ({ formData, discountCode, discountAmount }) => {
  const getPackageDetails = () => {
    switch (formData.package) {
      case 'basic':
        return { name: 'Essential Package', price: 39.99 };
      case 'deluxe':
        return { name: 'Signature Package', price: 74.99 };
      case 'premium':
        return { name: 'Masterpiece Package', price: 139.99 };
      default:
        return { name: 'Signature Package', price: 74.99 };
    }
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

  return (
    <div className="bg-black/20 rounded-lg p-6 mb-6">
      <div className="flex justify-between items-center pb-2 mb-4 border-b border-white/10">
        <h3 className="text-xl font-semibold">Order Summary</h3>
      </div>

      <div className="mb-4">
        <SummaryItem
          label={packageDetails.name}
          value={`£${packageDetails.price.toFixed(2)}`}
        />
        
        {/* Show included addons */}
        {includedAddons.length > 0 && (
          <div className="mt-2 mb-2 pl-4 border-l-2 border-accent/20">
            <p className="text-xs text-light-muted mb-1">Included in your package:</p>
            {includedAddons.map((addon, index) => (
              <SummaryItem
                key={`included-${index}`}
                label={addon.name}
                value="Included"
              />
            ))}
          </div>
        )}

        {/* Show selected addons that aren't already included */}
        {formData.addons && formData.addons.map((addon) => {
          // Skip addons already included in the package
          if (isAddonIncludedInPackage(addon)) {
            return null;
          }
          
          const addonDetails = getAddonPrice(addon);
          if (addonDetails) {
            return (
              <SummaryItem
                key={addon}
                label={addonDetails.name}
                value={`£${addonDetails.price.toFixed(2)}`}
              />
            );
          }
          return null;
        })}
      </div>

      <div className="border-t border-dashed border-white/10 my-4 pt-4">
        <SummaryItem
          label="Subtotal"
          value={`£${subtotal.toFixed(2)}`}
        />

        {discountCode && discountAmount > 0 && (
          <SummaryItem
            label={`Discount (${discountAmount}% off)`}
            value={`-£${discount}`}
          />
        )}
      </div>

      <div className="flex justify-between font-bold text-lg border-t border-white/10 pt-4">
        <span>Total:</span>
        <span className="text-accent">£{total}</span>
      </div>
    </div>
  );
};

const StepFour = ({ formData, setFormData, prevStep, onSubmit, loading, error, calculateTotalPrice }) => {
  const [discountCode, setDiscountCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [codeError, setCodeError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // NEW STATE: Control whether to show the payment form
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  // NEW STATE: Track if the order has been submitted
  const [orderSubmitted, setOrderSubmitted] = useState(false);
  // NEW STATE: Store the order ID after creation
  const [orderId, setOrderId] = useState(null);

  useEffect(() => {
    const savedDiscountCode = localStorage.getItem('discountCode');
    if (savedDiscountCode) {
      setDiscountCode(savedDiscountCode);
      setEnteredCode(savedDiscountCode);
      setDiscountAmount(10);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleApplyDiscount = () => {
    if (!enteredCode) {
      setCodeError('Please enter a discount code');
      return;
    }

    const savedDiscountCode = localStorage.getItem('discountCode');
    if (savedDiscountCode && enteredCode.toUpperCase() === savedDiscountCode.toUpperCase()) {
      setDiscountCode(savedDiscountCode);
      setDiscountAmount(10);
      setCodeError('');
    } else if (enteredCode.toUpperCase() === 'WELCOME10' || enteredCode.toUpperCase() === 'FIRST10') {
      setDiscountCode(enteredCode.toUpperCase());
      setDiscountAmount(10);
      setCodeError('');
    } else {
      setCodeError('Invalid or expired discount code');
      setDiscountCode('');
      setDiscountAmount(0);
    }
  };

  // NEW FUNCTION: Handle the initial order form submission
  const handleSubmitOrderInfo = async () => {
    // Validate required fields
    if (!formData.customerName || !formData.customerEmail) {
      setError('Please fill in all required fields');
      return;
    }
    
    // Save discount code in localStorage for next time
    if (discountCode) {
      localStorage.setItem('discountCode', discountCode);
    }
    
    // Show payment form after validation passes
    setShowPaymentForm(true);
  };

  const handleSuccessfulPayment = (paymentResult) => {
    setPaymentSuccess(true);
    
    // Clear discount code from localStorage after successful payment
    if (discountCode) localStorage.removeItem('discountCode');
    
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

      <OrderSummary
        formData={formData}
        discountCode={discountCode}
        discountAmount={discountAmount}
      />

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

          <div className="mb-8 bg-white/5 rounded-lg p-6 border border-white/10">
            <h4 className="font-semibold mb-4">Discount Code</h4>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                placeholder="Enter your discount code"
                className="flex-grow p-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent transition-colors"
              />
              <button
                type="button"
                onClick={handleApplyDiscount}
                className="px-6 py-3 bg-accent text-dark font-medium rounded-lg hover:bg-accent-alt transition-colors"
              >
                Apply Code
              </button>
            </div>

            {codeError && (
              <p className="text-romantic text-sm mt-2">
                <i className="fas fa-exclamation-circle mr-1"></i>
                {codeError}
              </p>
            )}

            {discountCode && discountAmount > 0 && (
              <div className="mt-3 p-3 bg-accent/10 border border-accent/20 rounded-lg flex items-center">
                <i className="fas fa-check-circle text-accent mr-2"></i>
                <span>
                  <strong>{discountCode}</strong> applied: {discountAmount}% discount
                </span>
              </div>
            )}
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
          discountAmount={discountAmount}
          onSuccessfulPayment={handleSuccessfulPayment}
        />
      )}
    </div>
  );
};

export default StepFour;