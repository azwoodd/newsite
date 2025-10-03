// client/src/components/OrderForm/StepTwo.jsx
import { useState, useEffect, useRef } from 'react';
import { useMusicPlayer } from '../../components/GlobalMusicPlayer';

// Style Option Component
const StyleOption = ({ style, icon, name, selected, onClick, previewUrl, tabIndex }) => {
  const { playTrack } = useMusicPlayer();
  const optionRef = useRef(null);
  
  const handlePreview = (e) => {
    e.stopPropagation();
    if (previewUrl) {
      playTrack({
        id: `preview-${style}`,
        url: previewUrl,
        title: `${name} Preview`,
        author: 'SongSculptors',
        genre: 'Preview',
      });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    } else if (e.key === 'p' || e.key === 'P') {
      e.preventDefault();
      handlePreview(e);
    }
  };
  
  useEffect(() => {
    if (selected && optionRef.current) {
      optionRef.current.focus();
    }
  }, [selected]);
  
  return (
    <div 
      ref={optionRef}
      role="radio"
      aria-checked={selected}
      tabIndex={tabIndex}
      className={`bg-white/5 rounded-lg p-4 cursor-pointer transition-all duration-300 
        border-2 ${selected ? 'border-accent shadow-glow-accent' : 'border-transparent'} 
        hover:-translate-y-1 hover:bg-white/8 flex flex-col justify-between min-h-[150px]
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-opacity-75`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
    >
      <div>
        <div className="text-2xl text-accent mb-3">
          <i className={`fas fa-${icon}`}></i>
        </div>
        <div className="font-semibold mb-2">{name}</div>
      </div>
      
      <div 
        className={`flex items-center text-sm ${selected ? 'text-accent' : 'text-muted'} 
          mt-auto cursor-pointer hover:text-accent focus:text-accent`}
        onClick={handlePreview}
        role="button"
        tabIndex={selected ? 0 : -1}
        aria-label={`Preview ${name} style`}
      >
        <i className="fas fa-play mr-2"></i> Preview
        <div className="h-0.5 bg-white/20 rounded-full mt-0 ml-2 relative overflow-hidden w-full">
          <div className={`absolute top-0 left-0 h-full ${selected ? 'w-2/5 bg-accent' : 'w-1/3 bg-white/50'} rounded-px animate-pulse`}></div>
        </div>
      </div>
    </div>
  );
};

// Package Option Component
const PackageOption = ({ type, name, price, features, selected, onChange }) => {
  const [isHovered, setIsHovered] = useState(false);
  const packageRef = useRef(null);
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onChange();
    }
  };
  
  useEffect(() => {
    if (selected && packageRef.current) {
      packageRef.current.focus();
    }
  }, [selected]);
  
  return (
    <div 
      ref={packageRef}
      role="radio"
      aria-checked={selected}
      tabIndex="0"
      className={`bg-white/5 rounded-lg p-6 cursor-pointer border-2 transition-all duration-300 
        ${selected ? 'border-accent bg-accent/10 shadow-glow-accent' : 'border-transparent'}
        ${isHovered ? 'transform scale-105 shadow-lg z-10' : ''}
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-opacity-75`}
      onClick={onChange}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <input 
        type="radio" 
        name="package" 
        value={type}
        checked={selected}
        onChange={onChange}
        className="hidden"
        aria-hidden="true"
      />
      
      <div className="flex justify-between items-center mb-4">
        <span className="font-semibold text-xl">{name}</span>
        <span className="text-accent font-bold">£{price}</span>
      </div>
      
      <div className="mt-4">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start mb-2">
            <i className={`fas fa-check ${selected ? 'text-accent' : 'text-white/70'} mr-2 mt-1 flex-shrink-0`}></i>
            <span className={`${selected ? 'text-white' : 'text-light-muted'} text-sm`}>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const StepTwo = ({ formData, setFormData, nextStep, prevStep }) => {
  const [activeCategory, setActiveCategory] = useState('pop');

  // convenience base
  const PREVIEW = '/uploads/genre-previews';

  // All style options (wired to your files under /server/uploads/genre-previews)
  const allStyleOptions = {
    pop: [
      { id: 'modern-pop',       name: 'Modern Pop',       icon: 'music',        previewUrl: `${PREVIEW}/modern-pop.mp3` },
      { id: 'pop-ballad',       name: 'Pop Ballad',       icon: 'guitar',       previewUrl: `${PREVIEW}/pop-ballad.mp3` },
      { id: 'upbeat-pop',       name: 'Upbeat Pop',       icon: 'compact-disc', previewUrl: `${PREVIEW}/upbeat-pop.mp3` },
      { id: 'pop-rock',         name: 'Pop Rock',         icon: 'drum',         previewUrl: `${PREVIEW}/pop-rock.mp3` }
    ],
    acoustic: [
      { id: 'acoustic-folk',    name: 'Acoustic Folk',    icon: 'guitar',       previewUrl: `${PREVIEW}/acoustic-folk.mp3` },
      { id: 'acoustic-ballad',  name: 'Acoustic Ballad',  icon: 'music',        previewUrl: `${PREVIEW}/acoustic-ballad.mp3` },
      { id: 'indie-acoustic',   name: 'Indie Acoustic',   icon: 'compact-disc', previewUrl: `${PREVIEW}/indie-acoustic.mp3` }
    ],
    rnb: [
      { id: 'modern-rnb',       name: 'Modern R&B',       icon: 'music',        previewUrl: `${PREVIEW}/modern-rnb.mp3` },
      { id: 'soul-rnb',         name: 'Soul R&B',         icon: 'compact-disc', previewUrl: `${PREVIEW}/soul-rnb.mp3` },
      { id: 'smooth-rnb',       name: 'Smooth R&B',       icon: 'headphones',   previewUrl: `${PREVIEW}/smooth-rnb.mp3` }
    ],
    indie: [
      { id: 'indie-pop',        name: 'Indie Pop',        icon: 'music',        previewUrl: `${PREVIEW}/indie-pop.mp3` },
      { id: 'indie-folk',       name: 'Indie Folk',       icon: 'guitar',       previewUrl: `${PREVIEW}/indie-folk.mp3` },
      { id: 'indie-electronic', name: 'Indie Electronic', icon: 'compact-disc', previewUrl: `${PREVIEW}/indie-electronic.mp3` }
    ],
    electronic: [
      { id: 'pop-electronic',   name: 'Electronic Pop',   icon: 'music',        previewUrl: `${PREVIEW}/pop-electronic.mp3` },
      { id: 'chill-electronic', name: 'Chill Electronic', icon: 'headphones',   previewUrl: `${PREVIEW}/chill-electronic.mp3` },
      { id: 'dance-electronic', name: 'Dance Electronic', icon: 'compact-disc', previewUrl: `${PREVIEW}/dance-electronic.mp3` }
    ],
    folk: [
      { id: 'modern-folk',      name: 'Modern Folk',      icon: 'guitar',       previewUrl: `${PREVIEW}/modern-folk.mp3` },
      { id: 'indie-folk',       name: 'Indie Folk',       icon: 'music',        previewUrl: `${PREVIEW}/indie-folk.mp3` }, // recycled
      { id: 'traditional-folk', name: 'Traditional Folk', icon: 'leaf',         previewUrl: `${PREVIEW}/traditional-folk.mp3` }
    ]
  };
  
  const styleCategories = [
    { id: 'pop',        name: 'Pop' },
    { id: 'acoustic',   name: 'Acoustic' },
    { id: 'rnb',        name: 'R&B' },
    { id: 'indie',      name: 'Indie' },
    { id: 'electronic', name: 'Electronic' },
    { id: 'folk',       name: 'Folk' }
  ];
  
  // Package options (unchanged except names/pricing you set)
  const packageOptions = [
    {
      type: 'essential',
      name: 'Essential',
      price: '39.99',
      features: [
        'Fully personalised, based on your story',
        'Choose your preferred style, tone & occasion',
        'Delivered via your private dashboard',
        'Lyric feedback & revisions included',
        'Preview two versions—download one',
        'High-quality MP3 file'
      ]
    },
    {
      type: 'signature',
      name: 'Signature',
      price: '99.99',
      features: [
        'Everything in Essential',
        'Instrumental version INCLUDED',
        'Expedited delivery INCLUDED',
        'Enhanced storytelling with extra emotional detail',
        'Crafted by our most experienced writers',
        'Priority queue'
      ]
    },
    {
      type: 'masterpiece',
      name: 'Masterpiece',
      price: '179.99',
      features: [
        'Everything in Signature',
        'Digital Lyric Sheet INCLUDED',
        'Extra nuanced writing (names, quotes, meaningful moments)',
        'Perfect for milestone occasions & keepsakes'
      ]
    }
  ];
  
  // Initialize defaults
  useEffect(() => {
    if (formData.musicStyle) {
      for (const [category, styles] of Object.entries(allStyleOptions)) {
        if (styles.some(style => style.id === formData.musicStyle)) {
          setActiveCategory(category);
          break;
        }
      }
    } else {
      setFormData({ ...formData, musicStyle: 'modern-pop' });
    }
    if (!formData.package) {
      setFormData({ ...formData, package: 'essential' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const styleOptions = allStyleOptions[activeCategory] || [];
  
  const handleMusicStyleChange = (style) => {
    setFormData({ ...formData, musicStyle: style });
  };
  
  const handlePackageChange = (packageType) => {
    setFormData({ ...formData, package: packageType });
  };
  
  const handleCategoryKeyNav = (e) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const currentIndex = styleCategories.findIndex(cat => cat.id === activeCategory);
      const nextIndex = (currentIndex + 1) % styleCategories.length;
      setActiveCategory(styleCategories[nextIndex].id);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const currentIndex = styleCategories.findIndex(cat => cat.id === activeCategory);
      const prevIndex = (currentIndex - 1 + styleCategories.length) % styleCategories.length;
      setActiveCategory(styleCategories[prevIndex].id);
    }
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.musicStyle) setFormData({ ...formData, musicStyle: 'modern-pop' });
    if (!formData.package) setFormData({ ...formData, package: 'essential' });
    nextStep();
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mr-4 flex-shrink-0">
          <i className="fas fa-box"></i>
        </div>
        <h3 className="text-2xl font-semibold">Choose Your Package</h3>
      </div>
      
      <p className="text-light-muted mb-8">
        Select the package that best fits your needs and budget.
      </p>
      
      {/* Music Style Selection */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4">Music Style</h4>
        
        <div className="overflow-x-auto pb-2 -mb-0.5 relative">
          <div 
            className="flex border-b border-white/10 min-w-max"
            role="tablist"
            aria-label="Music style categories"
            onKeyDown={handleCategoryKeyNav}
          >
            {styleCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                role="tab"
                id={`tab-${category.id}`}
                aria-selected={activeCategory === category.id}
                aria-controls={`tabpanel-${category.id}`}
                tabIndex={activeCategory === category.id ? 0 : -1}
                className={`px-5 py-2 font-medium border-b-2 transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-opacity-75 ${
                  activeCategory === category.id
                    ? 'text-accent border-accent'
                    : 'text-muted border-transparent hover:text-light'
                }`}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
        
        <div 
          role="tabpanel"
          id={`tabpanel-${activeCategory}`}
          aria-labelledby={`tab-${activeCategory}`}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6"
        >
          {styleOptions.map((style) => (
            <StyleOption
              key={style.id}
              style={style.id}
              icon={style.icon}
              name={style.name}
              previewUrl={style.previewUrl}
              selected={formData.musicStyle === style.id}
              onClick={() => handleMusicStyleChange(style.id)}
              tabIndex={formData.musicStyle === style.id ? 0 : -1}
            />
          ))}
        </div>
        
        <input 
          type="hidden" 
          name="music-style" 
          value={formData.musicStyle || 'modern-pop'} 
        />
      </div>
      
      {/* Package Selection */}
      <div className="mb-8">
        <h4 className="text-xl font-semibold mb-4">Package Level</h4>
        
        <div 
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          role="radiogroup"
          aria-label="Package selection"
        >
          {packageOptions.map((pkg) => (
            <PackageOption
              key={pkg.type}
              type={pkg.type}
              name={pkg.name}
              price={pkg.price}
              features={pkg.features}
              selected={formData.package === pkg.type}
              onChange={() => handlePackageChange(pkg.type)}
            />
          ))}
        </div>
      </div>
      
      {/* Navigation */}
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

export default StepTwo;
