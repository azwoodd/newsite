// client/src/components/admin/AddRevisionNote.jsx
import { useState } from 'react';
import { adminService } from '../../services/api';

const AddRevisionNote = ({ orderId, revisionType, onNoteAdded }) => {
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!note.trim()) {
      setError('Please enter a note');
      return;
    }
    
    // Determine the note type based on revisionType
    const noteType = revisionType === 'lyrics' ? 'admin_lyrics_note' : 'admin_song_note';
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Make sure to include revisionType in the payload
      await adminService.addRevisionNote(orderId, {
        type: noteType,
        comment: note,
        revisionType: revisionType === 'songs' ? 'song' : revisionType // Standardize to 'song' or 'lyrics'
      });
      
      // Clear form and notify parent
      setNote('');
      if (onNoteAdded) {
        onNoteAdded();
      }
    } catch (err) {
      console.error('Error adding revision note:', err);
      setError('Failed to add note. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="mt-3">
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <label className="text-sm text-light-muted mb-1 block">
            Add Admin Note:
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={`Add internal note about ${revisionType}...`}
            className="w-full p-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-accent text-sm"
            rows="2"
          ></textarea>
        </div>
        
        {error && (
          <div className="text-romantic text-xs mb-2">
            <i className="fas fa-exclamation-circle mr-1"></i>
            {error}
          </div>
        )}
        
        <button
          type="submit"
          disabled={isSubmitting || !note.trim()}
          className="px-4 py-1.5 bg-accent/80 text-dark text-sm rounded hover:bg-accent transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <><i className="fas fa-spinner fa-spin mr-1"></i> Adding...</>
          ) : (
            <><i className="fas fa-plus mr-1"></i> Add Note</>
          )}
        </button>
      </form>
    </div>
  );
};

export default AddRevisionNote;