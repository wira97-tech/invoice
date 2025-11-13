export interface PaymentConfig {
  gateway: string
  clientId: string
  secretKey: string
  environment: 'sandbox' | 'production'
  baseUrl: string
}

export const PAYMENT_CONFIG: PaymentConfig = {
  gateway: 'doku',
  clientId: process.env.DOKU_CLIENT_ID || 'YOUR_CLIENT_ID',
  secretKey: process.env.DOKU_SECRET_KEY || 'YOUR_SECRET_KEY',
  environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
  baseUrl: process.env.NODE_ENV === 'production'
    ? 'https://api.doku.com'
    : 'https://api-sandbox.doku.com'
}

export interface PaymentRequest {
  order_id: string
  amount: number
  currency: string
  customer_details: {
    name: string
    email: string
    phone: string
    address?: string
    city?: string
    postal_code?: string
    country_code?: string
  }
  item_details?: {
    id: string
    price: number
    quantity: number
    name: string
  }[]
  payment_method_types?: string[]
}

export interface DOKUPaymentResponse {
  payment: {
    order: {
      invoice_number: string
      amount: number
    }
    session: {
      id: string
      url: string
    }
    va: Array<{
      name: string
      va_number: string
      bank_code: string
    }>
    ewallet: Array<{
      name: string
      deeplink_url: string
      app_url: string
    }>
  }
}

export interface PaymentResponse {
  session_id: string
  payment_url: string
  credit_card_enabled?: boolean
  card_payment_methods?: Array<{
    name: string
    type: string
    icon: string
  }>
  installment_options?: Array<{
    bank: string
    tenors: number[]
  }>
}

// DOKU requires HMAC-SHA256 signature generation
function generateDOKUSignature(clientId: string, requestId: string, grossAmount: number, secretKey: string): string {
  const crypto = require('crypto')
  const digestComponent = `${clientId}${requestId}${grossAmount}`

  return crypto
    .createHmac('sha256', secretKey)
    .update(digestComponent)
    .digest('base64')
}

export const createPayment = async (paymentData: PaymentRequest): Promise<PaymentResponse> => {
  try {
    const requestId = `REQ-${Date.now()}`
    const signature = generateDOKUSignature(
      PAYMENT_CONFIG.clientId,
      requestId,
      paymentData.amount,
      PAYMENT_CONFIG.secretKey
    )

    const requestBody = {
      order: {
        invoice_number: paymentData.order_id,
        amount: paymentData.amount,
        currency: paymentData.currency || 'IDR',
        session_id: requestId,
        callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3003'}/payment/callback`,
        line_items: paymentData.item_details?.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })) || []
      },
      customer: {
        name: paymentData.customer_details.name,
        email: paymentData.customer_details.email,
        phone: paymentData.customer_details.phone,
        address: paymentData.customer_details.address,
        city: paymentData.customer_details.city,
        postal_code: paymentData.customer_details.postal_code,
        country: paymentData.customer_details.country_code || 'ID'
      },
      payment_method_types: paymentData.payment_method_types || [
        'CREDIT_CARD',
        'DEBIT_CARD'
      ]
    }

    console.log('DOKU Payment Request:', requestBody)

    // Mock implementation for now - Credit/Debit Card focus
    return {
      session_id: requestId,
      payment_url: `https://checkout-sandbox.doku.com/${requestId}`,
      credit_card_enabled: true,
      card_payment_methods: [
        {
          name: 'Visa',
          type: 'CREDIT_CARD',
          icon: 'visa'
        },
        {
          name: 'Mastercard',
          type: 'CREDIT_CARD',
          icon: 'mastercard'
        },
        {
          name: 'JCB',
          type: 'CREDIT_CARD',
          icon: 'jcb'
        }
      ],
      installment_options: [
        {
          bank: 'BCA',
          tenors: [3, 6, 12]
        },
        {
          bank: 'BNI',
          tenors: [3, 6, 12]
        },
        {
          bank: 'Mandiri',
          tenors: [3, 6, 12]
        }
      ]
    }

    /* Actual DOKU API implementation (commented out for now):
    const response = await fetch(`${PAYMENT_CONFIG.baseUrl}/orders/v1/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Client-Id': PAYMENT_CONFIG.clientId,
        'Request-Id': requestId,
        'Request-Timestamp': new Date().toISOString(),
        'Signature': signature
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`DOKU API error: ${response.statusText}`)
    }

    const data: DOKUPaymentResponse = await response.json()

    // Format response for our application
    return {
      session_id: data.session.id,
      payment_url: data.session.url,
      va_numbers: data.va.map(va => ({
        bank_name: va.name,
        va_number: va.va_number
      })),
      ewallet_links: data.ewallet.map(ew => ({
        name: ew.name,
        url: ew.deeplink_url
      }))
    }
    */
  } catch (error) {
    console.error('DOKU payment creation error:', error)
    throw new Error('Failed to create DOKU payment')
  }
}