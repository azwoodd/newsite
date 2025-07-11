import { useState, useEffect } from 'react';
import { useMusicPlayer } from './GlobalMusicPlayer';

// This component wraps the AudioPlayer functionality but connects to the global music player
const ConnectedAudioPlayer = ({ track, title, author, genre }) => {
  const { 
    playTrack, 
    currentTrack, 
    isPlaying,
    formatTime,
    addToQueue
  } = useMusicPlayer();
  
  // Local state for minimal UI
  const [trackProgress, setTrackProgress] = useState(0);
  
  // Check if this is the currently playing track
  const isCurrentTrack = currentTrack && currentTrack.id === track.id;
  
  // Update local progress if this is the current track
  useEffect(() => {
    if (!isCurrentTrack) {
      setTrackProgress(0);
      return;
    }
    
    // Set up an interval to update the progress
    const interval = setInterval(() => {
      if (currentTrack && isPlaying) {
        const audio = document.querySelector('audio');
        if (audio) {
          const progress = (audio.currentTime / audio.duration) * 100;
          setTrackProgress(progress);
        }
      }
    }, 100);
    
    return () => clearInterval(interval);
  }, [isCurrentTrack, isPlaying, currentTrack]);
  
  // Handle play button click
  const handlePlay = () => {
    // Format the track for the global player
    const formattedTrack = {
      id: track.id || Math.random().toString(),
      url: track.trackUrl || track.url,
      title: title || track.title,
      author: author || track.author,
      genre: genre || track.genre,
      imageUrl: track.image || track.imageUrl
    };
    
    playTrack(formattedTrack);
  };
  
  // Handle add to queue
  const handleAddToQueue = (e) => {
    e.stopPropagation();
    
    const formattedTrack = {
      id: track.id || Math.random().toString(),
      url: track.trackUrl || track.url,
      title: title || track.title,
      author: author || track.author,
      genre: genre || track.genre,
      imageUrl: track.image || track.imageUrl
    };
    
    addToQueue(formattedTrack);
  };
  
  return (
    <div className="w-full">
      <div className="flex items-center mb-3">
        <button 
          onClick={handlePlay}
          className={`w-10 h-10 rounded-full ${isCurrentTrack && isPlaying ? 'bg-accent-alt' : 'bg-accent'} text-dark flex items-center justify-center flex-shrink-0 mr-3 transition-transform hover:scale-105 active:scale-95 shadow-sm`}
          aria-label={isCurrentTrack && isPlaying ? 'Playing' : 'Play'}
        >
          <i className={`fas fa-${isCurrentTrack && isPlaying ? 'pause' : 'play'}`}></i>
        </button>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-semibold truncate pr-2">
              {title || track.title}
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div 
              className="h-2 bg-white/10 rounded-full cursor-pointer relative overflow-hidden flex-grow mr-2"
              onClick={handlePlay}
            >
              {isCurrentTrack ? (
                <div 
                  className="h-full bg-gradient-to-r from-accent to-accent-alt absolute top-0 left-0 rounded-full transition-all duration-200"
                  style={{ width: `${trackProgress}%` }}
                >
                  <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-sm"></div>
                </div>
              ) : (
                <div className="h-full bg-accent/50 w-0 absolute top-0 left-0 rounded-full"></div>
              )}
            </div>
            
            <button
              onClick={handleAddToQueue}
              className="text-xs text-light-muted hover:text-accent transition-colors"
              title="Add to queue"
            >
              <i className="fas fa-plus"></i>
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-light-muted">
        <div className="flex items-center">
          <i className="fas fa-user text-accent mr-1"></i>
          {author || track.author}
        </div>
        <div className="flex items-center">
          <i className="fas fa-music text-accent mr-1"></i>
          {genre || track.genre}
        </div>
      </div>
    </div>
  );
};

export default ConnectedAudioPlayer;