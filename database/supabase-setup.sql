-- Invoice Dashboard Database Schema for Supabase
-- Run this SQL script in your Supabase SQL Editor

-- Enable UUID extension for primary keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =======================================================
-- 1. CLIENTS TABLE
-- =======================================================
CREATE TABLE IF NOT EXISTS clients (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    status VARCHAR(50) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Prospect')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);

-- =======================================================
-- 2. INVOICES TABLE
-- =======================================================
CREATE TABLE IF NOT EXISTS invoices (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Paid', 'Overdue', 'Cancelled')),
    subtotal DECIMAL(12, 2) DEFAULT 0.00,
    tax_rate DECIMAL(5, 2) DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) DEFAULT 0.00,
    total_amount DECIMAL(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- =======================================================
-- 3. INVOICE ITEMS TABLE
-- =======================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10, 2) DEFAULT 1.00,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- =======================================================
-- 4. FUNCTIONS AND TRIGGERS
-- =======================================================

-- Function to generate invoice number
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

-- Create sequence for invoice numbering
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Trigger to auto-generate invoice number
CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at BEFORE UPDATE ON invoice_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update invoice total
CREATE OR REPLACE FUNCTION update_invoice_total()
RETURNS TRIGGER AS $$
DECLARE
    invoice_total DECIMAL(12, 2);
BEGIN
    -- Calculate total from invoice items
    SELECT COALESCE(SUM(total_price), 0) INTO invoice_total
    FROM invoice_items
    WHERE invoice_id = NEW.invoice_id OR OLD.invoice_id;

    -- Update invoice total
    UPDATE invoices SET
        subtotal = invoice_total,
        total_amount = invoice_total + (invoice_total * tax_rate / 100)
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers for total calculation
CREATE TRIGGER update_invoice_total_after_insert
    AFTER INSERT OR UPDATE OR DELETE ON invoice_items
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_invoice_total();

-- =======================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- =======================================================

-- Enable RLS on all tables
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;

-- Clients table policies
CREATE POLICY "Users can view own clients" ON clients
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clients" ON clients
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own clients" ON clients
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own clients" ON clients
    FOR DELETE USING (auth.uid() = user_id);

-- Invoices table policies
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own invoices" ON invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (auth.uid() = user_id);

-- Invoice items table policies (inherits from invoices)
CREATE POLICY "Users can manage own invoice items" ON invoice_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM invoices
            WHERE invoices.id = invoice_items.invoice_id
            AND invoices.user_id = auth.uid()
        )
    );

-- =======================================================
-- 6. INSERT SAMPLE DATA
-- =======================================================

-- Note: Uncomment this section if you want sample data
-- This will be inserted for the currently authenticated user

/*
-- Sample clients
INSERT INTO clients (name, email, phone, company, address, status) VALUES
('Acme Corporation', 'contact@acme.com', '+1 (555) 123-4567', 'Acme Corp', '123 Business Ave, Suite 100, New York, NY 10001', 'Active'),
('Tech Solutions Inc', 'hello@techsol.com', '+1 (555) 987-6543', 'Tech Solutions', '456 Innovation Drive, Palo Alto, CA 94301', 'Active'),
('Global Industries', 'info@global.com', '+1 (555) 456-7890', 'Global Industries', '789 Commerce Blvd, Chicago, IL 60601', 'Active');

-- Sample invoices (will need client IDs from actual data)
-- INSERT INTO invoices (client_id, description, due_date, status) VALUES
-- (client_uuid_1, 'Website Development Services', NOW() + INTERVAL '30 days', 'Pending'),
-- (client_uuid_2, 'Consulting Services', NOW() + INTERVAL '15 days', 'Paid');
*/

-- =======================================================
-- 7. HELPER VIEWS (Optional)
-- =======================================================

-- View for invoices with client information
CREATE OR REPLACE VIEW invoices_with_clients AS
SELECT
    i.*,
    c.name as client_name,
    c.email as client_email,
    c.company as client_company
FROM invoices i
JOIN clients c ON i.client_id = c.id;

-- View for dashboard statistics
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
-- 8. COMPLETE SETUP
-- =======================================================

-- Grant necessary permissions
GRANT ALL ON clients TO authenticated;
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoice_items TO authenticated;
GRANT SELECT ON invoices_with_clients TO authenticated;
GRANT SELECT ON dashboard_stats TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON SEQUENCE invoice_number_seq TO authenticated;

-- Setup complete!