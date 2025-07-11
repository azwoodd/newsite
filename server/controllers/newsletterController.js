const { query } = require('../config/db');
const validator = require('../utils/validator');
const mailer = require('../utils/mailer');

// Subscribe to newsletter
exports.subscribe = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || !validator.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Check if already subscribed
    const existingSubscriptions = await query(
      'SELECT * FROM newsletter_signups WHERE email = ?',
      [email]
    );
    
    if (existingSubscriptions.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }
    
    // Add to database
    await query(
      'INSERT INTO newsletter_signups (email) VALUES (?)',
      [email]
    );
    
    // Send confirmation email
    try {
      await mailer.sendSubscriptionConfirmation(email);
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // We still consider the subscription successful even if email fails
    }
    
    res.status(201).json({
      success: true,
      message: 'You have been successfully subscribed to our newsletter'
    });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing your subscription'
    });
  }
};

// Unsubscribe from newsletter
exports.unsubscribe = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Validate email
    if (!email || !validator.isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }
    
    // Check if subscribed
    const existingSubscriptions = await query(
      'SELECT * FROM newsletter_signups WHERE email = ?',
      [email]
    );
    
    if (existingSubscriptions.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'This email is not subscribed to our newsletter'
      });
    }
    
    // Remove from database
    await query(
      'DELETE FROM newsletter_signups WHERE email = ?',
      [email]
    );
    
    res.status(200).json({
      success: true,
      message: 'You have been successfully unsubscribed from our newsletter'
    });
  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing your unsubscription'
    });
  }
};