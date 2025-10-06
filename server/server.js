// server/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const passport = require('passport');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const http = require('http');

// Initialize app FIRST before any imports that might use it
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Enhanced CORS configuration 
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
  process.env.CLIENT_URL || 'https://songsculptors.com',
  'http://51.75.20.71:5000',
  'http://51.75.20.71',
  'https://songsculptors.com',
  'https://www.songsculptors.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost'
];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Origin', 'Accept', 'Stripe-Signature', 'PayPal-Auth-Algo', 'PayPal-Cert-Url', 'PayPal-Transmission-Id', 'PayPal-Transmission-Sig', 'PayPal-Transmission-Time'],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));

// Security middleware with relaxed CSP for payment providers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://*.stripe.com",
          "https://*.paypal.com",
          "https://accounts.google.com",
          "https://apis.google.com",
          process.env.CLIENT_URL || "https://songsculptors.com",
        ],
        frameSrc: [
          "'self'",
          "https://*.stripe.com",
          "https://*.paypal.com",
          "https://accounts.google.com",
        ],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://*.stripe.com",
          "https://*.paypal.com",
          "https://js.stripe.com",
          "https://accounts.google.com",
          "https://apis.google.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://*.stripe.com",
          "https://*.paypal.com",
          "https://developers.google.com",
          "https://accounts.google.com",
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdnjs.cloudflare.com",
        ],
      },
    },
    // these avoid blocking some third-party embeds/assets in prod
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// Create necessary directories
const ensureDirectories = () => {
  const directories = [
    path.join(__dirname, 'uploads'),
    path.join(__dirname, 'uploads/songs'),
    path.join(__dirname, 'uploads/showcase'),
    path.join(__dirname, 'uploads/showcase/audio'),
    path.join(__dirname, 'uploads/showcase/images'),
    path.join(__dirname, 'uploads/affiliate-portfolios')
  ];
  
  directories.forEach(dir => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
      }
    } catch (error) {
      console.error(`Failed to create directory ${dir}:`, error.message);
    }
  });
};

// Initialize directories
try {
  ensureDirectories();
} catch (error) {
  console.error('Failed to ensure directories:', error);
}

// More lenient rate limiting configuration
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 300, // allow 300 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    const skipPaths = [
      '/api/auth/',
      '/api/health',
      '/webhook',
      '/api/helpdesk/admin/',
      '/api/affiliate/track'
    ];
    return skipPaths.some(path => req.path.startsWith(path));
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.'
    });
  }
});

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ 
  limit: '50mb', 
  extended: true,
  parameterLimit: 50000 
}));

// Cookie parser for affiliate tracking
const cookieParser = require('cookie-parser');
app.use(cookieParser());

// Logger
app.use(morgan('dev'));

// Apply rate limiter to API routes
app.use('/api/', limiter);

// Trust proxy headers for handling client IP properly
app.set('trust proxy', 'loopback, linklocal, uniquelocal');

// Import database config with error handling
let dbPool = null;
try {
  const { pool, testConnection } = require('./config/db');
  dbPool = pool;
  
  // Test database connection at startup
  testConnection()
    .then(connected => {
      if (!connected) {
        console.error('WARNING: Failed to connect to database. Server will continue but database operations will fail.');
      } else {
        console.log('Database connection established');
      }
    })
    .catch(err => {
      console.error('Database connection test failed:', err.message);
      // Don't exit - let the server continue
    });
} catch (error) {
  console.error('Failed to import database config:', error.message);
  // Continue without database
}

// Passport configuration - MUST be set up before routes
try {
  require('./config/passport')(passport);
  app.use(passport.initialize());
  console.log('Passport configured successfully');
} catch (error) {
  console.error('Failed to configure passport:', error.message);
}

// Upload directory
const uploadsDir = path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

// SERVE STATIC FRONTEND FILES - MOVED BEFORE API ROUTES
const clientBuildPath = path.join(__dirname, '../client/dist');

// Check if client build exists and serve it
if (fs.existsSync(clientBuildPath)) {
  console.log('Client build found, serving static files from:', clientBuildPath);
  
  // Serve static assets with proper MIME types
  app.use(express.static(clientBuildPath, {
    setHeaders: (res, filePath) => {
      // Set proper MIME types for CSS files
      if (filePath.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css; charset=utf-8');
      }
      // Set proper MIME types for JS files
      if (filePath.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      }
      // Set proper MIME types for JSON files
      if (filePath.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      // Set proper MIME types for SVG files
      if (filePath.endsWith('.svg')) {
        res.setHeader('Content-Type', 'image/svg+xml');
      }
      // Set proper MIME types for PNG files
      if (filePath.endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      }
      // Set proper cache headers for assets
      if (filePath.includes('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
      } else {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for other files
      }
    }
  }));
} else {
  console.warn('Client build directory not found at:', clientBuildPath);
  console.warn('   Make sure to run "npm run build" in the client directory');
}

// Add a health check endpoint BEFORE other routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    version: '1.0.0',
    database: dbPool ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
    clientBuild: fs.existsSync(clientBuildPath) ? 'available' : 'missing'
  });
});

// Routes with error handling - FIXED VERSION
const loadRoutes = () => {
  try {
    // Load working routes only
    const workingRoutes = [
      { path: '/api/auth', module: './routes/auth', name: 'Auth' },
      { path: '/api/users', module: './routes/user', name: 'User' },
      { path: '/api/orders', module: './routes/order', name: 'Order' },
      { path: '/api/songs', module: './routes/song', name: 'Song' },
      { path: '/api/newsletter', module: './routes/newsletter', name: 'Newsletter' },
      { path: '/api/admin', module: './routes/admin', name: 'Admin' },
      { path: '/api/helpdesk', module: './routes/helpdesk', name: 'Helpdesk' },
      { path: '/api/payment', module: './routes/stripe', name: 'Stripe' },
      { path: '/api/affiliate', module: './routes/affiliate', name: 'Affiliate' },
      { path: '/api/checkout', module: './routes/checkout', name: 'Checkout' },
      { path: '/api/webhooks', module: './routes/webhooks', name: 'Webhooks' }
    ];

    // Temporarily disabled routes (until dependencies are fixed)
    const disabledRoutes = [
      { path: '/api/paypal', name: 'PayPal', reason: 'Missing express-validator dependency' }
    ];

// Load working routes
workingRoutes.forEach(({ path, module, name }) => {
  try {
    const mod = require(module);
    // Support: module.exports = router  OR  module.exports = { router }  OR  export default router
    const candidate = (mod && (mod.router || mod.default)) || mod;

    // Express routers are functions; some also have a .stack array
    const isRouter =
      typeof candidate === 'function' ||
      (candidate && typeof candidate === 'object' && Array.isArray(candidate.stack));

    if (!isRouter) {
      throw new Error(`${name} routes module did not export an Express router (got ${typeof candidate})`);
    }

    app.use(path, candidate);
    console.log(`${name} routes loaded`);
  } catch (error) {
    console.error(`Failed to load ${name} routes:`, error.message);
    // Fallback: keep API up and return 503 for this route group
    app.use(path, (req, res) => {
      res.status(503).json({
        success: false,
        message: `${name} service is currently unavailable`,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    });
  }
});

    // Create placeholder routes for disabled services
    disabledRoutes.forEach(({ path, name, reason }) => {
      console.log(`${name} routes disabled: ${reason}`);
      app.use(path, (req, res) => {
        res.status(503).json({
          success: false,
          message: `${name} service is temporarily disabled`,
          reason: reason
        });
      });
    });

  } catch (error) {
    console.error('Failed to load routes:', error);
  }
};

// Load all routes
loadRoutes();

// Special handling for Stripe webhooks - needs raw body
app.post('/api/webhook/stripe', express.raw({type: 'application/json'}), (req, res) => {
  try {
    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = req.headers['stripe-signature'];

    if (!endpointSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(500).json({ 
        success: false, 
        message: 'Webhook endpoint not configured' 
      });
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).json({ 
        success: false, 
        message: 'Webhook signature verification failed' 
      });
    }

    // Handle the event
    console.log('Stripe webhook event:', event.type);
    
    // Process different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        console.log('Payment succeeded:', event.data.object.id);
        break;
      case 'payment_intent.payment_failed':
        console.log('Payment failed:', event.data.object.id);
        break;
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error processing webhook' 
    });
  }
});

// HANDLE CLIENT-SIDE ROUTING - MUST BE AFTER ALL API ROUTES
if (fs.existsSync(clientBuildPath)) {
  app.get('*', (req, res) => {
    // Don't serve index.html for API routes, uploads, or webhooks
    if (req.path.startsWith('/api/') || 
        req.path.startsWith('/uploads/') || 
        req.path.includes('/webhook')) {
      return res.status(404).json({
        success: false,
        message: 'API endpoint not found',
        path: req.path
      });
    }
    
    // Serve index.html for all other routes (React Router)
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  if (err instanceof SyntaxError && err.status === 413) {
    return res.status(413).json({
      success: false,
      message: 'Request entity too large. Please reduce the file size.'
    });
  }
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : {}
  });
});

// 404 handler for unmatched routes (this should rarely be hit now)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// Initialize WebSocket with error handling
let wss = null;
try {
  const { initWebSocket } = require('./websocket');
  wss = initWebSocket(server);
  console.log('WebSocket server initialized');
} catch (error) {
  console.error('Failed to initialize WebSocket:', error.message);
}

// Graceful shutdown handler
const gracefulShutdown = () => {
  console.log('\nShutting down gracefully...');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Close database connections
    if (dbPool) {
      dbPool.end(() => {
        console.log('Database connections closed');
        process.exit(0);
      });
    } else {
      process.exit(0);
    }
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Listen for shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled promise rejections in production
  if (process.env.NODE_ENV !== 'production') {
    gracefulShutdown();
  }
});

// Start Server using the HTTP server instance
server.listen(PORT, '0.0.0.0', () => {
  console.log(`========================================`);
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API available at: https://songsculptors.com/api`);
  console.log(`WebSocket: ${wss ? 'Enabled' : 'Disabled'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${dbPool ? 'Connected' : 'Disconnected'}`);
  console.log(`JWT: ${process.env.JWT_SECRET ? 'Configured' : 'Using default (NOT SECURE)'}`);
  console.log(`Stripe: ${process.env.STRIPE_SECRET_KEY ? 'Configured' : 'Not configured'}`);
  console.log(`PayPal: ${process.env.PAYPAL_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`Frontend: ${fs.existsSync(clientBuildPath) ? 'Serving from ' + clientBuildPath : 'Not available'}`);
  console.log(`========================================`);
});

// Export for testing
module.exports = { app, server };