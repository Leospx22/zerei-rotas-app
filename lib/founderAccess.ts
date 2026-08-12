import { isSupabaseConfigured, supabase } from '@/lib/supabase';

type FounderAdminRole = 'founder' | 'admin';

interface FounderAdminRow {
  role: string | null;
  is_enabled: boolean | null;
}

const FOUNDER_ADMIN_ROLES: FounderAdminRole[] = ['founder', 'admin'];

export async function fetchFounderAdminAccess(): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) return false;

  const { data, error } = await supabase
    .from('admin_users')
    .select('role,is_enabled')
    .eq('user_id', userData.user.id)
    .eq('is_enabled', true)
    .in('role', FOUNDER_ADMIN_ROLES)
    .maybeSingle();

  if (error || !data) return false;

  const row = data as FounderAdminRow;
  return row.is_enabled === true && FOUNDER_ADMIN_ROLES.includes(row.role as FounderAdminRole);
}
