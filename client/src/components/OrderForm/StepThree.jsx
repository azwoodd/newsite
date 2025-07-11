// client/src/components/OrderForm/StepThree.jsx
import { useState, useEffect } from 'react';

// Enhanced Addon Option Component
const AddonOption = ({ type, name, price, description, selected, onChange, disabled, includedInPackage }) => {
  return (
    <div 
      className={`bg-white/5 rounded-lg p-4 flex items-start ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} border-2 transition-colors duration-200 ${
        selected || includedInPackage ? 'border-accent bg-accent/10 shadow-glow-accent' : 'border-transparent hover:border-accent/50'
      }`}
      onClick={() => !disabled && onChange()}
      role="checkbox"
      aria-checked={selected || includedInPackage}
      tabIndex={disabled ? "-1" : "0"}
      onKeyDown={(e) => {
        if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onChange();
        }
      }}
    >
      <input 
        type="checkbox" 
        id={`addon-${type}`}
        checked={selected || includedInPackage}
        onChange={() => !disabled && onChange()}
        className="hidden"
        aria-hidden="true"
        disabled={disabled}
      />
      
      {/* Custom Checkbox */}
      <div className={`w-5 h-5 rounded border mr-3 flex-shrink-0 mt-1 relative ${
        selected || includedInPackage ? 'bg-accent border-accent' : 'border-white/30'
      }`}>
        {(selected || includedInPackage) && (
          <span className="absolute inset-0 flex items-center justify-center text-dark font-bold text-xs">✓</span>
        )}
      </div>
      
      <div className="flex-grow">
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold">{name}</span>
          <div className="flex items-center">
            {includedInPackage ? (
              <span className="text-accent text-xs font-medium mr-2">Included</span>
            ) : null}
            <span className="text-accent font-semibold">£{price}</span>
          </div>
        </div>
        <p className="text-sm text-light-muted">{description}</p>
      </div>
    </div>
  );
};

const StepThree = ({ formData, setFormData, nextStep, prevStep }) => {
  // Available add-ons with updated prices
  const addonOptions = [
    {
      type: 'lyric-sheet',
      name: 'Digital Lyric Sheet',
      price: '14.99',
      description: 'Professional lyric sheet with your song lyrics'
    },
    {
      type: 'instrumental',
      name: 'Instrumental Version',
      price: '35',
      description: 'Get your song without vocals - perfect for background music use'
    },
    {
      type: 'expedited',
      name: 'Expedited Delivery',
      price: '29.99',
      description: 'Get your song faster (typically 3-5 days)'
    },
    {
      type: 'physical-cd',
      name: 'Physical CD',
      price: '34.99',
      description: 'Professional CD in custom case with artwork'
    },
    {
      type: 'physical-vinyl',
      name: 'Vinyl Record',
      price: '119.99',
      description: 'Premium vinyl pressing with custom artwork (allow up to 6 weeks)'
    },
    {
      type: 'streaming',
      name: 'Streaming Release',
      price: '34.99',
      description: 'Release your song on Spotify, Apple Music & more'
    }
  ];
  
  // Initialize addons if not already set
  useEffect(() => {
    if (!formData.addons) {
      setFormData({ ...formData, addons: [] });
    }
    // Set default showInGallery value if it's undefined
    if (formData.showInGallery === undefined) {
      setFormData({ ...formData, showInGallery: false });
    }
  }, []);
  
  const handleAddonToggle = (addonType) => {
    // Do nothing if addon is included in package
    if (isAddonIncludedInPackage(addonType)) {
      return;
    }
    
    const currentAddons = [...(formData.addons || [])];
    
    if (currentAddons.includes(addonType)) {
      // Remove addon if already selected
      const newAddons = currentAddons.filter(type => type !== addonType);
      setFormData({ ...formData, addons: newAddons });
    } else {
      // Add addon if not already selected
      currentAddons.push(addonType);
      setFormData({ ...formData, addons: currentAddons });
    }
  };
  
  const isAddonSelected = (addonType) => {
    return formData.addons && formData.addons.includes(addonType);
  };

  // Function to check if an addon is included in the selected package
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

  // State for showcase gallery option
  const [showInGallery, setShowInGallery] = useState(formData.showInGallery || false);
  
  const handleShowcaseToggle = () => {
    const newValue = !showInGallery;
    setShowInGallery(newValue);
    setFormData({ ...formData, showInGallery: newValue });
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Save gallery preference to localStorage for syncing with admin panel
    try {
      localStorage.setItem('songSculptors_galleryConsent', showInGallery.toString());
    } catch (error) {
      console.warn('Error saving gallery preference to localStorage:', error);
    }
    
    nextStep();
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mr-4 flex-shrink-0">
          <i className="fas fa-plus-circle"></i>
        </div>
        <h3 className="text-2xl font-semibold font-secondary">Enhance Your Song</h3>
      </div>
      
      <p className="text-light-muted mb-8">
        Optional enhancements to make your song even more special.
      </p>
      
      {/* Addon Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8" role="group" aria-label="Available add-ons">
        {addonOptions.map((addon) => {
          // Check if addon is included in the selected package
          const isIncluded = isAddonIncludedInPackage(addon.type);
          
          return (
            <AddonOption
              key={addon.type}
              type={addon.type}
              name={addon.name}
              price={addon.price}
              description={addon.description}
              selected={isAddonSelected(addon.type)}
              onChange={() => handleAddonToggle(addon.type)}
              disabled={isIncluded}
              includedInPackage={isIncluded}
            />
          );
        })}
      </div>
      
      {/* Package-specific information */}
      <div className="mb-8 bg-accent/10 rounded-lg p-5 border border-accent/30">
        <div className="flex items-start gap-3">
          <div className="text-accent mt-1">
            <i className="fas fa-info-circle"></i>
          </div>
          
          <div>
            <h4 className="font-semibold mb-2">Your Package Includes:</h4>
            <p className="text-sm">
              {formData.package === 'premium' ? (
                <>
                  Your Masterpiece package already includes both an <span className="text-accent font-medium">Instrumental Version</span> and a <span className="text-accent font-medium">Digital Lyric Sheet</span>.
                </>
              ) : formData.package === 'deluxe' ? (
                <>
                  Your Signature package already includes an <span className="text-accent font-medium">Instrumental Version</span>.
                </>
              ) : (
                <>
                  Your Essential package includes all the basics for a beautiful, personalized song. Add extras above to enhance your experience.
                </>
              )}
            </p>
          </div>
        </div>
      </div>
      
      {/* Gallery Showcase Option - Enhanced with better visual feedback */}
      <div className="mb-8 p-5 bg-white/5 border-2 border-white/10 rounded-lg hover:border-accent/30 transition-colors">
        <div className="flex items-start gap-3">
          <div className="relative mt-1">
            <input 
              type="checkbox" 
              id="showcase-option" 
              className="appearance-none h-5 w-5 rounded border border-white/30 checked:bg-accent checked:border-accent focus:outline-none focus:ring-2 focus:ring-accent/50 transition-colors"
              checked={showInGallery}
              onChange={handleShowcaseToggle}
            />
            <span className={`absolute top-0 left-0 h-5 w-5 flex items-center justify-center pointer-events-none transition-opacity ${showInGallery ? 'opacity-100' : 'opacity-0'}`}>
              <i className="fas fa-check text-xs text-dark"></i>
            </span>
          </div>
          
          <div className="flex-grow">
            <label 
              htmlFor="showcase-option" 
              className="font-semibold cursor-pointer"
            >
              Include my song in the SongSculptors gallery
            </label>
            <p className="text-sm text-light-muted mt-1">
              By selecting this option, you permit us to showcase your song in our public gallery.
              Your personal details will remain private, but the song itself and a brief description
              will be shared with others seeking inspiration.
            </p>
            
            {/* Added benefits section when enabled */}
            {showInGallery && (
              <div className="mt-3 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                <p className="text-sm">
                  <i className="fas fa-star mr-2 text-accent"></i>
                  <span className="font-medium text-accent">Gallery Benefits:</span> Your song may be featured on our homepage, 
                  and you'll receive exclusive gallery member updates and discounts on future orders.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Additional Comments */}
      <div className="mb-8">
        <label htmlFor="additional-notes" className="block mb-2 font-medium">
          Additional Notes (Optional)
        </label>
        <textarea
          id="additional-notes"
          name="additionalNotes"
          value={formData.additionalNotes || ''}
          onChange={(e) => setFormData({ ...formData, additionalNotes: e.target.value })}
          placeholder="Any special requests for your add-ons, or other details you'd like us to know..."
          rows="3"
          className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
        ></textarea>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="px-8 py-3 bg-transparent border border-white/20 text-light font-semibold rounded-full hover:bg-white/10 hover:border-white/30 transition-colors duration-300 group focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
        >
          <i className="fas fa-arrow-left mr-2"></i> Back
        </button>
        
        <button
          type="submit"
          className="px-8 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-gradient-to-r hover:from-accent hover:to-accent-alt transition-all duration-300 hover:shadow-glow-accent group focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-opacity-75"
        >
          Continue 
          <i className="fas fa-arrow-right ml-2 transition-transform duration-300 group-hover:translate-x-1"></i>
        </button>
      </div>
    </form>
  );
};

export default StepThree;