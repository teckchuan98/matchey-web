import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/session';
import { FeedbackList } from './feedback-list';

export default async function AdminFeedbackPage() {
  const store = await cookies();
  if (!isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  return <FeedbackList />;
}
