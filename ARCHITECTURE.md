# SongSculptors Checkout, Discounts & Affiliates Architecture

## Overview

This document outlines the implementation of the checkout system, discount/promo code functionality, and affiliate tracking system for SongSculptors.com. All changes are implemented with feature flags and maintain backward compatibility with existing functionality.

## Key Principles

- **Zero Regression**: All new functionality is behind feature flags
- **Server-Side Authority**: All validation and calculations happen server-side
- **Idempotent Operations**: All database writes are safe against race conditions
- **Privacy-First**: IP addresses and user agents are hashed for privacy
- **Extensible Design**: Modular services support future enhancements

## Architecture Changes

### New Services

#### 1. DiscountService (`server/services/discountService.js`)
- **Purpose**: Handles all promo code validation and discount calculations
- **Key Features**:
  - Server-side validation with business rules
  - Support for percentage and fixed discounts
  - Usage limits (global and per-user)
  - Date-based validity windows
  - Stacking prevention (configurable)
  - Race condition protection

#### 2. AffiliateService (`server/services/affiliateService.js`)
- **Purpose**: Manages affiliate tracking, attribution, and commission processing
- **Key Features**:
  - Cookie-based tracking with signed data
  - First-click vs last-click attribution
  - Self-referral fraud prevention
  - Commission calculation (pre/post discount)
  - Idempotent commission creation

#### 3. PaymentService (`server/services/paymentService.js`)
- **Purpose**: Adapter pattern for multiple payment providers
- **Key Features**:
  - Stripe integration (primary)
  - PayPal support (placeholder)
  - Webhook signature verification
  - Refund processing

### New Controllers

#### 1. CheckoutController (`server/controllers/checkoutController.js`)
- **Endpoints**:
  - `POST /api/checkout/apply-promo` - Validate and apply promo codes
  - `POST /api/checkout/confirm` - Process complete checkout
  - `GET /api/checkout/summary` - Get pricing breakdown

#### 2. WebhookController (`server/controllers/webhookController.js`)
- **Endpoints**:
  - `POST /api/webhooks/payments` - Handle payment provider webhooks
- **Features**:
  - Signature verification
  - Idempotent processing
  - Commission approval automation

### Frontend Components

#### 1. PromoCodeInput (`client/src/components/OrderForm/PromoCodeInput.jsx`)
- **Features**:
  - Debounced validation
  - Real-time pricing updates
  - Error handling
  - Accessibility support

#### 2. AffiliateTracker (`client/src/components/AffiliateTracker.jsx`)
- **Features**:
  - URL parameter detection
  - Cookie-based persistence
  - Dismissible banner
  - Mobile responsive

## Database Schema Usage

### Existing Tables (No Changes)

#### promo_codes
- `type`: 'discount' | 'affiliate'
- `is_percentage`: 0 = fixed amount, 1 = percentage
- `discount_amount`: Amount or percentage value
- `max_uses`: Global usage limit (0 = unlimited)
- `max_uses_per_user`: Per-user limit
- `current_uses`: Running total (atomically updated)
- `starts_at`/`expires_at`: Validity window
- `affiliate_id`: Links to affiliate for commission codes

#### promo_code_usage
- Tracks individual usage instances
- Unique constraint: (user_id, code_id, order_id)
- `discount_applied`: Actual discount amount used

#### affiliates
- `status`: 'pending' | 'approved' | 'suspended' | 'rejected'
- `commission_rate`: Default commission percentage
- `balance`: Current unpaid balance
- `payout_threshold`: Minimum for payout requests

#### commissions
- Unique constraint: (affiliate_id, order_id)
- `status`: 'pending' | 'approved' | 'paid' | 'rejected'
- `eligible_for_payout_date`: 14-day delay for chargebacks

#### referral_events
- `event_type`: 'click' | 'signup' | 'purchase'
- `ip_address`/`user_agent`: Hashed for privacy
- `conversion_value`: Order total for purchase events

#### orders
- `used_promo_code`: Applied promo code
- `promo_discount_amount`: Discount applied
- `referring_affiliate_id`: Attribution link

### Views (Automatically Enhanced)
- `affiliate_performance`: Shows commission stats
- `top_promo_codes`: Shows usage and conversion stats

## Feature Flags

### Environment Variables

```env
# Core Features
FEATURE_AFFILIATES=true
FEATURE_DISCOUNTS=true
ALLOW_STACKING=false

# Affiliate Configuration
AFFIL_ATTRIBUTION=LAST_CLICK    # or FIRST_CLICK
AFFIL_BASIS=post_discount       # or pre_discount
AFFIL_COOKIE_DAYS=30

# Payment Provider
PAYMENT_PROVIDER=stripe         # or paypal

# Database
DB_NAME=soundsculptors
```

## API Endpoints

### Checkout Flow

```
POST /api/checkout/apply-promo
Body: { code: string, orderValue: number }
Response: { success: boolean, breakdown: object }

GET /api/checkout/summary
Query: { packageType, addons?, promoCode? }
Response: { success: boolean, summary: object }

POST /api/checkout/confirm
Body: { orderData: object, promoCode?, paymentMethodId: string }
Response: { success: boolean, order: object }
```

### Affiliate Tracking

```
POST /api/affiliate/track
Body: { code: string, eventType: string, url?: string }
Response: { success: boolean, affiliateInfo?: object }
```

### Webhooks

```
POST /api/webhooks/payments
Headers: { stripe-signature: string }
Body: Stripe webhook payload
Response: { received: boolean }
```

## Business Logic

### Discount Validation Rules

1. **Code Existence**: Must exist and be active
2. **Date Validity**: Must be within starts_at/expires_at window
3. **Minimum Order**: Order value must meet min_order_value
4. **Usage Limits**: Respect max_uses and max_uses_per_user
5. **Type Validation**: Must be type='discount'

### Discount Application

1. **Fixed First**: Apply fixed discounts before percentage
2. **Server Authority**: Always recalculate on server
3. **Atomic Updates**: Use transactions for usage tracking
4. **Race Protection**: Use ON DUPLICATE KEY UPDATE

### Affiliate Attribution

1. **Cookie Tracking**: Set signed, httpOnly cookies
2. **Attribution Window**: Configurable (default 30 days)
3. **Attribution Method**: FIRST_CLICK or LAST_CLICK
4. **Fraud Prevention**: Block self-referrals, rate limit clicks

### Commission Processing

1. **Basis Calculation**: Pre-discount or post-discount configurable
2. **Eligibility Delay**: 14-day delay for chargeback protection
3. **Idempotent Creation**: Unique (affiliate_id, order_id) constraint
4. **Status Workflow**: pending → approved → paid

## Security Measures

### Data Privacy
- IP addresses hashed with SHA-256
- User agents hashed for anonymity
- Signed cookies prevent tampering

### Fraud Prevention
- Self-referral detection and blocking
- Rate limiting on clicks and validations
- Usage limits enforced server-side

### Payment Security
- Webhook signature verification
- Idempotent webhook processing
- PCI compliance through Stripe

## Testing Strategy

### Unit Tests
- `server/tests/discountService.test.js`
- `server/tests/affiliateService.test.js`

### Integration Tests
- `server/tests/checkout.integration.test.js`

### Demo Scripts
- `server/scripts/seedDemoData.js` - Creates test data
- `server/scripts/demoFlow.js` - End-to-end testing

### Test Commands
```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run seed:demo          # Seed demo data
npm run demo:flow          # Run complete demo
```

## Deployment & Rollback

### Feature Flag Rollout
1. Deploy code with flags disabled
2. Enable FEATURE_DISCOUNTS first
3. Monitor for issues
4. Enable FEATURE_AFFILIATES
5. Monitor affiliate tracking

### Rollback Strategy
1. Set feature flags to false in environment
2. Restart application
3. All new functionality disabled
4. Existing checkout flow unaffected

### Database Migrations
- No destructive changes required
- All tables already exist
- Only indexes added if needed for performance

## Monitoring & Observability

### Key Metrics
- Promo code usage rates
- Affiliate click-through rates
- Commission conversion rates
- Payment success rates

### Logging
- All validation failures logged
- Affiliate tracking events logged
- Payment webhook events logged
- Commission creation logged

### Error Handling
- Graceful degradation when services unavailable
- User-friendly error messages
- Detailed server-side logging

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- Efficient joins in views
- Atomic operations for counters

### Caching Strategy
- Promo code validation results (short-term)
- Affiliate data caching
- Rate limiting with Redis (future)

### Scalability
- Stateless service design
- Database connection pooling
- Horizontal scaling ready

## Future Enhancements

### Planned Features
- Multi-tier commission structures
- Advanced promo code rules
- A/B testing for discounts
- Real-time analytics dashboard

### Technical Improvements
- Redis for session storage
- Queue system for webhook processing
- Advanced fraud detection
- Machine learning for conversion optimization

## Troubleshooting

### Common Issues

1. **Promo codes not working**
   - Check FEATURE_DISCOUNTS flag
   - Verify code is active and not expired
   - Check usage limits

2. **Affiliate tracking not working**
   - Check FEATURE_AFFILIATES flag
   - Verify cookie settings
   - Check affiliate approval status

3. **Commissions not created**
   - Check webhook configuration
   - Verify payment status
   - Check for self-referrals

### Debug Commands
```bash
# Check feature flags
grep FEATURE .env

# Check database connectivity
npm run db:test

# Run demo flow
npm run demo:flow

# Check logs
tail -f logs/app.log
```

## Support & Maintenance

### Regular Tasks
- Monitor commission payouts
- Review affiliate applications
- Analyze promo code performance
- Update fraud detection rules

### Code Maintenance
- Regular dependency updates
- Security patch applications
- Performance monitoring
- Test coverage maintenance

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Author**: SongSculptors Development Team