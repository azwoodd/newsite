// client/src/components/admin/RevisionHistory.jsx
import { useState, useEffect } from 'react';
import { adminService } from '../../services/api';
import AddRevisionNote from './AddRevisionNote';

const RevisionHistory = ({ orderId, revisionType }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [revisions, setRevisions] = useState([]);

  const fetchRevisionHistory = async () => {
    try {
      setLoading(true);
      console.log(`Fetching revision history for order ${orderId}, type: ${revisionType}`);
      const response = await adminService.getOrderRevisionHistory(orderId);
      
      // Debug logging - show ALL revisions for debugging
      console.log("All revisions received:", response.data.revisions);
      
      if (response.data.success) {
        // SIMPLIFIED FILTERING LOGIC
        let filteredRevisions = [];
        
        if (revisionType === 'lyrics') {
          // For lyrics, explicitly include these types without complex logic
          filteredRevisions = response.data.revisions.filter(revision => 
            // Core lyrics-related types
            revision.type === 'lyrics_approved' ||
            revision.type === 'lyrics_changes_requested' ||
            revision.type === 'lyrics_change_request' ||
            revision.type === 'admin_lyrics_note' ||
            // Backup with revision_type field and keyword matching
            revision.revision_type === 'lyrics' ||
            (revision.type && revision.type.toLowerCase().includes('lyrics'))
          );
          
          console.log("LYRICS REVISIONS - Types found:", 
            filteredRevisions.map(r => r.type));
        } else if (revisionType === 'song' || revisionType === 'songs') {
          // For songs, explicitly include these types
          filteredRevisions = response.data.revisions.filter(revision => 
            // Core song-related types
            revision.type === 'song_approved' ||
            revision.type === 'melody_approved' ||
            revision.type === 'song_change_request' ||
            revision.type === 'melody_changes_requested' ||
            revision.type === 'admin_song_note' ||
            // Backup with revision_type field and keyword matching
            revision.revision_type === 'song' ||
            (revision.type && 
              (revision.type.toLowerCase().includes('song') || 
               revision.type.toLowerCase().includes('melody')))
          );
          
          console.log("SONG REVISIONS - Types found:", 
            filteredRevisions.map(r => r.type));
        }
        
        console.log(`Filtered ${revisionType} revisions:`, filteredRevisions);
        setRevisions(filteredRevisions);
      } else {
        console.error('Failed to load revision history:', response.data);
        setError('Failed to load revision history');
      }
    } catch (err) {
      console.error('Error fetching revision history:', err);
      setError('Error loading revision history. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (orderId) {
      fetchRevisionHistory();
    }
  }, [orderId, revisionType]);
  
  // Manual refresh function - explicitly added at the top
  const handleRefresh = () => {
    console.log("Manual refresh requested");
    fetchRevisionHistory();
  };
  
  // Format the revision type for display
  const formatRevisionType = (type) => {
    switch(type) {
      case 'lyrics_approved': return 'Lyrics Approved';
      case 'lyrics_changes_requested': return 'Lyrics Changes Requested';
      case 'lyrics_change_request': return 'Lyrics Changes Requested';
      case 'song_approved': return 'Song Approved';
      case 'melody_approved': return 'Song Approved';
      case 'song_change_request': return 'Song Changes Requested';
      case 'melody_changes_requested': return 'Song Changes Requested';
      case 'admin_lyrics_note': return 'Admin Note (Lyrics)';
      case 'admin_song_note': return 'Admin Note (Song)';
      default: return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };
  
  // Format date for display
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };
  
  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent mx-auto"></div>
        <p className="mt-2 text-sm text-light-muted">Loading revision history...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-romantic/10 border border-romantic/20 rounded-lg p-4 text-sm">
        <i className="fas fa-exclamation-circle mr-2"></i>
        {error}
      </div>
    );
  }
  
  if (revisions.length === 0) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 text-center text-light-muted text-sm">
        <i className="fas fa-info-circle mr-2"></i>
        No revision history available for this {revisionType === 'lyrics' ? 'lyrics' : 'song'}.
      </div>
    );
  }
  
  const handleNoteAdded = () => {
    // Refresh the revision history with the same simplified logic
    setLoading(true);
    adminService.getOrderRevisionHistory(orderId)
      .then(response => {
        if (response.data.success) {
          let filteredRevisions = [];
          
          if (revisionType === 'lyrics') {
            // For lyrics, explicitly include these types
            filteredRevisions = response.data.revisions.filter(revision => 
              // Core lyrics-related types
              revision.type === 'lyrics_approved' ||
              revision.type === 'lyrics_changes_requested' ||
              revision.type === 'lyrics_change_request' ||
              revision.type === 'admin_lyrics_note' ||
              // Backup with revision_type field and keyword matching
              revision.revision_type === 'lyrics' ||
              (revision.type && revision.type.toLowerCase().includes('lyrics'))
            );
          } else if (revisionType === 'song' || revisionType === 'songs') {
            // For songs, explicitly include these types
            filteredRevisions = response.data.revisions.filter(revision => 
              // Core song-related types
              revision.type === 'song_approved' ||
              revision.type === 'melody_approved' ||
              revision.type === 'song_change_request' ||
              revision.type === 'melody_changes_requested' ||
              revision.type === 'admin_song_note' ||
              // Backup with revision_type field and keyword matching
              revision.revision_type === 'song' ||
              (revision.type && 
                (revision.type.toLowerCase().includes('song') || 
                revision.type.toLowerCase().includes('melody')))
            );
          }
          
          setRevisions(filteredRevisions);
        }
      })
      .catch(err => {
        console.error('Error refreshing revision history:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <div className="space-y-3 mt-2">
      {/* Simple refresh button at top, standalone */}
      <div className="flex justify-end mb-4">
        <button
          onClick={handleRefresh}
          className="bg-accent/20 hover:bg-accent/30 text-white px-4 py-2 rounded-lg flex items-center transition-colors"
        >
          <i className="fas fa-sync-alt mr-2"></i>
          Refresh Notes
        </button>
      </div>

      {revisions.map((revision) => (
        <div 
          key={revision.id} 
          className={`p-4 rounded-lg border ${
            revision.type.includes('approved') 
              ? 'bg-green-500/10 border-green-500/20' 
              : revision.type.includes('admin')
                ? 'bg-purple-500/10 border-purple-500/20'
                : 'bg-yellow-500/10 border-yellow-500/20'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className={`text-sm font-medium ${
                revision.type.includes('approved') 
                  ? 'text-green-400' 
                  : revision.type.includes('admin')
                    ? 'text-purple-400'
                    : 'text-yellow-400'
              }`}>
                {formatRevisionType(revision.type)}
              </span>
              <span className="text-xs text-light-muted ml-2">
                by {revision.user_display_name} • {formatDate(revision.created_at)}
              </span>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${
              revision.user_type === 'admin' 
                ? 'bg-purple-500/20 text-purple-300' 
                : 'bg-blue-500/20 text-blue-300'
            }`}>
              {revision.user_type === 'admin' ? 'Staff' : 'Customer'}
            </span>
          </div>
          
          {revision.comment && (
            <div className="mt-2 bg-white/5 p-3 rounded text-sm whitespace-pre-wrap">
              {revision.comment}
            </div>
          )}
        </div>
      ))}
      
      {/* Add ability to add notes */}
      <AddRevisionNote 
        orderId={orderId}
        revisionType={revisionType}
        onNoteAdded={handleNoteAdded}
      />
    </div>
  );
};

export default RevisionHistory;