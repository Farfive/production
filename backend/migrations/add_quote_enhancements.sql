-- Migration: Add Quote Enhancement Features
-- Date: 2025-01-12
-- Description: Add quote negotiation, attachments, and notification features

-- Add new fields to quotes table
ALTER TABLE quotes ADD COLUMN material VARCHAR(200);
ALTER TABLE quotes ADD COLUMN process VARCHAR(200);
ALTER TABLE quotes ADD COLUMN finish VARCHAR(200);
ALTER TABLE quotes ADD COLUMN tolerance VARCHAR(100);
ALTER TABLE quotes ADD COLUMN quantity INTEGER;
ALTER TABLE quotes ADD COLUMN shipping_method VARCHAR(100);
ALTER TABLE quotes ADD COLUMN warranty VARCHAR(200);

-- Add new quote status for negotiation
-- Note: This would be handled in code with enum updates

-- Create quote_attachments table
CREATE TABLE quote_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    mime_type VARCHAR(100),
    description TEXT,
    uploaded_by INTEGER NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_attachments_quote_id ON quote_attachments(quote_id);
CREATE INDEX idx_quote_attachments_uploaded_by ON quote_attachments(uploaded_by);

-- Create quote_negotiations table
CREATE TABLE quote_negotiations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    requested_price DECIMAL(12, 2),
    requested_delivery_days INTEGER,
    changes_requested JSON,
    created_by INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    response_message TEXT,
    responded_by INTEGER,
    responded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (responded_by) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_negotiations_quote_id ON quote_negotiations(quote_id);
CREATE INDEX idx_quote_negotiations_created_by ON quote_negotiations(created_by);
CREATE INDEX idx_quote_negotiations_status ON quote_negotiations(status);

-- Create quote_notifications table
CREATE TABLE quote_notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    quote_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_push BOOLEAN DEFAULT FALSE,
    metadata JSON,
    action_url VARCHAR(500),
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    FOREIGN KEY (quote_id) REFERENCES quotes (id) ON DELETE CASCADE
);

CREATE INDEX idx_quote_notifications_user_id ON quote_notifications(user_id);
CREATE INDEX idx_quote_notifications_quote_id ON quote_notifications(quote_id);
CREATE INDEX idx_quote_notifications_type ON quote_notifications(type);
CREATE INDEX idx_quote_notifications_read ON quote_notifications(read);
CREATE INDEX idx_quote_notifications_created_at ON quote_notifications(created_at);

-- Add configuration table for system settings
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default notification settings
INSERT OR IGNORE INTO system_settings (key, value, description, category) VALUES
('notification_email_enabled', 'true', 'Enable email notifications', 'notifications'),
('notification_push_enabled', 'true', 'Enable push notifications', 'notifications'),
('file_upload_max_size', '52428800', 'Maximum file upload size in bytes (50MB)', 'files'),
('file_upload_allowed_types', 'pdf,doc,docx,xls,xlsx,png,jpg,jpeg,gif,dwg,dxf,step,stl', 'Allowed file types for uploads', 'files');

-- Create uploads directory structure (would be done by file system)
-- This is just for documentation
-- uploads/
-- ├── quotes/
-- │   └── {quote_id}/
-- │       └── {files}
-- ├── orders/
-- │   └── {order_id}/
-- │       └── {files}
-- └── temp/
--     └── {temporary_files}

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quotes_valid_until ON quotes(valid_until);
CREATE INDEX IF NOT EXISTS idx_quotes_manufacturer_id ON quotes(manufacturer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_order_id ON quotes(order_id); 