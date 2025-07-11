// client/src/components/LyricsReviewPanel.jsx
import { useState } from 'react';

const LyricsReviewPanel = ({ lyrics, onApprove, onRequestChanges, isSubmitting, revisionCount, maxRevisions }) => {
  const [feedback, setFeedback] = useState('');
  const [feedbackRequired, setFeedbackRequired] = useState(false);
  
  const handleRequestChanges = () => {
    if (!feedback.trim()) {
      setFeedbackRequired(true);
      return;
    }
    onRequestChanges(feedback);
  };
  
  return (
    <div className="bg-accent/5 border border-accent/20 rounded-lg p-6 mb-6">
      <h4 className="text-xl font-semibold mb-4">Lyrics Review</h4>
      
      <div className="mb-4">
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
      
      <div className="whitespace-pre-wrap bg-white/5 p-4 rounded-lg border border-white/10 mb-4 max-h-[300px] overflow-y-auto">
        {lyrics || "No lyrics have been provided yet."}
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
          placeholder="Tell us what you think about the lyrics or request specific changes..."
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
              ? 'bg-gray-500 cursor-not-allowed' 
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
          onClick={() => onApprove(feedback)}
          disabled={isSubmitting}
          className="px-6 py-2 bg-accent text-dark rounded-lg hover:bg-accent-alt transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin mr-2"></i>Submitting...</>
          ) : (
            <><i className="fas fa-check mr-2"></i>Approve Lyrics</>
          )}
        </button>
      </div>
      
      {revisionCount >= maxRevisions && (
        <div className="mt-4 text-yellow-300 text-sm flex items-center">
          <i className="fas fa-exclamation-triangle mr-2"></i>
          <span>You've reached the maximum number of revisions. Please contact support if you need additional changes.</span>
        </div>
      )}
    </div>
  );
};

export default LyricsReviewPanel;