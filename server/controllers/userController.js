const { query } = require('../config/db');
const bcrypt = require('bcrypt');
const validator = require('../utils/validator');

// Get user profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user data without password
    const users = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      user: users[0]
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
};

// Update user profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, email } = req.body;
    
    // Validate email if provided
    if (email && !validator.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Check if email is already in use by another user
    if (email) {
      const existingUsers = await query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, userId]
      );
      
      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'This email is already in use by another user'
        });
      }
    }
    
    // Prepare update query parts
    let updateQuery = 'UPDATE users SET ';
    const updateValues = [];
    
    if (name) {
      updateQuery += 'name = ?, ';
      updateValues.push(name);
    }
    
    if (email) {
      updateQuery += 'email = ?, ';
      updateValues.push(email);
    }
    
    // Remove trailing comma and add WHERE clause
    updateQuery = updateQuery.slice(0, -2) + ' WHERE id = ?';
    updateValues.push(userId);
    
    // Execute update
    await query(updateQuery, updateValues);
    
    // Fetch updated user data
    const users = await query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [userId]
    );
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: users[0]
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user profile'
    });
  }
};

// Delete user account
exports.deleteUserAccount = async (req, res) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;
    
    // Validate password
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to delete your account'
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
    
    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect password'
      });
    }
    
    // Delete user from database (cascading delete will handle related records)
    await query('DELETE FROM users WHERE id = ?', [userId]);
    
    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('Delete user account error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting account'
    });
  }
};