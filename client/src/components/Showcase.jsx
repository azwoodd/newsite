import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ConnectedAudioPlayer from './ConnectedAudioPlayer';
import { songService } from '../services/api';

const CategoryFilter = ({ categories, activeCategory, onChange }) => {
  return (
    <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-8 px-2 overflow-x-auto pb-2">
      {categories.map((category) => (
        <button
          key={category.id}
          className={`px-4 py-2 rounded-full transition-colors duration-300 text-sm font-medium whitespace-nowrap ${
            activeCategory === category.id 
              ? 'bg-accent text-dark' 
              : 'bg-white/10 text-light hover:bg-white/20'
          }`}
          onClick={() => onChange(category.id)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
};

const Showcase = () => {
  const [scrolled, setScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showcaseItems, setShowcaseItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showPublicOption, setShowPublicOption] = useState(false);
  const [showMoreSamples, setShowMoreSamples] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Load initial data and scroll handling
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    
    // Check local storage for showcase option preference
    const savedShowcaseOption = localStorage.getItem('showcaseOption');
    if (savedShowcaseOption === 'true') {
      setShowPublicOption(true);
    }
    
    // Load showcase data
    fetchShowcaseData();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Filter showcase items when category changes
  useEffect(() => {
    if (activeCategory === 'all') {
      setFilteredItems(showMoreSamples ? showcaseItems : showcaseItems.slice(0, 6));
    } else {
      const filtered = showcaseItems.filter(item => item.category === activeCategory);
      setFilteredItems(filtered);
    }
  }, [activeCategory, showMoreSamples, showcaseItems]);

  // Fetch showcase data from API
  const fetchShowcaseData = async () => {
    try {
      setLoading(true);
      
      // Fetch categories
      const categoriesResponse = await songService.getShowcaseCategories();
      setCategories(categoriesResponse.data.categories);
      
      // Fetch showcase items
      const showcaseResponse = await songService.getShowcaseSongs();
      setShowcaseItems(showcaseResponse.data.showcaseItems);
      setFilteredItems(showMoreSamples ? 
        showcaseResponse.data.showcaseItems : 
        showcaseResponse.data.showcaseItems.slice(0, 6)
      );
    } catch (err) {
      console.error('Error fetching showcase data:', err);
      setError('Failed to load showcase items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleItemClick = (itemId) => {
    // In a real app, you might show more details or play the audio
    console.log('Sample clicked:', itemId);
  };

  // Toggle remembering showcase option
  const handleShowcaseOptionChange = () => {
    const newValue = !showPublicOption;
    setShowPublicOption(newValue);
    localStorage.setItem('showcaseOption', newValue.toString());
  };

  // Handle button click to create song with showcase option
  const handleCreateSongClick = () => {
    navigate(`/#order-form?showInGallery=${showPublicOption}`);
  };

  return (
    <main className="pt-20 pb-24">
      <section className="py-16 bg-gradient-to-b from-dark to-deep">
        <div className="container-custom">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 font-secondary">Our Song Gallery</h1>
            <p className="max-w-2xl mx-auto text-light-muted">
              Browse our collection of custom songs crafted from real stories and emotions.
              Each piece is as unique as the story behind it.
            </p>
          </div>
          
          {/* Error message */}
          {error && (
            <div className="bg-romantic/10 border border-romantic rounded-md p-4 mb-8 text-center">
              <i className="fas fa-exclamation-circle mr-2"></i>
              {error}
            </div>
          )}
          
          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
            </div>
          )}
          
          {!loading && (
            <>
              <CategoryFilter 
                categories={categories} 
                activeCategory={activeCategory} 
                onChange={setActiveCategory} 
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredItems.map((item) => (
                  <div 
                    key={item.id} 
                    className="bg-white/5 rounded-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2 border border-white/10"
                  >
                    <div className="h-[200px] relative overflow-hidden">
                      <img 
                        src={item.image} 
                        alt={item.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                      />
                      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-end p-6">
                        <h3 className="text-xl sm:text-2xl font-bold mb-4 text-white">{item.title}</h3>
                      </div>
                      {item.featured && (
                        <div className="absolute top-4 right-[-35px] bg-accent text-dark py-1 px-12 transform rotate-45 text-xs font-semibold">
                          Featured
                        </div>
                      )}
                    </div>
                    
                    <div className="p-6">
                      <ConnectedAudioPlayer 
                        track={{
                          id: item.id,
                          title: item.title,
                          trackUrl: item.trackUrl,
                          author: item.author,
                          genre: item.genre,
                          image: item.image
                        }}
                      />
                      
                      <p className="text-light-muted mt-6 mb-2 line-clamp-3">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              
              {activeCategory === 'all' && !showMoreSamples && filteredItems.length < showcaseItems.length && (
                <div className="mt-12 text-center">
                  <button
                    onClick={() => setShowMoreSamples(true)}
                    className="px-6 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-accent/10 transition-colors duration-300 inline-block"
                  >
                    <i className="fas fa-plus-circle mr-2"></i>
                    View More Songs
                  </button>
                </div>
              )}
              
              {filteredItems.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-light-muted">No songs found in this category.</p>
                </div>
              )}
            </>
          )}
          
          <div className="mt-16 p-8 bg-white/5 rounded-lg border border-white/10">
            <h3 className="text-2xl font-semibold mb-4 font-secondary">Want your story featured here?</h3>
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex-grow">
                <p className="text-light-muted mb-4">
                  When ordering your custom song, you can choose to have it showcased in our gallery.
                  This option is completely voluntary and does not affect the price or quality of your song.
                </p>
                
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="showcase-option" 
                    className="mr-3 h-5 w-5 accent-accent"
                    checked={showPublicOption}
                    onChange={handleShowcaseOptionChange}
                  />
                  <label htmlFor="showcase-option" className="cursor-pointer">
                    I want to feature my song in the showcase gallery
                  </label>
                </div>
              </div>
              
              <button 
                onClick={handleCreateSongClick}
                className="px-6 py-3 bg-accent text-dark font-medium rounded-full hover:bg-accent-alt transition-colors duration-300 text-center md:text-left flex-shrink-0"
              >
                Start My Song
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

export default Showcase;