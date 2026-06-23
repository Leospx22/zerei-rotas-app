import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

try {
  if (supabaseUrl && supabaseAnonKey && supabaseAnonKey.length > 20) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
} catch {
  supabaseInstance = null;
}

export const supabase = supabaseInstance;
