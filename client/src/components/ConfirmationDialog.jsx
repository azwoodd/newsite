// client/src/components/ConfirmationDialog.jsx
import React from 'react';

/**
 * A reusable confirmation dialog component for actions that need user confirmation
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message/description
 * @param {string} props.confirmText - Text for confirm button
 * @param {string} props.cancelText - Text for cancel button
 * @param {function} props.onConfirm - Function to call when confirmed
 * @param {function} props.onCancel - Function to call when canceled
 * @param {string} props.type - Dialog type ('warning', 'danger', 'success', 'info')
 * @param {boolean} props.show - Whether to show the dialog
 * @param {React.ReactNode} props.children - Optional additional content
 */
const ConfirmationDialog = ({ 
  title = 'Confirm Action', 
  message = 'Are you sure you want to proceed?', 
  confirmText = 'Confirm', 
  cancelText = 'Cancel', 
  onConfirm, 
  onCancel, 
  type = 'info',
  show,
  children
}) => {
  if (!show) return null;
  
  // Determine theme based on type
  let themeClasses = {
    info: {
      bg: 'bg-accent/10',
      border: 'border-accent/20',
      button: 'bg-accent hover:bg-accent-alt'
    },
    success: {
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
      button: 'bg-green-500 hover:bg-green-600'
    },
    warning: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      button: 'bg-yellow-500 hover:bg-yellow-600'
    },
    danger: {
      bg: 'bg-romantic/10',
      border: 'border-romantic',
      button: 'bg-romantic hover:bg-romantic/90'
    },
  };
  
  const theme = themeClasses[type] || themeClasses.info;
  
  // Get appropriate icon based on type
  const getIcon = () => {
    switch(type) {
      case 'success': return 'fas fa-check-circle';
      case 'warning': return 'fas fa-exclamation-triangle';
      case 'danger': return 'fas fa-exclamation-circle';
      default: return 'fas fa-info-circle';
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className={`bg-deep border ${theme.border} rounded-lg w-full max-w-md`}>
        <div className="p-6">
          <div className="flex items-center mb-4">
            <i className={`${getIcon()} text-xl mr-3`}></i>
            <h3 className="text-xl font-bold">{title}</h3>
          </div>
          
          <p className="mb-4">{message}</p>
          
          {/* Optional additional content */}
          {children && <div className="mb-4">{children}</div>}
          
          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-transparent border border-white/20 text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2 ${theme.button} text-dark rounded-lg transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationDialog;