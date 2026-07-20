import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/session';
import { AnalyticsDashboard } from './analytics-dashboard';

export default async function AdminPage() {
  const store = await cookies();
  if (!isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  return <AnalyticsDashboard />;
}
