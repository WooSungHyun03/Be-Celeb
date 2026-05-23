-- Add holidays table for tracking public holidays and special dates
CREATE TABLE IF NOT EXISTS public.holidays (
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
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(date);
CREATE INDEX IF NOT EXISTS idx_holidays_category ON public.holidays(category);
CREATE INDEX IF NOT EXISTS idx_holidays_is_active ON public.holidays(is_active);

-- Add RLS policies
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to holidays" ON public.holidays;
DROP POLICY IF EXISTS "Allow admins to manage holidays" ON public.holidays;
DROP POLICY IF EXISTS "Allow service role to manage holidays" ON public.holidays;

-- Allow all authenticated users to read public holidays
CREATE POLICY "Allow public read access to holidays" ON public.holidays
    FOR SELECT
    TO anon, authenticated
    USING (is_active = TRUE);

-- Allow backend jobs using the Supabase service role to manage holidays.
CREATE POLICY "Allow service role to manage holidays" ON public.holidays
    FOR ALL
    TO service_role
    USING (TRUE)
    WITH CHECK (TRUE);

GRANT SELECT ON public.holidays TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holidays TO service_role;
