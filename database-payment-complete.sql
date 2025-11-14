-- Complete Database Setup for DOKU Payment System
-- Run this in Supabase SQL Editor after the main supabase-setup.sql

-- =======================================================
-- 1. ADD PAYMENT COLUMNS TO INVOICES TABLE
-- =======================================================
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- =======================================================
-- 2. CREATE PAYMENTS TABLE
-- =======================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(255) NOT NULL,
  request_id VARCHAR(255) UNIQUE NOT NULL,
  session_id VARCHAR(255),
  amount BIGINT,
  payment_url TEXT,
  status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SUCCESS, FAILED, ERROR, CANCELLED
  response_code VARCHAR(20),
  response_message TEXT,
  meta JSONB, -- Store DOKU response metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================================
-- 3. CREATE DOKU CALLBACKS TABLE
-- =======================================================
CREATE TABLE IF NOT EXISTS doku_callbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(255),
  request_id VARCHAR(255),
  status VARCHAR(100),
  doku_payload JSONB NOT NULL, -- Store raw DOKU callback data
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =======================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- =======================================================
CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON payments(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_invoice_number ON doku_callbacks(invoice_number);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_request_id ON doku_callbacks(request_id);

-- =======================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =======================================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doku_callbacks ENABLE ROW LEVEL SECURITY;

-- =======================================================
-- 6. SERVICE ROLE POLICIES (FOR DOKU SYSTEM)
-- =======================================================
-- These policies allow the service role to perform any operation on the payment tables
-- This is crucial for the DOKU payment system to work

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access to payments" ON payments;
DROP POLICY IF EXISTS "Service role full access to doku_callbacks" ON doku_callbacks;

-- Create service role policies
CREATE POLICY "Service role full access to payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to doku_callbacks" ON doku_callbacks
  FOR ALL USING (auth.role() = 'service_role');

-- =======================================================
-- 7. USER ACCESS POLICIES (FOR FRONTEND)
-- =======================================================
-- Users can view payments for their own invoices
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM invoices
      WHERE invoice_number = payments.invoice_number
    )
  );

-- DOKU callbacks are system-only, users cannot access them
CREATE POLICY "No user access to doku_callbacks" ON doku_callbacks
  FOR ALL USING (false);

-- =======================================================
-- 8. TRIGGER FOR UPDATED_AT COLUMN
-- =======================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for payments table
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =======================================================
-- 9. TEST INSERT (VERIFY SETUP)
-- =======================================================
-- Insert a test payment record (this will be deleted automatically)
INSERT INTO payments (
  invoice_number,
  request_id,
  session_id,
  amount,
  status
) VALUES (
  'SETUP-TEST-' || EXTRACT(EPOCH FROM NOW()),
  'SETUP-REQ-' || EXTRACT(EPOCH FROM NOW()),
  'SETUP-SESS-' || EXTRACT(EPOCH FROM NOW()),
  1000,
  'TEST'
) ON CONFLICT (request_id) DO NOTHING;

-- =======================================================
-- 10. VERIFICATION QUERIES
-- =======================================================

-- Test table access (run these to verify setup works):
/*
-- Test service role access (should work):
SELECT COUNT(*) FROM payments;
SELECT COUNT(*) FROM doku_callbacks;

-- Test payment insertion (should work):
INSERT INTO payments (invoice_number, request_id, amount, status)
VALUES ('TEST-001', 'REQ-001', 10000, 'PENDING');

-- Clean up test data:
DELETE FROM payments WHERE invoice_number LIKE 'TEST-%' OR invoice_number LIKE 'SETUP-%';
*/

-- =======================================================
-- SETUP COMPLETE
-- =======================================================

-- After running this script:
-- 1. Run the test-database-setup.js script to verify everything works
-- 2. Test the payment flow with a real invoice
-- 3. Check that payment records are created and updated correctly