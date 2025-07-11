const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Generate a random string of specified length
exports.generateRandomString = (length = 10) => {
  return crypto
    .randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
};

// Format currency
exports.formatCurrency = (amount, currency = 'GBP') => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency
  }).format(amount);
};

// Format date
exports.formatDate = (date, format = 'full') => {
  const d = new Date(date);
  
  if (format === 'full') {
    return d.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  if (format === 'short') {
    return d.toLocaleDateString('en-GB');
  }
  
  if (format === 'datetime') {
    return d.toLocaleString('en-GB');
  }
  
  return d.toISOString();
};

// Check if directory exists and create it if it doesn't
exports.ensureDirectoryExists = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
};

// Create a slug from a string
exports.createSlug = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove duplicate hyphens
    .trim();
};

// Get file extension
exports.getFileExtension = (filename) => {
  return path.extname(filename).toLowerCase();
};

// Generate pagination metadata
exports.generatePagination = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  const currentPage = page > totalPages ? totalPages : page;
  
  return {
    total,
    totalPages,
    currentPage,
    limit,
    hasNext: currentPage < totalPages,
    hasPrev: currentPage > 1
  };
};

// Calculate difference between two dates in days
exports.daysBetweenDates = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
};

// ---------------- ADDITIONAL HELPER FUNCTIONS ----------------

// Sanitize input to prevent XSS attacks
exports.sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

// Generate a unique order number
exports.generateOrderNumber = (prefix = 'ORD') => {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

// Format file size
exports.formatFileSize = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Truncate text with ellipsis
exports.truncateText = (text, maxLength = 100, ellipsis = '...') => {
  if (!text || text.length <= maxLength) return text;
  
  return text.substring(0, maxLength) + ellipsis;
};

// Validate email format
exports.isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

// Validate password strength
exports.isValidPassword = (password, minLength = 6) => {
  // Basic password validation - can be extended with more rules
  if (!password || password.length < minLength) return false;
  return true;
};

// Generate a UUID v4
exports.generateUUID = () => {
  return crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Safe JSON parsing with error handling
exports.parseJSON = (jsonString, defaultValue = null) => {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('JSON parsing error:', error);
    return defaultValue;
  }
};

// Standardized API response format
exports.createResponse = (success, message, data = null, statusCode = 200) => {
  return {
    success,
    message,
    data,
    statusCode,
    timestamp: new Date()
  };
};

// Log errors with consistent format
exports.logError = (error, source = 'server') => {
  const timestamp = new Date().toISOString();
  const errorMessage = error.message || 'Unknown error';
  const errorStack = error.stack || '';
  
  console.error(`[${timestamp}] [${source}] Error: ${errorMessage}`);
  console.error(errorStack);
  
  // Can be extended to log to file or external service
  return { timestamp, source, errorMessage, errorStack };
};

// Check if a value is empty (null, undefined, empty string, empty array, or empty object)
exports.isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0 && !(value instanceof Date)) return true;
  
  return false;
};

// Deep clone an object (for objects that can be serialized)
exports.deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

// Generate a random password
exports.generateRandomPassword = (length = 12) => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+=-{}[]|:;<>,.?/';
  
  const allChars = lowercase + uppercase + numbers + symbols;
  let password = '';
  
  // Ensure at least one of each character type
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  password += symbols.charAt(Math.floor(Math.random() * symbols.length));
  
  // Fill the rest randomly
  for (let i = 4; i < length; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  // Shuffle the password characters
  return password.split('').sort(() => 0.5 - Math.random()).join('');
};

// Get readable time elapsed since a date (e.g., "2 days ago", "5 minutes ago")
exports.timeAgo = (date) => {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  
  let interval = seconds / 31536000; // Years
  if (interval > 1) return Math.floor(interval) + ' years ago';
  
  interval = seconds / 2592000; // Months
  if (interval > 1) return Math.floor(interval) + ' months ago';
  
  interval = seconds / 86400; // Days
  if (interval > 1) return Math.floor(interval) + ' days ago';
  
  interval = seconds / 3600; // Hours
  if (interval > 1) return Math.floor(interval) + ' hours ago';
  
  interval = seconds / 60; // Minutes
  if (interval > 1) return Math.floor(interval) + ' minutes ago';
  
  return Math.floor(seconds) + ' seconds ago';
};

// Remove HTML tags from string
exports.stripHtml = (html) => {
  return html.replace(/<\/?[^>]+(>|$)/g, '');
};

// Capitalize first letter of each word
exports.capitalizeWords = (str) => {
  return str.replace(/\w\S*/g, (word) => {
    return word.charAt(0).toUpperCase() + word.substr(1).toLowerCase();
  });
};