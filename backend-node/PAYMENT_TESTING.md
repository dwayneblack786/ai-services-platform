# Payment Testing Guide

## Development Payment Methods

For testing the payment verification flow during development, we provide dummy payment methods with predictable behavior.

### Quick Setup

1. **Run the script to create dummy payment methods:**
```bash
node scripts/create-dummy-payment-methods.js
```

Or use the API endpoint (requires authentication):
```bash
POST /api/payment-methods/dev/create-test-cards
```

### Test Cards

#### ✅ Success Card (Visa ****4242)
- **Card Number:** 4242 4242 4242 4242
- **Expiry:** 12/25
- **CVC:** Any 3 digits
- **Behavior:** Always succeeds verification
- **Use for:** Testing successful payment flows

#### ❌ Decline Card (Mastercard ****0002)
- **Card Number:** 5555 5555 5555 0002
- **Expiry:** 11/25
- **CVC:** Any 3 digits
- **Behavior:** Always fails verification with "card_declined" error
- **Use for:** Testing payment failure handling

#### ⏰ Expired Card (Amex ****9999)
- **Card Number:** 3782 822463 19999
- **Expiry:** 01/23 (expired)
- **CVC:** Any 4 digits
- **Behavior:** Marked as expired status
- **Use for:** Testing expired card handling

## Testing Product Signup Flow

### 1. Select Payment Method
```javascript
// Frontend: Select existing payment method
const response = await axios.get('/api/payment-methods');
const goodCard = response.data.paymentMethods.find(pm => pm.cardLast4 === '4242');
```

### 2. Verify Payment Method
```javascript
// Frontend: Verify payment before proceeding
const verifyResponse = await axios.post('/api/payment-methods/verify', {
  paymentMethodId: goodCard._id
});

if (verifyResponse.data.success) {
  // Proceed to product configuration
}
```

### 3. Subscribe to Product
```javascript
// Frontend: Subscribe with verified payment method
const subscribeResponse = await axios.post('/api/user-products', {
  productId: selectedProductId,
  paymentMethodId: goodCard._id
});
```

## Expected Responses

### Success Verification (****4242)
```json
{
  "success": true,
  "verified": true,
  "message": "Payment method verified successfully",
  "testMode": true
}
```

### Failed Verification (****0002)
```json
{
  "error": "Payment verification failed",
  "details": "Your card was declined. Please try a different payment method.",
  "code": "card_declined",
  "testMode": true
}
```

### Expired Card (****9999)
```json
{
  "error": "Payment verification failed",
  "details": "Your card has expired. Please update your payment method.",
  "code": "card_expired",
  "testMode": true
}
```

## Frontend Integration

The PaymentMethodSelector component automatically:
- Shows test mode banner in development
- Displays success/decline/expired indicators on test cards
- Provides "Create Test Cards" button
- Handles verification flow with proper error messages

## Production Considerations

⚠️ **These test methods are ONLY available in development mode**

In production:
- Test card creation endpoint is disabled
- Real Stripe verification is used
- No test mode indicators shown
- Actual payment processing occurs

## Stripe Test Cards (Future Integration)

When integrating with real Stripe:
- Use Stripe's official test cards
- Implement Stripe Elements for secure tokenization
- Replace mock `stripePaymentMethodId` with real Stripe tokens
- Handle 3D Secure authentication

## Security Notes

✅ **Development:**
- Test data is isolated to dev-tenant-001
- No real payment processing
- Safe for testing all scenarios

🔒 **Production:**
- Never store raw card data
- Always use tokenization
- Implement proper PCI compliance
- Use encrypted HTTPS connections
