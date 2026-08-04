import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard against missing credentials: createClient throws on an empty URL,
// which would blank the entire app. Fall back to a harmless placeholder so
// the UI still renders (screens degrade to their built-in empty/fallback
// states instead of a white screen).
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[v0] Supabase credentials are not configured; using a no-op client.');
}

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'public-anon-key',
  {
    auth: {
      persistSession: false,
    },
  }
);
