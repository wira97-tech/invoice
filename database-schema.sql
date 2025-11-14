-- Payment System Required Tables for DOKU Integration (2025)
-- Run these SQL queries in your Supabase SQL Editor

-- 1. Payments Table - Track payment attempts and status
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

-- 2. DOKU Callbacks Table - Store all DOKU webhooks for reconciliation
CREATE TABLE IF NOT EXISTS doku_callbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(255),
  request_id VARCHAR(255),
  status VARCHAR(100),
  doku_payload JSONB NOT NULL, -- Store raw DOKU callback data
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Invoices Table - Ensure this exists and has required columns
-- Make sure your invoices table has these columns:
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON payments(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_invoice ON doku_callbacks(invoice_number);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_request_id ON doku_callbacks(request_id);

-- Row Level Security (RLS) for payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doku_callbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies (adjust according to your auth system)
CREATE POLICY "Users can view own payments" ON payments
  FOR SELECT USING (auth.uid()::text = (SELECT user_id::text FROM invoices WHERE invoice_number = payments.invoice_number LIMIT 1));

CREATE POLICY "Users can insert own payments" ON payments
  FOR INSERT WITH CHECK (auth.uid()::text = (SELECT user_id::text FROM invoices WHERE invoice_number = payments.invoice_number LIMIT 1));

-- DOKU callbacks are system-only
CREATE POLICY "System can manage doku_callbacks" ON doku_callbacks
  FOR ALL USING (false);