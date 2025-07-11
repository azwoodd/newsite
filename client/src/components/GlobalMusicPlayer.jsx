import { useState, useEffect, useRef, createContext, useContext } from 'react';

// Create a context for the global music player
export const MusicPlayerContext = createContext(null);

// Custom hook to use the music player
export const useMusicPlayer = () => {
  const context = useContext(MusicPlayerContext);
  if (!context) {
    throw new Error('useMusicPlayer must be used within a MusicPlayerProvider');
  }
  return context;
};

// Provider component for the music player
export const MusicPlayerProvider = ({ children }) => {
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isMinimized, setIsMinimized] = useState(true);
  const [queue, setQueue] = useState([]);
  const [audioData, setAudioData] = useState(null);
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const analyzerRef = useRef(null);
  const dataArrayRef = useRef(null);

  // Update time as audio plays
  const updateTimeElapsed = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      
      // Update audio visualization data if analyzer exists
      if (analyzerRef.current && dataArrayRef.current) {
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current);
        setAudioData([...dataArrayRef.current]);
      }
      
      animationRef.current = requestAnimationFrame(updateTimeElapsed);
    }
  };

  // Play a track and prevent multiple tracks playing at once
  const playTrack = (track) => {
    // Stop any currently playing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
    }
    
    if (currentTrack && currentTrack.id === track.id) {
      // Toggle play/pause if it's the same track
      if (isPlaying) {
        audioRef.current.pause();
        cancelAnimationFrame(animationRef.current);
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => {
            animationRef.current = requestAnimationFrame(updateTimeElapsed);
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
          });
      }
    } else {
      // Set new track
      setCurrentTrack(track);
      
      // Reset state for new track
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(true);
      
      // Need to wait for audio element to update before playing
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.volume = volume;
          audioRef.current.play()
            .then(() => {
              animationRef.current = requestAnimationFrame(updateTimeElapsed);
              
              // Set up audio analyzer for visualization
              try {
                if (!analyzerRef.current && window.AudioContext) {
                  const audioContext = new AudioContext();
                  const source = audioContext.createMediaElementSource(audioRef.current);
                  const analyzer = audioContext.createAnalyser();
                  
                  analyzer.fftSize = 256;
                  source.connect(analyzer);
                  analyzer.connect(audioContext.destination);
                  
                  const bufferLength = analyzer.frequencyBinCount;
                  const dataArray = new Uint8Array(bufferLength);
                  
                  analyzerRef.current = analyzer;
                  dataArrayRef.current = dataArray;
                }
              } catch (error) {
                console.error('Could not initialize audio analyzer:', error);
              }
            })
            .catch(error => {
              console.error('Error playing audio:', error);
              setIsPlaying(false);
            });
        }
      }, 100);
    }
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (!currentTrack) return;
    
    if (isPlaying) {
      audioRef.current.pause();
      cancelAnimationFrame(animationRef.current);
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          animationRef.current = requestAnimationFrame(updateTimeElapsed);
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Error playing audio:', error);
        });
    }
  };

  // Handle track end
  const handleTrackEnd = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    cancelAnimationFrame(animationRef.current);
    
    // Play next track in queue if available
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      setQueue(newQueue);
      playTrack(nextTrack);
    }
  };

  // Add track to queue
  const addToQueue = (track) => {
    setQueue([...queue, track]);
  };

  // Skip to next track
  const playNext = () => {
    if (queue.length > 0) {
      const nextTrack = queue[0];
      const newQueue = queue.slice(1);
      setQueue(newQueue);
      playTrack(nextTrack);
    }
  };

  // Play previous track (restart current track for now)
  const playPrevious = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      if (!isPlaying) {
        togglePlay();
      }
    }
  };

  // Seek to position
  const seekTo = (percentage) => {
    if (!audioRef.current || !duration) return;
    
    const time = (percentage / 100) * duration;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  // Handle volume change
  const changeVolume = (newVolume) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
    }
    setVolume(newVolume);
  };

  // Toggle minimize/expand
  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  // Listen for audio element events
  useEffect(() => {
    if (!audioRef.current) return;
    
    const handleDurationChange = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };
    
    const audio = audioRef.current;
    audio.addEventListener('loadedmetadata', handleDurationChange);
    audio.addEventListener('ended', handleTrackEnd);
    
    return () => {
      audio.removeEventListener('loadedmetadata', handleDurationChange);
      audio.removeEventListener('ended', handleTrackEnd);
    };
  }, [currentTrack]);

  const value = {
    currentTrack,
    isPlaying,
    duration,
    currentTime,
    volume,
    queue,
    isMinimized,
    audioData,
    formatTime,
    playTrack,
    togglePlay,
    seekTo,
    changeVolume,
    addToQueue,
    playNext,
    playPrevious,
    toggleMinimize
  };

  // Calculate if we're on a mobile device
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <MusicPlayerContext.Provider value={value}>
      {children}
      
      {/* Hidden audio element */}
      <audio 
        ref={audioRef}
        src={currentTrack?.url}
        preload="metadata"
      />
      
      {/* Custom player UI */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-deep border-t border-white/20 h-[90px] z-40 flex items-center px-4">
          {/* Left: Track Info */}
          <div className="flex items-center w-[30%]">
            <div className="h-14 w-14 mr-3 bg-dark overflow-hidden rounded">
              {currentTrack.imageUrl ? (
                <img 
                  src={currentTrack.imageUrl} 
                  alt={currentTrack.title} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white/50">
                  <i className="fas fa-music text-xl"></i>
                </div>
              )}
            </div>
            <div className="truncate">
              <div className="font-medium text-white truncate">{currentTrack.title}</div>
              <div className="text-xs text-light-muted truncate">{currentTrack.author}</div>
            </div>
          </div>
          
          {/* Center: Player Controls */}
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="flex items-center gap-5 mb-1">
              <button 
                onClick={playPrevious}
                className="text-light-muted hover:text-accent transition-colors"
                aria-label="Previous track"
              >
                <i className="fas fa-step-backward"></i>
              </button>
              <button 
                onClick={togglePlay}
                className="bg-accent rounded-full w-8 h-8 flex items-center justify-center text-dark hover:scale-105 transition-transform"
                aria-label={isPlaying ? "Pause" : "Play"}
              >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>
              <button 
                onClick={playNext}
                className="text-light-muted hover:text-accent transition-colors"
                aria-label="Next track"
              >
                <i className="fas fa-step-forward"></i>
              </button>
            </div>
            
            <div className="w-full max-w-[600px] flex items-center gap-2 text-xs">
              <span className="text-light-muted w-10 text-right">{formatTime(currentTime)}</span>
              <div 
                className="flex-1 h-1 bg-white/20 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = ((e.clientX - rect.left) / rect.width) * 100;
                  seekTo(percent);
                }}
              >
                <div 
                  className="absolute inset-y-0 left-0 bg-accent rounded-full group-hover:bg-accent-alt"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100"></div>
                </div>
              </div>
              <span className="text-light-muted w-10">{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Right: Volume */}
          <div className="w-[30%] flex justify-end items-center">
            <div className="flex items-center gap-2">
              <i className={`fas fa-volume-${volume > 0.5 ? 'up' : volume > 0 ? 'down' : 'mute'} text-light-muted`}></i>
              <div 
                className="w-24 h-1 bg-white/20 rounded-full cursor-pointer relative group"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const percent = (e.clientX - rect.left) / rect.width;
                  changeVolume(Math.max(0, Math.min(1, percent)));
                }}
              >
                <div 
                  className="absolute inset-y-0 left-0 bg-light-muted rounded-full group-hover:bg-accent"
                  style={{ width: `${volume * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 transform -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover:opacity-100"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </MusicPlayerContext.Provider>
  );
};

export default MusicPlayerProvider;