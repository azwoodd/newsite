// client/src/components/AudioPlayer.jsx
import { useState, useEffect, useRef } from 'react';

const AudioPlayer = ({ trackUrl, title, author, genre }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState(false);
  const audioRef = useRef(null);
  const progressRef = useRef(null);
  const animationRef = useRef(null);
  
  // Initialize audio element
  useEffect(() => {
    const audio = audioRef.current;
    
    // Load metadata when audio is loaded
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setError(false);
    };
    
    // Clean up when component unmounts
    const handleAudioEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
    };
    
    // Handle errors
    const handleError = () => {
      console.error("Audio error:", audio.error);
      setError(true);
      setIsPlaying(false);
    };
    
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleAudioEnded);
    audio.addEventListener('error', handleError);
    
    return () => {
      cancelAnimationFrame(animationRef.current);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleAudioEnded);
      audio.removeEventListener('error', handleError);
      audio.pause();
    };
  }, []);
  
  // Effect to handle trackUrl changes
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      // Reset player when track changes
      setIsPlaying(false);
      setProgress(0);
      setCurrentTime(0);
      setError(false);
      
      // Load the new track
      audio.load();
    }
  }, [trackUrl]);
  
  // Format time to MM:SS
  const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };
  
  // Update progress bar
  const updateProgress = () => {
    const audio = audioRef.current;
    if (audio && !isNaN(audio.duration)) {
      const currentProgress = (audio.currentTime / audio.duration) * 100;
      setProgress(currentProgress);
      setCurrentTime(audio.currentTime);
    }
    animationRef.current = requestAnimationFrame(updateProgress);
  };
  
  // Toggle play/pause
  const togglePlay = () => {
    if (error) return; // Don't try to play if there's an error
    
    const audio = audioRef.current;
    
    if (isPlaying) {
      audio.pause();
      cancelAnimationFrame(animationRef.current);
    } else {
      audio.play()
        .then(() => {
          animationRef.current = requestAnimationFrame(updateProgress);
        })
        .catch(error => {
          console.error("Error playing audio:", error);
          setError(true);
        });
    }
    
    setIsPlaying(!isPlaying);
  };
  
  // Update audio position when clicking on progress bar
  const handleProgressClick = (e) => {
    if (error) return; // Don't update if there's an error
    
    const audio = audioRef.current;
    const progressBar = progressRef.current;
    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentClicked = (clickX / rect.width);
    
    audio.currentTime = percentClicked * audio.duration;
    setProgress(percentClicked * 100);
    setCurrentTime(percentClicked * audio.duration);
  };
  
  return (
    <div className="w-full">
      <audio ref={audioRef} src={trackUrl} preload="metadata" />
      
      <div className="flex items-center mb-3">
        <button 
          onClick={togglePlay}
          className={`w-10 h-10 rounded-full ${error ? 'bg-red-500' : 'bg-accent'} text-dark flex items-center justify-center flex-shrink-0 mr-3 transition-transform hover:scale-105 active:scale-95 shadow-sm`}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          disabled={error}
        >
          <i className={`fas fa-${error ? 'exclamation' : isPlaying ? 'pause' : 'play'}`}></i>
        </button>
        
        <div className="flex-grow">
          <div className="flex justify-between items-center mb-1">
            <div className="text-sm font-semibold truncate pr-2">
              {title}
            </div>
            <div className="text-xs font-mono text-light-muted">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div 
            ref={progressRef} 
            className={`h-2 ${error ? 'bg-red-800/30' : 'bg-white/10'} rounded-full cursor-pointer relative overflow-hidden`}
            onClick={handleProgressClick}
          >
            <div 
              className={`h-full ${error ? 'bg-red-500' : 'bg-gradient-to-r from-accent to-accent-alt'} absolute top-0 left-0 rounded-full`}
              style={{ width: `${progress}%` }}
            >
              {!error && (
                <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2 shadow-sm"></div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between text-xs text-light-muted">
        <div className="flex items-center">
          <i className="fas fa-user text-accent mr-1"></i>
          {author}
        </div>
        <div className="flex items-center">
          <i className="fas fa-music text-accent mr-1"></i>
          {genre}
        </div>
      </div>
      
      {error && (
        <div className="mt-2 text-xs text-red-400">
          <i className="fas fa-exclamation-circle mr-1"></i>
          Unable to load audio. Please try again later.
        </div>
      )}
    </div>
  );
};

export default AudioPlayer;