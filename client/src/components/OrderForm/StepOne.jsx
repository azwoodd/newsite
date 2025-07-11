import { useState, useEffect } from 'react';

const EmotionOption = ({ emotion, icon, name, description, selected, onClick }) => {
  // Determine color based on emotion type
  let emotionColor;
  switch(emotion) {
    case 'romantic': emotionColor = 'var(--color-romantic)'; break;
    case 'happy': emotionColor = 'var(--color-happy)'; break;
    case 'nostalgic': emotionColor = 'var(--color-nostalgic)'; break;
    case 'powerful': emotionColor = 'var(--color-powerful)'; break;
    case 'peaceful': emotionColor = 'var(--color-peaceful)'; break;
    default: emotionColor = 'var(--color-accent)';
  }
  
  return (
    <div 
      className={`flex flex-col items-center bg-white/5 rounded-lg p-6 cursor-pointer transition-all duration-300 border border-transparent hover:-translate-y-1 hover:bg-white/8 relative overflow-hidden ${
        selected ? 'border-solid' : ''
      }`}
      style={{ 
        borderColor: selected ? emotionColor : 'transparent',
        backgroundColor: selected ? `${emotionColor}10` : ''
      }}
      onClick={onClick}
    >
      <div 
        className="text-4xl mb-4 transition-transform duration-300 hover:scale-110"
        style={{ color: emotionColor }}
      >
        <i className={`fas fa-${icon}`}></i>
      </div>
      
      <div className="font-semibold mb-2">{name}</div>
      
      <div className="text-sm text-muted text-center">{description}</div>
      
      {/* Bottom highlight bar */}
      <div 
        className={`absolute bottom-0 left-0 w-full h-1 transition-transform duration-300 ${
          selected ? 'scale-x-100' : 'scale-x-0'
        } hover:scale-x-100`}
        style={{ backgroundColor: emotionColor, transformOrigin: 'center' }}
      ></div>
    </div>
  );
};

const StepOne = ({ formData, setFormData, nextStep }) => {
  const [provideLyrics, setProvideLyrics] = useState(formData.provideLyrics || false);
  
  // Check local storage for form data on mount
  useEffect(() => {
    const savedFormData = localStorage.getItem('songFormData');
    if (savedFormData) {
      const parsedData = JSON.parse(savedFormData);
      
      // Only update if the form hasn't been filled yet
      if (!formData.songPurpose && !formData.recipientName) {
        setFormData(prevData => ({
          ...prevData,
          ...parsedData
        }));
        
        if (parsedData.provideLyrics !== undefined) {
          setProvideLyrics(parsedData.provideLyrics);
        }
      }
    }
  }, []);
  
  // Save form data to local storage when it changes
  useEffect(() => {
    localStorage.setItem('songFormData', JSON.stringify(formData));
  }, [formData]);

  const emotionOptions = [
    {
      emotion: 'romantic',
      icon: 'heart',
      name: 'Romantic',
      description: 'Intimate, loving, tender'
    },
    {
      emotion: 'happy',
      icon: 'smile',
      name: 'Joyful',
      description: 'Upbeat, celebratory, fun'
    },
    {
      emotion: 'nostalgic',
      icon: 'clock',
      name: 'Nostalgic',
      description: 'Reflective, sentimental, warm'
    },
    {
      emotion: 'powerful',
      icon: 'bolt',
      name: 'Powerful',
      description: 'Strong, passionate, intense'
    },
    {
      emotion: 'peaceful',
      icon: 'dove',
      name: 'Peaceful',
      description: 'Calming, serene, gentle'
    }
  ];

  const songPurposeOptions = [
    { value: '', label: 'Select purpose', disabled: true },
    { value: 'anniversary', label: 'Anniversary' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'wedding', label: 'Wedding' },
    { value: 'birthday', label: 'Birthday' },
    { value: 'other', label: 'Other' }
  ];

  const handleEmotionSelect = (emotion) => {
    setFormData({ ...formData, emotion });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };
  
  const toggleLyricsOption = () => {
    setProvideLyrics(!provideLyrics);
    setFormData({ 
      ...formData, 
      provideLyrics: !provideLyrics,
      // Clear lyrics if switching back to "We write lyrics"
      lyrics: !provideLyrics ? formData.lyrics : ''
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    nextStep();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center mb-8">
        <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center mr-4 flex-shrink-0">
          <i className="fas fa-heart"></i>
        </div>
        <h3 className="text-2xl font-semibold">Tell Us Your Story</h3>
      </div>
      
      <p className="text-light-muted mb-8">
        Share the details of your relationship and what makes it special. 
        The more you tell us, the more personalised your song will be.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div>
          <label htmlFor="song-purpose" className="block mb-2 font-medium">
            Song Purpose
          </label>
          <select
            id="song-purpose"
            name="songPurpose"
            value={formData.songPurpose || ''}
            onChange={handleInputChange}
            className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,0,102,0.2)]"
            required
          >
            {songPurposeOptions.map((option) => (
              <option 
                key={option.value} 
                value={option.value} 
                disabled={option.disabled}
                className="bg-deep text-white"
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="recipient-name" className="block mb-2 font-medium">
            Recipient Name
          </label>
          <input
            type="text"
            id="recipient-name"
            name="recipientName"
            value={formData.recipientName || ''}
            onChange={handleInputChange}
            placeholder="Who is this song for?"
            className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(255,0,102,0.2)]"
            required
          />
        </div>
      </div>
      
      <div className="mb-8">
        <label className="block mb-4 font-medium">How do you want the song to feel?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {emotionOptions.map((option) => (
            <EmotionOption
              key={option.emotion}
              emotion={option.emotion}
              icon={option.icon}
              name={option.name}
              description={option.description}
              selected={formData.emotion === option.emotion}
              onClick={() => handleEmotionSelect(option.emotion)}
            />
          ))}
        </div>
      </div>
      
      {/* Lyrics Options Toggle - Improved mobile layout */}
      <div className="bg-white/5 rounded-lg p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
          <h4 className="text-lg font-semibold mb-2 sm:mb-0">Lyrics Options</h4>
          
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto">
            <span className={`text-sm ${!provideLyrics ? 'text-accent font-medium' : 'text-light-muted'}`}>
              We write
            </span>
            
            <button 
              type="button"
              onClick={toggleLyricsOption}
              className="relative inline-flex h-6 w-11 items-center rounded-full mx-3"
            >
              <span className="sr-only">Toggle lyrics option</span>
              <span 
                className={`inline-block h-4 w-10 rounded-full transition-colors ${
                  provideLyrics ? 'bg-accent/80' : 'bg-white/20'
                }`}
              ></span>
              <span 
                className={`absolute inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${
                  provideLyrics ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              ></span>
            </button>
            
            <span className={`text-sm ${provideLyrics ? 'text-accent font-medium' : 'text-light-muted'}`}>
              You write
            </span>
          </div>
        </div>
        
        {provideLyrics ? (
          <div>
            <label htmlFor="user-lyrics" className="block mb-2 font-medium">
              Your Lyrics
            </label>
            <textarea
              id="user-lyrics"
              name="lyrics"
              value={formData.lyrics || ''}
              onChange={handleInputChange}
              placeholder="Enter your lyrics here..."
              rows="8"
              className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
              required={provideLyrics}
            ></textarea>
            <p className="text-sm text-light-muted mt-2">
              Our team will adapt your lyrics to fit the musical composition while preserving your message and style.
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <label htmlFor="song-theme" className="block mb-2 font-medium">
                Song Theme & Message
              </label>
              <textarea
                id="song-theme"
                name="songTheme"
                value={formData.songTheme || ''}
                onChange={handleInputChange}
                placeholder="What's the main message you want to convey?"
                rows="3"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                required={!provideLyrics}
              ></textarea>
            </div>
            
            <div>
              <label htmlFor="personal-story" className="block mb-2 font-medium">
                Personal Story or Key Events
              </label>
              <textarea
                id="personal-story"
                name="personalStory"
                value={formData.personalStory || ''}
                onChange={handleInputChange}
                placeholder="Share special moments, memories, or milestones"
                rows="4"
                className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white transition-all focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(196,160,100,0.2)]"
                required={!provideLyrics}
              ></textarea>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          className="px-8 py-3 bg-transparent border-2 border-accent text-white font-semibold rounded-full hover:bg-gradient-to-r hover:from-accent hover:to-accent-alt transition-all duration-300 hover:shadow-glow-accent group"
        >
          Continue 
          <i className="fas fa-arrow-right ml-2 transition-transform duration-300 group-hover:translate-x-1"></i>
        </button>
      </div>
    </form>
  );
};

export default StepOne;