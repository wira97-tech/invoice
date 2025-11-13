-- Fix Invoice Total Function and Update Currency
-- Run this SQL script in your Supabase SQL Editor

-- =======================================================
-- 1. FIX BROKEN TRIGGER FUNCTION (CORRECT ORDER)
-- =======================================================

-- Drop the broken triggers FIRST (before dropping the function)
DROP TRIGGER IF EXISTS update_invoice_total_after_insert ON invoice_items;

-- Drop any other triggers that might use the function
DROP TRIGGER IF EXISTS update_invoice_total_after_update ON invoice_items;
DROP TRIGGER IF EXISTS update_invoice_total_after_delete ON invoice_items;

-- Now drop the function
DROP FUNCTION IF EXISTS update_invoice_total();

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

-- Create corrected triggers for total calculation
CREATE TRIGGER update_invoice_total_after_insert
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_total();

-- =======================================================
-- 2. CREATE IMPROVED INVOICE NUMBER FUNCTION
-- =======================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS generate_invoice_number_trigger ON invoices;
DROP FUNCTION IF EXISTS generate_invoice_number();

-- Create improved function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                           LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- =======================================================
-- COMPLETE!
-- =======================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION update_invoice_total() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number() TO authenticated;

-- This should fix the "argument of OR must be type boolean, not type uuid" error