import { redirect } from 'next/navigation';
import { authedDb } from './server-supabase';
import { serviceDb } from './db';

export interface CurrentManager {
  id: string;
  email: string;
  facility_access: string[];
}

export interface FacilityForManager {
  id: string;
  slug: string;
  name: string;
}

// Load the calling manager. Redirects to /admin/login when there is no
// session or no managers row. Server components / server actions call
// this at the top of every protected entry point.
export async function currentManager(): Promise<CurrentManager> {
  const supabase = await authedDb();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/admin/login');

  const { data, error } = await serviceDb()
    .from('managers')
    .select('id, email, facility_access')
    .eq('id', user.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) redirect('/admin/login?error=no_manager_row');
  return data as CurrentManager;
}

export async function managerFacilities(manager: CurrentManager): Promise<FacilityForManager[]> {
  if (manager.facility_access.length === 0) return [];
  const { data, error } = await serviceDb()
    .from('facilities')
    .select('id, slug, name')
    .in('id', manager.facility_access)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as FacilityForManager[];
}

// Resolve a facility slug from the URL and assert the manager has access.
// Returns the facility row; redirects to /admin if not allowed.
export async function requireFacility(
  manager: CurrentManager,
  slug: string,
): Promise<FacilityForManager> {
  const { data, error } = await serviceDb()
    .from('facilities')
    .select('id, slug, name')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  if (!data) redirect('/admin');
  if (!manager.facility_access.includes(data.id)) redirect('/admin');
  return data as FacilityForManager;
}
