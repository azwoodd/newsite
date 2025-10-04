import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PromoCodeInput from './PromoCodeInput';

const CheckoutForm = ({ formData, promoCode = '', onSuccessfulPayment }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  
  // State management
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  
  // Customer information
  const [customerInfo, setCustomerInfo] = useState({
    name: formData.customerName || '',
    email: formData.customerEmail || '',
    address: '',
    city: '',
    postcode: '',
    country: 'GB' // Default to UK
  });
  
  // Discount tracking
  const [discountBreakdown, setDiscountBreakdown] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState('');

    // ✅ ADD THIS NEW useEffect HERE (between state and handlers)
  useEffect(() => {
    const storedTracking = localStorage.getItem('affiliate_tracking');
    
    if (storedTracking && !appliedPromoCode) {
      try {
        const trackingData = JSON.parse(storedTracking);
        
        // Check if tracking is still valid (within 30 days)
        const trackingDate = new Date(trackingData.timestamp);
        const daysSinceTracking = (new Date() - trackingDate) / (1000 * 60 * 60 * 24);
        
        if (daysSinceTracking <= 30 && trackingData.code) {
          console.log('Auto-applying affiliate code from localStorage:', trackingData.code);
          setAppliedPromoCode(trackingData.code);
        }
      } catch (error) {
        console.error('Error reading affiliate tracking:', error);
      }
    }
  }, []); // Run once on mount

  // Handle promo code applied
  const handlePromoApplied = (breakdown) => {
    console.log('Promo code applied:', breakdown);
    setDiscountBreakdown(breakdown);
    setDiscountAmount(breakdown.discountAmount);
    setAppliedPromoCode(breakdown.code);
  };

  // Handle promo code removed
  const handlePromoRemoved = () => {
    console.log('Promo code removed');
    setDiscountBreakdown(null);
    setDiscountAmount(0);
    setAppliedPromoCode('');
  };

  // Check if an addon is included in the selected package
  const isAddonIncludedInPackage = (addonType) => {
    // Instrumental included in Signature or Masterpiece
    if (addonType === 'instrumental' && (formData.package === 'signature' || formData.package === 'masterpiece')) {
      return true;
    }
    
    // Lyric sheet included in Masterpiece
    if (addonType === 'lyric-sheet' && formData.package === 'masterpiece') {
      return true;
    }
    
    return false;
  };

  // Calculate subtotal (before discount) in pounds
const calculateSubtotal = (formData) => {
  let total = 0;

  switch (formData.package) {
    case 'essential':   total += 39.99; break;
    case 'signature':   total += 99.99; break;
    case 'masterpiece': total += 179.99; break;
    default:            total += 39.99;
  }

  if (formData.addons?.length) {
    formData.addons.forEach(addon => {
      if (!isAddonIncludedInPackage(addon)) {
        switch (addon) {
          case 'lyric-sheet':    total += 14.99; break;
          case 'instrumental':   total += 35.00; break;
          case 'expedited':      total += 19.99; break;
          case 'physical-cd':    total += 24.99; break;
          case 'physical-vinyl': total += 59.99; break;
          case 'extended':       total += 49.99; break;
          case 'streaming':      total += 34.99; break;
        }
      }
    });
  }

  return Math.min(total, 250.00); // safety cap
};

  // Calculate total amount in pence (for Stripe) with discount applied
  const calculateTotalAmount = (formData, discountAmount = 0) => {
    const subtotal = calculateSubtotal(formData);
    
    // Apply discount (discountAmount is already in pounds)
    const finalTotal = Math.max(0, subtotal - discountAmount);
    
    // Convert to pence for Stripe (multiply by 100 and round)
    return Math.round(finalTotal * 100);
  };

  // Format currency for display (£XX.XX)
  const formatCurrency = (amountInPence) => {
    return `£${(amountInPence / 100).toFixed(2)}`;
  };

  // Create payment intent when form data or discount changes
  useEffect(() => {
    if (!formData || !formData.package) {
      return;
    }
    
    const createPaymentIntent = async () => {
      try {
        setPaymentError(null);
        const totalInPence = calculateTotalAmount(formData, discountAmount);
        console.log(`Creating payment intent for ${totalInPence} pence (£${(totalInPence / 100).toFixed(2)})`);
        
        const response = await api.post('/payment/create-intent', {
          amount: totalInPence,
          currency: 'gbp',
          metadata: {
            packageType: formData.package,
            addons: formData.addons ? formData.addons.join(', ') : '',
            promoCode: appliedPromoCode || '',
            discountAmount: discountAmount || 0
          }
        });
        
        if (response.data.success) {
          console.log('Payment intent created successfully:', response.data.paymentIntent.id);
          setClientSecret(response.data.clientSecret);
          setPaymentIntent(response.data.paymentIntent);
        } else {
          console.error('Failed to create payment intent:', response.data);
          setPaymentError('Failed to initialize payment system. Please try again.');
        }
      } catch (error) {
        console.error('Error creating payment intent:', error);
        const errorMessage = 
          error.response?.data?.message || 
          'Failed to initialize payment system. Please try again later.';
        setPaymentError(errorMessage);
      }
    };

    createPaymentIntent();
  }, [formData, discountAmount, appliedPromoCode]);

  // Handle customer info changes
  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Create order in database
  const createOrder = async () => {
    try {
      console.log('Creating new order...');
      
      const orderData = {
        packageType: formData.package,
        totalPrice: calculateTotalAmount(formData, discountAmount) / 100, // Convert to pounds
        songPurpose: formData.songPurpose,
        recipientName: formData.recipientName,
        emotion: formData.emotion,
        provideLyrics: formData.provideLyrics,
        lyrics: formData.lyrics,
        songTheme: formData.songTheme,
        personalStory: formData.personalStory,
        musicStyle: formData.musicStyle,
        showInGallery: formData.showInGallery,
        additionalNotes: formData.additionalNotes,
        addons: formData.addons ? formData.addons.filter(addon => !isAddonIncludedInPackage(addon)).map(addonType => {
          let price = 0;
          
          switch(addonType) {
            case 'lyric-sheet':
              price = 14.99;
              break;
            case 'instrumental':
              price = 35.00;
              break;
            case 'expedited':
              price = 29.99;
              break;
            case 'physical-cd':
              price = 34.99;
              break;
            case 'physical-vinyl':
              price = 119.99;
              break;
            case 'extended':
              price = 49.99;
              break;
            case 'streaming':
              price = 34.99;
              break;
          }
          
          return { type: addonType, price };
        }) : [],
        usedPromoCode: appliedPromoCode || null,
        promoDiscountAmount: discountAmount || 0,
        finalPrice: calculateTotalAmount(formData, discountAmount) / 100, // Back to pounds
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          address: customerInfo.address,
          city: customerInfo.city,
          postcode: customerInfo.postcode,
          country: customerInfo.country
        }
      };
      
      console.log('Submitting order data:', orderData);
      
      const response = await api.post('/orders', orderData);
      
      if (response.data.success) {
        console.log('Order created successfully:', response.data.order);
        setOrderCreated(true);
        setOrderId(response.data.order.id);
        setOrderNumber(response.data.order.orderNumber);
        return response.data.order;
      } else {
        throw new Error(response.data.message || 'Failed to create order');
      }
    } catch (err) {
      console.error('Order submission error:', err);
      
      let errorMessage = 'Failed to create order. Please try again.';
      
      if (err.response?.status === 400) {
        errorMessage = err.response.data?.message || 'Invalid order data. Please check your information and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create orders. Please contact support.';
      } else if (err.response?.status === 422) {
        errorMessage = 'Some required information is missing or invalid. Please review your order details.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Our servers are experiencing issues. Please try again in a few moments.';
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = 'Network connection error. Please check your internet connection and try again.';
      }
      
      setPaymentError(errorMessage);
      return null;
    }
  };

  // Handle Stripe payment submission
  const handleStripeSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      setPaymentError('Payment processing is initializing. Please try again in a moment.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    // Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    const validationErrors = [];
    
    if (!customerInfo.name || customerInfo.name.trim().length < 2) {
      validationErrors.push('Please enter your full name');
    }
    
    if (!customerInfo.email || !emailRegex.test(customerInfo.email.trim())) {
      validationErrors.push('Please enter a valid email address');
    }
    
    if (!customerInfo.address || customerInfo.address.trim().length < 5) {
      validationErrors.push('Please enter a complete address');
    }
    
    if (!customerInfo.city || customerInfo.city.trim().length < 2) {
      validationErrors.push('Please enter your city/town');
    }
    
    if (!customerInfo.postcode || customerInfo.postcode.trim().length < 3) {
      validationErrors.push('Please enter your postcode');
    }

    if (validationErrors.length > 0) {
      setPaymentError(validationErrors[0]);
      setIsProcessing(false);
      return;
    }

    try {
      // First, create the order in the database
      if (!orderCreated) {
        const order = await createOrder();
        if (!order) {
          setIsProcessing(false);
          return;
        }
      }

      console.log(`Confirming payment with client secret (first 10 chars): ${clientSecret.substring(0, 10)}...`);
      
      // Confirm the card payment
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: customerInfo.name,
            email: customerInfo.email,
            address: {
              line1: customerInfo.address,
              city: customerInfo.city,
              postal_code: customerInfo.postcode,
              country: customerInfo.country,
            },
          },
        },
        receipt_email: customerInfo.email,
      });

      if (result.error) {
        console.error('Payment confirmation error:', result.error);
        
        let userFriendlyError = result.error.message;
        
        if (result.error.code === 'card_declined') {
          userFriendlyError = 'Your card was declined. Please check your card details or try a different payment method.';
        } else if (result.error.code === 'insufficient_funds') {
          userFriendlyError = 'Your card has insufficient funds. Please try a different payment method.';
        } else if (result.error.code === 'expired_card') {
          userFriendlyError = 'Your card has expired. Please check the expiry date or use a different card.';
        } else if (result.error.code === 'incorrect_cvc') {
          userFriendlyError = 'The security code (CVC) is incorrect. Please check and try again.';
        } else if (result.error.code === 'processing_error') {
          userFriendlyError = 'There was a processing error. Please try again in a moment.';
        } else if (result.error.code === 'incorrect_number') {
          userFriendlyError = 'The card number is incorrect. Please check and try again.';
        }
        
        setPaymentError(userFriendlyError);
        setIsProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', result.paymentIntent.id);
        
        try {
          // Update the order status to paid
          if (orderId) {
            console.log('Updating order status to paid...');
            await api.put(`/orders/${orderId}/status`, { 
              status: 'paid',
              paymentId: result.paymentIntent.id
            });
            console.log('Order status updated successfully');
          }
          
          // Call the onSuccessfulPayment callback
          if (onSuccessfulPayment) {
            onSuccessfulPayment({
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id
            });
          }
          
          setPaymentError(null);
          console.log('Payment completed successfully, redirecting to dashboard...');
          
          // Navigate to dashboard with success state
          navigate('/dashboard', { 
            state: { 
              orderSuccess: true,
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id 
            } 
          });
        } catch (error) {
          console.error('Error updating order after payment:', error);
          setPaymentError('Payment successful, but there was an issue updating your order. Our team will resolve this shortly.');
          
          if (onSuccessfulPayment) {
            onSuccessfulPayment({
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id
            });
          }
          
          setTimeout(() => {
            navigate('/dashboard', { 
              state: { 
                orderSuccess: true,
                orderId: orderId,
                orderNumber: orderNumber,
                paymentId: result.paymentIntent.id 
              } 
            });
          }, 3000);
        }
      } else {
        console.log('Payment status:', result.paymentIntent.status);
        setPaymentError(`Payment status: ${result.paymentIntent.status}. Please try again.`);
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError('An unexpected error occurred. Please try again.');
      setIsProcessing(false);
    }
  };

  // Stripe Card Element styling
  const cardElementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '16px',
        '::placeholder': {
          color: 'rgba(255, 255, 255, 0.5)',
        },
        iconColor: '#C4A064',
      },
      invalid: {
        color: '#ff3e6c',
        iconColor: '#ff3e6c',
      },
    },
    hidePostalCode: true,
  };

  // Compact Order Summary Component
  const CompactOrderSummary = () => {
    const packageNames = {
      'essential': 'Essential',
      'signature': 'Signature', 
      'masterpiece': 'Masterpiece'
    };
    
    const addonNames = {
      'expedited': 'Expedited Delivery',
      'physical-cd': 'Physical CD',
      'physical-vinyl': 'Physical Vinyl',
      'extended': 'Extended Version',
      'streaming': 'Streaming Distribution',
      'lyric-sheet': 'Digital Lyric Sheet',
      'instrumental': 'Instrumental Version'
    };

    const includedAddons = formData.addons ? formData.addons.filter(addon => isAddonIncludedInPackage(addon)) : [];
    const paidAddons = formData.addons ? formData.addons.filter(addon => !isAddonIncludedInPackage(addon)) : [];
    
    // Get package price
    let packagePrice = 99.99;
    switch(formData.package) {
      case 'essential': packagePrice = 99.99; break;
      case 'signature': packagePrice = 199.99; break;
      case 'masterpiece': packagePrice = 359.99; break;
    }

    const subtotal = calculateSubtotal(formData);
    const total = calculateTotalAmount(formData, discountAmount);
    
    return (
      <div className="mb-6 bg-white/5 rounded-lg p-4 border border-white/10">
        <h4 className="font-semibold mb-3 text-accent">Order Summary</h4>
        
        {/* Package */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-light-muted">{packageNames[formData.package] || 'Signature'} Package:</span>
          <span className="font-medium">£{packagePrice.toFixed(2)}</span>
        </div>
        
        {/* Included Add-ons */}
        {includedAddons.length > 0 && (
          <div className="mb-2 pl-4 border-l-2 border-green-500/30">
            <span className="text-xs text-green-400 font-medium">✓ Included:</span>
            {includedAddons.map(addon => (
              <div key={addon} className="text-xs text-green-400/80 ml-2">
                {addonNames[addon]}
              </div>
            ))}
          </div>
        )}
        
        {/* Paid Add-ons */}
        {paidAddons.length > 0 && (
          <div className="mb-2">
            {paidAddons.map(addon => {
              let price = 0;
              switch(addon) {
                case 'lyric-sheet': price = 14.99; break;
                case 'instrumental': price = 35.00; break;
                case 'expedited': price = 29.99; break;
                case 'physical-cd': price = 34.99; break;
                case 'physical-vinyl': price = 119.99; break;
                case 'extended': price = 49.99; break;
                case 'streaming': price = 34.99; break;
              }
              return (
                <div key={addon} className="text-sm flex justify-between items-center mb-1">
                  <span className="text-light-muted">{addonNames[addon]}:</span>
                  <span>£{price.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Subtotal */}
        <div className="flex justify-between items-center mb-2 pt-2 border-t border-white/10">
          <span className="text-sm font-medium">Subtotal:</span>
          <span className="font-medium">£{subtotal.toFixed(2)}</span>
        </div>
        
        {/* Discount */}
        {discountAmount > 0 && (
          <div className="flex justify-between items-center mb-2 text-green-400">
            <span className="text-sm">
              <i className="fas fa-tag mr-1"></i>
              Discount ({appliedPromoCode}):
            </span>
            <span className="font-medium">-£{discountAmount.toFixed(2)}</span>
          </div>
        )}
        
        {/* Total */}
        <div className="flex justify-between font-bold mt-3 pt-3 border-t border-white/10 text-lg">
          <span>Total:</span>
          <span className="text-accent">{formatCurrency(total)}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="mt-8">
      <CompactOrderSummary />
      
      {/* Promo Code Input */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Promo Code</h3>
        <PromoCodeInput
  orderValue={calculateSubtotal(formData)}
  onPromoApplied={handlePromoApplied}
  onPromoRemoved={handlePromoRemoved}
  disabled={isProcessing}
  initialCode={appliedPromoCode}  {/* ✅ NEW: Pass the code to auto-fill */}
/>
      </div>

      {/* Show discount confirmation if applied */}
      {discountBreakdown && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-green-400 font-medium">
              <i className="fas fa-tag mr-2"></i>
              {discountBreakdown.discountName || 'Discount Applied'}
            </span>
            <span className="text-green-400 font-bold">
              -£{discountBreakdown.discountAmount.toFixed(2)}
            </span>
          </div>
          <p className="text-sm text-light-muted">
            Code: {discountBreakdown.code || appliedPromoCode}
          </p>
        </div>
      )}
      
      <form onSubmit={handleStripeSubmit}>
        {/* Billing Information */}
        <div className="mb-6">
          <h4 className="font-semibold mb-4 flex items-center">
            <i className="fas fa-credit-card mr-2 text-accent"></i>
            Billing Information
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium">Full Name *</label>
              <input
                type="text"
                name="name"
                value={customerInfo.name}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
                placeholder="Enter your full name"
                maxLength="100"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium">Email Address *</label>
              <input
                type="email"
                name="email"
                value={customerInfo.email}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
                placeholder="Enter your email address"
                maxLength="255"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium">Address *</label>
              <input
                type="text"
                name="address"
                value={customerInfo.address}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
                placeholder="Enter your street address"
                maxLength="255"
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">City/Town *</label>
              <input
                type="text"
                name="city"
                value={customerInfo.city}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
                placeholder="Enter your city"
                maxLength="100"
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm font-medium">
                {customerInfo.country === 'US' ? 'ZIP Code' : 'Postcode'} *
              </label>
              <input
                type="text"
                name="postcode"
                value={customerInfo.postcode}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
                placeholder={
                  customerInfo.country === 'GB' ? 'e.g. SW1A 1AA' :
                  customerInfo.country === 'US' ? 'e.g. 12345' :
                  customerInfo.country === 'CA' ? 'e.g. K1A 0A6' :
                  'Enter postcode'
                }
                maxLength="20"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm font-medium">Country/Region *</label>
              <select
                name="country"
                value={customerInfo.country}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                required
              >
                <option value="GB">United Kingdom</option>
                <option value="IE">Ireland</option>
                <option value="FR">France</option>
                <option value="DE">Germany</option>
                <option value="ES">Spain</option>
                <option value="IT">Italy</option>
                <option value="NL">Netherlands</option>
                <option value="BE">Belgium</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="NZ">New Zealand</option>
              </select>
            </div>
          </div>
        </div>

        {/* Card Details */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Card Details *</label>
          <div className="p-4 bg-white/10 border border-white/20 rounded-lg mb-2">
            <CardElement options={cardElementOptions} />
          </div>
          <p className="text-sm text-light-muted mt-2">
            <i className="fas fa-lock mr-2"></i>
            Your payment information is securely processed by Stripe.
          </p>
        </div>
        
        {/* Error Message */}
        {paymentError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center text-red-400">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span className="text-sm">{paymentError}</span>
            </div>
          </div>
        )}
        
        {/* Security Message */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-start text-blue-300">
            <i className="fas fa-shield-alt mr-2 mt-0.5 flex-shrink-0"></i>
            <div className="text-sm">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>Your payment information is encrypted and securely processed by Stripe. We never store your card details.</p>
            </div>
          </div>
        </div>
        
        {/* Submit Button */}
        <button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className={`w-full mt-6 py-4 px-8 bg-gradient-to-r from-accent to-accent-alt text-dark font-semibold rounded-full relative overflow-hidden transition-all duration-300 ${
            isProcessing || !clientSecret ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-glow-accent transform hover:scale-105'
          }`}
        >
          <div className="flex items-center justify-center">
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-dark mr-3"></div>
                <span>Processing Payment...</span>
              </>
            ) : !clientSecret ? (
              <>
                <div className="animate-pulse flex items-center">
                  <div className="rounded-full h-5 w-5 bg-dark/30 mr-3"></div>
                  <span>Initializing Payment...</span>
                </div>
              </>
            ) : (
              <>
                <i className="fas fa-lock mr-3"></i>
                <span>Pay {formatCurrency(calculateTotalAmount(formData, discountAmount))} Securely</span>
              </>
            )}
          </div>
        </button>
        
        {/* SSL Encryption Notice */}
        <div className="flex items-center justify-center mt-6 text-sm text-light-muted">
          <i className="fas fa-shield-alt mr-2"></i>
          Secured with 256-bit SSL encryption
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;