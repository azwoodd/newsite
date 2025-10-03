-- Performance indexes for SongSculptors checkout/affiliate system
-- Run these if they don't already exist

-- Index for promo code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code_active ON promo_codes(code, is_active);

-- Index for promo code usage queries
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_code ON promo_code_usage(user_id, code_id);

-- Index for referral events tracking
CREATE INDEX IF NOT EXISTS idx_referral_events_code_type ON referral_events(code_id, event_type);
CREATE INDEX IF NOT EXISTS idx_referral_events_user_type ON referral_events(user_id, event_type);

-- Index for commission queries
CREATE INDEX IF NOT EXISTS idx_commissions_affiliate_status ON commissions(affiliate_id, status);
CREATE INDEX IF NOT EXISTS idx_commissions_order_unique ON commissions(affiliate_id, order_id);

-- Index for order affiliate lookups
CREATE INDEX IF NOT EXISTS idx_orders_affiliate ON orders(referring_affiliate_id);
CREATE INDEX IF NOT EXISTS idx_orders_promo_code ON orders(used_promo_code);

-- Index for affiliate performance
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON affiliates(status);

-- Ensure unique constraints exist
ALTER TABLE promo_code_usage ADD CONSTRAINT UNIQUE KEY unique_user_code_order (user_id, code_id, order_id);
ALTER TABLE commissions ADD CONSTRAINT UNIQUE KEY unique_affiliate_order (affiliate_id, order_id);