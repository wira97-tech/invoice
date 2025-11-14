# 🔧 DOKU Payment Redirect Fix

## 🎯 **Problem Identified**

### **Issue: Endless Polling Loop**
Setelah pembayaran berhasil dengan kartu kredit, user terjebak di infinite loop polling:
```
GET /api/internal/payment-status? 400 in 4ms
GET /api/internal/payment-status? 400 in 6ms
GET /api/internal/payment-status? 400 in 7ms
... (berulang terus)
```

### **Root Cause**
1. **DOKU redirects** user ke `/api/payment/callback?redirect=1&invoice=X&session_id=Y`
2. **Callback GET handler** memiliki logika redirect yang kompleks dengan `redirectFlag`
3. **Payment status page** (`/payment/status`) melakukan polling ke `/api/internal/payment-status`
4. **Endpoint `/api/internal/payment-status` mengembalikan 400 karena missing parameters
5. **Terjadi infinite loop** karena status tidak pernah ditemukan

## 🛠️ **Solution Applied**

### **1. Simplified Callback Logic**
**Before (Complex):**
```javascript
// Multiple redirect paths with redirectFlag check
if (!redirectFlag) {
  // Redirect to /payment/status
} else {
  // Complex DB lookup + redirect based on status
}
```

**After (Simplified):**
```javascript
// Always redirect to /payment/status for consistent polling
return NextResponse.redirect('/payment/status?' + params)
```

### **2. Consistent Payment Flow**
**New Flow:**
1. **DOKU Payment Completion** → POST callback to `/api/payment/callback`
2. **POST Callback** → Updates database (payments + invoices tables)
3. **DOKU Browser Redirect** → GET `/api/payment/callback` → Redirect to `/payment/status`
4. **Status Page** → Polls `/api/internal/payment-status` every 2 seconds
5. **Payment Found** → Redirects to `/payment/success` or `/payment/failed`

### **3. Key Changes Made**

#### **File: `/app/api/payment/callback/route.ts`**
- ✅ **Simplified GET handler** - always redirects to `/payment/status`
- ✅ **Removed complex redirect logic** with `redirectFlag`
- ✅ **Fixed syntax error** (removed duplicate closing brace)
- ✅ **Consistent parameter passing** for polling

#### **File: `/app/api/internal/payment-status/route.ts`**
- ✅ **Already exists** and working correctly
- ✅ **Proper error handling** for missing parameters
- ✅ **Multiple lookup methods** (requestId, invoice, sessionId)

## 🔄 **Complete Payment Flow After Fix**

### **Sequence Diagram:**
```
1. User clicks "Pay Now"
   ↓
2. POST /api/create-doku-payment
   → Creates payment record in `payments` table
   → Returns DOKU payment URL
   ↓
3. User redirected to DOKU
   → User completes card payment
   ↓
4. DOKU POST callback to /api/payment/callback
   → Updates payment status to "SUCCESS"
   → Updates invoice status to "Paid"
   ↓
5. DOKU redirects browser to /api/payment/callback
   → Always redirects to /payment/status
   ↓
6. /payment/status page loads
   → Starts polling every 2 seconds
   → Calls GET /api/internal/payment-status
   ↓
7. GET /api/internal/payment-status finds payment
   → Returns status: "SUCCESS"
   → Status page redirects to /payment/success
   ↓
8. User sees success page ✅
```

## 🧪 **Testing the Fix**

### **Step 1: Test Database Setup**
```bash
node test-database-setup.js
# Expected: All tables exist and insertion works
```

### **Step 2: Test Payment Creation**
```bash
# Check if payment record is created after clicking "Pay Now"
curl "https://wxanuptwbppxiesackyz.supabase.co/rest/v1/payments?select=*&order=created_at.desc&limit=1" \
  -H "apikey: YOUR_ANON_KEY"
```

### **Step 3: Monitor Payment Flow**
1. **Open browser dev tools**
2. **Click "Pay Now" on an invoice**
3. **Complete DOKU payment** with test card
4. **Watch network tab** for:
   - `/api/create-doku-payment` → Should be 200
   - `/api/payment/callback` → Should be 200 (POST)
   - `/api/payment/callback` → Should be 302 (GET redirect)
   - `/payment/status` → Should be 200
   - `/api/internal/payment-status` → Should be 200 (after callback)

### **Step 4: Verify Database Updates**
```sql
-- Check payments table
SELECT invoice_number, status, created_at, updated_at
FROM payments
WHERE invoice_number LIKE 'INV-%'
ORDER BY created_at DESC
LIMIT 5;

-- Check invoice updates
SELECT invoice_number, status, paid_at
FROM invoices
WHERE invoice_number LIKE 'INV-%'
ORDER BY updated_at DESC
LIMIT 5;
```

## ✅ **Expected Results After Fix**

### **Network Tab Should Show:**
```
POST /api/create-doku-payment              200 ✅
→ DOKU Payment Page (User interaction)
POST /api/payment/callback               200 ✅
GET /api/payment/callback                302 ✅ (redirect)
GET /payment/status                        200 ✅
GET /api/internal/payment-status            200 ✅ (polling)
→ Redirect to /payment/success           302 ✅
```

### **Database Should Show:**
```sql
-- Payments table:
{
  "invoice_number": "INV-2025-0004",
  "status": "SUCCESS",
  "request_id": "req-123",
  "session_id": "sess-123",
  "amount": 500000
}

-- Invoices table:
{
  "invoice_number": "INV-2025-0004",
  "status": "Paid",
  "paid_at": "2025-11-14T02:50:00Z"
}
```

## 🚨 **If Still Having Issues**

### **Check 1: Database Tables Exist**
```bash
node test-database-setup.js
# Look for any "❌" error messages
```

### **Check 2: Environment Variables**
```bash
# Verify DOKU config
echo $DOKU_CLIENT_ID      # Should show: BRN-0271-1763046785718
echo $DOKU_SECRET_KEY     # Should show: SK-LyEGAHU1FHskIznF8wRK
echo $NGROK_URL           # Should show: https://xxxx.ngrok-free.app
```

### **Check 3: Supabase RLS Policies**
```sql
-- Check if policies allow service role
SELECT * FROM pg_policies WHERE tablename = 'payments';
SELECT * FROM pg_policies WHERE tablename = 'doku_callbacks';
```

### **Check 4: DOKU Callback Logs**
```bash
# Check server logs for callback processing
# Look for:
# [DOKU CALLBACK] incoming request path: /api/payment/callback
# [DOKU CALLBACK] updated payments row id: xxx
# [DOKU CALLBACK] invoice INV-2025-0004 updated -> Paid
```

## 🎯 **Success Indicators**

✅ **Payment completes successfully**
✅ **User redirected to success page**
✅ **Invoice status updated to "Paid"**
✅ **No infinite polling loops**
✅ **Database records created and updated**

The fix ensures a clean, predictable payment flow without redirect conflicts! 🚀