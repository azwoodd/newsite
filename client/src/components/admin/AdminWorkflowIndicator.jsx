// client/src/components/admin/AdminWorkflowIndicator.jsx
import React from 'react';

/**
 * A component that visually displays order workflow status for admin panel
 * 
 * @param {Object} props - Component props
 * @param {string} props.status - Current order status
 * @param {boolean} props.lyricsApproved - Whether lyrics are approved
 * @param {boolean} props.hasSongVersions - Whether the order has song versions
 */
const AdminWorkflowIndicator = ({ status, lyricsApproved, hasSongVersions }) => {
  // Define workflow steps
  const steps = [
    { id: 'pending', label: 'Order Received', icon: 'clipboard-check' },
    { id: 'in_production', label: 'In Production', icon: 'pen-nib' },
    { id: 'lyrics_review', label: 'Lyrics Review', icon: 'file-alt' },
    { id: 'song_production', label: 'Song Creation', icon: 'music' },
    { id: 'song_review', label: 'Song Review', icon: 'headphones' },
    { id: 'completed', label: 'Completed', icon: 'check-circle' }
  ];
  
  // Determine current step based on status and properties
  let currentStepIndex = 0;
  
  // Normalize the status (convert to lowercase, replace spaces with underscores)
  const normalizedStatus = status.toLowerCase().replace(/\s+/g, '_');
  
  switch(normalizedStatus) {
    case 'pending': 
      currentStepIndex = 0; 
      break;
    case 'in_production': 
      currentStepIndex = 1; 
      break;
    case 'lyrics_review': 
      currentStepIndex = 2; 
      break;
    case 'song_production': 
      currentStepIndex = 3; 
      break;
    case 'song_review': 
      currentStepIndex = 4; 
      break;
    case 'completed': 
      currentStepIndex = 5; 
      break;
    case 'ready_for_review': // Legacy status support
      if (!lyricsApproved) {
        currentStepIndex = 2; // Lyrics review
      } else if (!hasSongVersions) {
        currentStepIndex = 3; // Song production
      } else {
        currentStepIndex = 4; // Song review
      }
      break;
    default:
      console.warn(`Unknown status: ${status}`);
      currentStepIndex = 0;
  }
  
  return (
    <div className="mb-6 pb-4 border-b border-white/10">
      <h3 className="text-lg font-semibold mb-4">Workflow Status</h3>
      
      {/* Progress Bar */}
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-4">
        <div 
          className="absolute top-0 left-0 h-full bg-accent transition-all duration-500"
          style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
        ></div>
      </div>
      
      {/* Status Steps */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
        {steps.map((step, index) => (
          <div 
            key={step.id} 
            className={`flex flex-col items-center ${
              index <= currentStepIndex ? 'text-accent' : 'text-light-muted opacity-50'
            }`}
            title={`${step.label} ${index === currentStepIndex ? '(Current)' : ''}`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 
              ${index <= currentStepIndex ? 'bg-accent/20 border border-accent' : 'bg-white/5 border border-white/20'}`}
            >
              <i className={`fas fa-${step.icon} ${index <= currentStepIndex ? '' : 'opacity-50'}`}></i>
            </div>
            <span className="text-xs">{step.label}</span>
          </div>
        ))}
      </div>
      
      {/* Debug Info - Only shown if debugMode is enabled */}
      <div className="mt-4 text-xs text-light-muted">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <span><strong>Status:</strong> {status}</span>
          <span><strong>Current Stage:</strong> {steps[currentStepIndex].label}</span>
          <span><strong>Lyrics Approved:</strong> {lyricsApproved ? 'Yes' : 'No'}</span>
          <span><strong>Song Versions:</strong> {hasSongVersions ? 'Yes' : 'No'}</span>
        </div>
      </div>
    </div>
  );
};

export default AdminWorkflowIndicator;