// client/src/components/OrderForm/CheckoutForm.jsx
import { useState, useEffect } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const CheckoutForm = ({ formData, discountAmount = 0, onSuccessfulPayment }) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
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
    country: 'GB' // Default to UK
  });

  // Create a new order first, before payment
  const createOrder = async () => {
    try {
      console.log('Creating new order...');
      
      // Format order data
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
              price = 35;
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
      
      // Create the order
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
      const errorMessage = 
        err.response?.data?.message || 
        'Failed to create order. Please try again.';
      setPaymentError(errorMessage);
      return null;
    }
  };

  useEffect(() => {
    // Create payment intent when component mounts
    const createPaymentIntent = async () => {
      try {
        setPaymentError(null);
        console.log(`Creating payment intent for ${calculateTotalAmount(formData, discountAmount)} pence`);
        
        const response = await api.post('/payment/create-intent', {
          amount: calculateTotalAmount(formData, discountAmount),
          currency: 'gbp',
          metadata: {
            packageType: formData.package,
            addons: formData.addons ? formData.addons.join(', ') : '',
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
  }, [formData, discountAmount]);

  // Customer info handling
  const handleCustomerInfoChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Custom styling for the Stripe Card Element - with UK-friendly styles
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
    hidePostalCode: true, // We collect postcode separately for UK format
  };

  // Handle Stripe payment submission
  const handleStripeSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      // Stripe.js has not loaded yet or no client secret
      setPaymentError('Payment processing is initializing. Please try again in a moment.');
      return;
    }

    // Basic validation
    if (!customerInfo.name || !customerInfo.email || !customerInfo.address || !customerInfo.city || !customerInfo.postcode) {
      setPaymentError('Please fill in all billing information fields');
      return;
    }

    // Validate UK postcode - basic UK postcode validation
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(customerInfo.postcode)) {
      setPaymentError('Please enter a valid UK postcode');
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // First, create the order in the database
      if (!orderCreated) {
        const order = await createOrder();
        if (!order) {
          setIsProcessing(false);
          return; // Error already set in createOrder function
        }
      }

      console.log(`Confirming payment with client secret (first 10 chars): ${clientSecret.substring(0, 10)}...`);
      
      // Confirm the card payment with UK-specific details
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
        // Show error to customer
        console.error('Payment confirmation error:', result.error);
        setPaymentError(result.error.message);
        setIsProcessing(false);
      } else if (result.paymentIntent.status === 'succeeded') {
        console.log('Payment succeeded:', result.paymentIntent.id);
        
        try {
          // Update the order status to paid if needed
          if (orderId) {
            await api.put(`/orders/${orderId}/status`, { 
              status: 'paid',
              paymentId: result.paymentIntent.id
            });
          }
          
          // Call the onSuccessfulPayment callback with order details
          if (onSuccessfulPayment) {
            onSuccessfulPayment({
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id
            });
          }
          
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
          // Still consider the payment successful even if order update fails
          // The payment webhook will handle this case
          if (onSuccessfulPayment) {
            onSuccessfulPayment({
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id
            });
          }
          
          // Ensure we still navigate even if there's an error with the update
          navigate('/dashboard', { 
            state: { 
              orderSuccess: true,
              orderId: orderId,
              orderNumber: orderNumber,
              paymentId: result.paymentIntent.id 
            } 
          });
        }
      } else if (result.paymentIntent.status === 'requires_action') {
        // Handle 3DS authentication
        console.log('Payment requires additional authentication');
        // Let Stripe.js handle the rest
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

  // Function to calculate total amount based on form data with updated pricing
  const calculateTotalAmount = (formData, discountAmount) => {
    let total = 0;
    
    // Add package price (in pence)
    switch(formData.package) {
      case 'basic':
        total += 3999; // £39.99 (in pence)
        break;
      case 'deluxe':
        total += 7499; // £74.99 (in pence)
        break;
      case 'premium':
        total += 13999; // £139.99 (in pence)
        break;
      default:
        total += 7499; // Default to Signature package
    }
    
    // Add addon prices
    if (formData.addons && formData.addons.length > 0) {
      formData.addons.forEach(addon => {
        // Skip if the addon is already included in the package
        if (isAddonIncludedInPackage(addon)) {
          return;
        }
        
        switch(addon) {
          case 'lyric-sheet':
            total += 1499; // £14.99
            break;
          case 'instrumental':
            total += 3500; // £35.00
            break;
          case 'expedited':
            total += 2999; // £29.99
            break;
          case 'physical-cd':
            total += 3499; // £34.99
            break;
          case 'physical-vinyl':
            total += 11999; // £119.99
            break;
          case 'extended':
            total += 4999; // £49.99
            break;
          case 'streaming':
            total += 3499; // £34.99
            break;
        }
      });
    }
    
    // Apply discount if any
    if (discountAmount > 0) {
      const discountValue = Math.round(total * (discountAmount / 100));
      total -= discountValue;
    }
    
    return total;
  };

  // Format currency for display (£XX.XX)
  const formatCurrency = (amount) => {
    return `£${(amount / 100).toFixed(2)}`;
  };

  // Create a compact order summary for the payment step
  const CompactOrderSummary = () => (
    <div className="mb-6 bg-white/5 rounded-lg p-4 border border-white/10">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-light-muted">Package:</span>
        <span>{formData.package === 'basic' ? 'Essential' : formData.package === 'deluxe' ? 'Signature' : 'Masterpiece'}</span>
      </div>
      
      {discountAmount > 0 && (
        <div className="flex justify-between mb-2 text-green-400 text-sm">
          <span>Discount:</span>
          <span>-{discountAmount}%</span>
        </div>
      )}
      
      <div className="flex justify-between font-semibold mt-2 pt-2 border-t border-white/10">
        <span>Total:</span>
        <span className="text-accent">{formatCurrency(calculateTotalAmount(formData, discountAmount))}</span>
      </div>
    </div>
  );

  return (
    <div className="mt-8">
      <CompactOrderSummary />
      
      <form onSubmit={handleStripeSubmit}>
        <div className="mb-6">
          <h4 className="font-semibold mb-3">Billing Information</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm">Full Name</label>
              <input
                type="text"
                name="name"
                value={customerInfo.name}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm">Email Address</label>
              <input
                type="email"
                name="email"
                value={customerInfo.email}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
                required
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm">Address</label>
              <input
                type="text"
                name="address"
                value={customerInfo.address}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm">City/Town</label>
              <input
                type="text"
                name="city"
                value={customerInfo.city}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
                required
              />
            </div>
            
            <div>
              <label className="block mb-2 text-sm">Postcode</label>
              <input
                type="text"
                name="postcode"
                value={customerInfo.postcode}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
                required
                placeholder="e.g. SW1A 1AA"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block mb-2 text-sm">Country/Region</label>
              <select
                name="country"
                value={customerInfo.country}
                onChange={handleCustomerInfoChange}
                className="w-full p-3 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent"
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

        {/* Payment Method Content */}
        <div className="mb-6">
          <label className="block mb-2 font-medium">Card Details</label>
          <div className="p-4 bg-white/10 border border-white/20 rounded-lg mb-2">
            <CardElement options={cardElementOptions} />
          </div>
          {paymentError && (
            <div className="text-red-400 text-sm mt-2">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {paymentError}
            </div>
          )}
          <p className="text-sm text-light-muted mt-2">
            <i className="fas fa-lock mr-2"></i>
            Your payment information is securely processed by Stripe.
          </p>
          
          <button
            type="submit"
            disabled={!stripe || isProcessing || !clientSecret}
            className={`w-full mt-6 py-4 px-8 bg-gradient-to-r from-accent to-accent-alt text-dark font-semibold rounded-full relative overflow-hidden transition-all duration-300 ${
              isProcessing || !clientSecret ? 'opacity-75 cursor-not-allowed' : 'hover:shadow-glow-accent'
            }`}
          >
            {isProcessing ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-3"></i>
                Processing Payment...
              </>
            ) : !clientSecret ? (
              <>
                <i className="fas fa-circle-notch fa-spin mr-3"></i>
                Initializing Payment...
              </>
            ) : (
              <>
                <i className="fas fa-lock mr-3"></i>
                Pay {formatCurrency(calculateTotalAmount(formData, discountAmount))} Securely
              </>
            )}
          </button>
        </div>
      </form>
      
      {/* Show security message at the bottom */}
      <div className="flex items-center justify-center mt-6 text-sm text-light-muted">
        <i className="fas fa-shield-alt mr-2"></i>
        Secured with 256-bit SSL encryption
      </div>
    </div>
  );
};

export default CheckoutForm;