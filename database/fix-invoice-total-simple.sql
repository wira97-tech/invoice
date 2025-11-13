-- Simple Fix for Invoice Total Function
-- Run this SQL script in your Supabase SQL Editor

-- =======================================================
-- 1. DROP FUNCTION WITH CASCADE
-- =======================================================

-- Drop function and all dependent objects together
DROP FUNCTION IF EXISTS update_invoice_total() CASCADE;

-- =======================================================
-- 2. CREATE CORRECTED FUNCTION
-- =======================================================

-- Create corrected function to update invoice total
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(12, 2);
    invoice_uuid UUID;
BEGIN
    -- Get the invoice ID from NEW or OLD record
    invoice_uuid := COALESCE(NEW.invoice_id, OLD.invoice_id);

    -- Calculate total from invoice items
    SELECT COALESCE(SUM(total_price), 0) INTO invoice_total
    FROM invoice_items
    WHERE invoice_id = invoice_uuid;

    -- Update invoice total
    UPDATE invoices SET
        subtotal = invoice_total,
        total_amount = invoice_total + (invoice_total * invoices.tax_rate / 100)
    WHERE id = invoice_uuid;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- =======================================================
-- 3. RECREATE TRIGGER
-- =======================================================

-- Create trigger for total calculation
CREATE TRIGGER update_invoice_total_after_insert
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_total();

-- =======================================================
-- COMPLETE!
-- =======================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_invoice_total() TO authenticated;

-- This should fix the "argument of OR must be type boolean, not type uuid" error