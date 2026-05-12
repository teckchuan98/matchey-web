'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'authenticated') router.replace('/dashboard');
    else if (auth.status === 'unauthenticated') router.replace('/login');
  }, [auth.status, router]);

  return (
    <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  );
}
