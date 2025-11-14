-- DOKU Payment System Database Schema
-- Run this in Supabase SQL Editor

-- Create payments table
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

-- Create doku_callbacks table
CREATE TABLE IF NOT EXISTS doku_callbacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number VARCHAR(255),
  request_id VARCHAR(255),
  status VARCHAR(100),
  doku_payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add columns to invoices table if they don't exist
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(100),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payments_invoice_number ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_request_id ON payments(request_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_id ON payments(session_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_invoice_number ON doku_callbacks(invoice_number);
CREATE INDEX IF NOT EXISTS idx_doku_callbacks_request_id ON doku_callbacks(request_id);

-- Enable Row Level Security
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE doku_callbacks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for service role access
-- These policies allow the service role to perform any operation on the tables
CREATE POLICY "Service role full access to payments" ON payments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to doku_callbacks" ON doku_callbacks
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert initial data test (optional)
-- You can remove this section or keep it for testing
INSERT INTO payments (
  invoice_number,
  request_id,
  session_id,
  amount,
  status
) VALUES (
  'TEST-INV-001',
  'TEST-REQ-001',
  'TEST-SESS-001',
  10000,
  'TEST'
) ON CONFLICT (request_id) DO NOTHING;

-- Clean up test data after verification (uncomment to delete test record)
-- DELETE FROM payments WHERE invoice_number = 'TEST-INV-001';