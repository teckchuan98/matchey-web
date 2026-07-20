import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/session';
import { AdminLoginForm } from './login-form';

export default async function AdminLoginPage() {
  const store = await cookies();
  if (isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) redirect('/admin');
  return <AdminLoginForm />;
}
