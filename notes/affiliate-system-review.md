# Affiliate System Review

This document summarizes the issues identified in the current affiliate tracking and commission flow.

## Stripe webhook commission calculation
- The Stripe webhook handler calculates `netTotal` as `total_price - promo_discount_amount`. However, the `orders.total_price` column already stores the discounted total. Subtracting the promo discount again underestimates the commission that gets recorded for the affiliate.

## Admin order status commission helper
- `processCommission` expects `(affiliate_id, orderId, orderTotal)` but the call site in `orderController.updateOrderStatus` passes `(orderId, promoCodeId)` and never supplies the order total. The helper therefore looks up a non-existent affiliate and will throw when it tries to update balances. Because of the exception, no commission is recorded on this path.
- Even if the call signature were corrected, the helper multiplies the commission rate by the `orderTotal` argument that is never supplied. When it is invoked from anywhere else it would compute `NaN` and insert an invalid commission record.

## Recommended remediation
1. Load the order row inside the webhook and use the stored `total_price` (or explicitly compute the pre-discount amount) when calculating commission. Do not subtract the promo discount twice.
2. Update `updateOrderStatus` so it loads the order row, calls `processCommission` with the affiliate ID, and remove the `orderTotal` parameter from the helper. The helper should compute its own order total from the database to keep the logic consistent.
3. After implementing the fixes, retest the checkout → Stripe webhook → affiliate dashboard flow to confirm commissions appear with the correct amounts.
