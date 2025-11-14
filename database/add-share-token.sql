-- Add share_token column to invoices table
-- This enables secure public sharing of invoices

ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS share_token VARCHAR(128) UNIQUE;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_share_token ON invoices(share_token);

-- Enable RLS for the new column if not already enabled
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Note: Existing RLS policies should continue to work as share_token is just an additional field
-- Public access will be handled through a separate API endpoint