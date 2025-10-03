import { useState } from 'react';
import CheckoutForm from './CheckoutForm';

const StepFour = ({ formData, setFormData, prevStep, onSubmit, loading, error }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Check if an addon is included in the selected package
  const isAddonIncludedInPackage = (addonType) => {
    if (formData.package === 'signature' || formData.package === 'masterpiece') {
      if (addonType === 'instrumental' || addonType === 'expedited') return true;
    }
    if (formData.package === 'masterpiece' && addonType === 'lyric-sheet') {
      return true;
    }
    return false;
  };

  const getPackageDetails = () => {
    const packages = {
      essential:   { name: 'Essential Package',   price: 39.99 },
      signature:   { name: 'Signature Package',   price: 99.99 },
      masterpiece: { name: 'Masterpiece Package', price: 179.99 }
    };
    return packages[formData.package] || packages.essential;
  };

  const getAddonPrice = (addonType) => {
    const prices = {
      'lyric-sheet':   { name: 'Digital Lyric Sheet',     price: 14.99 },
      'instrumental':  { name: 'Instrumental Version',    price: 35.00 },
      'expedited':     { name: 'Expedited Delivery',      price: 19.99 },
      'physical-cd':   { name: 'Physical CD',             price: 24.99 },
      'physical-vinyl':{ name: 'Vinyl Record',            price: 59.99 },
      'extended':      { name: 'Extended Song Length',    price: 49.99 },
      'streaming':     { name: 'Streaming Release',       price: 34.99 }
    };
    return prices[addonType] || null;
  };

  const getIncludedAddons = () => {
    const included = [];
    if (formData.package === 'signature' || formData.package === 'masterpiece') {
      included.push({ name: 'Instrumental Version', price: 35.00 });
      included.push({ name: 'Expedited Delivery',   price: 19.99 });
    }
    if (formData.package === 'masterpiece') {
      included.push({ name: 'Digital Lyric Sheet',  price: 14.99 });
    }
    return included;
  };

  const calculateSubtotal = () => {
    let total = 0;
    
    // Base package price
    switch (formData.package) {
      case 'essential':   total += 39.99; break;
      case 'signature':   total += 99.99; break;
      case 'masterpiece': total += 179.99; break;
      default:            total += 39.99;
    }
    
    // Add paid addon prices
    if (formData.addons && formData.addons.length > 0) {
      formData.addons.forEach(addon => {
        if (!isAddonIncludedInPackage(addon)) {
          const addonInfo = getAddonPrice(addon);
          if (addonInfo) total += addonInfo.price;
        }
      });
    }
    
    // Cap total
    return Math.min(total, 250.00);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmitOrderInfo = () => {
    if (!formData.customerName || !formData.customerEmail) {
      alert('Please fill in all required fields');
      return;
    }
    setShowPaymentForm(true);
  };

  const handleSuccessfulPayment = (paymentResult) => {
    setPaymentSuccess(true);
    if (onSubmit) {
      onSubmit(paymentResult);
    }
  };

  // Order Summary Component
  const OrderSummary = () => {
    const packageDetails = getPackageDetails();
    const includedAddons = getIncludedAddons();
    const paidAddons = formData.addons ? formData.addons.filter(addon => !isAddonIncludedInPackage(addon)) : [];

    return (
      <div className="mb-8 p-6 bg-white/5 rounded-lg border border-white/10">
        <h3 className="text-xl font-semibold mb-4">Order Summary</h3>
        
        {/* Package */}
        <div className="flex justify-between items-center mb-3">
          <span className="text-light-muted">{packageDetails.name}:</span>
          <span className="font-semibold">£{packageDetails.price.toFixed(2)}</span>
        </div>
        
        {/* Included Add-ons */}
        {includedAddons.length > 0 && (
          <div className="mb-3 pl-4 border-l-2 border-green-500/30">
            <span className="text-xs text-green-400 font-medium">✓ Included:</span>
            {includedAddons.map((addon, index) => (
              <div key={index} className="text-sm text-green-400/80 ml-2">
                {addon.name}
              </div>
            ))}
          </div>
        )}
        
        {/* Paid Add-ons */}
        {paidAddons.length > 0 && (
          <div className="mb-3">
            {paidAddons.map(addon => {
              const addonInfo = getAddonPrice(addon);
              if (!addonInfo) return null;
              return (
                <div key={addon} className="flex justify-between items-center mb-2 text-sm">
                  <span className="text-light-muted">{addonInfo.name}:</span>
                  <span>£{addonInfo.price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between items-center pt-3 border-t border-white/10">
          <span className="text-lg font-bold">Total:</span>
          <span className="text-lg font-bold text-accent">£{calculateSubtotal().toFixed(2)}</span>
        </div>
      </div>
    );
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

      {paymentSuccess ? (
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
                <>Continue to Payment</>
              )}
            </button>
          </div>
        </>
      ) : (
        <CheckoutForm
          formData={formData}
          onSuccessfulPayment={handleSuccessfulPayment}
        />
      )}
    </div>
  );
};

export default StepFour;
