-- 1. Drop existing 'site_settings' table
DROP TABLE IF EXISTS public.site_settings CASCADE;

-- 2. Create 'hero' table for dynamic slides
CREATE TABLE public.hero (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    subtitle TEXT,
    description TEXT,
    image_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE public.hero ENABLE ROW LEVEL SECURITY;

-- 4. Set Policies
-- Allow anyone to read slides (for the store)
CREATE POLICY "Allow public read access"
ON public.hero
FOR SELECT
USING (true);

-- Allow authenticated admins to full access (for the dashboard)
CREATE POLICY "Allow full access for authenticated users"
ON public.hero
FOR ALL
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 5. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.hero;
ALTER TABLE public.hero REPLICA IDENTITY FULL;
