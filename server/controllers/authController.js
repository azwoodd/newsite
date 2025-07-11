const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const validator = require('../utils/validator');

// Register a new user
exports.register = async (req, res) => {
  try {
    console.log('Registration request received:', { 
      body: req.body, 
      headers: req.headers['content-type'] 
    });
    
    const { name, email, password, confirmPassword } = req.body;
    
    // Basic validation
    if (!name || !email || !password) {
      console.log('Registration failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }
    
    // Validate input
    if (!validator.isValidEmail(email)) {
      console.log('Registration failed: Invalid email format');
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    if (!validator.isValidPassword(password)) {
      console.log('Registration failed: Password too short');
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    if (password !== confirmPassword) {
      console.log('Registration failed: Passwords do not match');
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }
    
    // Check if user already exists
    const existingUsers = await query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (existingUsers.length > 0) {
      console.log('Registration failed: Email already exists');
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Insert user into database - SET DEFAULT ROLE TO 'user'
    const result = await query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'user']
    );
    
    // Generate JWT token
    const token = jwt.sign(
      { id: result.insertId, name, email, role: 'user' },
      process.env.JWT_SECRET || 'your_jwt_secret_dev',
      { expiresIn: '1d' }
    );
    
    console.log('User registered successfully:', { id: result.insertId, name, email });
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: result.insertId,
        name,
        email,
        role: 'user'
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    console.log('Login request received:', { email: req.body.email });
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      console.log('Login failed: Missing email or password');
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }
    
    // Find user by email
    const users = await query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log('Login failed: User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    const user = users[0];
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log('Login failed: Password does not match');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'your_jwt_secret_dev',
      { expiresIn: '1d' }
    );
    
    console.log('User logged in successfully:', { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      tokenGenerated: !!token
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    // The user object is already attached to req by the auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const { id, name, email, role } = req.user;
    
    res.status(200).json({
      success: true,
      user: {
        id,
        name,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    // Simple implementation since it was missing
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }
    
    // Check if new password meets requirements
    if (!validator.isValidPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Get user from database
    const users = await query('SELECT * FROM users WHERE id = ?', [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const user = users[0];
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password in database
    await query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId]);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while changing password'
    });
  }
};