// server/migrations/affiliate-system-migration.js
/**
 * Database Migration for Affiliate Commission System
 * Ensures proper constraints and indexes for commission tracking
 * Run this after initial setup to finalize the affiliate system
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

const runMigration = async () => {
  let connection;
  
  try {
    console.log('🚀 Starting affiliate system database migration...');
    
    // Create connection
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'songsculptors'
    });

    console.log('✅ Connected to database');

    // 1. Add unique constraint to commissions table (prevent duplicate commissions)
    console.log('📝 Adding unique constraint to commissions table...');
    try {
      await connection.query(`
        ALTER TABLE commissions 
        ADD UNIQUE KEY unique_affiliate_order (affiliate_id, order_id)
      `);
      console.log('✅ Unique constraint added to commissions');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Unique constraint already exists on commissions');
      } else {
        throw error;
      }
    }

    // 2. Add indexes for performance
    console.log('📝 Adding performance indexes...');
    
    const indexes = [
      {
        table: 'commissions',
        name: 'idx_affiliate_status',
        columns: 'affiliate_id, status',
        description: 'Commission lookup by affiliate and status'
      },
      {
        table: 'commissions',
        name: 'idx_created_status',
        columns: 'created_at, status',
        description: 'Payout eligibility queries'
      },
      {
        table: 'affiliates',
        name: 'idx_user_status',
        columns: 'user_id, status',
        description: 'Affiliate lookup by user'
      },
      {
        table: 'affiliate_payouts',
        name: 'idx_affiliate_status',
        columns: 'affiliate_id, status',
        description: 'Payout history lookup'
      },
      {
        table: 'orders',
        name: 'idx_referring_affiliate',
        columns: 'referring_affiliate_id',
        description: 'Order lookup by affiliate'
      }
    ];

    for (const index of indexes) {
      try {
        await connection.query(`
          ALTER TABLE ${index.table} 
          ADD INDEX ${index.name} (${index.columns})
        `);
        console.log(`✅ Added ${index.name}: ${index.description}`);
      } catch (error) {
        if (error.code === 'ER_DUP_KEYNAME') {
          console.log(`ℹ️  Index ${index.name} already exists`);
        } else {
          console.warn(`⚠️  Could not add ${index.name}:`, error.message);
        }
      }
    }

    // 3. Ensure total_earnings column exists on affiliates
    console.log('📝 Checking total_earnings column...');
    try {
      await connection.query(`
        ALTER TABLE affiliates 
        ADD COLUMN total_earnings DECIMAL(10,2) DEFAULT 0.00 AFTER balance
      `);
      console.log('✅ Added total_earnings column');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  total_earnings column already exists');
      } else {
        throw error;
      }
    }

    // 4. Ensure payment_method and payment_info columns exist on affiliate_payouts
    console.log('📝 Checking payout payment fields...');
    try {
      await connection.query(`
        ALTER TABLE affiliate_payouts 
        ADD COLUMN payment_method ENUM('stripe', 'bank_transfer') DEFAULT 'stripe' AFTER status,
        ADD COLUMN payment_info JSON NULL AFTER payment_method
      `);
      console.log('✅ Added payment_method and payment_info columns');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Payment fields already exist');
      } else {
        throw error;
      }
    }

    // 5. Update existing commissions to have 'approved' status if they're paid
    console.log('📝 Updating commission statuses...');
    const [updateResult] = await connection.query(`
      UPDATE commissions 
      SET status = 'approved' 
      WHERE status = 'pending' 
        AND order_id IN (
          SELECT id FROM orders WHERE payment_status = 'paid'
        )
    `);
    console.log(`✅ Updated ${updateResult.affectedRows} commission statuses`);

    // 6. Sync affiliate balances with approved commissions
    console.log('📝 Syncing affiliate balances...');
    await connection.query(`
      UPDATE affiliates a
      SET balance = (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM commissions c
        WHERE c.affiliate_id = a.id 
          AND c.status = 'approved'
      )
    `);
    console.log('✅ Synced affiliate balances');

    // 7. Calculate total_earnings for all affiliates
    console.log('📝 Calculating total earnings...');
    await connection.query(`
      UPDATE affiliates a
      SET total_earnings = (
        SELECT COALESCE(SUM(c.amount), 0)
        FROM commissions c
        WHERE c.affiliate_id = a.id
      )
    `);
    console.log('✅ Calculated total earnings');

    // 8. Verify migration
    console.log('\n📊 Verifying migration results...');
    
    const [affiliateStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_affiliates,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_affiliates,
        SUM(balance) as total_balance,
        SUM(total_earnings) as total_earnings
      FROM affiliates
    `);

    const [commissionStats] = await connection.query(`
      SELECT 
        COUNT(*) as total_commissions,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_commissions,
        SUM(amount) as total_amount
      FROM commissions
    `);

    console.log('\n📈 Migration Summary:');
    console.log('─────────────────────────────────────');
    console.log(`Total Affiliates: ${affiliateStats[0].total_affiliates}`);
    console.log(`Approved Affiliates: ${affiliateStats[0].approved_affiliates}`);
    console.log(`Total Balance: £${parseFloat(affiliateStats[0].total_balance || 0).toFixed(2)}`);
    console.log(`Total Earnings: £${parseFloat(affiliateStats[0].total_earnings || 0).toFixed(2)}`);
    console.log(`\nTotal Commissions: ${commissionStats[0].total_commissions}`);
    console.log(`Approved Commissions: ${commissionStats[0].approved_commissions}`);
    console.log(`Total Commission Amount: £${parseFloat(commissionStats[0].total_amount || 0).toFixed(2)}`);
    console.log('─────────────────────────────────────');

    console.log('\n✅ Migration completed successfully!');
    console.log('\n📝 Next Steps:');
    console.log('1. Restart your Node.js server');
    console.log('2. Test the affiliate commission flow');
    console.log('3. Verify commission creation on successful payments');
    console.log('4. Check affiliate dashboard for accurate balances');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
};

// Run migration
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Migration failed with error:', error);
      process.exit(1);
    });
}

module.exports = { runMigration };