-- Add holidays table for tracking public holidays and special dates
CREATE TABLE IF NOT EXISTS holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'public_holiday', -- public_holiday, observance, special_date
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on date for faster lookup
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_category ON holidays(category);
CREATE INDEX IF NOT EXISTS idx_holidays_is_active ON holidays(is_active);

-- Add RLS policies
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read public holidays
CREATE POLICY "Allow public read access to holidays" ON holidays
    FOR SELECT
    USING (is_active = TRUE);

-- Allow admins to manage holidays
CREATE POLICY "Allow admins to manage holidays" ON holidays
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );
