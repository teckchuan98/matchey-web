import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/session';
import { UserAnalyticsDetail } from './user-detail';

export default async function UserAnalyticsPage({ params }: { params: Promise<{ role: string; userId: string }> }) {
  const store = await cookies();
  if (!isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  const values = await params;
  return <UserAnalyticsDetail role={values.role} userId={values.userId} />;
}
