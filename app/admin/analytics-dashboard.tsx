'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Activity, ArrowUpRight, CreditCard, Gift, LogOut, RefreshCw, Search, Share2, Timer, UserCheck, Users } from 'lucide-react';

type Trend = { date: string; signups: number; active: number };
type Overview = {
  signups: number; activated: number; activeUsers: number; dau: number; wau: number; mau: number;
  d1Retention: number; d7Retention: number; d30Retention: number; mealsLogged: number; mealsShared: number;
  shareConversion: number; trend: Trend[]; historicalNotice: string;
  funnels: { client: Funnel; trainer: Funnel };
};
type Funnel = { signedUp: number; onboarded: number; activated: number; converted: number };
type Count = { name: string; count: number };
type RetentionRow = { cohort: string; size: number; d1: number; d7: number; d30: number };
type CohortPage = { rows: RetentionRow[]; total: number; totalPages: number; page: number; size: number };
type UserRow = { id: string; role: string; name: string; email: string; signupAt: string; status: string; lastMeaningfulAt?: string | null; platform?: string | null; appVersion?: string | null };
type MealLoggerRow = { userId: string; name: string; email: string; mealsLogged: number; loggingDays: number; mealsShared: number; shareRate: number; lastMealAt?: string | null };
type ExerciseRow = { name: string; appearances: number; uniqueClients: number; lastUsedAt?: string | null };
type Paged<T> = { items: T[]; total: number; totalPages: number; page: number; size: number };
type SubscriptionRow = { clientId: string; name: string; email: string; accessType: 'PAID' | 'TRIAL' | 'MANUAL'; productId?: string | null; expiresAt?: string | null };
type SubscriptionAnalytics = Paged<SubscriptionRow> & { paidSubscribers: number; trialSubscribers: number; manualEntitlements: number };

const ranges = [7, 30, 90] as const;

export function AnalyticsDashboard() {
  const [days, setDays] = useState<number>(30);
  const [role, setRole] = useState('ALL');
  const [overview, setOverview] = useState<Overview | null>(null);
  const [cohorts, setCohorts] = useState<CohortPage | null>(null);
  const [cohortPage, setCohortPage] = useState(0);
  const [features, setFeatures] = useState<Count[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionAnalytics | null>(null);
  const [subscriptionPage, setSubscriptionPage] = useState(0);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(0);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const params = useMemo(() => {
    return new URLSearchParams({ from: malaysiaDate(days - 1), to: malaysiaDate(0), role });
  }, [days, role]);

  const loadDashboard = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [o, f] = await Promise.all([
        adminFetch<Overview>(`overview?${params}`),
        adminFetch<{ featureGroups: Count[] }>(`features?${params}`),
      ]);
      setOverview(o); setFeatures(f.featureGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics could not be loaded.');
    } finally { setLoading(false); }
  }, [params]);

  const loadCohorts = useCallback(async () => {
    try {
      const query = new URLSearchParams(params);
      query.set('page', String(cohortPage)); query.set('size', '5');
      setCohorts(await adminFetch<CohortPage>(`retention?${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Cohorts could not be loaded.');
    }
  }, [cohortPage, params]);

  const loadSubscriptions = useCallback(async () => {
    try {
      setSubscriptions(await adminFetch<SubscriptionAnalytics>(`subscriptions?page=${subscriptionPage}&size=10`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Subscription analytics could not be loaded.');
    }
  }, [subscriptionPage]);

  const loadUsers = useCallback(async () => {
    try {
      const userParams = new URLSearchParams({ role, size: '20', page: String(userPage), search });
      if (status) userParams.set('status', status);
      const result = await adminFetch<{ items: UserRow[]; total: number }>(`users?${userParams}`);
      setUsers(result.items); setUserTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Users could not be loaded.');
    }
  }, [role, search, status, userPage]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadUsers(), 250);
    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCohorts(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCohorts]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadSubscriptions(), 0);
    return () => window.clearTimeout(timer);
  }, [loadSubscriptions]);

  async function logout() { await fetch('/api/admin/logout', { method: 'POST' }); window.location.href = '/admin/login'; }
  return (
    <main className="mx-auto min-h-screen max-w-[1500px] px-4 py-5 sm:px-7 lg:px-10">
      <header className="flex flex-col gap-5 border-b border-neutral-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3"><Image src="/brand/logo.png" alt="Fittel" width={40} height={40} className="rounded-xl" /><div><h1 className="font-bold">Fittel Activity</h1><p className="text-xs text-neutral-500">Asia/Kuala_Lumpur · existing database records</p></div></div>
        <div className="flex items-center gap-2">
          <button onClick={() => { void loadDashboard(); void loadCohorts(); void loadSubscriptions(); void loadUsers(); }} className="rounded-xl border border-neutral-200 bg-white p-2.5 hover:bg-neutral-50" aria-label="Refresh"><RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} /></button>
          <button onClick={() => void logout()} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-medium hover:bg-neutral-50"><LogOut className="size-4" /> Sign out</button>
        </div>
      </header>

      <section className="mt-6 flex flex-wrap gap-2">
        {ranges.map((value) => <Filter key={value} active={days === value} onClick={() => { setDays(value); setCohortPage(0); }}>{value} days</Filter>)}
        <span className="mx-1 hidden h-9 w-px bg-neutral-200 sm:block" />
        {['ALL', 'CLIENT', 'TRAINER'].map((value) => <Filter key={value} active={role === value} onClick={() => { setRole(value); setUserPage(0); setCohortPage(0); }}>{value === 'ALL' ? 'Everyone' : `${value[0]}${value.slice(1).toLowerCase()}s`}</Filter>)}
      </section>

      {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {!overview ? <DashboardSkeleton /> : <>
        <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-6">
          <Metric icon={Users} label="Signups" value={overview.signups} />
          <Metric icon={UserCheck} label="Activated" value={overview.activated} />
          <Metric icon={Activity} label="DAU / WAU" value={`${overview.dau} / ${overview.wau}`} />
          <Metric icon={Activity} label="MAU" value={overview.mau} />
          <Metric icon={Share2} label="Meals shared" value={overview.mealsShared} />
          <Metric icon={ArrowUpRight} label="Share rate" value={`${overview.shareConversion}%`} />
        </section>

        <PremiumAccessPanel data={subscriptions} page={subscriptionPage} onPage={setSubscriptionPage} />

        <section className="mt-3">
          <Panel title="Growth and activity" subtitle="Daily signups compared with users who created database activity"><TrendChart rows={overview.trend} /></Panel>
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-2">
          <Panel title="Feature usage" subtitle="Meals, shares, workouts, coaching, sessions and feedback already stored"><FeatureBars items={features} /></Panel>
          <Panel title="Cohorts" subtitle="Signup-day retention in Malaysia time">
            {!cohorts ? <TableSkeleton /> : <><CohortTable rows={cohorts.rows} /><Pager page={cohortPage} total={cohorts.total} totalPages={cohorts.totalPages} onPage={setCohortPage} /></>}
          </Panel>
        </section>

        <LeaderboardSection baseParams={params.toString()} />

        <section className="mt-3 rounded-2xl border border-neutral-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-neutral-100 p-5 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="font-semibold">Users</h2><p className="mt-1 text-xs text-neutral-500">Open a person to see activity reconstructed from existing records.</p></div><div className="flex flex-col gap-2 sm:flex-row"><select value={status} onChange={(e) => { setStatus(e.target.value); setUserPage(0); }} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none"><option value="">All activity states</option><option value="ACTIVE">Active</option><option value="AT_RISK">At risk</option><option value="DORMANT">Dormant</option><option value="NEVER_ACTIVATED">Never activated</option></select><label className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(e) => { setSearch(e.target.value); setUserPage(0); }} placeholder="Search name or email" className="h-10 w-full rounded-xl border border-neutral-200 pl-9 pr-3 text-sm outline-none focus:border-[#4D8FFF] sm:w-72" /></label></div></div>
          <UserTable users={users} />
          <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-4 text-xs text-neutral-500"><span>{userTotal} users</span><div className="flex items-center gap-2"><button disabled={userPage === 0} onClick={() => setUserPage((p) => Math.max(0, p - 1))} className="rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Previous</button><span>Page {userPage + 1}</span><button disabled={(userPage + 1) * 20 >= userTotal} onClick={() => setUserPage((p) => p + 1)} className="rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Next</button></div></div>
        </section>
      </>}
    </main>
  );
}

async function adminFetch<T>(path: string): Promise<T> {
  const response = await fetch(`/api/admin/analytics/${path}`, { cache: 'no-store' });
  if (response.status === 401) { window.location.href = '/admin/login'; throw new Error('Admin session expired.'); }
  if (!response.ok) throw new Error('Analytics could not be loaded.');
  return response.json() as Promise<T>;
}

function Filter({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) { return <button onClick={onClick} className={`h-9 rounded-xl px-3 text-xs font-semibold transition ${active ? 'bg-neutral-950 text-white' : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50'}`}>{children}</button>; }
function Metric({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string | number }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-center gap-2 text-xs font-medium text-neutral-500"><Icon className="size-3.5" />{label}</div><div className="mt-3 text-2xl font-bold tabular-nums">{value}</div></div>; }
function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5"><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-neutral-500">{subtitle}</p>{children}</section>; }

function TrendChart({ rows }: { rows: Trend[] }) {
  const values = rows.flatMap((r) => [r.signups, r.active]); const max = Math.max(1, ...values);
  const points = (key: 'signups' | 'active') => rows.map((r, i) => `${rows.length === 1 ? 0 : i * 100 / (rows.length - 1)},${100 - r[key] * 92 / max}`).join(' ');
  return <div className="mt-5"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-52 w-full overflow-visible"><line x1="0" y1="100" x2="100" y2="100" stroke="#e5e5e5" /><polyline points={points('active')} fill="none" stroke="#4D8FFF" strokeWidth="2" vectorEffect="non-scaling-stroke" /><polyline points={points('signups')} fill="none" stroke="#111318" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="mt-3 flex gap-5 text-xs text-neutral-500"><span><i className="mr-2 inline-block size-2 rounded-full bg-[#4D8FFF]" />Active</span><span><i className="mr-2 inline-block size-2 rounded-full bg-neutral-950" />Signups</span></div></div>;
}
function FeatureBars({ items }: { items: Count[] }) { const max = Math.max(1, ...items.map((i) => i.count)); return <div className="mt-5 space-y-4">{items.length === 0 ? <Empty text="No feature events in this period." /> : items.slice(0, 8).map((item) => <div key={item.name}><div className="mb-1.5 flex justify-between text-xs"><span className="font-medium">{pretty(item.name)}</span><span className="tabular-nums text-neutral-500">{item.count}</span></div><div className="h-2 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-[#4D8FFF]" style={{ width: `${item.count * 100 / max}%` }} /></div></div>)}</div>; }
function CohortTable({ rows }: { rows: RetentionRow[] }) { return <div className="mt-5 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="text-neutral-500"><tr><th className="pb-3 font-medium">Cohort</th><th className="pb-3 font-medium">Users</th><th className="pb-3 font-medium">D1</th><th className="pb-3 font-medium">D7</th><th className="pb-3 font-medium">D30</th></tr></thead><tbody>{rows.map((r) => <tr key={r.cohort} className="border-t border-neutral-100"><td className="py-3 font-medium">{shortDate(r.cohort)}</td><td>{r.size}</td><Heat value={r.d1} /><Heat value={r.d7} /><Heat value={r.d30} /></tr>)}</tbody></table>{rows.length === 0 && <Empty text="No signup cohorts in this period." />}</div>; }
function Heat({ value }: { value: number }) { return <td><span className="inline-flex min-w-12 justify-center rounded-lg px-2 py-1 font-semibold" style={{ background: `rgba(77,143,255,${0.08 + value / 130})` }}>{value}%</span></td>; }

function PremiumAccessPanel({ data, page, onPage }: { data: SubscriptionAnalytics | null; page: number; onPage: (page: number) => void }) {
  return <section className="mt-3 rounded-2xl border border-neutral-200 bg-white p-5">
    <div><h2 className="font-semibold">Premium access</h2><p className="mt-1 text-xs text-neutral-500">Current production App Store subscriptions, trials, and manually granted premium access.</p></div>
    {!data ? <div className="mt-5"><TableSkeleton /></div> : <>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <AccessMetric icon={CreditCard} label="Active subscribers" value={data.paidSubscribers} />
        <AccessMetric icon={Timer} label="On trial" value={data.trialSubscribers} />
        <AccessMetric icon={Gift} label="Free entitlements" value={data.manualEntitlements} />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="text-neutral-500"><tr><th className="pb-3 font-medium">Client</th><th className="pb-3 font-medium">Access</th><th className="pb-3 font-medium">Plan</th><th className="pb-3 text-right font-medium">Ends</th></tr></thead>
          <tbody>{data.items.map((row) => <tr key={`${row.accessType}:${row.clientId}`} className="border-t border-neutral-100"><td className="py-3"><Link href={`/admin/users/client/${encodeURIComponent(row.clientId)}`} className="font-semibold hover:text-[#3478F6]">{row.name}</Link><div className="text-[11px] text-neutral-400">{row.email}</div></td><td><AccessBadge value={row.accessType} /></td><td className="text-neutral-600">{subscriptionPlan(row)}</td><td className="text-right text-neutral-600">{row.expiresAt ? formatDate(row.expiresAt) : 'No expiry'}</td></tr>)}</tbody>
        </table>
        {data.items.length === 0 && <Empty text="No current premium access records." />}
      </div>
      <Pager page={page} total={data.total} totalPages={data.totalPages} onPage={onPage} />
    </>}
  </section>;
}

function AccessMetric({ icon: Icon, label, value }: { icon: typeof CreditCard; label: string; value: number }) { return <div className="rounded-xl bg-neutral-50 p-4"><div className="flex items-center gap-2 text-xs font-medium text-neutral-500"><Icon className="size-3.5" />{label}</div><div className="mt-2 text-2xl font-bold tabular-nums">{value}</div></div>; }
function AccessBadge({ value }: { value: SubscriptionRow['accessType'] }) { const tones = { PAID: 'bg-green-50 text-green-700', TRIAL: 'bg-blue-50 text-blue-700', MANUAL: 'bg-purple-50 text-purple-700' }; return <span className={`rounded-lg px-2 py-1 font-semibold ${tones[value]}`}>{value === 'MANUAL' ? 'Free grant' : pretty(value)}</span>; }
function subscriptionPlan(row: SubscriptionRow) { if (row.accessType === 'MANUAL') return 'Manual entitlement'; const id = row.productId?.toLowerCase() ?? ''; if (id.endsWith('.weekly')) return 'Weekly'; if (id.endsWith('.monthly')) return 'Monthly'; if (id.endsWith('.annual') || id.endsWith('.yearly')) return 'Yearly'; return row.productId ?? 'Subscription'; }

function LeaderboardSection({ baseParams }: { baseParams: string }) {
  return <section className="mt-3 grid gap-3 xl:grid-cols-2"><MealLeaderboard key={`meals-${baseParams}`} baseParams={baseParams} /><ExerciseLeaderboard key={`exercises-${baseParams}`} baseParams={baseParams} /></section>;
}

function MealLeaderboard({ baseParams }: { baseParams: string }) {
  const [page, setPage] = useState(0); const [search, setSearch] = useState('');
  const [data, setData] = useState<Paged<MealLoggerRow> | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(baseParams); query.delete('role'); query.set('page', String(page)); query.set('size', '10'); query.set('search', search);
      void adminFetch<Paged<MealLoggerRow>>(`top-meal-loggers?${query}`).then((result) => { setData(result); setError(''); }).catch(() => setError('Could not load meal rankings.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [baseParams, page, search]);
  return <LeaderboardPanel title="Top meal loggers" subtitle="Ranked by meals saved in this period" search={search} onSearch={(value) => { setSearch(value); setPage(0); }}>
    {error ? <InlineError text={error} /> : !data ? <TableSkeleton /> : <><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="text-neutral-500"><tr><th className="pb-3 font-medium">#</th><th className="pb-3 font-medium">Client</th><th className="pb-3 text-right font-medium">Meals</th><th className="pb-3 text-right font-medium">Days</th><th className="pb-3 text-right font-medium">Shared</th><th className="pb-3 text-right font-medium">Share rate</th></tr></thead><tbody>{data.items.map((row, index) => <tr key={row.userId} className="border-t border-neutral-100"><td className="py-3 text-neutral-400">{page * 10 + index + 1}</td><td className="py-3"><Link href={`/admin/users/client/${encodeURIComponent(row.userId)}`} className="font-semibold hover:text-[#3478F6]">{row.name}</Link><div className="text-[11px] text-neutral-400">{row.lastMealAt ? `Last meal ${formatDate(row.lastMealAt)}` : row.email}</div></td><td className="text-right font-semibold tabular-nums">{row.mealsLogged}</td><td className="text-right tabular-nums">{row.loggingDays}</td><td className="text-right tabular-nums">{row.mealsShared}</td><td className="text-right tabular-nums">{row.shareRate}%</td></tr>)}</tbody></table>{data.items.length === 0 && <Empty text="No matching meal loggers." />}</div><Pager page={page} total={data.total} totalPages={data.totalPages} onPage={setPage} /></>}
  </LeaderboardPanel>;
}

function ExerciseLeaderboard({ baseParams }: { baseParams: string }) {
  const [page, setPage] = useState(0); const [search, setSearch] = useState('');
  const [data, setData] = useState<Paged<ExerciseRow> | null>(null); const [error, setError] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const query = new URLSearchParams(baseParams); query.delete('role'); query.set('page', String(page)); query.set('size', '10'); query.set('search', search);
      void adminFetch<Paged<ExerciseRow>>(`top-exercises?${query}`).then((result) => { setData(result); setError(''); }).catch(() => setError('Could not load exercise rankings.'));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [baseParams, page, search]);
  return <LeaderboardPanel title="Top exercises" subtitle="One appearance per workout; sets are excluded" search={search} onSearch={(value) => { setSearch(value); setPage(0); }}>
    {error ? <InlineError text={error} /> : !data ? <TableSkeleton /> : <><div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-neutral-500"><tr><th className="pb-3 font-medium">#</th><th className="pb-3 font-medium">Exercise</th><th className="pb-3 text-right font-medium">Workouts</th><th className="pb-3 text-right font-medium">Clients</th><th className="pb-3 text-right font-medium">Last used</th></tr></thead><tbody>{data.items.map((row, index) => <tr key={row.name.toLowerCase()} className="border-t border-neutral-100"><td className="py-3 text-neutral-400">{page * 10 + index + 1}</td><td className="py-3 font-semibold">{row.name}</td><td className="text-right font-semibold tabular-nums">{row.appearances}</td><td className="text-right tabular-nums">{row.uniqueClients}</td><td className="text-right text-neutral-500">{row.lastUsedAt ? formatDate(row.lastUsedAt) : '—'}</td></tr>)}</tbody></table>{data.items.length === 0 && <Empty text="No matching exercises." />}</div><Pager page={page} total={data.total} totalPages={data.totalPages} onPage={setPage} /></>}
  </LeaderboardPanel>;
}

function LeaderboardPanel({ title, subtitle, search, onSearch, children }: { title: string; subtitle: string; search: string; onSearch: (value: string) => void; children: React.ReactNode }) { return <section className="rounded-2xl border border-neutral-200 bg-white p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-xs text-neutral-500">{subtitle}</p></div><label className="relative shrink-0"><Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-neutral-400" /><input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search" className="h-9 w-full rounded-xl border border-neutral-200 pl-8 pr-3 text-xs outline-none focus:border-[#4D8FFF] sm:w-44" /></label></div><div className="mt-5">{children}</div></section>; }
function Pager({ page, total, totalPages, onPage }: { page: number; total: number; totalPages: number; onPage: (page: number) => void }) { return <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-4 text-xs text-neutral-500"><span>{total} results</span><div className="flex items-center gap-2"><button disabled={page === 0} onClick={() => onPage(Math.max(0, page - 1))} className="rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Previous</button><span>{totalPages === 0 ? 0 : page + 1} / {totalPages}</span><button disabled={page + 1 >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border border-neutral-200 px-3 py-2 font-semibold text-neutral-700 disabled:opacity-40">Next</button></div></div>; }
function InlineError({ text }: { text: string }) { return <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{text}</div>; }
function TableSkeleton() { return <div className="space-y-2">{Array.from({ length: 5 }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-neutral-100" />)}</div>; }

function UserTable({ users }: { users: UserRow[] }) { return <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs text-neutral-500"><tr><th className="px-5 py-3 font-medium">User</th><th className="py-3 font-medium">Role</th><th className="py-3 font-medium">Status</th><th className="py-3 font-medium">Signed up</th><th className="py-3 font-medium">Last meaningful use</th><th /></tr></thead><tbody>{users.map((u) => <tr key={`${u.role}:${u.id}`} className="border-t border-neutral-100 hover:bg-neutral-50/70"><td className="px-5 py-3"><div className="font-medium">{u.name}</div><div className="text-xs text-neutral-500">{u.email}</div></td><td><span className="rounded-lg bg-neutral-100 px-2 py-1 text-xs font-medium">{pretty(u.role)}</span></td><td><Status value={u.status} /></td><td className="text-xs text-neutral-600">{formatDate(u.signupAt)}</td><td className="text-xs text-neutral-600">{u.lastMeaningfulAt ? formatDate(u.lastMeaningfulAt) : '—'}</td><td className="pr-5 text-right"><Link href={`/admin/users/${u.role.toLowerCase()}/${encodeURIComponent(u.id)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[#3478F6]">Open <ArrowUpRight className="size-3" /></Link></td></tr>)}</tbody></table>{users.length === 0 && <Empty text="No matching users." />}</div>; }
function Status({ value }: { value: string }) { const tones: Record<string, string> = { ACTIVE: 'bg-green-50 text-green-700', AT_RISK: 'bg-amber-50 text-amber-700', DORMANT: 'bg-neutral-100 text-neutral-600', NEVER_ACTIVATED: 'bg-red-50 text-red-700' }; return <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${tones[value] ?? tones.DORMANT}`}>{pretty(value)}</span>; }
function Empty({ text }: { text: string }) { return <div className="py-10 text-center text-sm text-neutral-400">{text}</div>; }
function DashboardSkeleton() { return <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-neutral-200/70" />)}</div>; }
function pretty(value: string) { return value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function shortDate(value: string) { return new Intl.DateTimeFormat('en-MY', { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`)); }
function malaysiaDate(daysAgo: number) { const date = new Date(Date.now() - daysAgo * 86_400_000); const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuala_Lumpur', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date); const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? ''; return `${part('year')}-${part('month')}-${part('day')}`; }
function formatDate(value: string) { const normalized = /Z$|[+-]\d\d:\d\d$/.test(value) ? value : `${value}+08:00`; return new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kuala_Lumpur' }).format(new Date(normalized)); }
