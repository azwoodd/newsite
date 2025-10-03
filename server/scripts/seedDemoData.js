// server/scripts/seedDemoData.js
require('dotenv').config();
const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

async function seedDemoData() {
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    console.log('🌱 Starting demo data seeding...');

    // 1. Create demo users
    console.log('Creating demo users...');
    
    const hashedPassword = await bcrypt.hash('demo123', 10);
    
    // Demo customer
    const [customerResult] = await connection.query(`
      INSERT INTO users (name, email, password, role, created_at)
      VALUES ('Demo Customer', 'customer@demo.com', ?, 'user', NOW())
      ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
    `, [hashedPassword]);
    
    const customerId = customerResult.insertId || customerResult.id;
    
    // Demo affiliate user
    const [affiliateUserResult] = await connection.query(`
      INSERT INTO users (name, email, password, role, affiliate_code, created_at)
      VALUES ('Demo Affiliate', 'affiliate@demo.com', ?, 'user', 'DEMOAFF', NOW())
      ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
    `, [hashedPassword]);
    
    const affiliateUserId = affiliateUserResult.insertId || affiliateUserResult.id;

    // 2. Create demo affiliate
    console.log('Creating demo affiliate...');
    
    const [affiliateResult] = await connection.query(`
      INSERT INTO affiliates (
        user_id, status, commission_rate, balance, total_paid,
        application_date, approval_date, payout_threshold,
        content_platforms, audience_info, promotion_strategy
      ) VALUES (
        ?, 'approved', 15.00, 0.00, 0.00,
        NOW(), NOW(), 50.00,
        '["YouTube", "Instagram", "TikTok"]',
        'Music enthusiasts and content creators',
        'Social media promotion and content creation'
      )
      ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id)
    `, [affiliateUserId]);
    
    const affiliateId = affiliateResult.insertId || affiliateResult.id;

    // 3. Create demo promo codes
    console.log('Creating demo promo codes...');
    
    // Discount codes
    const promoCodes = [
      {
        code: 'WELCOME10',
        name: 'Welcome 10% Off',
        type: 'discount',
        discount_amount: 10.00,
        is_percentage: 1,
        min_order_value: 0.00,
        max_uses: 0,
        max_uses_per_user: 1,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      },
      {
        code: 'SAVE25',
        name: 'Save $25',
        type: 'discount',
        discount_amount: 25.00,
        is_percentage: 0,
        min_order_value: 100.00,
        max_uses: 100,
        max_uses_per_user: 1,
        expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days
      },
      {
        code: 'FIRST20',
        name: 'First Time 20% Off',
        type: 'discount',
        discount_amount: 20.00,
        is_percentage: 1,
        min_order_value: 50.00,
        max_uses: 0,
        max_uses_per_user: 1,
        expires_at: null
      }
    ];

    for (const promo of promoCodes) {
      await connection.query(`
        INSERT INTO promo_codes (
          code, name, type, created_by, discount_amount, is_percentage,
          min_order_value, max_uses, max_uses_per_user, expires_at,
          is_active, starts_at
        ) VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 1, NOW())
        ON DUPLICATE KEY UPDATE 
          name = VALUES(name),
          discount_amount = VALUES(discount_amount),
          is_percentage = VALUES(is_percentage)
      `, [
        promo.code, promo.name, promo.type, promo.discount_amount,
        promo.is_percentage, promo.min_order_value, promo.max_uses,
        promo.max_uses_per_user, promo.expires_at
      ]);
    }

    // Affiliate code
    const [affiliateCodeResult] = await connection.query(`
      INSERT INTO promo_codes (
        code, name, type, affiliate_id, created_by, discount_amount,
        is_percentage, min_order_value, max_uses, max_uses_per_user,
        expires_at, is_active, starts_at
      ) VALUES (
        'DEMOAFF', 'Demo Affiliate Code', 'affiliate', ?, 1, 5.00,
        1, 0.00, 0, 0, NULL, 1, NOW()
      )
      ON DUPLICATE KEY UPDATE affiliate_id = VALUES(affiliate_id)
    `, [affiliateId]);

    const affiliateCodeId = affiliateCodeResult.insertId || (
      await connection.query('SELECT id FROM promo_codes WHERE code = "DEMOAFF"')
    )[0][0].id;

    // 4. Create demo referral events
    console.log('Creating demo referral events...');
    
    const referralEvents = [
      { event_type: 'click', user_id: null },
      { event_type: 'click', user_id: null },
      { event_type: 'signup', user_id: customerId },
      { event_type: 'click', user_id: customerId }
    ];

    for (const event of referralEvents) {
      await connection.query(`
        INSERT INTO referral_events (
          code_id, user_id, ip_address, user_agent, event_type,
          session_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, NOW())
      `, [
        affiliateCodeId,
        event.user_id,
        'demo-ip-hash',
        'demo-user-agent-hash',
        event.event_type,
        'demo-session-' + Math.random().toString(36).substr(2, 9)
      ]);
    }

    // 5. Create demo order
    console.log('Creating demo order...');
    
    const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    
    const [orderResult] = await connection.query(`
      INSERT INTO orders (
        order_number, user_id, package_type, total_price, payment_method,
        payment_status, song_purpose, recipient_name, emotion, music_style,
        used_promo_code, promo_discount_amount, referring_affiliate_id,
        customer_name, customer_email, created_at
      ) VALUES (
        ?, ?, 'signature', 179.99, 'stripe', 'paid',
        'wedding', 'Sarah & Mike', 'romantic', 'acoustic-ballad',
        'WELCOME10', 20.00, ?, 'Demo Customer', 'customer@demo.com', NOW()
      )
    `, [orderNumber, customerId, affiliateId]);
    
    const orderId = orderResult.insertId;

    // 6. Record promo code usage
    console.log('Recording promo code usage...');
    
    const [welcomeCodeResult] = await connection.query(
      'SELECT id FROM promo_codes WHERE code = "WELCOME10"'
    );
    const welcomeCodeId = welcomeCodeResult[0].id;
    
    await connection.query(`
      INSERT INTO promo_code_usage (code_id, user_id, order_id, discount_applied)
      VALUES (?, ?, ?, 20.00)
    `, [welcomeCodeId, customerId, orderId]);

    // Update promo code usage count
    await connection.query(`
      UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = ?
    `, [welcomeCodeId]);

    // 7. Create demo commission
    console.log('Creating demo commission...');
    
    await connection.query(`
      INSERT INTO commissions (
        affiliate_id, order_id, code_id, amount, rate, order_total,
        status, created_at, eligible_for_payout_date
      ) VALUES (
        ?, ?, ?, 24.00, 15.00, 159.99, 'approved', NOW(),
        DATE_ADD(NOW(), INTERVAL 14 DAY)
      )
    `, [affiliateId, orderId, affiliateCodeId]);

    // Update affiliate balance
    await connection.query(`
      UPDATE affiliates SET balance = balance + 24.00 WHERE id = ?
    `, [affiliateId]);

    // 8. Add purchase referral event
    await connection.query(`
      INSERT INTO referral_events (
        code_id, user_id, order_id, event_type, conversion_value,
        session_id, created_at
      ) VALUES (?, ?, ?, 'purchase', 179.99, 'demo-purchase-session', NOW())
    `, [affiliateCodeId, customerId, orderId]);

    await connection.commit();
    
    console.log('✅ Demo data seeded successfully!');
    console.log('\n📊 Demo Data Summary:');
    console.log(`- Customer: customer@demo.com (password: demo123)`);
    console.log(`- Affiliate: affiliate@demo.com (password: demo123)`);
    console.log(`- Discount Codes: WELCOME10, SAVE25, FIRST20`);
    console.log(`- Affiliate Code: DEMOAFF`);
    console.log(`- Demo Order: ${orderNumber}`);
    console.log(`- Commission: $24.00 pending for affiliate`);
    console.log('\n🧪 Test Scenarios:');
    console.log('1. Apply discount codes during checkout');
    console.log('2. Visit with ?code=DEMOAFF to test affiliate tracking');
    console.log('3. Check affiliate dashboard for commission data');
    console.log('4. Test promo code validation API');
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Run the seeding if called directly
if (require.main === module) {
  seedDemoData()
    .then(() => {
      console.log('\n🎉 Demo data seeding completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Demo data seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDemoData };