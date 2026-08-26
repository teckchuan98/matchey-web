'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, MessageSquareText, Search, Sparkles, Utensils } from 'lucide-react';

type FeedbackType = 'FEEDBACK' | 'FEATURE_REQUEST' | 'BOTH' | 'MEAL_ACCURACY';
type FeedbackItem = {
  id: string; userId: string; role: string; userName: string; email: string; type: FeedbackType;
  feedback?: string | null; featureRequest?: string | null; mealId?: string | null; createdAt: string;
};
type FeedbackPage = { items: FeedbackItem[]; total: number; totalPages: number; page: number; size: number };

const periods = [
  { label: 'All time', value: 'ALL' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: '1 year', value: '365' },
] as const;

export function FeedbackList() {
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [role, setRole] = useState('ALL');
  const [type, setType] = useState('ALL');
  const [period, setPeriod] = useState('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    const query = new URLSearchParams({ role, type, search, page: String(page), size: '20' });
    if (period !== 'ALL') {
      query.set('from', malaysiaDate(Number(period) - 1));
      query.set('to', malaysiaDate(0));
    }
    return query;
  }, [page, period, role, search, type]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/feedback?${params}`, { cache: 'no-store' });
      if (response.status === 401) { window.location.href = '/admin/login'; return; }
      if (!response.ok) throw new Error('Feedback could not be loaded.');
      setData(await response.json() as FeedbackPage);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Feedback could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  function resetPage(setter: () => void) { setter(); setPage(0); }

  return <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-7">
    <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-black"><ArrowLeft className="size-4" /> Analytics</Link>
    <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3478F6]"><MessageSquareText className="size-4" /> Internal inbox</div><h1 className="mt-2 text-3xl font-bold tracking-tight">User feedback</h1><p className="mt-2 text-sm text-neutral-500">Feedback, feature requests, and meal-accuracy reports submitted inside Fittel.</p></div>
      <div className="text-sm text-neutral-500">{data ? `${data.total} submissions` : 'Loading submissions…'}</div>
    </header>

    <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="grid gap-3 md:grid-cols-[1.3fr_0.7fr_0.8fr]">
        <label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(event) => resetPage(() => setSearch(event.target.value))} placeholder="Search people, email, feedback, or meal ID" className="h-10 w-full rounded-xl border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-[#4D8FFF]" /></label>
        <select value={type} onChange={(event) => resetPage(() => setType(event.target.value))} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"><option value="ALL">All submission types</option><option value="FEEDBACK">Feedback</option><option value="FEATURE_REQUEST">Feature requests</option><option value="MEAL_ACCURACY">Meal accuracy</option></select>
        <select value={role} onChange={(event) => resetPage(() => setRole(event.target.value))} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"><option value="ALL">Clients and trainers</option><option value="CLIENT">Clients</option><option value="TRAINER">Trainers</option></select>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">{periods.map((item) => <button key={item.value} onClick={() => resetPage(() => setPeriod(item.value))} className={`h-8 rounded-lg px-3 text-xs font-semibold ${period === item.value ? 'bg-neutral-950 text-white' : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'}`}>{item.label}</button>)}</div>
    </section>

    {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mt-4 space-y-3">
      {loading && !data ? <Skeleton /> : data?.items.map((item) => <FeedbackCard key={item.id} item={item} />)}
      {!loading && data?.items.length === 0 && <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-400">No matching submissions.</div>}
    </section>
    {data && <Pager page={page} total={data.total} totalPages={data.totalPages} onPage={setPage} />}
  </main>;
}

function FeedbackCard({ item }: { item: FeedbackItem }) {
  const canOpenUser = item.role === 'CLIENT' || item.role === 'TRAINER';
  return <article className="rounded-2xl border border-neutral-200 bg-white p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div><div className="flex flex-wrap items-center gap-2"><TypeBadge value={item.type} /><span className="rounded-lg bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-600">{pretty(item.role)}</span></div><div className="mt-3 font-semibold">{item.userName}</div><div className="text-xs text-neutral-500">{item.email || 'No email stored'}</div></div>
      <div className="flex items-center gap-4"><time className="text-xs text-neutral-400">{formatDate(item.createdAt)}</time>{canOpenUser && <Link href={`/admin/users/${item.role.toLowerCase()}/${encodeURIComponent(item.userId)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#3478F6]">Open user <ArrowUpRight className="size-3" /></Link>}</div>
    </div>
    <div className="mt-5 grid gap-3 md:grid-cols-2">
      {item.feedback && <MessageBlock icon={MessageSquareText} label={item.mealId ? 'Meal accuracy report' : 'Feedback'} text={item.feedback} />}
      {item.featureRequest && <MessageBlock icon={Sparkles} label="Feature request" text={item.featureRequest} />}
      {item.mealId && <MessageBlock icon={Utensils} label="Meal ID" text={item.mealId} mono />}
    </div>
  </article>;
}

function MessageBlock({ icon: Icon, label, text, mono = false }: { icon: typeof MessageSquareText; label: string; text: string; mono?: boolean }) { return <div className="rounded-xl bg-neutral-50 p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-neutral-500"><Icon className="size-3.5" />{label}</div><p className={`mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800 ${mono ? 'font-mono text-xs' : ''}`}>{text}</p></div>; }
function TypeBadge({ value }: { value: FeedbackType }) { const tone: Record<FeedbackType, string> = { FEEDBACK: 'bg-blue-50 text-blue-700', FEATURE_REQUEST: 'bg-purple-50 text-purple-700', BOTH: 'bg-indigo-50 text-indigo-700', MEAL_ACCURACY: 'bg-amber-50 text-amber-700' }; return <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${tone[value]}`}>{value === 'BOTH' ? 'Feedback + request' : pretty(value)}</span>; }
function Pager({ page, total, totalPages, onPage }: { page: number; total: number; totalPages: number; onPage: (value: number) => void }) { return <div className="mt-5 flex items-center justify-between text-xs text-neutral-500"><span>{total} submissions</span><div className="flex items-center gap-2"><button disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Previous</button><span>{totalPages === 0 ? 0 : page + 1} / {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border border-neutral-200 bg-white px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Next</button></div></div>; }
function Skeleton() { return <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-2xl bg-neutral-200/70" />)}</div>; }
function pretty(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function malaysiaDate(daysAgo: number) { const date = new Date(Date.now() - daysAgo * 86_400_000); const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''; return `${part('year')}-${part('month')}-${part('day')}`; }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`; return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(normalized)); }
