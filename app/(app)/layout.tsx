'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { authCheck } from '@/lib/api/auth';
import { Button } from '@/components/ui/button';

const NAV_ITEMS: Array<{
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  enabled: boolean;
}> = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, enabled: true },
  { href: '/clients', label: 'Clients', icon: Users, enabled: false },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, enabled: true },
  { href: '/library', label: 'Library', icon: BookOpen, enabled: true },
  { href: '/settings', label: 'Settings', icon: Settings, enabled: false },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (
      auth.status === 'unauthenticated' ||
      auth.status === 'denied' ||
      auth.status === 'error'
    ) {
      router.replace('/login');
    }
  }, [auth.status, router]);

  if (auth.status !== 'authenticated') {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {auth.status === 'verifying' ? 'Verifying trainer access…' : 'Loading…'}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <MobileHeader />
        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-card">
      <BrandHeader className="px-4 py-5" />
      <nav className="flex-1 px-3 py-2 space-y-1">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
          />
        ))}
      </nav>
      <UserSection />
    </aside>
  );
}

function BrandHeader({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <Image
        src="/brand/logo.png"
        alt="Fittel"
        width={36}
        height={36}
        className="rounded-[10px]"
        priority
      />
      <span className="text-lg font-bold tracking-tight">Fittel</span>
    </div>
  );
}

function NavItem({
  item,
  active,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
}) {
  const Icon = item.icon;
  const baseClasses =
    'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors';

  if (!item.enabled) {
    return (
      <div
        className={`${baseClasses} cursor-not-allowed text-muted-foreground/50`}
        aria-disabled
      >
        <Icon className="size-4" />
        <span>{item.label}</span>
        <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/60">
          Soon
        </span>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${baseClasses} ${
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      <Icon className="size-4" />
      <span>{item.label}</span>
    </Link>
  );
}

function UserSection() {
  const auth = useAuth();
  const profile = useQuery({ queryKey: ['auth', 'check'], queryFn: authCheck });
  if (auth.status !== 'authenticated') return null;

  const name = stringField(profile.data?.trainer, 'name') ?? auth.user.email ?? 'Trainer';
  const photoUrl = stringField(profile.data?.trainer, 'photoUrl');

  return (
    <div className="border-t border-border p-3">
      <div className="flex items-center gap-3 rounded-md p-2">
        <TrainerAvatar photoUrl={photoUrl} name={name} size={36} />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="truncate text-xs text-muted-foreground">{auth.user.email}</div>
        </div>
      </div>
      <Button
        variant="ghost"
        className="mt-1 w-full justify-start text-muted-foreground"
        onClick={() => auth.signOut()}
      >
        <LogOut className="mr-2 size-4" />
        Sign out
      </Button>
    </div>
  );
}

function MobileHeader() {
  const auth = useAuth();
  const profile = useQuery({ queryKey: ['auth', 'check'], queryFn: authCheck });
  if (auth.status !== 'authenticated') return null;

  const name = stringField(profile.data?.trainer, 'name') ?? auth.user.email ?? 'Trainer';
  const photoUrl = stringField(profile.data?.trainer, 'photoUrl');

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3 lg:hidden">
      <BrandHeader />
      <div className="flex items-center gap-2">
        <TrainerAvatar photoUrl={photoUrl} name={name} size={32} />
        <button
          onClick={() => auth.signOut()}
          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Sign out"
        >
          <LogOut className="size-4" />
        </button>
      </div>
    </header>
  );
}

function TrainerAvatar({
  photoUrl,
  name,
  size,
}: {
  photoUrl: string | null | undefined;
  name: string;
  size: number;
}) {
  const usable = photoUrl && /^https?:\/\//.test(photoUrl);
  const initial = (name || '?').charAt(0).toUpperCase();
  if (usable) {
    return (
      <div
        className="relative shrink-0 overflow-hidden rounded-full bg-muted"
        style={{ width: size, height: size }}
      >
        <Image
          src={photoUrl}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full bg-brand-gradient text-sm font-semibold text-[#0B0D10]"
      style={{ width: size, height: size }}
    >
      {initial}
    </div>
  );
}

function stringField(o: Record<string, unknown> | null | undefined, key: string): string | null {
  if (!o) return null;
  const v = o[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}
