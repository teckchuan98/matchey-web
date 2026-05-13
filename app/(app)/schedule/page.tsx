'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  parse,
  startOfWeek,
  subDays,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Coffee, X } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveSchedule,
  createSchedule,
  deleteSchedule,
  listSchedules,
  listTrainerClients,
  type CreateScheduleRequest,
} from '@/lib/api/trainer';
import type { TrainerClientDto, TrainerScheduleDto } from '@/lib/types/trainer';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';

const START_HOUR = 6;
const END_HOUR = 24;
const SLOT_MINUTES = 30;
const SLOTS_PER_HOUR = 60 / SLOT_MINUTES;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const SLOT_HEIGHT = 28;
const TIME_AXIS_WIDTH = 56;
const DAYS_VISIBLE = 14;
const DEFAULT_TAP_SLOTS = 2; // 60 min on plain tap (no drag)
const LONG_PRESS_MS = 500;

type Mode = 'session' | 'quick' | 'unavailable';
type EventTone = 'pending' | 'session' | 'quick' | 'unavailable';

const TONE_BG: Record<EventTone, string> = {
  pending: 'bg-[#FF5C6A]/85',
  session: 'bg-[#4D8FFF]/85',
  quick: 'bg-[#FFB454]/90',
  unavailable: 'bg-[#A8B0BD]/25 border border-[#A8B0BD]/40',
};

const TONE_TEXT: Record<EventTone, string> = {
  pending: 'text-[#0B0D10]',
  session: 'text-[#0B0D10]',
  quick: 'text-[#0B0D10]',
  unavailable: 'text-foreground',
};

function eventTone(e: TrainerScheduleDto): EventTone {
  if (e.status === 'PENDING') return 'pending';
  if (e.isUnavailable) return 'unavailable';
  if (e.clientId) return 'session';
  return 'quick';
}

function modeTone(m: Mode): EventTone {
  return m === 'unavailable' ? 'unavailable' : m === 'quick' ? 'quick' : 'session';
}

function isoDate(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

function hhmmFromSlot(slotIdx: number): string {
  const total = START_HOUR * 60 + slotIdx * SLOT_MINUTES;
  if (total >= 24 * 60) return '23:59:59'; // LocalTime can't represent 24:00:00
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

function slotFromHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h * 60 + m - START_HOUR * 60) / SLOT_MINUTES;
}

function formatHourLabel(h: number): string {
  const d = new Date();
  d.setHours(h, 0, 0, 0);
  return format(d, 'ha').toLowerCase();
}

function formatTime12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return format(d, 'h:mma').toLowerCase();
}

export default function SchedulePage() {
  const queryClient = useQueryClient();

  // ─── Top-bar mode state ─────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('session');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [quickName, setQuickName] = useState('');

  const clients = useQuery({
    queryKey: ['trainer', 'linked-clients'],
    queryFn: listTrainerClients,
  });

  const canCreate =
    (mode === 'session' && selectedClientId !== '') ||
    (mode === 'quick' && quickName.trim().length > 0) ||
    mode === 'unavailable';

  // ─── Week navigation ────────────────────────────────────────────────
  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 }),
  );
  const days = useMemo(
    () => Array.from({ length: DAYS_VISIBLE }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // ─── Schedules ──────────────────────────────────────────────────────
  const schedules = useQuery({ queryKey: ['trainer', 'schedules'], queryFn: listSchedules });
  const byDay = useMemo(() => {
    const map = new Map<string, TrainerScheduleDto[]>();
    for (const e of schedules.data ?? []) {
      const arr = map.get(e.scheduleDate) ?? [];
      arr.push(e);
      map.set(e.scheduleDate, arr);
    }
    return map;
  }, [schedules.data]);

  // ─── Drag state ─────────────────────────────────────────────────────
  type Drag = { day: Date; startSlot: number; endSlot: number };
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  // ─── Mutations ──────────────────────────────────────────────────────
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['trainer', 'schedules'] });
  }, [queryClient]);

  const createM = useMutation({
    mutationFn: (req: CreateScheduleRequest) => createSchedule(req),
    onSuccess: () => invalidate(),
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not create.'),
  });

  const approveM = useMutation({
    mutationFn: approveSchedule,
    onSuccess: () => {
      invalidate();
      setActionEvent(null);
      toast.success('Approved.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not approve.'),
  });

  const deleteM = useMutation({
    mutationFn: deleteSchedule,
    onSuccess: () => {
      invalidate();
      setActionEvent(null);
      toast.success('Removed.');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not delete.'),
  });

  const buildCreatePayload = useCallback(
    (day: Date, startSlot: number, endSlot: number): CreateScheduleRequest => {
      const lo = Math.min(startSlot, endSlot);
      let hi = Math.max(startSlot, endSlot) + 1;
      // Plain tap (no drag) → expand to the default tap duration.
      if (hi - lo < DEFAULT_TAP_SLOTS) hi = lo + DEFAULT_TAP_SLOTS;
      hi = Math.min(hi, TOTAL_SLOTS);
      const startTime = hhmmFromSlot(lo);
      const endTime = hhmmFromSlot(hi);
      if (mode === 'unavailable') {
        return {
          scheduleDate: isoDate(day),
          startTime,
          endTime,
          isUnavailable: true,
        };
      }
      if (mode === 'quick') {
        return {
          scheduleDate: isoDate(day),
          startTime,
          endTime,
          isUnavailable: false,
          clientLabel: quickName.trim(),
        };
      }
      const client = clients.data?.find((c) => c.id === selectedClientId);
      return {
        scheduleDate: isoDate(day),
        startTime,
        endTime,
        isUnavailable: false,
        clientId: selectedClientId,
        clientLabel: client?.name ?? null,
      };
    },
    [mode, quickName, selectedClientId, clients.data],
  );

  const commitDrag = useCallback(() => {
    const d = dragRef.current;
    if (!d) return;
    if (!canCreate) {
      setDrag(null);
      return;
    }
    const payload = buildCreatePayload(d.day, d.startSlot, d.endSlot);
    createM.mutate(payload);
    setDrag(null);
  }, [buildCreatePayload, canCreate, createM]);

  // Global mouseup ends a drag — handles release outside the grid.
  useEffect(() => {
    const onUp = () => {
      if (dragRef.current) commitDrag();
    };
    window.addEventListener('mouseup', onUp);
    return () => window.removeEventListener('mouseup', onUp);
  }, [commitDrag]);

  const beginDrag = (day: Date, slotIdx: number) => {
    if (!canCreate) {
      toast.error(
        mode === 'session'
          ? 'Pick a client first.'
          : mode === 'quick'
            ? 'Enter a quick-client name first.'
            : 'Pick a mode first.',
      );
      return;
    }
    setDrag({ day, startSlot: slotIdx, endSlot: slotIdx });
  };

  const updateDrag = (day: Date, slotIdx: number) => {
    setDrag((prev) => {
      if (!prev || !isSameDay(prev.day, day)) return prev;
      return { ...prev, endSlot: slotIdx };
    });
  };

  // ─── Mark whole day off (long-press day header in Unavailable mode) ─
  const markDayOff = (day: Date) => {
    if (mode !== 'unavailable') return;
    const dayEvents = byDay.get(isoDate(day)) ?? [];
    const occupied = new Set<number>();
    for (const ev of dayEvents) {
      const a = Math.max(0, slotFromHHMM(ev.startTime));
      const b = Math.min(TOTAL_SLOTS, slotFromHHMM(ev.endTime));
      for (let s = a; s < b; s++) occupied.add(s);
    }
    // Build contiguous unoccupied ranges and POST each.
    const ranges: Array<[number, number]> = [];
    let runStart = -1;
    for (let s = 0; s < TOTAL_SLOTS; s++) {
      if (!occupied.has(s)) {
        if (runStart < 0) runStart = s;
      } else if (runStart >= 0) {
        ranges.push([runStart, s]);
        runStart = -1;
      }
    }
    if (runStart >= 0) ranges.push([runStart, TOTAL_SLOTS]);
    if (ranges.length === 0) {
      toast('Day already fully scheduled.');
      return;
    }
    Promise.all(
      ranges.map(([a, b]) =>
        createSchedule({
          scheduleDate: isoDate(day),
          startTime: hhmmFromSlot(a),
          endTime: hhmmFromSlot(b),
          isUnavailable: true,
        }),
      ),
    )
      .then(() => {
        invalidate();
        toast.success(`Marked ${format(day, 'EEE d')} off.`);
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : 'Could not mark off.'));
  };

  // ─── Action dialog state ────────────────────────────────────────────
  const [actionEvent, setActionEvent] = useState<TrainerScheduleDto | null>(null);

  const today = new Date();
  const rangeLabel = `${format(days[0], 'MMM d')} – ${format(days[DAYS_VISIBLE - 1], 'MMM d, yyyy')}`;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schedule</h1>
          <p className="text-sm text-muted-foreground">
            Tap a slot to create a 60-min block. Click-and-drag for a custom range. Long-press a day header (Unavailable mode) to mark the whole day off.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            disabled={isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }))}
          >
            Today
          </Button>
          <div className="inline-flex items-center rounded-md border border-border bg-card">
            <button
              type="button"
              onClick={() => setWeekStart(subDays(weekStart, DAYS_VISIBLE))}
              className="grid size-9 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Previous fortnight"
            >
              <ChevronLeft className="size-4" />
            </button>
            <div className="border-x border-border px-3 py-1.5 text-xs font-medium tabular-nums">
              {rangeLabel}
            </div>
            <button
              type="button"
              onClick={() => setWeekStart(addDays(weekStart, DAYS_VISIBLE))}
              className="grid size-9 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Next fortnight"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <ModeBar
        mode={mode}
        setMode={setMode}
        clients={clients.data ?? []}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
        quickName={quickName}
        setQuickName={setQuickName}
      />

      <div className="rounded-lg border border-border bg-card select-none">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${TIME_AXIS_WIDTH}px repeat(${DAYS_VISIBLE}, minmax(0, 1fr))`,
          }}
        >
          {/* Header row */}
          <div className="sticky top-0 z-10 border-b border-border bg-card" />
          {days.map((d) => (
            <DayHeader
              key={d.toISOString()}
              day={d}
              isToday={isSameDay(d, today)}
              longPressEnabled={mode === 'unavailable'}
              onLongPress={() => markDayOff(d)}
            />
          ))}

          {/* Time axis */}
          <TimeAxis />

          {/* Day columns */}
          {days.map((d) => {
            const events = byDay.get(isoDate(d)) ?? [];
            const isDraggingHere = drag && isSameDay(drag.day, d);
            return (
              <DayColumn
                key={d.toISOString()}
                day={d}
                isToday={isSameDay(d, today)}
                events={events}
                onEmptyMouseDown={(s) => beginDrag(d, s)}
                onEmptyMouseMove={(s) => updateDrag(d, s)}
                onEventClick={(e) => setActionEvent(e)}
                dragSpan={
                  isDraggingHere
                    ? {
                        startSlot: Math.min(drag!.startSlot, drag!.endSlot),
                        endSlot: Math.max(drag!.startSlot, drag!.endSlot) + 1,
                        tone: modeTone(mode),
                      }
                    : null
                }
              />
            );
          })}
        </div>
      </div>

      {actionEvent && (
        <EventActionDialog
          event={actionEvent}
          onClose={() => setActionEvent(null)}
          onApprove={() => approveM.mutate(actionEvent.id)}
          onDelete={() => deleteM.mutate(actionEvent.id)}
          working={approveM.isPending || deleteM.isPending}
        />
      )}
    </div>
  );
}

function ModeBar({
  mode,
  setMode,
  clients,
  selectedClientId,
  setSelectedClientId,
  quickName,
  setQuickName,
}: {
  mode: Mode;
  setMode: (m: Mode) => void;
  clients: TrainerClientDto[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  quickName: string;
  setQuickName: (s: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-3">
      <div className="inline-flex rounded-md border border-border bg-background p-0.5">
        <ModeButton tone="session" active={mode === 'session'} onClick={() => setMode('session')}>
          Session
        </ModeButton>
        <ModeButton tone="quick" active={mode === 'quick'} onClick={() => setMode('quick')}>
          Quick name
        </ModeButton>
        <ModeButton
          tone="unavailable"
          active={mode === 'unavailable'}
          onClick={() => setMode('unavailable')}
        >
          Unavailable
        </ModeButton>
      </div>

      {mode === 'session' && (
        <div className="flex items-center gap-2">
          <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v ?? '')}>
            <SelectTrigger className="min-w-[200px]">
              <SelectValue placeholder="Pick a client" />
            </SelectTrigger>
            <SelectContent>
              {clients.length === 0 && (
                <div className="px-2 py-1.5 text-xs text-muted-foreground">No clients linked.</div>
              )}
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name ?? c.email ?? c.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {mode === 'quick' && (
        <Input
          placeholder="Quick client name"
          value={quickName}
          onChange={(e) => setQuickName(e.target.value)}
          className="max-w-[240px]"
        />
      )}

      {mode === 'unavailable' && (
        <span className="text-xs text-muted-foreground">
          Tap/drag to create off blocks. Long-press a day header to mark the whole day off.
        </span>
      )}
    </div>
  );
}

function ModeButton({
  tone,
  active,
  onClick,
  children,
}: {
  tone: EventTone;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const accent: Record<EventTone, string> = {
    pending: '',
    session: 'data-[active=true]:bg-[#4D8FFF]/15 data-[active=true]:text-[#4D8FFF]',
    quick: 'data-[active=true]:bg-[#FFB454]/15 data-[active=true]:text-[#FFB454]',
    unavailable: 'data-[active=true]:bg-muted data-[active=true]:text-foreground',
  };
  return (
    <button
      type="button"
      data-active={active}
      onClick={onClick}
      className={`rounded px-3 py-1.5 text-xs font-semibold transition-colors ${accent[tone]} ${
        active ? '' : 'text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  );
}

function DayHeader({
  day,
  isToday,
  longPressEnabled,
  onLongPress,
}: {
  day: Date;
  isToday: boolean;
  longPressEnabled: boolean;
  onLongPress: () => void;
}) {
  const timerRef = useRef<number | null>(null);
  const firedRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleDown = () => {
    if (!longPressEnabled) return;
    firedRef.current = false;
    timerRef.current = window.setTimeout(() => {
      firedRef.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  };

  const handleUp = () => clearTimer();

  return (
    <div
      onMouseDown={handleDown}
      onMouseUp={handleUp}
      onMouseLeave={handleUp}
      className={`sticky top-0 z-10 border-b border-l border-border px-2 py-2 text-center transition-colors ${
        longPressEnabled ? 'cursor-pointer hover:bg-[#A8B0BD]/10' : ''
      } ${isToday ? 'bg-primary/10' : 'bg-card'}`}
    >
      <div
        className={`text-[10px] font-semibold uppercase tracking-wider ${
          isToday ? 'text-primary' : 'text-muted-foreground'
        }`}
      >
        {format(day, 'EEE')}
      </div>
      <div className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
        {format(day, 'd')}
      </div>
    </div>
  );
}

function TimeAxis() {
  // One label per hour line, including the trailing midnight at the bottom.
  const hours = useMemo(
    () => Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i),
    [],
  );
  return (
    <div
      className="relative border-r border-border bg-card"
      style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
    >
      {hours.map((h) => (
        <span
          key={h}
          className="absolute right-2 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
          style={{ top: (h - START_HOUR) * SLOTS_PER_HOUR * SLOT_HEIGHT }}
        >
          {formatHourLabel(h)}
        </span>
      ))}
    </div>
  );
}

function DayColumn({
  day,
  isToday,
  events,
  onEmptyMouseDown,
  onEmptyMouseMove,
  onEventClick,
  dragSpan,
}: {
  day: Date;
  isToday: boolean;
  events: TrainerScheduleDto[];
  onEmptyMouseDown: (slotIdx: number) => void;
  onEmptyMouseMove: (slotIdx: number) => void;
  onEventClick: (e: TrainerScheduleDto) => void;
  dragSpan: { startSlot: number; endSlot: number; tone: EventTone } | null;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const slotAt = (clientY: number): number => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const y = clientY - rect.top;
    return Math.max(0, Math.min(TOTAL_SLOTS - 1, Math.floor(y / SLOT_HEIGHT)));
  };

  return (
    <div
      ref={containerRef}
      className={`relative cursor-pointer border-l border-border ${
        isToday ? 'bg-primary/[0.04]' : ''
      }`}
      style={{ height: TOTAL_SLOTS * SLOT_HEIGHT }}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        // Don't start a drag if mousedown landed on an event button.
        if ((e.target as HTMLElement).closest('[data-event="1"]')) return;
        onEmptyMouseDown(slotAt(e.clientY));
      }}
      onMouseMove={(e) => onEmptyMouseMove(slotAt(e.clientY))}
    >
      {/* Hour grid lines */}
      {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
        <div
          key={i}
          className="pointer-events-none absolute left-0 right-0 border-t border-border/60"
          style={{ top: (i + 1) * SLOTS_PER_HOUR * SLOT_HEIGHT - 1 }}
        />
      ))}
      {/* 30-min subtle lines */}
      {Array.from({ length: END_HOUR - START_HOUR }).map((_, i) => (
        <div
          key={`half-${i}`}
          className="pointer-events-none absolute left-0 right-0 border-t border-border/25"
          style={{ top: (i + 0.5) * SLOTS_PER_HOUR * SLOT_HEIGHT - 0.5 }}
        />
      ))}

      {/* Drag preview (shows custom range OR snaps to default tap duration) */}
      {dragSpan && (
        <div
          className={`pointer-events-none absolute left-0.5 right-0.5 rounded-sm opacity-60 ${TONE_BG[dragSpan.tone]}`}
          style={{
            top: dragSpan.startSlot * SLOT_HEIGHT,
            height:
              Math.max(dragSpan.endSlot - dragSpan.startSlot, DEFAULT_TAP_SLOTS) * SLOT_HEIGHT,
          }}
        />
      )}

      {/* Events */}
      {events.map((ev) => {
        const start = slotFromHHMM(ev.startTime);
        const end = slotFromHHMM(ev.endTime);
        if (end <= 0 || start >= TOTAL_SLOTS) return null;
        const clampedStart = Math.max(0, start);
        const clampedEnd = Math.min(TOTAL_SLOTS, end);
        const tone = eventTone(ev);
        const title = ev.isUnavailable
          ? 'Off'
          : ev.clientName ?? ev.clientLabel ?? 'Open block';
        return (
          <button
            key={ev.id}
            type="button"
            data-event="1"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(ev);
            }}
            className={`absolute left-0.5 right-0.5 overflow-hidden rounded-sm px-1.5 py-1 text-left text-[10px] font-semibold leading-tight transition-colors ${TONE_BG[tone]} ${TONE_TEXT[tone]}`}
            style={{
              top: clampedStart * SLOT_HEIGHT,
              height: (clampedEnd - clampedStart) * SLOT_HEIGHT,
            }}
            title={`${title} · ${formatTime12(ev.startTime)} – ${formatTime12(ev.endTime)}`}
          >
            {ev.isUnavailable ? (
              <div className="flex items-center gap-1">
                <Coffee className="size-3" />
                <span className="truncate">Off</span>
              </div>
            ) : (
              <div className="truncate">{title}</div>
            )}
            {clampedEnd - clampedStart >= 2 && (
              <div className="truncate text-[9px] font-medium opacity-80">
                {formatTime12(ev.startTime).replace(':00', '')}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function EventActionDialog({
  event,
  onClose,
  onApprove,
  onDelete,
  working,
}: {
  event: TrainerScheduleDto;
  onClose: () => void;
  onApprove: () => void;
  onDelete: () => void;
  working: boolean;
}) {
  const isPending = event.status === 'PENDING';
  const day = parse(event.scheduleDate, 'yyyy-MM-dd', new Date());
  const title = event.isUnavailable
    ? 'Unavailable block'
    : event.clientName ?? event.clientLabel ?? 'Open block';

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isPending ? 'Session request' : title}</DialogTitle>
          <DialogDescription>
            {format(day, 'EEEE, MMMM d')} · {formatTime12(event.startTime)} –{' '}
            {formatTime12(event.endTime)}
          </DialogDescription>
        </DialogHeader>

        {isPending && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium">
              {event.requestedByClientName ?? event.clientName ?? 'Client'}
            </div>
            <div className="text-muted-foreground text-xs mt-0.5">
              Requested a session on this slot.
            </div>
          </div>
        )}

        {event.agenda && !isPending && (
          <p className="text-sm text-muted-foreground">{event.agenda}</p>
        )}

        <DialogFooter>
          {isPending ? (
            <>
              <Button variant="outline" onClick={onDelete} disabled={working}>
                <X className="mr-1 size-4" /> Reject
              </Button>
              <Button onClick={onApprove} disabled={working}>
                {working ? 'Working…' : 'Approve'}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={onClose} disabled={working}>
                Close
              </Button>
              <Button variant="destructive" onClick={onDelete} disabled={working}>
                {working ? 'Removing…' : 'Delete block'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

