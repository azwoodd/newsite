import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { orderService } from '../../services/api';
import ProgressBar from './ProgressBar';
import StepOne from './StepOne';
import StepTwo from './StepTwo';
import StepThree from './StepThree';
import StepFour from './StepFour';

const OrderForm = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderCreated, setOrderCreated] = useState(false);
  const [orderDetails, setOrderDetails] = useState(null);
  const [formData, setFormData] = useState({
    // Default values
    songPurpose: '',
    recipientName: '',
    emotion: 'romantic',
    provideLyrics: false,
    lyrics: '',
    songTheme: '',
    personalStory: '',
    musicStyle: 'modern-pop',
    package: 'essential',
    customerName: currentUser?.name || '',
    customerEmail: currentUser?.email || '',
    showInGallery: false
  });

  useEffect(() => {
    // Check for saved form data
    const savedFormData = localStorage.getItem('songFormData');
    if (savedFormData) {
      setFormData(prevData => ({
        ...prevData,
        ...JSON.parse(savedFormData),
        // Always keep current user data updated
        customerName: currentUser?.name || prevData.customerName,
        customerEmail: currentUser?.email || prevData.customerEmail,
      }));
    }
    
    // Check for URL parameters
    const parseAndApplyParams = () => {
      const params = new URLSearchParams(location.search);
      
      // Handle package selection from URL
      const packageType = params.get('package');
      if (packageType && ['essential', 'signature', 'masterpiece'].includes(packageType)) {
        setFormData(prevData => ({
          ...prevData,
          package: packageType
        }));
        // Also update localStorage to sync the change
        const currentData = localStorage.getItem('songFormData');
        if (currentData) {
          const parsedData = JSON.parse(currentData);
          localStorage.setItem('songFormData', JSON.stringify({
            ...parsedData,
            package: packageType
          }));
        }
      }
      
      // Handle showcase preference from URL params
      const showInGallery = params.get('showInGallery');
      if (showInGallery === 'true') {
        setFormData(prevData => ({
          ...prevData,
          showInGallery: true
        }));
        // Also update localStorage
        const currentData = localStorage.getItem('songFormData');
        if (currentData) {
          const parsedData = JSON.parse(currentData);
          localStorage.setItem('songFormData', JSON.stringify({
            ...parsedData,
            showInGallery: true
          }));
        }
      }
    };
    
    parseAndApplyParams();
    
    // Set up a listener for URL changes to handle direct navigation to the form with params
    const handleLocationChange = () => {
      parseAndApplyParams();
    };
    
    window.addEventListener('popstate', handleLocationChange);
    
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, [currentUser, location]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('songFormData', JSON.stringify(formData));
    
    // This effect will also update the URL if package changes
    // This creates two-way binding between form data and URL
    const params = new URLSearchParams(location.search);
    const currentPackage = params.get('package');
    
    if (formData.package && formData.package !== currentPackage) {
      // Update URL without full page reload
      const newParams = new URLSearchParams(location.search);
      newParams.set('package', formData.package);
      const newUrl = `${location.pathname}?${newParams.toString()}${location.hash}`;
      window.history.replaceState(null, '', newUrl);
    }
  }, [formData, location]);

  // Move to the next step
  const nextStep = () => {
    setCurrentStep(currentStep + 1);
    // Scroll to top of form when changing steps
    scrollToTop();
  };

  // Go back to previous step
  const prevStep = () => {
    setCurrentStep(currentStep - 1);
    // Scroll to top of form when changing steps
    scrollToTop();
  };
  
  // Scroll to top of form
  const scrollToTop = () => {
    const formElement = document.getElementById('order-form');
    if (formElement) {
      formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Check if an addon is included in the selected package
  const isAddonIncludedInPackage = (addonType) => {
    // Check if instrumental version is included in Signature or Masterpiece packages
    if (addonType === 'instrumental' && (formData.package === 'signature' || formData.package === 'masterpiece')) {
      return true;
    }
    
    // Check if lyric sheet is included in Masterpiece package
    if (addonType === 'lyric-sheet' && formData.package === 'masterpiece') {
      return true;
    }
    
    return false;
  };
  // Calculate total price
const calculateTotalPrice = () => {
  let total = 0;

  // base package
  switch (formData.package) {
    case 'essential':   total = 39.99; break;
    case 'signature':   total = 99.99; break;
    case 'masterpiece': total = 179.99; break;
    default:            total = 39.99;
  }

  // add-ons (skip included)
  if (formData.addons?.length) {
    formData.addons.forEach(addon => {
      if (isAddonIncludedInPackage(addon)) return;
      switch (addon) {
        case 'lyric-sheet':    total += 14.99; break;
        case 'instrumental':   total += 35.00; break;
        case 'expedited':      total += 19.99; break;
        case 'physical-cd':    total += 24.99; break;
        case 'physical-vinyl': total += 59.99; break; // placeholder
        case 'extended':       total += 49.99; break;
        case 'streaming':      total += 34.99; break;
      }
    });
  }

  // hard cap (belt-and-braces)
  return Math.min(total, 250.00);
};


  // Handle form submission - now just redirects to login if user not logged in
  const handleSubmit = async (paymentResult) => {
    if (!currentUser) {
      // Store form data in localStorage
      localStorage.setItem('songFormData', JSON.stringify(formData));
      
      // Redirect to login page if not logged in
      navigate('/login', { state: { from: '/order-form' } });
      return;
    }
    
    // If we got a successful payment result, store it and clear form data
    if (paymentResult) {
      setOrderCreated(true);
      setOrderDetails(paymentResult);
      
      // Clear form data from localStorage
      localStorage.removeItem('songFormData');
      
      // You'll be redirected to dashboard by the CheckoutForm component
    } else {
      setError('Something went wrong with payment processing. Please try again.');
    }
  };

  return (
    <section id="order-form" className="relative py-20 bg-gradient-to-b from-deep to-dark">
      <div className="absolute top-[-100px] left-0 w-full h-[100px] bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 320%27%3E%3Cpath fill=%27%230A1128%27 fill-opacity=%271%27 d=%27M0,96L48,117.3C96,139,192,181,288,176C384,171,480,117,576,101.3C672,85,768,107,864,138.7C960,171,1056,213,1152,224C1248,235,1344,213,1392,202.7L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z%27%3E%3C/path%3E%3C/svg%3E')] bg-cover"></div>
      
      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
            Create Your Song
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Tell us about your story, and we'll transform it into a beautiful song.
          </p>
        </div>
        
        {error && (
          <div className="bg-romantic/10 border border-romantic rounded-lg p-4 text-center mb-6 max-w-4xl mx-auto">
            <i className="fas fa-exclamation-circle mr-2"></i>
            {error}
          </div>
        )}
        
        {orderCreated && orderDetails ? (
          // Success message after order completion
          <div className="bg-white/5 rounded-lg p-6 sm:p-10 max-w-4xl mx-auto overflow-hidden relative text-center">
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <i className="fas fa-check text-2xl text-white"></i>
            </div>
            <h3 className="text-2xl font-bold mb-4">Order Successfully Created!</h3>
            <p className="text-light-muted mb-6">
              Thank you for your order. We'll start working on your custom song right away.
              Your order number is <strong>{orderDetails.orderNumber}</strong>.
              You can track your order status on your dashboard.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-accent/10 transition-colors duration-300"
            >
              View Order Status
            </button>
          </div>
        ) : (
          // Order form
          <div className="bg-white/5 rounded-lg p-6 sm:p-10 max-w-4xl mx-auto overflow-hidden relative">
            {/* Progress Bar with navigation */}
            <ProgressBar currentStep={currentStep} setCurrentStep={setCurrentStep} />
            
            {/* Form Steps */}
            <div className="transition-all duration-500">
              {currentStep === 1 && (
                <StepOne 
                  formData={formData} 
                  setFormData={setFormData} 
                  nextStep={nextStep} 
                />
              )}
              
              {currentStep === 2 && (
                <StepTwo 
                  formData={formData} 
                  setFormData={setFormData} 
                  nextStep={nextStep} 
                  prevStep={prevStep} 
                />
              )}
              
              {currentStep === 3 && (
                <StepThree 
                  formData={formData} 
                  setFormData={setFormData} 
                  nextStep={nextStep} 
                  prevStep={prevStep} 
                />
              )}
              
              {currentStep === 4 && (
                <StepFour 
                  formData={formData} 
                  setFormData={setFormData} 
                  prevStep={prevStep}
                  loading={loading}
                  error={error}
                  onSubmit={handleSubmit}
                  calculateTotalPrice={calculateTotalPrice}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default OrderForm;