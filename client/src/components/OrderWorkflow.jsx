// client/src/components/OrderWorkflow.jsx
import React from 'react';

// Visual workflow component that shows the 6 distinct stages
const OrderWorkflow = ({ order }) => {
  // Define workflow steps
  const steps = [
    { id: 'pending', label: 'Order Received', icon: 'clipboard-check' },
    { id: 'in_production', label: 'In Production', icon: 'pen-nib' },
    { id: 'lyrics_review', label: 'Lyrics Review', icon: 'file-alt' },
    { id: 'song_production', label: 'Song Creation', icon: 'music' },
    { id: 'song_review', label: 'Song Review', icon: 'headphones' },
    { id: 'completed', label: 'Completed', icon: 'check-circle' }
  ];
  
  // Determine current step based on order status and properties
  let currentStepIndex = 0;
  
  // If we have workflow_stage, use it directly (1-indexed, so subtract 1 for zero-indexed array)
  if (order.workflow_stage) {
    currentStepIndex = Math.min(Math.max(0, order.workflow_stage - 1), 5);
  } else {
    // Otherwise, determine from status and other properties
    const status = order.status.toLowerCase().replace(/\s+/g, '_');
    
    switch(status) {
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
        if (!order.lyrics_approved) {
          currentStepIndex = 2; // Lyrics review
        } else if (!order.songVersions || order.songVersions.length === 0) {
          currentStepIndex = 3; // Song production
        } else {
          currentStepIndex = 4; // Song review
        }
        break;
      default:
        currentStepIndex = 0;
    }
  }
  
  return (
    <div className="mb-6 pb-4 border-b border-white/10">
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
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 
              ${index <= currentStepIndex ? 'bg-accent/20 border border-accent' : 'bg-white/5 border border-white/20'}`}
            >
              <i className={`fas fa-${step.icon} text-xs`}></i>
            </div>
            <span className="text-xs">{step.label}</span>
          </div>
        ))}
      </div>
      
      {/* Current Status Message */}
      <div className="mt-4 text-center text-sm">
        <span className="px-3 py-1 rounded-full bg-accent/10 text-accent">
          {steps[currentStepIndex].label}
        </span>
      </div>
    </div>
  );
};

export default OrderWorkflow;