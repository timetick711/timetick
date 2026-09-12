-- Add slug column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create an index for faster lookups by slug
CREATE INDEX IF NOT EXISTS products_slug_idx ON public.products(slug);
