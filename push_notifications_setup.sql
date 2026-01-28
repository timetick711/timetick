-- Create the push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subscription_json TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can insert their own subscriptions
CREATE POLICY "Users can insert their own subscriptions" 
ON public.push_subscriptions FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy: Authenticated users can see their own subscriptions
CREATE POLICY "Users can see their own subscriptions" 
ON public.push_subscriptions FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Authenticated users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions" 
ON public.push_subscriptions FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

-- Policy: Admin (Service Role) can do everything (default in Supabase)
