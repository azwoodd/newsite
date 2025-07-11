// client/src/components/SongReviewPanel.jsx
import { useState, useEffect } from 'react';

const SongReviewPanel = ({ songVersions, onApprove, onRequestChanges, isSubmitting, onSelectVersion, onDownload, anyVersionDownloaded, revisionCount, maxRevisions }) => {
  const [feedback, setFeedback] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [feedbackRequired, setFeedbackRequired] = useState(false);
  
  // Find currently selected version if any
  useEffect(() => {
    const selected = songVersions.find(version => version.is_selected);
    if (selected) {
      setSelectedVersion(selected.id);
    }
  }, [songVersions]);
  
  const handleSelectVersion = (versionId) => {
    setSelectedVersion(versionId);
    onSelectVersion(versionId);
  };
  
  const handleRequestChanges = () => {
    if (!feedback.trim()) {
      setFeedbackRequired(true);
      return;
    }
    
    onRequestChanges(feedback);
  };
  
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 mb-6">
      <h4 className="text-xl font-semibold mb-4">Song Review</h4>
      
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-light-muted mb-2">
          <div className="flex items-center">
            <i className="fas fa-sync-alt mr-2"></i>
            <span>Revisions: {revisionCount}/{maxRevisions}</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-info-circle mr-2"></i>
            <span>You can request up to {maxRevisions} revisions</span>
          </div>
        </div>
        
        <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-accent transition-all duration-300" 
            style={{ width: `${(revisionCount / maxRevisions) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <p className="text-light-muted mb-6">
        Listen to both versions and select your favorite. You can request changes or approve the song.
      </p>
      
      <div className="space-y-4 mb-6">
        {songVersions.map((version) => (
          <AudioPlayer 
            key={version.id}
            track={version}
            isSelected={version.id === selectedVersion}
            isDownloaded={version.is_downloaded}
            anyVersionDownloaded={anyVersionDownloaded}
            onSelectVersion={handleSelectVersion}
          />
        ))}
      </div>
      
      <div className="mb-4">
        <label className="block text-sm mb-2 flex justify-between">
          <span>Your Feedback {feedbackRequired && !feedback.trim() && <span className="text-romantic">* Required for requesting changes</span>}</span>
          <span className="text-light-muted text-xs">{feedback.length} characters</span>
        </label>
        <textarea 
          rows="4"
          value={feedback}
          onChange={(e) => {
            setFeedback(e.target.value);
            if (e.target.value.trim()) setFeedbackRequired(false);
          }}
          placeholder="Tell us what you think or request specific changes to the song..."
          className={`w-full p-3 bg-white/10 border ${
            feedbackRequired && !feedback.trim() ? 'border-romantic' : 'border-white/20'
          } rounded-lg text-white focus:outline-none focus:border-accent transition-all`}
        ></textarea>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-end">
        <button
          onClick={handleRequestChanges}
          disabled={isSubmitting || revisionCount >= maxRevisions || !feedback.trim()}
          className={`px-6 py-2 ${
            isSubmitting || revisionCount >= maxRevisions || !feedback.trim()
              ? 'bg-gray-500 text-white/50 cursor-not-allowed'
              : 'bg-transparent border border-white/20 text-white hover:bg-white/5'
          } rounded-lg transition-colors`}
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</>
          ) : (
            <><i className="fas fa-undo mr-2"></i>Request Changes</>
          )}
        </button>
        
        <button
          onClick={() => onApprove(feedback, selectedVersion)}
          disabled={isSubmitting || !selectedVersion}
          className={`px-6 py-2 ${
            isSubmitting || !selectedVersion
              ? 'bg-gray-500 text-white/50 cursor-not-allowed'
              : 'bg-accent text-dark hover:bg-accent-alt'
          } transition-colors rounded-lg`}
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</>
          ) : (
            <><i className="fas fa-check mr-2"></i>Approve Song</>
          )}
        </button>
      </div>
      
      {!selectedVersion && (
        <p className="text-yellow-300 text-sm mt-4">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          Please select a version before approving.
        </p>
      )}
      
      {revisionCount >= maxRevisions && (
        <div className="mt-4 text-yellow-300 text-sm flex items-center">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <span>You've reached the maximum number of revisions. Please contact support if you need additional changes.</span>
        </div>
      )}
    </div>
  );
};

// Audio Player Component for Song Versions (removed download button)
const AudioPlayer = ({ track, isSelected, onSelectVersion, isDownloaded, anyVersionDownloaded }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const handleTimeUpdate = (e) => {
    if (duration) {
      setCurrentTime(e.target.currentTime);
      setProgress((e.target.currentTime / duration) * 100);
    }
  };
  
  const handleLoadedMetadata = (e) => {
    setDuration(e.target.duration);
  };
  
  const handleEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    setCurrentTime(0);
  };
  
  const togglePlay = () => {
    const audio = document.getElementById(track.id);
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };
  
  const handleProgressClick = (e) => {
    const audio = document.getElementById(track.id);
    const progressBar = e.currentTarget;
    const position = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    audio.currentTime = position * duration;
  };
  
  return (
    <div className={`p-5 ${isSelected ? 'bg-accent/10 border-accent' : 'bg-white/5'} border rounded-lg mb-4 transition-all`}>
      <h3 className="text-lg font-semibold mb-2">{track.title}</h3>
      
      <audio 
        id={track.id} 
        src={track.url} 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />
      
      <div className="flex items-center mb-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-accent text-dark flex items-center justify-center flex-shrink-0 mr-3"
        >
          <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
        </button>
        
        <div 
          className="h-2 bg-white/10 rounded-full flex-grow cursor-pointer relative" 
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-accent rounded-full absolute left-0 top-0"
            style={{ width: `${progress}%` }}
          >
            <div className="w-3 h-3 bg-white rounded-full absolute right-0 top-1/2 transform -translate-y-1/2"></div>
          </div>
        </div>
        
        <div className="text-xs ml-3 font-mono w-16 text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 gap-3">
        <div className="text-sm text-light-muted">
          <i className="fas fa-music mr-2"></i> Version {track.version}
        </div>
        
        <div className="flex flex-wrap gap-3">
          {isSelected ? (
            <div className="flex items-center text-sm font-medium text-accent">
              <i className="fas fa-check-circle mr-2"></i> Selected Version
            </div>
          ) : (
            <button 
              onClick={() => onSelectVersion(track.id)} 
              className={`px-4 py-2 bg-transparent border border-accent text-accent text-sm rounded-full hover:bg-accent/10 transition-colors ${
                anyVersionDownloaded ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={anyVersionDownloaded}
              title={anyVersionDownloaded ? "A version has already been downloaded" : ""}
            >
              Select This Version
            </button>
          )}
          
          {isDownloaded && (
            <div className="flex items-center text-sm font-medium text-green-300">
              <i className="fas fa-check-circle mr-2"></i> Downloaded
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongReviewPanel;