'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthProvider';
import { Header } from '@/components/landing/Header';
import { HeroSection } from '@/components/landing/HeroSection';
import { ContactSection } from '@/components/landing/ContactSection';

export default function Home() {
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (auth.status === 'authenticated') router.replace('/dashboard');
  }, [auth.status, router]);

  return (
    <div className="flex min-h-screen flex-col scroll-smooth bg-white text-neutral-900">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <ContactSection />
      </main>
      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-500">
        <div>© {new Date().getFullYear()} Fittel · Built for personal trainers</div>
        <div className="mt-2 flex justify-center gap-4">
          <a href="/privacy" className="hover:text-neutral-900 hover:underline">
            Privacy
          </a>
          <span aria-hidden="true">·</span>
          <a href="/tos" className="hover:text-neutral-900 hover:underline">
            Terms of Service
          </a>
        </div>
      </footer>
    </div>
  );
}
