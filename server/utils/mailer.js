const nodemailer = require('nodemailer');

// Create nodemailer transporter
const createTransporter = () => {
  // For production, use actual SMTP settings
  if (process.env.NODE_ENV === 'production') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  // For development, use ethereal.email (fake SMTP service)
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: process.env.DEV_SMTP_USER || 'your_dev_user',
      pass: process.env.DEV_SMTP_PASS || 'your_dev_password'
    }
  });
};

// Send newsletter subscription confirmation
exports.sendSubscriptionConfirmation = async (email) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SongSculptors" <${process.env.EMAIL_FROM || 'noreply@songsculptors.com'}>`,
      to: email,
      subject: 'Welcome to SongSculptors Newsletter',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C4A064; text-align: center;">Welcome to SongSculptors!</h2>
          <p>Thank you for subscribing to our newsletter. We're excited to keep you updated with:</p>
          <ul>
            <li>New showcase songs and customer stories</li>
            <li>Special offers and discounts</li>
            <li>Creative ideas for personalizing your song</li>
          </ul>
          <p>If you ever want to unsubscribe, just click the unsubscribe link at the bottom of any of our emails.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://songsculptors.com" style="background-color: #C4A064; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visit Our Website</a>
          </div>
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} SongSculptors. All rights reserved.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Subscription confirmation sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('Error sending subscription confirmation:', error);
    throw error;
  }
};

// Send order confirmation
exports.sendOrderConfirmation = async (user, order) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SongSculptors" <${process.env.EMAIL_FROM || 'orders@songsculptors.com'}>`,
      to: user.email,
      subject: `Your SongSculptors Order #${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C4A064; text-align: center;">Thank You for Your Order!</h2>
          <p>Dear ${user.name},</p>
          <p>We're thrilled to confirm your order for a custom song. Here are your order details:</p>
          <div style="background-color: #f8f8f8; padding: 15px; border-radius: 5px;">
            <p><strong>Order Number:</strong> ${order.order_number}</p>
            <p><strong>Package:</strong> ${order.package_type.charAt(0).toUpperCase() + order.package_type.slice(1)}</p>
            <p><strong>Total Amount:</strong> £${order.total_price}</p>
            <p><strong>Status:</strong> ${order.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
          </div>
          <p>We'll start working on your song right away. You can track your order status on your dashboard.</p>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://songsculptors.com/dashboard" style="background-color: #C4A064; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Your Order</a>
          </div>
          <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact us at support@songsculptors.com.</p>
          <p>Warm regards,<br/>The SongSculptors Team</p>
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} SongSculptors. All rights reserved.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Order confirmation sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('Error sending order confirmation:', error);
    throw error;
  }
};

// Send song ready notification
exports.sendSongReadyNotification = async (user, order) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: `"SongSculptors" <${process.env.EMAIL_FROM || 'orders@songsculptors.com'}>`,
      to: user.email,
      subject: `Your Custom Song is Ready! Order #${order.order_number}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #C4A064; text-align: center;">Your Custom Song is Ready!</h2>
          <p>Dear ${user.name},</p>
          <p>Great news! We've completed your custom song and it's ready for you to review.</p>
          <p>We've created two versions for you to choose from. Please log in to your dashboard to:</p>
          <ul>
            <li>Listen to both versions</li>
            <li>Select your preferred version</li>
            <li>Download your final song</li>
          </ul>
          <div style="text-align: center; margin-top: 30px;">
            <a href="https://songsculptors.com/dashboard" style="background-color: #C4A064; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Listen Now</a>
          </div>
          <p style="margin-top: 30px;">We hope your custom song exceeds your expectations. If you have any questions or need assistance, please contact us at support@songsculptors.com.</p>
          <p>Warm regards,<br/>The SongSculptors Team</p>
          <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #888;">
            &copy; ${new Date().getFullYear()} SongSculptors. All rights reserved.
          </p>
        </div>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Song ready notification sent:', info.messageId);
    
    return info;
  } catch (error) {
    console.error('Error sending song ready notification:', error);
    throw error;
  }
};