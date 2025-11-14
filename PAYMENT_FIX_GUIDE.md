# 🚀 DOKU Payment System Fix Guide

## 🔧 **Immediate Issues Found**

### **1. Missing Database Tables** ❌
Your code references `payments` and `doku_callbacks` tables that likely don't exist.

### **2. TypeScript Error** ❌
Unused variable in callback route (already fixed)

## 📋 **Step-by-Step Fix Instructions**

### **Step 1: Setup Database Tables** ⚡ **REQUIRED**

1. **Open Supabase Dashboard**
   - Go to https://wxanuptwbppxiesackyz.supabase.co
   - Navigate to **SQL Editor**

2. **Run This SQL Script:**
   ```sql
   -- Copy contents from database-schema.sql file
   -- Or run these commands:

   CREATE TABLE IF NOT EXISTS payments (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     invoice_number VARCHAR(255) NOT NULL,
     request_id VARCHAR(255) UNIQUE NOT NULL,
     session_id VARCHAR(255),
     amount BIGINT,
     payment_url TEXT,
     status VARCHAR(50) DEFAULT 'PENDING',
     response_code VARCHAR(20),
     response_message TEXT,
     meta JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   CREATE TABLE IF NOT EXISTS doku_callbacks (
     id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
     invoice_number VARCHAR(255),
     request_id VARCHAR(255),
     status VARCHAR(100),
     doku_payload JSONB NOT NULL,
     processed BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   ALTER TABLE invoices
   ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
   ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
   ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

   -- Indexes
   CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
   CREATE INDEX IF NOT EXISTS idx_payments_request_id ON payments(request_id);
   ```

3. **Set Up RLS Policies:**
   ```sql
   ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
   ALTER TABLE doku_callbacks ENABLE ROW LEVEL SECURITY;

   -- Allow service role to manage tables
   CREATE POLICY "Service role full access" ON payments
     FOR ALL USING (auth.role() = 'service_role');

   CREATE POLICY "Service role full access" ON doku_callbacks
     FOR ALL USING (auth.role() = 'service_role');
   ```

### **Step 2: Verify Setup** 🧪

1. **Install Node Dependencies** (if not already):
   ```bash
   npm install @supabase/supabase-js
   ```

2. **Run Database Test:**
   ```bash
   node test-database-setup.js
   ```

3. **Expected Output:**
   ```
   ✅ Payments table exists
   ✅ DOKU callbacks table exists
   ✅ Payment record insertion successful
   ```

### **Step 3: Test Payment Flow** 💳

1. **Create a Test Invoice**:
   - Go to `/invoices`
   - Click "Create Invoice"
   - Fill in test data

2. **Test Payment**:
   - Click "Pay Now" on any invoice
   - Check browser console for logs
   - Verify payment record is created

3. **Check Supabase for Records:**
   ```sql
   -- Check payments table
   SELECT * FROM payments ORDER BY created_at DESC LIMIT 5;

   -- Check invoice updates
   SELECT invoice_number, status, paid_at FROM invoices ORDER BY updated_at DESC LIMIT 5;
   ```

### **Step 4: Debug Common Issues** 🔍

#### **Issue 1: "Table not found" Error**
```bash
# Solution: Run the SQL script from Step 1
# Make sure tables are created in Supabase
```

#### **Issue 2: RLS Policy Blocking**
```bash
# Check current policies:
SELECT * FROM pg_policies WHERE tablename IN ('payments', 'doku_callbacks');

# Add service role policies if missing
```

#### **Issue 3: Payment Record Not Created**
```bash
# Check browser network tab for API errors
# Check server logs for database errors
# Verify Supabase connection
```

#### **Issue 4: DOKU API Not Responding**
```bash
# Test DOKU connectivity:
curl -I https://api-sandbox.doku.com/credit-card/v1/payment-page

# Check environment variables
echo $DOKU_CLIENT_ID
echo $DOKU_SECRET_KEY
```

### **Step 5: Environment Variables Check** ⚙️

Your current `.env.local` looks correct:
```env
DOKU_CLIENT_ID=BRN-0271-1763046785718  ✅
DOKU_SECRET_KEY=SK-LyEGAHU1FHskIznF8wRK  ✅
SUPABASE_SERVICE_ROLE_KEY=[valid-key]      ✅
NEXT_PUBLIC_APP_URL=[ngrok-url]            ✅
NGROK_URL=[ngrok-url]                      ✅
```

## 🔄 **Complete Payment Flow**

### **Expected Working Flow:**

1. **User Clicks "Pay Now"**
   ```
   POST /api/create-doku-payment
   → Creates payment record in `payments` table
   → Returns DOKU payment URL
   ```

2. **User Redirected to DOKU**
   ```
   User sees DOKU payment page
   → Enters card details
   → Completes/declines transaction
   ```

3. **DOKU Sends Callback**
   ```
   POST /api/payment/callback
   → Updates `payments` table status
   → Updates `invoices` table status
   → Stores callback data in `doku_callbacks`
   ```

4. **User Redirected Back**
   ```
   GET /api/payment/callback?redirect=1
   → Checks payment status
   → Redirects to /payment/success or /payment/failed
   ```

## 🧪 **Testing Commands**

```bash
# Test database connectivity
curl "https://wxanuptwbppxiesackyz.supabase.co/rest/v1/payments?select=id&limit=1" \
  -H "apikey: YOUR_ANON_KEY"

# Test payment creation
curl -X POST "http://localhost:3000/api/create-doku-payment" \
  -H "Content-Type: application/json" \
  -d '{
    "order": {
      "invoice_number": "TEST-001",
      "amount": 10000
    },
    "customer": {
      "name": "Test User",
      "email": "test@example.com"
    }
  }'

# Check recent payments
curl "https://wxanuptwbppxiesackyz.supabase.co/rest/v1/payments?select=*&order=created_at.desc&limit=5" \
  -H "apikey: YOUR_ANON_KEY"
```

## 🚨 **If Still Not Working**

1. **Run the database setup script** - this is the most common issue
2. **Check Supabase logs** for any errors
3. **Verify ngrok tunnel** is active and accessible
4. **Test with a fresh invoice** to avoid corrupted data

## 📞 **Support**

If you're still stuck after following these steps:
1. Run `node test-database-setup.js` and share the output
2. Check browser console for any JavaScript errors
3. Check server logs for database connection errors
4. Share the specific error message you're seeing