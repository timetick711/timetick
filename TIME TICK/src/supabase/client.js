
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vciyuynmwdmzrmlfgpvh.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZjaXl1eW5td2RtenJtbGZncHZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3NDA5NjgsImV4cCI6MjA4NDMxNjk2OH0.VPj6ghpDyhvT6WE9zRgLEvDKrL6x7eLg7FIHDyAVPoc';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or Anon Key is missing! Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
