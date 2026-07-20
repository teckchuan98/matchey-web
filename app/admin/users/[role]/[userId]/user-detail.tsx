'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CalendarDays, Clock3, Mail, MonitorSmartphone, UserRound } from 'lucide-react';

type Timeline = { id: string; name: string; feature: string; occurredAt: string; source: string };
type Detail = {
  id: string; role: string; name: string; email: string; signupAt: string; status: string;
  lastAuthenticatedAt?: string | null; lastSessionAt?: string | null; lastMeaningfulAt?: string | null;
  platform?: string | null; appVersion?: string | null; appBuild?: string | null; onboardingComplete: boolean;
  auth: Record<string, unknown>; totals: Record<string, number>; topFeatures: Array<{ name: string; count: number }>;
  timeline: Timeline[]; coach?: { id: string; name: string } | null; linkedClients?: number;
};

export function UserAnalyticsDetail({ role, userId }: { role: string; userId: string }) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    fetch(`/api/admin/analytics/users/${encodeURIComponent(role)}/${encodeURIComponent(userId)}`, { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) { window.location.href = '/admin/login'; return null; }
        if (!response.ok) throw new Error('User analytics could not be loaded.');
        return response.json() as Promise<Detail>;
      }).then((data) => { if (data) setDetail(data); }).catch((err: unknown) => setError(err instanceof Error ? err.message : 'Could not load user.'));
  }, [role, userId]);

  if (error) return <main className="mx-auto max-w-5xl p-6"><Link href="/admin" className="text-sm text-[#3478F6]">Back to analytics</Link><div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">{error}</div></main>;
  if (!detail) return <main className="mx-auto max-w-5xl p-6"><div className="h-72 animate-pulse rounded-3xl bg-neutral-200" /></main>;

  const authRows = Object.entries(detail.auth).filter(([, value]) => value !== null && value !== undefined);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:px-7">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-black"><ArrowLeft className="size-4" /> Analytics</Link>
      <header className="mt-6 rounded-3xl border border-neutral-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-widest text-[#3478F6]">{detail.role}</div><h1 className="mt-2 text-3xl font-bold tracking-tight">{detail.name}</h1><div className="mt-2 flex items-center gap-2 text-sm text-neutral-500"><Mail className="size-4" />{detail.email}</div></div><span className="w-fit rounded-xl bg-neutral-950 px-3 py-2 text-xs font-semibold text-white">{pretty(detail.status)}</span></div>
        <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Fact icon={CalendarDays} label="Signed up" value={formatDate(detail.signupAt)} />
          <Fact icon={Clock3} label="Last meaningful use" value={detail.lastMeaningfulAt ? formatDate(detail.lastMeaningfulAt) : 'Never'} />
          <Fact icon={MonitorSmartphone} label="Activity source" value="Existing database records" />
          <Fact icon={UserRound} label={detail.role === 'CLIENT' ? 'Coach' : 'Linked clients'} value={detail.role === 'CLIENT' ? detail.coach?.name ?? 'No coach' : String(detail.linkedClients ?? 0)} />
        </div>
      </header>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.5fr]">
        <div className="space-y-4">
          <Panel title="Feature totals"><div className="grid grid-cols-2 gap-2">{Object.entries(detail.totals).sort((a, b) => b[1] - a[1]).map(([name, value]) => <div key={name} className="rounded-xl bg-neutral-50 p-3"><div className="text-xl font-bold tabular-nums">{value}</div><div className="mt-1 text-xs text-neutral-500">{pretty(name)}</div></div>)}</div>{Object.keys(detail.totals).length === 0 && <Empty text="No meaningful activity recorded." />}</Panel>
          <Panel title="Authentication"><dl className="space-y-3">{authRows.map(([name, value]) => <div key={name} className="flex items-start justify-between gap-4 border-b border-neutral-100 pb-3 text-sm last:border-0"><dt className="text-neutral-500">{pretty(name)}</dt><dd className="max-w-[60%] text-right font-medium">{formatUnknown(value)}</dd></div>)}</dl></Panel>
        </div>
        <Panel title="Activity timeline"><div className="mt-2">{detail.timeline.map((event, index) => <div key={event.id} className="relative flex gap-4 pb-6 last:pb-0"><div className="relative z-10 mt-1.5 size-2.5 shrink-0 rounded-full bg-[#4D8FFF] ring-4 ring-blue-50" />{index < detail.timeline.length - 1 && <div className="absolute left-[4px] top-4 h-full w-px bg-neutral-200" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><div className="font-medium">{pretty(event.name)}</div><time className="text-xs text-neutral-400">{formatDate(event.occurredAt)}</time></div><div className="mt-1 text-xs text-neutral-500">{pretty(event.feature)} · existing record</div></div></div>)}{detail.timeline.length === 0 && <Empty text="No saved activity exists for this user." />}</div></Panel>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="mb-4 font-semibold">{title}</h2>{children}</section>; }
function Fact({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: string }) { return <div className="rounded-2xl bg-neutral-50 p-4"><Icon className="size-4 text-neutral-400" /><div className="mt-3 text-xs text-neutral-500">{label}</div><div className="mt-1 text-sm font-semibold">{value}</div></div>; }
function Empty({ text }: { text: string }) { return <div className="py-8 text-center text-sm text-neutral-400">{text}</div>; }
function pretty(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`; return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(normalized)); }
function formatUnknown(value: unknown) { if (typeof value === 'string' && /^\d{4}-\d\d-\d\dT/.test(value)) return formatDate(value); if (typeof value === 'boolean') return value ? 'Yes' : 'No'; return String(value); }
