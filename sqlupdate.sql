-- SongSculptors Affiliate System Database Migration
-- MySQL/MariaDB Compatible
-- Run this against your existing soundsculptors database

USE soundsculptors;

-- 1. Affiliates Table
-- Stores affiliate account information and status
CREATE TABLE IF NOT EXISTS affiliates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    status ENUM('pending', 'approved', 'denied', 'suspended') DEFAULT 'pending',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP NULL,
    denial_date TIMESTAMP NULL,
    denial_reason TEXT NULL,
    next_allowed_application_date TIMESTAMP NULL,
    
    -- Application details
    content_platforms JSON NULL,
    audience_info TEXT NULL,
    promotion_strategy TEXT NULL,
    portfolio_links TEXT NULL,
    
    -- Commission settings
    commission_rate DECIMAL(5,2) DEFAULT 10.00,
    custom_commission_rate BOOLEAN DEFAULT FALSE,
    payout_threshold DECIMAL(10,2) DEFAULT 50.00,
    
    -- Financial tracking
    balance DECIMAL(10,2) DEFAULT 0.00,
    total_paid DECIMAL(10,2) DEFAULT 0.00,
    stripe_account_id VARCHAR(255) NULL,
    
    -- Admin and user experience
    admin_notes TEXT NULL,
    tour_completed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_affiliates_status (status),
    INDEX idx_affiliates_user_id (user_id),
    INDEX idx_affiliates_balance (balance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 2. Promo Codes Table
-- Stores both affiliate codes and general discount codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    type ENUM('affiliate', 'discount') NOT NULL,
    affiliate_id INT NULL,
    created_by INT NOT NULL,
    
    -- Discount settings
    discount_amount DECIMAL(10,2) DEFAULT 0,
    is_percentage BOOLEAN DEFAULT TRUE,
    
    -- Usage limits
    max_uses INT DEFAULT 0, -- 0 = unlimited
    current_uses INT DEFAULT 0,
    max_uses_per_user INT DEFAULT 1,
    
    -- Timing
    starts_at TIMESTAMP NULL,
    expires_at TIMESTAMP NULL,
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_promo_codes_code (code),
    INDEX idx_promo_codes_type (type),
    INDEX idx_promo_codes_active (is_active),
    INDEX idx_promo_codes_affiliate (affiliate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 3. Referral Events Table
-- Tracks clicks, signups, and purchases through affiliate codes
CREATE TABLE IF NOT EXISTS referral_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_id INT NOT NULL,
    user_id INT NULL, -- NULL for anonymous clicks
    ip_address VARCHAR(45) NULL, -- IPv4 and IPv6 compatible
    user_agent TEXT NULL,
    referrer_url TEXT NULL,
    
    event_type ENUM('click', 'signup', 'purchase') NOT NULL,
    order_id INT NULL, -- Only for purchase events
    
    -- Tracking data
    session_id VARCHAR(255) NULL,
    conversion_value DECIMAL(10,2) NULL, -- Order total for purchases
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
    INDEX idx_referral_events_code_id (code_id),
    INDEX idx_referral_events_event_type (event_type),
    INDEX idx_referral_events_created_at (created_at),
    INDEX idx_referral_events_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 4. Commissions Table
-- Tracks commissions earned by affiliates
CREATE TABLE IF NOT EXISTS commissions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_id INT NOT NULL,
    order_id INT NOT NULL,
    code_id INT NOT NULL, -- Which code was used
    
    -- Commission calculation
    amount DECIMAL(10,2) NOT NULL,
    rate DECIMAL(5,2) NOT NULL, -- Commission rate used
    order_total DECIMAL(10,2) NOT NULL,
    
    -- Status tracking
    status ENUM('pending', 'approved', 'paid', 'rejected') DEFAULT 'pending',
    
    -- Timing
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    eligible_for_payout_date TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 14 DAY),
    approved_at TIMESTAMP NULL,
    paid_at TIMESTAMP NULL,
    
    -- Admin notes
    admin_notes TEXT NULL,
    
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (code_id) REFERENCES promo_codes(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_affiliate_order (affiliate_id, order_id),
    INDEX idx_commissions_status (status),
    INDEX idx_commissions_eligible_date (eligible_for_payout_date),
    INDEX idx_commissions_affiliate_id (affiliate_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 5. Affiliate Payouts Table
-- Tracks payout requests and transactions
CREATE TABLE IF NOT EXISTS affiliate_payouts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    affiliate_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    
    -- Commission tracking
    commission_ids JSON NOT NULL, -- Array of commission IDs included
    commission_count INT NOT NULL DEFAULT 0,
    
    -- Payment processing
    stripe_transfer_id VARCHAR(255) NULL,
    stripe_destination_account VARCHAR(255) NULL,
    
    -- Status and timing
    status ENUM('pending', 'processing', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    completed_at TIMESTAMP NULL,
    
    -- Error handling
    failure_reason TEXT NULL,
    admin_notes TEXT NULL,
    
    FOREIGN KEY (affiliate_id) REFERENCES affiliates(id) ON DELETE CASCADE,
    INDEX idx_affiliate_payouts_affiliate_id (affiliate_id),
    INDEX idx_affiliate_payouts_status (status),
    INDEX idx_affiliate_payouts_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- 6. Promo Code Usage Tracking Table
-- Tracks individual usage of promo codes by users
CREATE TABLE IF NOT EXISTS promo_code_usage (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_id INT NOT NULL,
    user_id INT NOT NULL,
    order_id INT NOT NULL,
    discount_applied DECIMAL(10,2) NOT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (code_id) REFERENCES promo_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_code_order (user_id, code_id, order_id),
    INDEX idx_promo_usage_code_id (code_id),
    INDEX idx_promo_usage_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Add affiliate_code column to users table
ALTER TABLE users 
ADD COLUMN affiliate_code VARCHAR(50) NULL UNIQUE AFTER role,
ADD INDEX idx_users_affiliate_code (affiliate_code);

-- Add affiliate tracking columns to orders table
ALTER TABLE orders 
ADD COLUMN used_promo_code VARCHAR(50) NULL AFTER additional_notes,
ADD COLUMN promo_discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER used_promo_code,
ADD COLUMN referring_affiliate_id INT NULL AFTER promo_discount_amount,
ADD INDEX idx_orders_promo_code (used_promo_code),
ADD INDEX idx_orders_affiliate (referring_affiliate_id);

-- Create views for common queries

-- Affiliate performance summary view
CREATE OR REPLACE VIEW affiliate_performance AS
SELECT 
    a.id,
    a.user_id,
    u.name as affiliate_name,
    u.email as affiliate_email,
    a.status,
    a.commission_rate,
    a.balance,
    a.total_paid,
    pc.code as affiliate_code,
    COUNT(DISTINCT c.id) as total_commissions,
    COUNT(DISTINCT CASE WHEN c.status = 'paid' THEN c.id END) as paid_commissions,
    SUM(CASE WHEN c.status = 'paid' THEN c.amount ELSE 0 END) as total_earnings,
    SUM(CASE WHEN c.status = 'pending' THEN c.amount ELSE 0 END) as pending_earnings,
    COUNT(DISTINCT re.id) as total_clicks,
    COUNT(DISTINCT CASE WHEN re.event_type = 'signup' THEN re.id END) as total_signups,
    COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as total_conversions
FROM affiliates a
JOIN users u ON a.user_id = u.id
LEFT JOIN promo_codes pc ON pc.affiliate_id = a.id AND pc.type = 'affiliate'
LEFT JOIN commissions c ON c.affiliate_id = a.id
LEFT JOIN referral_events re ON re.code_id = pc.id
WHERE a.status = 'approved'
GROUP BY a.id, a.user_id, u.name, u.email, a.status, a.commission_rate, a.balance, a.total_paid, pc.code;

-- Top performing codes view
CREATE OR REPLACE VIEW top_promo_codes AS
SELECT 
    pc.id,
    pc.code,
    pc.name,
    pc.type,
    pc.current_uses,
    pc.is_active,
    COALESCE(a.user_id, pc.created_by) as owner_id,
    COALESCE(u_aff.name, u_admin.name) as owner_name,
    COUNT(DISTINCT re.id) as total_clicks,
    COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) as conversions,
    SUM(CASE WHEN re.event_type = 'purchase' THEN re.conversion_value ELSE 0 END) as total_revenue,
    CASE 
        WHEN COUNT(DISTINCT re.id) > 0 
        THEN ROUND((COUNT(DISTINCT CASE WHEN re.event_type = 'purchase' THEN re.id END) * 100.0 / COUNT(DISTINCT re.id)), 2)
        ELSE 0 
    END as conversion_rate
FROM promo_codes pc
LEFT JOIN affiliates a ON pc.affiliate_id = a.id
LEFT JOIN users u_aff ON a.user_id = u_aff.id
LEFT JOIN users u_admin ON pc.created_by = u_admin.id
LEFT JOIN referral_events re ON re.code_id = pc.id
WHERE pc.is_active = TRUE
GROUP BY pc.id, pc.code, pc.name, pc.type, pc.current_uses, pc.is_active, 
         COALESCE(a.user_id, pc.created_by), COALESCE(u_aff.name, u_admin.name)
ORDER BY total_revenue DESC;

-- Insert default system promo codes (optional - you can remove these)
INSERT INTO promo_codes (code, name, type, created_by, discount_amount, is_percentage, max_uses, is_active) 
VALUES 
('WELCOME10', 'Welcome Discount', 'discount', 1, 10.00, TRUE, 0, TRUE),
('FIRST20', 'First Time Customer', 'discount', 1, 20.00, TRUE, 0, TRUE)
ON DUPLICATE KEY UPDATE code = code;

-- Migration complete notification
SELECT 'Affiliate System Database Migration Completed Successfully!' as message;