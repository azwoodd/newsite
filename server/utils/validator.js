// Email validation
exports.isValidEmail = (email) => {
  if (!email) return false;
  
  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation
exports.isValidPassword = (password) => {
  if (!password) return false;
  
  // Minimum 6 characters
  return password.length >= 6;
};

// Input sanitization
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  // Escape HTML entities to prevent XSS
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Validate order form inputs
exports.validateOrderForm = (formData) => {
  const errors = {};
  
  if (!formData.songPurpose) {
    errors.songPurpose = 'Song purpose is required';
  }
  
  if (!formData.recipientName) {
    errors.recipientName = 'Recipient name is required';
  }
  
  if (!formData.emotion) {
    errors.emotion = 'Emotional tone is required';
  }
  
  if (formData.provideLyrics && !formData.lyrics) {
    errors.lyrics = 'Lyrics are required when providing your own';
  }
  
  if (!formData.provideLyrics) {
    if (!formData.songTheme) {
      errors.songTheme = 'Song theme is required';
    }
    
    if (!formData.personalStory) {
      errors.personalStory = 'Personal story details are required';
    }
  }
  
  if (!formData.musicStyle) {
    errors.musicStyle = 'Music style is required';
  }
  
  if (!formData.package) {
    errors.package = 'Package selection is required';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};