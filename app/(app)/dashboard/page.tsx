'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  Activity,
  Calendar as CalendarIcon,
  Clock,
  Coffee,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { authCheck } from '@/lib/api/auth';
import { getClientDailySummary, listSchedules } from '@/lib/api/trainer';
import type {
  ClientDailySummaryDto,
  TrainerScheduleDto,
} from '@/lib/types/trainer';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function todayIso(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatTime(t: string): string {
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, 'h:mm a').toLowerCase().replace(' ', '');
}

function greeting(hour: number): string {
  if (hour < 5) return 'Good evening';
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const today = todayIso();
  const now = new Date();

  const profile = useQuery({ queryKey: ['auth', 'check'], queryFn: authCheck });
  const schedules = useQuery({
    queryKey: ['trainer', 'schedules'],
    queryFn: listSchedules,
  });
  const summary = useQuery({
    queryKey: ['trainer', 'clients', 'daily-summary', today],
    queryFn: () => getClientDailySummary(today),
  });

  const trainerName = useMemo(() => {
    const t = profile.data?.trainer;
    if (t && typeof t.name === 'string') return t.name as string;
    return null;
  }, [profile.data]);

  const upcomingItems = useMemo<TrainerScheduleDto[]>(() => {
    if (!schedules.data) return [];
    const nowMin = now.getHours() * 60 + now.getMinutes();
    return schedules.data
      .filter((s) => {
        if (s.scheduleDate > today) return true;
        if (s.scheduleDate < today) return false;
        const [h, m] = s.endTime.split(':').map(Number);
        return h * 60 + m > nowMin; // still in progress or future
      })
      .sort((a, b) => {
        if (a.scheduleDate !== b.scheduleDate) {
          return a.scheduleDate.localeCompare(b.scheduleDate);
        }
        return a.startTime.localeCompare(b.startTime);
      })
      .slice(0, 5);
  }, [schedules.data, today, now]);

  const stats = useMemo(() => {
    const todayList = (schedules.data ?? []).filter((s) => s.scheduleDate === today);
    const sessions = todayList.filter((s) => !s.isUnavailable).length;
    const pending = todayList.filter((s) => s.status === 'PENDING').length;
    const clients = summary.data?.length ?? 0;
    return { sessions, pending, clients };
  }, [schedules.data, today, summary.data]);

  const firstName = trainerName ? trainerName.split(' ')[0] : null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      <PageHeader
        date={now}
        greeting={greeting(now.getHours())}
        firstName={firstName}
      />

      <StatsRow
        sessions={stats.sessions}
        pending={stats.pending}
        clients={stats.clients}
        loading={schedules.isLoading || summary.isLoading}
      />

      <Section
        title="Upcoming"
        icon={CalendarIcon}
        meta={
          schedules.isLoading
            ? null
            : upcomingItems.length === 0
              ? null
              : `Next ${upcomingItems.length}`
        }
      >
        {schedules.isLoading ? (
          <ScheduleSkeleton />
        ) : schedules.isError ? (
          <EmptyState icon={CalendarIcon} title="Couldn't load your schedule." />
        ) : upcomingItems.length === 0 ? (
          <EmptyState
            icon={Coffee}
            title="No upcoming sessions"
            body="Once you schedule blocks for today or beyond, they'll show up here."
          />
        ) : (
          <div className="grid gap-3">
            {upcomingItems.map((s, i) => (
              <ScheduleRow key={s.id} item={s} today={today} isNext={i === 0} />
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Clients"
        icon={Users}
        meta={
          summary.isLoading
            ? null
            : `${summary.data?.length ?? 0} active`
        }
      >
        {summary.isLoading ? (
          <ClientGridSkeleton />
        ) : summary.isError ? (
          <EmptyState icon={Users} title="Couldn't load your clients." />
        ) : !summary.data || summary.data.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No clients linked yet"
            body="Create an invite from the mobile app to connect your first client."
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {summary.data.map((c) => (
              <ClientCard key={c.clientId} client={c} />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

function PageHeader({
  date,
  greeting,
  firstName,
}: {
  date: Date;
  greeting: string;
  firstName: string | null;
}) {
  return (
    <header>
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <CalendarIcon className="size-3.5" />
        <span>{format(date, 'EEEE, MMMM d, yyyy')}</span>
      </div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
        {greeting}
        {firstName ? `, ${firstName}` : ''}.
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Here&apos;s what&apos;s on the books today.
      </p>
    </header>
  );
}

function StatsRow({
  sessions,
  pending,
  clients,
  loading,
}: {
  sessions: number;
  pending: number;
  clients: number;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Sessions today"
        value={sessions}
        icon={Activity}
        accent="primary"
        loading={loading}
      />
      <StatCard
        label="Pending requests"
        value={pending}
        icon={Clock}
        accent="warn"
        loading={loading}
      />
      <StatCard
        label="Active clients"
        value={clients}
        icon={TrendingUp}
        accent="success"
        loading={loading}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  accent: 'primary' | 'warn' | 'success';
  loading: boolean;
}) {
  const tone: Record<typeof accent, string> = {
    primary: 'bg-primary/10 text-primary',
    warn: 'bg-[#FFB454]/15 text-[#FFB454]',
    success: 'bg-[#8AE9A0]/15 text-[#8AE9A0]',
  };
  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-5">
        <div className={`grid size-11 place-items-center rounded-lg ${tone[accent]}`}>
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </div>
          {loading ? (
            <Skeleton className="mt-1 h-7 w-10" />
          ) : (
            <div className="mt-0.5 text-2xl font-semibold tabular-nums">{value}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  meta,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  meta: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        </div>
        {meta && (
          <span className="text-xs font-medium text-muted-foreground">{meta}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({
  icon: Icon,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <div className="grid size-10 place-items-center rounded-full bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="text-sm font-medium">{title}</div>
        {body && <div className="max-w-xs text-xs text-muted-foreground">{body}</div>}
      </CardContent>
    </Card>
  );
}

function ScheduleRow({
  item,
  today,
  isNext,
}: {
  item: TrainerScheduleDto;
  today: string;
  isNext: boolean;
}) {
  const isPending = item.status === 'PENDING';
  const isBusy = !item.isUnavailable;
  const title = item.isUnavailable
    ? 'Unavailable'
    : item.clientName ?? item.clientLabel ?? 'Open block';
  const initial = (title || '?').charAt(0).toUpperCase();
  const isToday = item.scheduleDate === today;
  const dayLabel = isToday
    ? 'Today'
    : format(parseDateOnly(item.scheduleDate), 'EEE, MMM d');

  return (
    <Card
      className={`relative overflow-hidden transition-colors ${
        isNext ? 'border-primary/40' : ''
      }`}
    >
      {isNext && (
        <div className="absolute inset-y-0 left-0 w-1 bg-brand-gradient" aria-hidden />
      )}
      <CardContent className="flex items-center gap-4 py-4 pl-5">
        <div className="flex w-28 shrink-0 flex-col text-xs tabular-nums">
          <span className={`text-[10px] font-semibold uppercase tracking-wider ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
            {dayLabel}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {formatTime(item.startTime)}
          </span>
          <span className="text-muted-foreground">
            → {formatTime(item.endTime)}
          </span>
        </div>

        <div
          className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold ${
            item.isUnavailable
              ? 'bg-muted text-muted-foreground'
              : 'bg-brand-gradient text-[#0B0D10]'
          }`}
        >
          {item.isUnavailable ? <Coffee className="size-4" /> : initial}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            {isNext && <Chip tone="primary">Next up</Chip>}
            {isPending && <Chip tone="warn">Pending</Chip>}
            {item.isUnavailable && <Chip tone="muted">Off</Chip>}
          </div>
          {item.agenda && isBusy && (
            <p className="mt-1 truncate text-xs text-muted-foreground">{item.agenda}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ClientCard({ client }: { client: ClientDailySummaryDto }) {
  const initial = (client.clientName || '?').charAt(0).toUpperCase();
  const sessionsText =
    client.sessionsLeft != null ? `${client.sessionsLeft} left` : null;

  return (
    <Card className="group cursor-default transition-colors hover:border-primary/40">
      <CardContent className="flex items-center gap-3 py-4">
        <ClientAvatar photoUrl={client.photoUrl} initial={initial} />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-semibold">
            {client.clientName || 'Unnamed'}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {client.offDay ? (
              <Chip tone="muted">Off day</Chip>
            ) : client.planAssigned ? (
              <Chip tone={client.workoutLogged ? 'success' : 'primary'}>
                {client.workoutLogged ? 'Workout done' : 'Plan set'}
              </Chip>
            ) : (
              <Chip tone="muted">No plan today</Chip>
            )}
            {client.mealCount > 0 && (
              <Chip tone="muted">
                {client.mealCount} meal{client.mealCount === 1 ? '' : 's'}
              </Chip>
            )}
            {sessionsText && <Chip tone="muted">{sessionsText}</Chip>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ClientAvatar({ photoUrl, initial }: { photoUrl: string | null; initial: string }) {
  const usable = photoUrl && /^https?:\/\//.test(photoUrl);
  if (usable) {
    return (
      <div className="relative size-12 shrink-0 overflow-hidden rounded-full bg-muted">
        <Image src={photoUrl} alt="" fill sizes="48px" className="object-cover" unoptimized />
      </div>
    );
  }
  return (
    <div className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-gradient text-base font-semibold text-[#0B0D10]">
      {initial}
    </div>
  );
}

function Chip({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: 'muted' | 'primary' | 'success' | 'warn';
}) {
  const classes: Record<typeof tone, string> = {
    muted: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/15 text-primary',
    success: 'bg-[#8AE9A0]/15 text-[#8AE9A0]',
    warn: 'bg-[#FFB454]/15 text-[#FFB454]',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${classes[tone]}`}>
      {children}
    </span>
  );
}

function ScheduleSkeleton() {
  return (
    <div className="grid gap-3">
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-4 py-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="size-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ClientGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Card key={i}>
          <CardContent className="flex items-center gap-3 py-4">
            <Skeleton className="size-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
