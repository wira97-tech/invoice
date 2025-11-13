# DOKU Payment Gateway Setup

This application supports payment processing through DOKU payment gateway.

## Prerequisites

1. Create a DOKU account at [https://www.doku.com](https://www.doku.com)
2. Register your business and get your credentials
3. Configure payment methods in DOKU dashboard

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and update the following variables:

```env
# Payment Gateway Configuration (DOKU)
DOKU_CLIENT_ID=your_doku_client_id
DOKU_SECRET_KEY=your_doku_secret_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3003
```

### Getting DOKU Credentials

1. Log in to your DOKU dashboard
2. Go to **Settings > API Keys**
3. Copy your **Client ID** (BRNCA_CLIENT_ID)
4. Copy your **Secret Key** (BRNCA_SECRET_KEY)

## How it Works

1. When a customer clicks "Pay Now" on an invoice:
   - The system creates a payment session with DOKU
   - Customer sees payment method selection dialog
   - Customer can choose from:
     - **Credit Card**: Visa, Mastercard, JCB
     - **Debit Card**: All major bank debit cards
     - **Installment Options**: 3, 6, 12 month tenors from BCA, BNI, Mandiri
   - Customer is redirected to secure DOKU payment page
   - Customer enters card details and completes payment
   - After payment, system receives callback notification

## Supported Payment Methods

### Credit Cards
- Visa
- Mastercard
- JCB (Japan Credit Bureau)

### Debit Cards
- All major Indonesian bank debit cards
- Visa Debit
- Mastercard Debit
- Cirrus (Maestro)

### Installment Options
- BCA Card Installment: 3, 6, 12 months
- BNI Card Installment: 3, 6, 12 months
- Mandiri Card Installment: 3, 6, 12 months

## Testing

For testing purposes, you can use DOKU Sandbox environment:

1. Use sandbox credentials from DOKU developer portal
2. Test various payment scenarios
3. Simulate successful/failed payments

## Webhook Configuration (Recommended)

To automatically update invoice status after payment, configure webhook notifications:

1. In DOKU dashboard, go to **Settings > Webhook**
2. Add your webhook endpoint URL: `https://yourdomain.com/api/payment/webhook`
3. Implement webhook handler to receive payment notifications

## API Flow

```typescript
// 1. Create Payment
const paymentData = {
  order_id: "INV-001",
  amount: 100000,
  currency: "IDR",
  customer_details: {
    name: "John Doe",
    email: "john@example.com",
    phone: "08123456789"
  },
  payment_method_types: ["CREDIT_CARD", "DEBIT_CARD"]
}

// 2. Response from DOKU
const response = {
  session_id: "REQ-1234567890",
  payment_url: "https://checkout-sandbox.doku.com/REQ-1234567890",
  credit_card_enabled: true,
  card_payment_methods: [
    { name: "Visa", type: "CREDIT_CARD", icon: "visa" },
    { name: "Mastercard", type: "CREDIT_CARD", icon: "mastercard" },
    { name: "JCB", type: "CREDIT_CARD", icon: "jcb" }
  ],
  installment_options: [
    { bank: "BCA", tenors: [3, 6, 12] },
    { bank: "BNI", tenors: [3, 6, 12] },
    { bank: "Mandiri", tenors: [3, 6, 12] }
  ]
}
```

## Security Notes

- Never expose Secret Key on client-side
- Always validate webhook signatures using HMAC-SHA256
- Use HTTPS for webhook endpoints
- Implement proper error handling and logging

## Payment Status

The system handles these payment statuses:
- **Pending**: Payment initiated but not completed
- **Paid**: Payment successfully completed
- **Failed**: Payment failed or expired
- **Refunded**: Payment was refunded

## Callback Handling

After payment completion, DOKU sends a webhook to your configured callback URL with payment details:

```typescript
// Webhook payload example
{
  "order": {
    "invoice_number": "INV-001",
    "amount": 100000,
    "status": "PAID"
  },
  "payment": {
    "method": "VIRTUAL_ACCOUNT",
    "channel": "BCA"
  },
  "timestamp": "2024-01-01T12:00:00Z"
}
```