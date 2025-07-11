// server/start-server.js
/**
 * Safe startup script for SongSculptors server
 * This script ensures proper initialization and prevents startup loops
 */

const path = require('path');
const fs = require('fs');

console.log('🎵 Starting SongSculptors Server...\n');

// Load environment variables first
require('dotenv').config();

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found!');
  console.log('Creating a template .env file...\n');
  
  const envTemplate = `# Server Configuration
NODE_ENV=development
PORT=5000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=songsculptors_db
DB_PORT=3306

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_change_this
JWT_EXPIRE=7d

# Client URL
CLIENT_URL=http://localhost:3000

# Email Configuration (SendGrid)
SENDGRID_API_KEY=
FROM_EMAIL=noreply@songsculptors.com
ADMIN_EMAIL=admin@songsculptors.com

# Payment Configuration
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_MODE=sandbox

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# File Upload
MAX_FILE_SIZE=50MB
`;

  fs.writeFileSync(envPath, envTemplate);
  console.log('✅ Created .env template. Please configure it and restart.\n');
  process.exit(0);
}

// Validate critical environment variables
const requiredEnvVars = [
  'DB_HOST',
  'DB_USER',
  'DB_NAME',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => console.error(`   - ${varName}`));
  console.log('\nPlease update your .env file and restart.\n');
  process.exit(1);
}

// Check if server is already running on the port
const net = require('net');
const PORT = process.env.PORT || 5000;

const checkPort = (port) => {
  return new Promise((resolve, reject) => {
    const tester = net.createServer()
      .once('error', err => {
        if (err.code === 'EADDRINUSE') {
          resolve(false);
        } else {
          reject(err);
        }
      })
      .once('listening', () => {
        tester.once('close', () => resolve(true))
          .close();
      })
      .listen(port, '0.0.0.0');
  });
};

// Kill zombie processes (Windows specific)
const killZombieProcesses = async () => {
  if (process.platform === 'win32') {
    console.log('🧹 Checking for zombie Node.js processes...');
    const { exec } = require('child_process');
    
    return new Promise((resolve) => {
      exec('tasklist /FI "IMAGENAME eq node.exe" /FO CSV', (error, stdout) => {
        if (!error && stdout) {
          const lines = stdout.split('\n');
          const currentPID = process.pid;
          let killedAny = false;
          
          lines.forEach(line => {
            const match = line.match(/"node\.exe","(\d+)"/);
            if (match && match[1] != currentPID) {
              const pid = match[1];
              try {
                process.kill(pid, 'SIGTERM');
                console.log(`   Killed zombie process: ${pid}`);
                killedAny = true;
              } catch (e) {
                // Process might already be dead
              }
            }
          });
          
          if (!killedAny) {
            console.log('   No zombie processes found.');
          }
        }
        setTimeout(resolve, 1000); // Wait a bit for processes to die
      });
    });
  }
  return Promise.resolve();
};

// Main startup function
const startServer = async () => {
  try {
    // Check if port is available
    const portAvailable = await checkPort(PORT);
    
    if (!portAvailable) {
      console.error(`❌ Port ${PORT} is already in use!`);
      console.log('\nOptions:');
      console.log('1. Kill the existing process');
      console.log('2. Use a different port in .env');
      console.log('3. If on Windows, run: netstat -ano | findstr :' + PORT);
      console.log('   Then kill the process with: taskkill /PID <PID> /F\n');
      
      // Try to kill zombie processes on Windows
      await killZombieProcesses();
      
      // Check port again
      const stillInUse = !(await checkPort(PORT));
      if (stillInUse) {
        process.exit(1);
      }
    }
    
    console.log('✅ Port ' + PORT + ' is available\n');
    
    // Set up process handlers to prevent loops
    let serverStarted = false;
    let shutdownInProgress = false;
    
    process.on('uncaughtException', (error) => {
      if (!shutdownInProgress) {
        console.error('\n❌ Uncaught Exception:');
        console.error(error);
        shutdownInProgress = true;
        process.exit(1);
      }
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      if (!shutdownInProgress) {
        console.error('\n❌ Unhandled Rejection at:', promise);
        console.error('Reason:', reason);
        // Don't exit on unhandled promise rejections in production
        if (process.env.NODE_ENV !== 'production') {
          shutdownInProgress = true;
          process.exit(1);
        }
      }
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      if (!shutdownInProgress) {
        console.log(`\n📍 Received ${signal}, shutting down gracefully...`);
        shutdownInProgress = true;
        
        // Give the server 5 seconds to shut down
        setTimeout(() => {
          console.log('⏱️  Shutdown timeout, forcing exit...');
          process.exit(0);
        }, 5000);
      }
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Start the server
    console.log('🚀 Starting server...\n');
    require('./server.js');
    serverStarted = true;
    
  } catch (error) {
    console.error('\n❌ Failed to start server:');
    console.error(error);
    process.exit(1);
  }
};

// Run the startup
startServer().catch(error => {
  console.error('Startup failed:', error);
  process.exit(1);
});