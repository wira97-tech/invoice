-- Fix RLS Policies for Invoice Dashboard
-- Run this SQL script in your Supabase SQL Editor

-- =======================================================
-- 1. DROP EXISTING POLICIES
-- =======================================================

-- Drop existing clients policies
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can insert own clients" ON clients;
DROP POLICY IF EXISTS "Users can update own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete own clients" ON clients;

-- Drop existing invoices policies
DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;

-- Drop existing invoice_items policies
DROP POLICY IF EXISTS "Users can manage own invoice items" ON invoice_items;

-- =======================================================
-- 2. CREATE TRIGGER TO AUTO-SET USER_ID
-- =======================================================

-- Function to auto-set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Set user_id to current authenticated user
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers for auto-setting user_id
DROP TRIGGER IF EXISTS clients_set_user_id ON clients;
CREATE TRIGGER clients_set_user_id
    BEFORE INSERT ON clients
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS invoices_set_user_id ON invoices;
CREATE TRIGGER invoices_set_user_id
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- =======================================================
-- 3. CREATE IMPROVED RLS POLICIES
-- =======================================================

-- Clients table policies
CREATE POLICY "Enable all for authenticated users on clients" ON clients
    FOR ALL USING (auth.uid() = user_id);

-- Invoices table policies
CREATE POLICY "Enable all for authenticated users on invoices" ON invoices
    FOR ALL USING (auth.uid() = user_id);

-- Invoice items table policies (simpler approach)
CREATE POLICY "Enable all for authenticated users on invoice_items" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- =======================================================
-- 4. ADD HELPER FUNCTION FOR DEBUGGING
-- =======================================================

-- Function to check current user
CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================================
-- 5. TEST THE SETUP (Optional)
-- =======================================================

-- Test function - run this to check if user_id is set correctly
-- SELECT get_current_user_id() as current_user_id;

-- Test query to see if RLS is working
-- SELECT COUNT(*) FROM clients; -- Should return 0 if no clients for current user

-- =======================================================
-- 6. ADD ADDITIONAL INDEXES FOR PERFORMANCE
-- =======================================================

CREATE INDEX IF NOT EXISTS idx_clients_user_id_rls ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id_rls ON invoices(user_id);

-- =======================================================
-- 7. UPDATE VIEW POLICIES
-- =======================================================

-- Drop and recreate views with proper RLS
DROP VIEW IF EXISTS invoices_with_clients;
CREATE OR REPLACE VIEW invoices_with_clients AS
SELECT
    i.*,
    c.name as client_name,
    c.email as client_email,
    c.company as client_company
FROM invoices i
JOIN clients c ON i.client_id = c.id
WHERE i.user_id = auth.uid();

DROP VIEW IF EXISTS dashboard_stats;
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT
    COUNT(DISTINCT c.id) as total_clients,
    COUNT(DISTINCT i.id) as total_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'Paid' THEN i.id END) as paid_invoices,
    COUNT(DISTINCT CASE WHEN i.status = 'Pending' THEN i.id END) as pending_invoices,
    COALESCE(SUM(CASE WHEN i.status = 'Paid' THEN i.total_amount END), 0) as total_revenue
FROM clients c
LEFT JOIN invoices i ON c.id = i.client_id
WHERE c.user_id = auth.uid();

-- =======================================================
-- COMPLETE!
-- =======================================================

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION set_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- This should fix the RLS policy violations