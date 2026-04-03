-- Create the site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
    id SERIAL PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Allow read access for everyone (anonymous and authenticated)
CREATE POLICY "Allow read access for all" ON public.site_settings
    FOR SELECT USING (true);

-- Policy: Allow update access for authenticated users (admins)
CREATE POLICY "Allow update for authenticated" ON public.site_settings
    FOR UPDATE TO authenticated USING (true);

-- Insert initial hero_slides data (fallback text with placeholder images or existing assets)
-- Note: In the store, we'll try to use the hardcoded assets as fallback if this is missing.
INSERT INTO public.site_settings (key, value)
VALUES ('hero_slides', '[
    {"id": 1, "image": "https://res.cloudinary.com/dhqatpc8w/image/upload/v1712121600/time-tick/hero-watch.png", "title": "كلاسيك", "subtitle": "الزمن .. بمنظور فني"},
    {"id": 2, "image": "https://res.cloudinary.com/dhqatpc8w/image/upload/v1712121600/time-tick/hero-watch-2.png", "title": "أناقة", "subtitle": "تميز بلا حدود"},
    {"id": 3, "image": "https://res.cloudinary.com/dhqatpc8w/image/upload/v1712121600/time-tick/hero-watch-3.png", "title": "عصرية", "subtitle": "تكنولوجيا المستقبل"}
]')
ON CONFLICT (key) DO NOTHING;
