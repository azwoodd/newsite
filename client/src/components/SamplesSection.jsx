import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Changed from Link to useNavigate
import { songService } from '../services/api';
import ConnectedAudioPlayer from './ConnectedAudioPlayer'; // Use the connected player

const SamplesSection = () => {
  const [samples, setSamples] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // Use navigate hook instead of Link
  
  useEffect(() => {
    // Fetch showcase samples for homepage (top 6)
    const fetchSamples = async () => {
      try {
        setLoading(true);
        const response = await songService.getShowcaseSongs('all', 6); // Limit to 6
        setSamples(response.data.showcaseItems);
      } catch (err) {
        console.error('Error fetching showcase samples:', err);
        setError('Failed to load showcase samples');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSamples();
  }, []);
  
  // Track view/play when a sample is played
  const handleSamplePlay = async (sampleId) => {
    try {
      await songService.incrementViewCount(sampleId);
    } catch (err) {
      console.error('Error tracking sample play:', err);
    }
  };

  // Navigate programmatically instead of using Link to prevent audio interruption
  const handleViewAllClick = () => {
    navigate('/showcase');
  };

  return (
    <section id="samples" className="py-20 bg-gradient-to-b from-dark to-deep">
      <div className="container-custom">
        <div className="text-center mb-16 animate-on-scroll">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 relative inline-block">
            Hear Our Work
            <span className="absolute w-20 h-0.5 bg-accent bottom-[-10px] left-1/2 transform -translate-x-1/2"></span>
          </h2>
          <p className="max-w-xl mx-auto text-light-muted">
            Listen to samples of our custom songs created for real clients.
          </p>
        </div>
        
        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent"></div>
          </div>
        )}
        
        {error && (
          <div className="text-center text-romantic my-8">
            <p>{error}</p>
          </div>
        )}
        
        {!loading && samples.length === 0 && (
          <div className="text-center text-light-muted my-8">
            <p>No showcase samples available at this time.</p>
          </div>
        )}
        
        {!loading && samples.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {samples.map((sample) => (
              <div 
                key={sample.id} 
                className="bg-white/5 rounded-lg overflow-hidden transition-transform duration-300 hover:-translate-y-2 border border-white/10"
              >
                <div className="h-[200px] relative overflow-hidden">
                  <img 
                    src={sample.image} 
                    alt={sample.title}
                    className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/80 to-transparent flex items-end p-6">
                    <h3 className="text-2xl text-white m-0">{sample.title}</h3>
                  </div>
                  {sample.featured && (
                    <div className="absolute top-4 right-[-35px] bg-accent text-dark py-1 px-12 transform rotate-45 text-xs font-semibold">
                      Featured
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <ConnectedAudioPlayer 
                    track={{
                      id: sample.id,
                      title: sample.title,
                      trackUrl: sample.trackUrl,
                      author: sample.author,
                      genre: sample.genre,
                      image: sample.image
                    }}
                    onPlay={() => handleSamplePlay(sample.id)}
                  />
                  
                  <p className="text-light-muted mt-6 mb-2 line-clamp-3">{sample.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="mt-12 text-center">
          <button
            onClick={handleViewAllClick}
            className="px-6 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-accent/10 transition-colors duration-300 inline-block"
          >
            <i className="fas fa-headphones mr-2"></i>
            View All Songs
          </button>
        </div>
      </div>
    </section>
  );
};

export default SamplesSection;