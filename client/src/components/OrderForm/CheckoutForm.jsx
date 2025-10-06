import React, { useState, useEffect } from 'react';
import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import PromoCodeInput from './PromoCodeInput';

const PRICE_BOOK = {
  packages: {
    essential: 39.99,
    signature: 99.99,
    masterpiece: 179.99,
  },
  addons: {
    'lyric-sheet': 14.99,
    instrumental: 35.0,
    expedited: 19.99,
    'physical-cd': 24.99,
    'physical-vinyl': 59.99,
    extended: 49.99,
    streaming: 34.99,
  },
};

const CheckoutForm = ({ formData, promoCode = '', onSuccessfulPayment }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();

  // State
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntent, setPaymentIntent] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);

  const [customerInfo, setCustomerInfo] = useState({
    name: formData.customerName || '',
    email: formData.customerEmail || '',
    address: '',
    city: '',
    postcode: '',
    country: 'GB',
  });

  const [discountBreakdown, setDiscountBreakdown] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [appliedPromoCode, setAppliedPromoCode] = useState(promoCode || '');

  // ----- helpers -----
  const isAddonIncludedInPackage = (addonType) => {
    if (addonType === 'instrumental' && (formData.package === 'signature' || formData.package === 'masterpiece')) {
      return true;
    }
    if (addonType === 'lyric-sheet' && formData.package === 'masterpiece') {
      return true;
    }
    return false;
  };

  const calculateSubtotal = (data) => {
    if (!data?.package) return 0;
    let total = PRICE_BOOK.packages[data.package] ?? PRICE_BOOK.packages.signature;

    if (data.addons?.length) {
      data.addons.forEach((addon) => {
        if (!isAddonIncludedInPackage(addon)) {
          total += PRICE_BOOK.addons[addon] ?? 0;
        }
      });
    }

    return Math.min(total, 250.0); // safety cap
  };

  const calculateTotalAmount = (data, discount = 0) => {
    const subtotal = calculateSubtotal(data);
    const finalTotal = Math.max(0, subtotal - discount);
    return Math.round(finalTotal * 100); // pence
  };

  const formatCurrency = (pence) => `£${(pence / 100).toFixed(2)}`;

  // Auto-apply affiliate code (URL ?ref= or localStorage) – runs once
  useEffect(() => {
    if (appliedPromoCode) return; // already set from prop
    const urlParams = new URLSearchParams(window.location.search);
    const refParam = urlParams.get('ref');

    if (refParam) {
      console.log('Auto-applying affiliate code from URL ref parameter:', refParam);
      setAppliedPromoCode(refParam);
      return;
    }

    const storedTracking = localStorage.getItem('affiliate_tracking');
    if (storedTracking) {
      try {
        const tracking = JSON.parse(storedTracking);
        const trackingDate = new Date(tracking.timestamp);
        const days = (new Date() - trackingDate) / (1000 * 60 * 60 * 24);
        if (days <= 30 && tracking.code) {
          console.log('Auto-applying affiliate code from localStorage:', tracking.code);
          setAppliedPromoCode(tracking.code);
        }
      } catch (e) {
        console.error('Error reading affiliate tracking:', e);
      }
    }
  }, []); // once

  // NEW: Ensure order exists, then create/refresh payment intent (needs orderId)
  useEffect(() => {
    if (!formData || !formData.package) return;

    let cancelled = false;

    const initPayment = async () => {
      try {
        setPaymentError(null);

        // 1) Ensure an order exists exactly once
        let currentOrderId = orderId;
        if (!currentOrderId) {
          const order = await createOrder(); // defined below
          if (!order) return; // error already surfaced
          currentOrderId = order.id;
          setOrderId(order.id);
          setOrderNumber(order.orderNumber);
          setOrderCreated(true);
        }

        // 2) Create/refresh the payment intent for the current total
        const totalInPence = calculateTotalAmount(formData, discountAmount);
        console.log(
          `Creating payment intent for ${totalInPence} pence (${formatCurrency(totalInPence)})`
        );

        const response = await api.post('/payment/create-intent', {
          amount: totalInPence,
          currency: 'gbp',
          orderId: currentOrderId,
          metadata: {
            packageType: formData.package,
            addons: formData.addons ? formData.addons.join(', ') : '',
            promoCode: appliedPromoCode || '',
            discountAmount: discountAmount || 0,
          },
        });

        if (cancelled) return;

        if (response.data.success) {
          console.log('Payment intent created:', response.data.paymentIntent.id);
          setClientSecret(response.data.clientSecret);
          setPaymentIntent(response.data.paymentIntent);
        } else {
          console.error('Failed to create payment intent:', response.data);
          setPaymentError('Failed to initialize payment system. Please try again.');
        }
      } catch (error) {
        if (cancelled) return;
        console.error('Error creating payment intent:', error);
        const msg =
          error.response?.data?.message ||
          'Failed to initialize payment system. Please try again later.';
        setPaymentError(msg);
      }
    };

    initPayment();
    return () => {
      cancelled = true;
    };
  }, [formData, discountAmount, appliedPromoCode]); // do NOT include orderId to avoid re-creating

  // Promo apply/remove
  const handlePromoApplied = (breakdown) => {
    setDiscountBreakdown(breakdown);
    setDiscountAmount(breakdown.discountAmount);
    setAppliedPromoCode(breakdown.code);
  };
  const handlePromoRemoved = () => {
    setDiscountBreakdown(null);
    setDiscountAmount(0);
    setAppliedPromoCode('');
  };

  // Customer info
  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((prev) => ({ ...prev, [name]: value }));
  };

  // Create order in DB (used by the effect and the submit fallback)
  const createOrder = async () => {
    try {
      console.log('Creating new order...');

      const addonsPayload =
        formData.addons
          ?.filter((a) => !isAddonIncludedInPackage(a))
          .map((type) => ({ type, price: PRICE_BOOK.addons[type] ?? 0 })) || [];

      const orderData = {
        packageType: formData.package,
        totalPrice: calculateTotalAmount(formData, discountAmount) / 100, // £
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
        promoCode: appliedPromoCode || null,   // <-- server reads this
        promoDiscountAmount: discountAmount || 0,
        finalPrice: calculateTotalAmount(formData, discountAmount) / 100, // £
        customer: {
          name: customerInfo.name,
          email: customerInfo.email,
          address: customerInfo.address,
          city: customerInfo.city,
          postcode: customerInfo.postcode,
          country: customerInfo.country,
        },
      };

      const response = await api.post('/orders', orderData);
      if (response.data.success) {
        const order = response.data.order;
        setOrderCreated(true);
        setOrderId(order.id);
        setOrderNumber(order.orderNumber);
        return order;
      }
      throw new Error(response.data.message || 'Failed to create order');
    } catch (err) {
      console.error('Order submission error:', err);
      let errorMessage = 'Failed to create order. Please try again.';
      if (err.response?.status === 400) {
        errorMessage =
          err.response.data?.message ||
          'Invalid order data. Please check your information and try again.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Authentication required. Please log in and try again.';
      } else if (err.response?.status === 403) {
        errorMessage = 'You do not have permission to create orders.';
      } else if (err.response?.status === 422) {
        errorMessage = 'Some required information is missing or invalid.';
      } else if (err.response?.status >= 500) {
        errorMessage = 'Our servers are experiencing issues. Please try again shortly.';
      } else if (err.code === 'NETWORK_ERROR' || !err.response) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      setPaymentError(errorMessage);
      return null;
    }
  };

  // Submit (confirm card)
  const handleStripeSubmit = async (event) => {
    event.preventDefault();
    if (!stripe || !elements || !clientSecret) {
      setPaymentError('Payment processing is initializing. Please try again in a moment.');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const errs = [];
    if (!customerInfo.name?.trim() || customerInfo.name.trim().length < 2) errs.push('name');
    if (!emailRegex.test(customerInfo.email?.trim() || '')) errs.push('email');
    if (!customerInfo.address?.trim() || customerInfo.address.trim().length < 5) errs.push('address');
    if (!customerInfo.city?.trim() || customerInfo.city.trim().length < 2) errs.push('city');
    if (!customerInfo.postcode?.trim() || customerInfo.postcode.trim().length < 3) errs.push('postcode');
    if (errs.length) {
      setPaymentError('Please complete your billing details.');
      setIsProcessing(false);
      return;
    }

    try {
      // Fallback: ensure order exists (in case user clicked instantly)
      if (!orderCreated) {
        const order = await createOrder();
        if (!order) {
          setIsProcessing(false);
          return;
        }
      }

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
        let msg = result.error.message;
        const map = {
          card_declined: 'Your card was declined. Please try a different card.',
          insufficient_funds: 'Insufficient funds. Please try another payment method.',
          expired_card: 'Your card has expired.',
          incorrect_cvc: 'The CVC is incorrect.',
          processing_error: 'There was a processing error. Please try again.',
          incorrect_number: 'The card number is incorrect.',
        };
        if (result.error.code && map[result.error.code]) msg = map[result.error.code];
        setPaymentError(msg);
        setIsProcessing(false);
        return;
      }

if (result.paymentIntent.status === 'succeeded') {
  // No client-side status update — webhook will mark paid and advance workflow.
  const paymentId = result.paymentIntent.id;

  onSuccessfulPayment?.({
    orderId,
    orderNumber,
    paymentId,
  });

  navigate('/dashboard', {
    state: {
      orderSuccess: true,
      orderId,
      orderNumber,
      paymentId,
    },
  });
} else {
  setPaymentError(`Payment status: ${result.paymentIntent.status}. Please try again.`);
  setIsProcessing(false);
}
} catch (error) {
  console.error('Payment error:', error);
  setPaymentError('An unexpected error occurred. Please try again.');
  setIsProcessing(false);
}
};

  const cardElementOptions = {
    style: {
      base: {
        color: '#ffffff',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '16px',
        '::placeholder': { color: 'rgba(255, 255, 255, 0.5)' },
        iconColor: '#C4A064',
      },
      invalid: {
        color: '#ff3e6c',
        iconColor: '#ff3e6c',
      },
    },
    hidePostalCode: true,
  };

  const CompactOrderSummary = () => {
    const packageNames = {
      essential: 'Essential',
      signature: 'Signature',
      masterpiece: 'Masterpiece',
    };

    const addonNames = {
      expedited: 'Expedited Delivery',
      'physical-cd': 'Physical CD',
      'physical-vinyl': 'Physical Vinyl',
      extended: 'Extended Version',
      streaming: 'Streaming Distribution',
      'lyric-sheet': 'Digital Lyric Sheet',
      instrumental: 'Instrumental Version',
    };

    const includedAddons = formData.addons ? formData.addons.filter(isAddonIncludedInPackage) : [];
    const paidAddons = formData.addons
      ? formData.addons.filter((a) => !isAddonIncludedInPackage(a))
      : [];

    const packagePrice = PRICE_BOOK.packages[formData.package] ?? PRICE_BOOK.packages.signature;
    const subtotal = calculateSubtotal(formData);
    const total = calculateTotalAmount(formData, discountAmount);

    return (
      <div className="mb-6 bg-white/5 rounded-lg p-4 border border-white/10">
        <h4 className="font-semibold mb-3 text-accent">Order Summary</h4>

        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-light-muted">
            {packageNames[formData.package] || 'Signature'} Package:
          </span>
          <span className="font-medium">£{packagePrice.toFixed(2)}</span>
        </div>

        {includedAddons.length > 0 && (
          <div className="mb-2 pl-4 border-l-2 border-green-500/30">
            <span className="text-xs text-green-400 font-medium">✓ Included:</span>
            {includedAddons.map((addon) => (
              <div key={addon} className="text-xs text-green-400/80 ml-2">
                {addonNames[addon]}
              </div>
            ))}
          </div>
        )}

        {paidAddons.length > 0 && (
          <div className="mb-2">
            {paidAddons.map((addon) => (
              <div key={addon} className="text-sm flex justify-between items-center mb-1">
                <span className="text-light-muted">{addonNames[addon]}:</span>
                <span>£{(PRICE_BOOK.addons[addon] ?? 0).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-between items-center mb-2 pt-2 border-t border-white/10">
          <span className="text-sm font-medium">Subtotal:</span>
          <span className="font-medium">£{subtotal.toFixed(2)}</span>
        </div>

        {discountAmount > 0 && (
          <div className="flex justify-between items-center mb-2 text-green-400">
            <span className="text-sm">
              <i className="fas fa-tag mr-1"></i>
              Discount ({appliedPromoCode}):
            </span>
            <span className="font-medium">-£{discountAmount.toFixed(2)}</span>
          </div>
        )}

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

      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3">Promo Code</h3>
        <PromoCodeInput
          orderValue={calculateSubtotal(formData)}
          onPromoApplied={handlePromoApplied}
          onPromoRemoved={handlePromoRemoved}
          disabled={isProcessing}
          initialCode={appliedPromoCode}
        />
      </div>

      <form onSubmit={handleStripeSubmit}>
        {/* Billing */}
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
                  customerInfo.country === 'GB'
                    ? 'e.g. SW1A 1AA'
                    : customerInfo.country === 'US'
                    ? 'e.g. 12345'
                    : customerInfo.country === 'CA'
                    ? 'e.g. K1A 0A6'
                    : 'Enter postcode'
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

        {/* Card */}
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

        {/* Error */}
        {paymentError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-4">
            <div className="flex items-center text-red-400">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              <span className="text-sm">{paymentError}</span>
            </div>
          </div>
        )}

        {/* Security note */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
          <div className="flex items-start text-blue-300">
            <i className="fas fa-shield-alt mr-2 mt-0.5 flex-shrink-0"></i>
            <div className="text-sm">
              <p className="font-medium mb-1">Secure Payment</p>
              <p>Your payment information is encrypted and securely processed by Stripe.</p>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!stripe || isProcessing || !clientSecret}
          className={`w-full mt-6 py-4 px-8 bg-gradient-to-r from-accent to-accent-alt text-dark font-semibold rounded-full relative overflow-hidden transition-all duration-300 ${
            isProcessing || !clientSecret
              ? 'opacity-75 cursor-not-allowed'
              : 'hover:shadow-glow-accent transform hover:scale-105'
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
                <span>
                  Pay {formatCurrency(calculateTotalAmount(formData, discountAmount))} Securely
                </span>
              </>
            )}
          </div>
        </button>

        <div className="flex items-center justify-center mt-6 text-sm text-light-muted">
          <i className="fas fa-shield-alt mr-2"></i>
          Secured with 256-bit SSL encryption
        </div>
      </form>
    </div>
  );
};

export default CheckoutForm;
