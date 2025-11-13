# Payment Gateway Setup

This application supports payment processing through Midtrans payment gateway.

## Prerequisites

1. Create a Midtrans account at [https://midtrans.com](https://midtrans.com)
2. Get your Merchant ID and Server Key from Midtrans dashboard

## Configuration

### Environment Variables

Copy `.env.example` to `.env.local` and update the following variables:

```env
# Payment Gateway Configuration (Midtrans)
NEXT_PUBLIC_MIDTRANS_MERCHANT_ID=your_midtrans_merchant_id
MIDTRANS_SERVER_KEY=your_midtrans_server_key
```

### Getting Midtrans Credentials

1. Log in to your Midtrans dashboard
2. Go to **Settings > Access Keys**
3. Copy your **Merchant ID** (Client Key)
4. Copy your **Server Key** (Production key for live mode, Sandbox key for testing)

## How it Works

1. When a customer clicks "Pay Now" on an invoice:
   - The system creates a payment transaction with Midtrans
   - Customer is redirected to Midtrans payment page
   - Customer can choose various payment methods (Credit Card, Bank Transfer, E-Wallet, etc.)
   - After payment, customer is redirected back to your application

2. Payment Status Tracking:
   - After successful payment, the invoice status should be updated to "Paid"
   - You can implement webhooks to receive real-time payment notifications
   - Manual status updates can be done through the admin panel

## Supported Payment Methods

- Credit/Debit Cards
- Bank Transfer (Virtual Account)
- E-Wallets (GoPay, OVO, Dana, ShopeePay)
- QRIS
- Installments
- ClickPay
- and more...

## Testing

For testing purposes, you can use Midtrans Sandbox environment with test credentials:

- Use test card numbers provided by Midtrans
- Simulate successful/failed payments
- Test various payment scenarios

## Webhook Configuration (Optional but Recommended)

To automatically update invoice status after payment, configure webhook notifications:

1. In Midtrans dashboard, go to **Settings > Notifications**
2. Add your webhook endpoint URL: `https://yourdomain.com/api/payment/webhook`
3. Implement webhook handler to receive payment notifications

## Security Notes

- Never expose Server Key on client-side
- Always validate webhook signatures
- Use HTTPS for webhook endpoints
- Implement proper error handling and logging