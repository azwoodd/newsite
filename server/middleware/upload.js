const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Storage configuration for song files
const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/songs');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Format: orderID-versionX-timestamp.ext
    const orderId = req.params.orderId || 'unknown';
    const version = req.body.version || 'unknown';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    
    cb(null, `${orderId}-version${version}-${timestamp}${ext}`);
  }
});

// Storage configuration for showcase images
const showcaseStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    let dir;
    
    if (file.fieldname === 'image') {
      dir = path.join(__dirname, '../uploads/showcase/images');
    } else if (file.fieldname === 'audio') {
      dir = path.join(__dirname, '../uploads/showcase/audio');
    } else {
      dir = path.join(__dirname, '../uploads/misc');
    }
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname
      .replace(ext, '')
      .replace(/[^a-z0-9]/gi, '-')
      .toLowerCase();
    
    cb(null, `${safeName}-${timestamp}${ext}`);
  }
});

// File filter for audio files
const audioFilter = (req, file, cb) => {
  const allowedTypes = ['.mp3', '.wav', '.m4a', '.aac'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only audio files are allowed (.mp3, .wav, .m4a, .aac)'), false);
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (.jpg, .jpeg, .png, .gif, .webp)'), false);
  }
};

// Configure multer for song uploads
const uploadSong = multer({
  storage: songStorage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Increased to 50MB to match nginx limit
  }
}).single('songFile');

// Configure multer for showcase uploads 
const uploadShowcase = multer({
  storage: showcaseStorage,
  limits: {
    fileSize: 50 * 1024 * 1024 // Increased to 50MB to match nginx limit
  }
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]);

// Middleware wrappers for error handling
exports.uploadSong = (req, res, next) => {
  uploadSong(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};

exports.uploadShowcaseFiles = (req, res, next) => {
  uploadShowcase(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: `Upload error: ${err.message}`
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
};