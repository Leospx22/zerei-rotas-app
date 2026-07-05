import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';

export function hasSupabaseConfig(url?: string, anonKey?: string): boolean {
  if (!url || !anonKey) return false;

  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'https:' && anonKey.length > 20;
  } catch {
    return false;
  }
}

export const isSupabaseConfigured = hasSupabaseConfig(supabaseUrl, supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
