# Payment System Documentation

## Overview
Complete payment method management system with transaction tracking, status monitoring, and secure tokenized storage.

## Architecture

### Data Model
**PaymentMethod** stored in MongoDB `payment_methods` collection:
```typescript
{
  _id: ObjectId,
  tenantId: string,
  userId: string,
  stripePaymentMethodId: string, // Tokenized - never raw card data
  cardBrand: string, // visa, mastercard, amex, discover
  cardLast4: string, // Last 4 digits only
  cardExpMonth: number,
  cardExpYear: number,
  billingName: string,
  billingEmail?: string,
  billingAddress?: {
    line1: string,
    line2?: string,
    city: string,
    state: string,
    postalCode: string,
    country: string
  },
  isDefault: boolean,
  status: 'active' | 'expired' | 'removed',
  // Transaction tracking
  lastTransactionDate?: Date,
  lastTransactionAmount?: number, // in cents
  lastTransactionStatus?: 'success' | 'failed' | 'pending',
  transactionCount: number,
  createdAt: Date,
  updatedAt: Date
}
```

## Backend API

### Endpoints

#### GET /api/payment-methods
List all payment methods for tenant
- **Authentication**: Required (JWT)
- **Returns**: Array of sanitized payment methods
- **Sanitization**: Removes sensitive fields before returning

#### POST /api/payment-methods
Add new payment method
- **Authentication**: Required (JWT)
- **Body**:
  ```json
  {
    "stripePaymentMethodId": "pm_...",
    "cardBrand": "visa",
    "cardLast4": "4242",
    "cardExpMonth": 12,
    "cardExpYear": 2025,
    "billingName": "John Doe",
    "billingEmail": "john@example.com",
    "billingAddress": {...},
    "setAsDefault": false
  }
  ```
- **Returns**: Created payment method

#### PATCH /api/payment-methods/:id/set-default
Set payment method as default
- **Authentication**: Required (JWT)
- **Unsets**: All other default flags for tenant
- **Returns**: Success confirmation

#### DELETE /api/payment-methods/:id
Remove payment method (soft delete)
- **Authentication**: Required (JWT)
- **Action**: Sets status to 'removed'
- **Validation**: Cannot remove if it's the only payment method

#### POST /api/payment-methods/verify
Verify payment method with payment processor
- **Authentication**: Required (JWT)
- **Body**: `{ "paymentMethodId": "..." }`
- **Development**: Smart verification based on card identifier
  - `4242` (Visa ending in 4242): Success
  - `0002` (Mastercard ending in 0002): Decline
  - `9999` (Amex ending in 9999): Expired
- **Production**: Real Stripe verification
- **Returns**: Verification result with transaction tracking

#### POST /api/payment-methods/dev/create-test-cards (Dev Only)
Create test payment methods for development
- **Environment**: Development only
- **Action**: Creates 3 test cards (success, decline, expired)
- **Returns**: Created test payment methods

## Frontend Components

### Payment.tsx
Main payment methods management page
- **Route**: `/payment`
- **Features**:
  - Lists all payment methods with cards
  - Shows status badges (Active, Inactive, Expired, Removed)
  - Displays transaction history (last used, amount, status)
  - Set default payment method
  - Remove payment methods
  - Security notice

**Status Logic**:
- **Active**: Used within last 90 days
- **Inactive**: Not used or last use > 90 days ago
- **Expired**: Card expiration date passed
- **Removed**: Soft-deleted

### PaymentMethodSelector.tsx
Component for selecting/adding payment methods during signup
- **Used In**: Product subscription flow
- **Features**:
  - Select existing payment method
  - Add new payment method form
  - Development mode indicators
  - "Create Test Cards" button (dev only)
  - Payment verification flow
  - Security encryption notice

## Status Tracking

### Active Status
Payment method is considered **active** if:
1. Status is 'active'
2. Card not expired
3. Last transaction within 90 days

### Automatic Status Updates
- **Expired**: Automatically detected based on expiration date
- **Removed**: Set when user removes payment method
- **Transaction Tracking**: Updated on each payment verification

### Transaction Fields
- `lastTransactionDate`: Timestamp of most recent transaction
- `lastTransactionAmount`: Amount in cents (e.g., 9900 = $99.00)
- `lastTransactionStatus`: 'success', 'failed', or 'pending'
- `transactionCount`: Total number of transactions

## Security

### Data Protection
- **Never stored**: Full card numbers, CVV
- **Tokenized**: Stripe payment method tokens only
- **Encrypted**: All payment data encrypted in database
- **HTTPS**: All API calls over secure connection
- **httpOnly Cookies**: JWT tokens not accessible to JavaScript

### Development vs Production
**Development**:
- Test cards with predictable behavior
- Local verification logic
- Dev-only endpoints enabled

**Production**:
- Real Stripe integration
- PCI DSS compliance required
- Dev endpoints disabled
- SSL/TLS required

## Testing

### Test Cards (Development)
```
✅ Visa ending in 4242
   Brand: visa
   Last4: 4242
   Result: Success
   
❌ Mastercard ending in 0002
   Brand: mastercard
   Last4: 0002
   Result: Decline
   
⏰ Amex ending in 9999
   Brand: amex
   Last4: 9999
   Result: Expired
```

### Creating Test Data
```bash
# Run script to create test payment methods
cd backend-node
node scripts/create-dummy-payment-methods.js
```

### Testing Flow
1. Create test payment methods (script or dev endpoint)
2. Navigate to `/payment` page
3. Verify all payment methods displayed
4. Check status badges
5. Test "Set as Default" action
6. Test "Remove" action
7. Go to `/products` to test signup flow
8. Verify payment verification works with test cards

## Integration with Product Subscriptions

When subscribing to a product:
1. User selects or adds payment method
2. Payment method verified
3. Subscription created with `paymentMethodId` link
4. Transaction tracking updated
5. Payment method status updated to active

See [user-products-routes.ts](../backend-node/src/routes/user-products-routes.ts) for implementation.

## Future Enhancements
- [ ] Automatic expiration notifications
- [ ] Payment method update flow
- [ ] Transaction history detail view
- [ ] Billing invoice generation
- [ ] Automatic retry for failed payments
- [ ] Multiple payment processors support
- [ ] Subscription payment automation

## Related Files
- Backend:
  - [PaymentMethod.ts](../backend-node/src/models/PaymentMethod.ts) - Data model
  - [payment-routes.ts](../backend-node/src/routes/payment-routes.ts) - API routes
  - [user-products-routes.ts](../backend-node/src/routes/user-products-routes.ts) - Integration
  - [create-dummy-payment-methods.js](../backend-node/scripts/create-dummy-payment-methods.js) - Test data

- Frontend:
  - [Payment.tsx](../frontend/src/pages/Payment.tsx) - Payment methods page
  - [PaymentMethodSelector.tsx](../frontend/src/components/PaymentMethodSelector.tsx) - Selector component
  - [Payment.styles.ts](../frontend/src/styles/Payment.styles.ts) - Page styles
  - [PaymentMethod.styles.ts](../frontend/src/styles/PaymentMethod.styles.ts) - Component styles

- Documentation:
  - [PAYMENT_TESTING.md](../backend-node/PAYMENT_TESTING.md) - Testing guide
