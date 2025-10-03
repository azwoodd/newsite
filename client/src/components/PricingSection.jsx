import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const PricingCard = ({ featured, icon, title, price, features, buttonText, type, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`bg-white/5 rounded-lg p-8 md:p-10 text-center transition-all duration-300 relative overflow-hidden flex flex-col h-full ${
        isHovered ? 'transform scale-105 shadow-lg z-10 border border-accent' : 'border border-white/10'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {featured && (
        <div className="absolute top-6 right-[-4rem] bg-accent text-dark py-2 px-16 transform rotate-45 text-sm font-semibold">
          Most Popular
        </div>
      )}

      <div className={`text-5xl ${featured ? 'text-accent' : 'text-accent'} mb-6`}>
        <i className={`fas fa-${icon}`}></i>
      </div>

      <h3 className="text-2xl font-bold mb-2 font-secondary">{title}</h3>

      <div className="flex items-center justify-center gap-1 mb-6">
        <span className="text-xl font-medium">£</span>
        <span className="text-4xl font-bold text-white">{price}</span>
      </div>

      <ul className="mb-8 text-left flex-grow">
        {features.map((feature, index) => (
          <li key={index} className="mb-3 flex items-start">
            <span className="text-accent mr-3 mt-1 flex-shrink-0">
              <i className="fas fa-check"></i>
            </span>
            <span className="text-light-muted">{feature}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onClick(type)}
        className={`inline-block w-full py-3 px-6 rounded-lg border-2 border-accent text-white font-semibold transition-all duration-300 mt-auto ${
          isHovered ? 'bg-accent/20 hover:bg-accent/30' : 'bg-transparent hover:bg-accent/10'
        }`}
      >
        {buttonText}
      </button>
    </div>
  );
};

const PricingSection = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Selected package (used for initial state / consistency with URL & storage)
  const [selectedPackage, setSelectedPackage] = useState(null);

  useEffect(() => {
    // Support both ?package=... in search and in hash (/#order-form?package=...)
    const getParams = () => {
      if (location.search && location.search.length > 1) {
        return new URLSearchParams(location.search);
      }
      const hash = location.hash || '';
      const q = hash.includes('?') ? hash.split('?')[1] : '';
      return new URLSearchParams(q);
    };

    const VALID = ['essential', 'signature', 'masterpiece'];
    const LEGACY_MAP = { basic: 'essential', deluxe: 'signature', premium: 'masterpiece' };

    const normalize = (val) => {
      if (!val) return null;
      if (VALID.includes(val)) return val;
      return LEGACY_MAP[val] || null;
    };

    // 1) URL takes priority
    const params = getParams();
    const fromUrl = normalize(params.get('package'));
    if (fromUrl) {
      setSelectedPackage(fromUrl);
      return;
    }

    // 2) Fallback to localStorage
    try {
      const saved = localStorage.getItem('songFormData');
      if (saved) {
        const formData = JSON.parse(saved);
        const fromStorage = normalize(formData?.package);
        if (fromStorage) {
          setSelectedPackage(fromStorage);
          return;
        }
      }
    } catch {
      // ignore JSON/localStorage errors
    }

    // 3) Default
    setSelectedPackage('signature');
  }, [location.search, location.hash]);

  // Current plans (new names/prices)
  const pricingPlans = [
    {
      featured: false,
      icon: 'star',
      title: 'Essential',
      type: 'essential',
      price: '39.99',
      features: [
        'Fully personalised, based on your story',
        'Choose your preferred style, tone & occasion',
        'Delivered via your private dashboard',
        'Lyric feedback & revisions included',
        'Preview two versions—download one',
        'High-quality MP3 file'
      ],
      buttonText: 'Choose Essential'
    },
    {
      featured: true,
      icon: 'gem',
      title: 'Signature',
      type: 'signature',
      price: '99.99',
      features: [
        'Everything in Essential',
        'Instrumental version INCLUDED',
        'Expedited delivery INCLUDED',
        'Enhanced storytelling with extra emotional detail',
        'Crafted by our most experienced writers',
        'Priority queue'
      ],
      buttonText: 'Choose Signature'
    },
    {
      featured: false,
      icon: 'crown',
      title: 'Masterpiece',
      type: 'masterpiece',
      price: '179.99',
      features: [
        'Everything in Signature',
        'Digital Lyric Sheet INCLUDED',
        'Extra nuanced writing (names, quotes, meaningful moments)',
        'Perfect for milestone occasions and keepsakes'
      ],
      buttonText: 'Choose Masterpiece'
    }
  ];

  // When a plan is selected
  const handleSelectPackage = (packageType) => {
    setSelectedPackage(packageType);

    // Persist to localStorage
    try {
      const saved = localStorage.getItem('songFormData');
      if (saved) {
        const data = JSON.parse(saved);
        data.package = packageType;
        localStorage.setItem('songFormData', JSON.stringify(data));
      } else {
        localStorage.setItem('songFormData', JSON.stringify({ package: packageType }));
      }
    } catch {
      // ignore storage errors
    }

    // Navigate to order form (query after hash is how your app currently routes)
    navigate(`/#order-form?package=${packageType}`);

    // Smooth scroll
    setTimeout(() => {
      const el = document.getElementById('order-form');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <section id="pricing" className="relative py-20 bg-deep">
      <div className="absolute top-[-100px] left-0 w-full h-[100px] bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 1440 320%27%3E%3Cpath fill=%27%23070B16%27 fill-opacity=%271%27 d=%27M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,128C672,107,768,117,864,138.7C960,160,1056,192,1152,197.3C1248,203,1344,181,1392,170.7L1440,160L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z%27%3E%3C/path%3E%3C/svg%3E')] bg-cover"></div>

      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block font-secondary">
            Investment in Memories
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Choose the package that fits your story and vision.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {pricingPlans.map((plan, index) => (
            <PricingCard
              key={index}
              featured={plan.featured}
              icon={plan.icon}
              title={plan.title}
              type={plan.type}
              price={plan.price}
              features={plan.features}
              buttonText={plan.buttonText}
              onClick={handleSelectPackage}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
