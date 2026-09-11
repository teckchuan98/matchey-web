'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  RefreshCw,
  ShieldCheck,
  TriangleAlert,
  XCircle,
} from 'lucide-react';

type ReviewStatus = 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'VERIFIED' | 'REJECTED';
type CatalogEntry = {
  id: string;
  verified: boolean;
  verificationStatus: ReviewStatus;
  name: string;
  ingredient: string;
  cookingMethod: string;
  servingAmount: number;
  servingUnit: string;
  servingWeightGrams?: number | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  brand?: string | null;
  createdAt?: string | null;
};

const statuses: { value: ReviewStatus; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending' },
  { value: 'NEEDS_CHANGES', label: 'Needs changes' },
  { value: 'VERIFIED', label: 'Verified' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function CatalogReviewQueue() {
  const [status, setStatus] = useState<ReviewStatus>('PENDING_REVIEW');
  const [items, setItems] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actingId, setActingId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/admin/nutrition-catalog/submissions?status=${status}&size=100`,
        { cache: 'no-store' },
      );
      if (response.status === 401) {
        window.location.href = '/admin/login';
        return;
      }
      if (!response.ok) throw new Error('Catalogue submissions could not be loaded.');
      setItems((await response.json()) as CatalogEntry[]);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Catalogue submissions could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function act(item: CatalogEntry, action: 'approve' | 'NEEDS_CHANGES' | 'REJECTED') {
    let reviewNotes = '';
    if (action === 'approve') {
      if (!window.confirm(`Verify “${item.name}” and publish it to the trusted catalogue?`)) return;
    } else {
      const note = window.prompt(
        action === 'NEEDS_CHANGES'
          ? 'What should the contributor correct?'
          : 'Why is this submission being rejected?',
      );
      if (note === null) return;
      reviewNotes = note.trim();
    }
    setActingId(item.id);
    setError('');
    try {
      const path = action === 'approve'
        ? `${encodeURIComponent(item.id)}/approve`
        : `${encodeURIComponent(item.id)}/review?status=${action}`;
      const response = await fetch(`/api/admin/nutrition-catalog/submissions/${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewNotes }),
      });
      if (response.status === 401) {
        window.location.assign('/admin/login');
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Review action failed.');
      setItems((current) => current.filter((entry) => entry.id !== item.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Review action failed.');
    } finally {
      setActingId('');
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-6 sm:px-7">
      <Link href="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-black">
        <ArrowLeft className="size-4" /> Analytics
      </Link>
      <header className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#3478F6]">
            <ShieldCheck className="size-4" /> Nutrition safety
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">Community food review</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500">
            Unverified foods remain isolated from automatic calculations until you approve them here.
          </p>
        </div>
        <button onClick={() => void load()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold hover:bg-neutral-50">
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {statuses.map((option) => (
          <button
            key={option.value}
            onClick={() => setStatus(option.value)}
            className={`h-9 rounded-xl px-4 text-sm font-semibold ${status === option.value ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {error && <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      <section className="mt-4 space-y-3">
        {loading && items.length === 0
          ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-56 animate-pulse rounded-2xl bg-neutral-200/70" />)
          : items.map((item) => (
              <SubmissionCard
                key={item.id}
                item={item}
                busy={actingId === item.id}
                onAction={(action) => void act(item, action)}
              />
            ))}
        {!loading && items.length === 0 && (
          <div className="rounded-2xl border border-neutral-200 bg-white py-16 text-center text-sm text-neutral-400">
            No {status.toLowerCase().replaceAll('_', ' ')} submissions.
          </div>
        )}
      </section>
    </main>
  );
}

function SubmissionCard({
  item,
  busy,
  onAction,
}: {
  item: CatalogEntry;
  busy: boolean;
  onAction: (action: 'approve' | 'NEEDS_CHANGES' | 'REJECTED') => void;
}) {
  const calculated = item.protein * 4 + item.carbs * 4 + item.fat * 9;
  const calorieDelta = Math.abs(item.kcal - calculated);
  const suspicious = calorieDelta > Math.max(50, item.kcal * 0.2);
  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.verificationStatus} />
            {suspicious && (
              <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700">
                <TriangleAlert className="size-3" /> Check calorie mismatch
              </span>
            )}
          </div>
          <h2 className="mt-3 text-xl font-bold">{item.name}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {item.ingredient} · {item.cookingMethod || 'No cooking method'}
            {item.brand ? ` · ${item.brand}` : ''}
          </p>
        </div>
        <div className="text-xs text-neutral-400">
          {item.createdAt ? formatDate(item.createdAt) : item.id}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <Metric label="Serving" value={`${format(item.servingAmount)} ${unit(item.servingUnit)}`} />
        <Metric label="Calories" value={`${format(item.kcal)} kcal`} warning={suspicious} />
        <Metric label="Protein" value={`${format(item.protein)} g`} />
        <Metric label="Carbs" value={`${format(item.carbs)} g`} />
        <Metric label="Fat" value={`${format(item.fat)} g`} />
        <Metric label="Fiber" value={`${format(item.fiber)} g`} />
      </div>

      {(item.verificationStatus === 'PENDING_REVIEW' || item.verificationStatus === 'NEEDS_CHANGES') && (
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-neutral-100 pt-4">
          <button disabled={busy} onClick={() => onAction('REJECTED')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-700 disabled:opacity-40">
            <XCircle className="size-4" /> Reject
          </button>
          <button disabled={busy} onClick={() => onAction('NEEDS_CHANGES')} className="inline-flex h-9 items-center gap-2 rounded-xl border border-amber-200 px-3 text-sm font-semibold text-amber-700 disabled:opacity-40">
            <Clock3 className="size-4" /> Needs changes
          </button>
          <button disabled={busy} onClick={() => onAction('approve')} className="inline-flex h-9 items-center gap-2 rounded-xl bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40">
            <CheckCircle2 className="size-4" /> Verify and publish
          </button>
        </div>
      )}
    </article>
  );
}

function Metric({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return <div className={`rounded-xl p-3 ${warning ? 'bg-amber-50' : 'bg-neutral-50'}`}><div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">{label}</div><div className={`mt-1 font-bold ${warning ? 'text-amber-800' : 'text-neutral-900'}`}>{value}</div></div>;
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const tone: Record<ReviewStatus, string> = {
    PENDING_REVIEW: 'bg-blue-50 text-blue-700',
    NEEDS_CHANGES: 'bg-amber-50 text-amber-700',
    VERIFIED: 'bg-emerald-50 text-emerald-700',
    REJECTED: 'bg-red-50 text-red-700',
  };
  return <span className={`rounded-lg px-2 py-1 text-[11px] font-semibold ${tone[status]}`}>{status.toLowerCase().replaceAll('_', ' ')}</span>;
}

function unit(value: string) {
  if (value === 'G') return 'g';
  if (value === 'ML') return 'ml';
  return value.toLowerCase();
}
function format(value: number) { return Number.isInteger(value) ? String(value) : value.toFixed(1); }
function formatDate(value: string) {
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`;
  return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(normalized));
}
