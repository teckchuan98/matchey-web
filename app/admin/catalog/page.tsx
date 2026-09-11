import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ADMIN_COOKIE, isValidAdminSession } from '@/lib/admin/session';
import { CatalogReviewQueue } from './review-queue';

export default async function AdminCatalogPage() {
  const store = await cookies();
  if (!isValidAdminSession(store.get(ADMIN_COOKIE)?.value)) redirect('/admin/login');
  return <CatalogReviewQueue />;
}
