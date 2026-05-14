'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ChevronDown, Dumbbell, Pencil, Search, SlidersHorizontal, Timer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  addTrainerLibraryExercise,
  deleteTrainerLibraryExercise,
  listTrainerLibrary,
  searchExerciseLibrary,
  updateTrainerLibraryExercise,
} from '@/lib/api/trainer';
import type {
  ExerciseLibraryItemDto,
  TrainerLibraryExerciseDto,
  TrainerLibraryExerciseRequest,
} from '@/lib/types/trainer';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Constants ────────────────────────────────────────────────────────────────

const TIMER_TAG = ' [timer]';
const SECS_PER_MIN = 60;

const BODY_PARTS: Array<{ key: string; label: string }> = [
  { key: 'chest', label: 'Chest' },
  { key: 'back', label: 'Back' },
  { key: 'upper arms', label: 'Arms' },
  { key: 'upper legs', label: 'Legs' },
  { key: 'waist', label: 'Core' },
  { key: 'shoulders', label: 'Shoulders' },
  { key: 'lower legs', label: 'Calves' },
  { key: 'lower arms', label: 'Forearms' },
  { key: 'cardio', label: 'Cardio' },
  { key: 'neck', label: 'Neck' },
];

// ─── Form helpers ─────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  exerciseRef: string | null;
  gifUrl: string | null;
  instructions: string[];
  defaultSets: number;
  perSetReps: number[];             // minutes when isTimer
  perSetWeights: (number | null)[]; // null = bodyweight
  isTimer: boolean;
  weightUnit: 'kg' | 'lb';
}

const EMPTY_FORM: FormState = {
  name: '',
  exerciseRef: null,
  gifUrl: null,
  instructions: [],
  defaultSets: 3,
  perSetReps: [10, 10, 10],
  perSetWeights: [null, null, null],
  isTimer: false,
  weightUnit: 'kg',
};

function parseName(raw: string): { baseName: string; isTimer: boolean } {
  return raw.endsWith(TIMER_TAG)
    ? { baseName: raw.slice(0, -TIMER_TAG.length), isTimer: true }
    : { baseName: raw, isTimer: false };
}

function exerciseToForm(e: TrainerLibraryExerciseDto): FormState {
  const { baseName, isTimer } = parseName(e.name);
  const sets = e.defaultSets;
  const baseReps = isTimer ? e.defaultReps / SECS_PER_MIN : e.defaultReps;

  const perSetReps =
    e.perSetReps && e.perSetReps.length === sets
      ? e.perSetReps.map((r) => (isTimer ? r / SECS_PER_MIN : r))
      : Array<number>(sets).fill(baseReps);

  const perSetWeights =
    e.perSetWeights && e.perSetWeights.length === sets
      ? e.perSetWeights.map((w) => w ?? null)
      : Array<number | null>(sets).fill(e.defaultWeight ?? null);

  return {
    name: baseName,
    exerciseRef: e.exerciseRef,
    gifUrl: e.gifUrl,
    instructions: e.instructions ?? [],
    defaultSets: sets,
    perSetReps,
    perSetWeights,
    isTimer,
    weightUnit: e.weightUnit === 'lb' ? 'lb' : 'kg',
  };
}

function formToRequest(f: FormState): TrainerLibraryExerciseRequest {
  const storedName = f.isTimer ? f.name.trim() + TIMER_TAG : f.name.trim();
  const toStoredReps = (r: number) =>
    f.isTimer ? Math.max(1, Math.round(r * SECS_PER_MIN)) : Math.max(1, Math.round(r));

  const perSetReps = f.perSetReps.map(toStoredReps);

  return {
    name: storedName,
    category: null,
    exerciseRef: f.exerciseRef || null,
    gifUrl: f.gifUrl || null,
    instructions: f.instructions,
    defaultSets: f.defaultSets,
    defaultReps: perSetReps[0] ?? 10,          // first set — mobile compat
    defaultWeight: f.perSetWeights[0] ?? null, // first set — mobile compat
    weightUnit: f.weightUnit,
    sequentialWeight: false,
    perSetReps,
    perSetWeights: f.perSetWeights,
  };
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LibraryPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TrainerLibraryExerciseDto | null>(null);

  const library = useQuery({ queryKey: ['trainer', 'library'], queryFn: listTrainerLibrary });

  const invalidate = useCallback(
    () => queryClient.invalidateQueries({ queryKey: ['trainer', 'library'] }),
    [queryClient],
  );

  const addM = useMutation({
    mutationFn: addTrainerLibraryExercise,
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success('Exercise added.'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not add.'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, req }: { id: string; req: TrainerLibraryExerciseRequest }) =>
      updateTrainerLibraryExercise(id, req),
    onSuccess: () => { invalidate(); setDialogOpen(false); toast.success('Saved.'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not save.'),
  });

  const deleteM = useMutation({
    mutationFn: deleteTrainerLibraryExercise,
    onSuccess: () => { invalidate(); toast.success('Removed.'); },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not delete.'),
  });

  const exercises = library.data ?? [];

  const openAdd = () => { setEditTarget(null); setDialogOpen(true); };
  const openEdit = (ex: TrainerLibraryExerciseDto) => { setEditTarget(ex); setDialogOpen(true); };

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exercise Library</h1>
          <p className="text-sm text-muted-foreground">
            {library.isLoading ? 'Loading…' : `${exercises.length} saved`}
          </p>
        </div>
        <Button onClick={openAdd} className="gap-1.5">
          <span className="text-lg leading-none">+</span> Add Exercise
        </Button>
      </header>

      {library.isLoading ? (
        <LoadingSkeleton />
      ) : exercises.length === 0 ? (
        <EmptyState onAdd={openAdd} />
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {exercises.map((ex) => (
            <ExerciseCard
              key={ex.id}
              exercise={ex}
              onEdit={() => openEdit(ex)}
              onDelete={() => deleteM.mutate(ex.id)}
              deleting={deleteM.isPending && deleteM.variables === ex.id}
            />
          ))}
        </div>
      )}

      <ExerciseDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        editTarget={editTarget}
        onSave={(form) => {
          const req = formToRequest(form);
          if (editTarget) updateM.mutate({ id: editTarget.id, req });
          else addM.mutate(req);
        }}
        saving={addM.isPending || updateM.isPending}
      />
    </div>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

function ExerciseCard({
  exercise: ex,
  onEdit,
  onDelete,
  deleting,
}: {
  exercise: TrainerLibraryExerciseDto;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { baseName, isTimer } = parseName(ex.name);
  const toDisplay = (r: number) => (isTimer ? +(r / SECS_PER_MIN).toFixed(2) : r);

  const repsArr =
    ex.perSetReps && ex.perSetReps.length === ex.defaultSets
      ? ex.perSetReps.map(toDisplay)
      : Array<number>(ex.defaultSets).fill(toDisplay(ex.defaultReps));

  const weightsArr =
    ex.perSetWeights && ex.perSetWeights.length === ex.defaultSets
      ? ex.perSetWeights
      : Array<number | null>(ex.defaultSets).fill(ex.defaultWeight ?? null);

  return (
    <div className="group rounded-xl border border-border bg-card px-4 py-3.5 transition-shadow hover:shadow-sm">
      {/* Top row: gif + name + actions */}
      <div className="flex items-start gap-3">
        {ex.gifUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ex.gifUrl} alt={baseName} className="size-11 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Dumbbell className="size-4 text-muted-foreground/40" />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {isTimer && <Timer className="size-3 shrink-0 text-muted-foreground" />}
            <span className="truncate text-sm font-semibold">{baseName}</span>
            {ex.exerciseRef && (
              <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[9px] font-bold uppercase tracking-wider text-primary">
                DB
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Per-set breakdown */}
      <div className="mt-2.5 flex flex-wrap gap-1.5 pl-14">
        {repsArr.map((reps, i) => {
          const w = weightsArr[i];
          const repStr = isTimer ? `${reps} min` : `${reps} reps`;
          const weightStr = w != null && w > 0 ? ` · ${w} ${ex.weightUnit}` : '';
          return (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs tabular-nums"
            >
              <span className="font-semibold text-foreground/60">S{i + 1}</span>
              <span className="text-foreground">{repStr}{weightStr}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

// ─── Exercise Dialog ───────────────────────────────────────────────────────────

type Step = 'find' | 'defaults';

function ExerciseDialog({
  open,
  onClose,
  editTarget,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  editTarget: TrainerLibraryExerciseDto | null;
  onSave: (form: FormState) => void;
  saving: boolean;
}) {
  const [step, setStep] = useState<Step>('find');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));

  useEffect(() => {
    if (open) {
      if (editTarget) {
        setForm(exerciseToForm(editTarget));
        setStep('defaults');
      } else {
        setForm(EMPTY_FORM);
        setStep('find');
      }
    }
  }, [open, editTarget]);

  const handlePick = (
    name: string,
    exerciseRef?: string,
    gifUrl?: string,
    instructions?: string[],
  ) => {
    patch({ name, exerciseRef: exerciseRef ?? null, gifUrl: gifUrl ?? null, instructions: instructions ?? [] });
    setStep('defaults');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="p-0 sm:max-w-2xl [&>button]:hidden">
        {step === 'find' ? (
          <FindStep onPick={handlePick} onClose={onClose} />
        ) : (
          <DefaultsStep
            form={form}
            patch={patch}
            isEdit={!!editTarget}
            onBack={() => { if (!editTarget) setStep('find'); }}
            onSave={() => onSave(form)}
            onClose={onClose}
            saving={saving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Step 1: Find exercise ────────────────────────────────────────────────────

function FindStep({
  onPick,
  onClose,
}: {
  onPick: (name: string, exerciseRef?: string, gifUrl?: string, instructions?: string[]) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [bodyPart, setBodyPart] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleQuery = (v: string) => {
    setQuery(v);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setDebounced(v), 350);
  };

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const results = useInfiniteQuery({
    queryKey: ['exercise-library', debounced, bodyPart],
    queryFn: ({ pageParam }) =>
      searchExerciseLibrary({ query: debounced, bodyPart: bodyPart ?? undefined, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasNextPage ? (last.nextCursor ?? undefined) : undefined),
    staleTime: 1000 * 60 * 5,
  });

  const items = results.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pb-3 pt-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Step 1 of 2
        </p>
        <h2 className="mt-0.5 text-xl font-bold tracking-tight">Find your exercise</h2>
      </div>

      {/* Search + inline filter */}
      <div className="shrink-0 px-6 pb-4">
        <div className="relative flex items-center">
          <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) onPick(query.trim());
            }}
            placeholder="Search or type exercise name…"
            className="h-11 pl-10 pr-28 text-sm"
          />
          <BodyPartFilter value={bodyPart} onChange={setBodyPart} />
        </div>
      </div>

      {/* Results grid — 4 columns, scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 pb-3">
        {results.isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : items.length > 0 ? (
          <>
            <div className="grid grid-cols-4 gap-2">
              {items.map((item) => (
                <ExerciseGridCell
                  key={item.id}
                  item={item}
                  onPick={() => onPick(item.name, item.id, item.mediaUrl ?? undefined, item.instructions)}
                />
              ))}
            </div>
            {results.hasNextPage && (
              <button
                type="button"
                onClick={() => results.fetchNextPage()}
                disabled={results.isFetchingNextPage}
                className="mt-3 w-full rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
              >
                {results.isFetchingNextPage ? 'Loading…' : 'Load more'}
              </button>
            )}
          </>
        ) : results.isError ? (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">Library unavailable — type a name to continue.</p>
          </div>
        ) : (
          <div className="flex h-36 items-center justify-center rounded-xl border border-dashed border-border">
            <p className="text-sm text-muted-foreground">No results.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
        {query.trim() ? (
          <button
            type="button"
            onClick={() => onPick(query.trim())}
            className="text-sm font-medium text-primary hover:underline"
          >
            Add &ldquo;{query.trim()}&rdquo; →
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">
            Pick from the library or type a name above
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function ExerciseGridCell({ item, onPick }: { item: ExerciseLibraryItemDto; onPick: () => void }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!item.mediaUrl && !imgFailed;

  return (
    <button
      type="button"
      onClick={onPick}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card text-left transition-all hover:border-primary/40 hover:shadow-md"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.mediaUrl!}
          alt={item.name}
          className="h-32 w-full object-cover transition-transform group-hover:scale-[1.03]"
          loading="lazy"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="flex h-32 w-full items-center justify-center bg-muted">
          <Dumbbell className="size-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="px-2.5 py-2">
        <p className="truncate text-xs font-semibold capitalize leading-tight">{item.name}</p>
        <p className="mt-0.5 truncate text-[10px] capitalize text-muted-foreground">
          {[item.bodyPart, item.target].filter(Boolean).join(' · ')}
        </p>
      </div>
    </button>
  );
}

// ─── Step 2: Set defaults ─────────────────────────────────────────────────────

function DefaultsStep({
  form,
  patch,
  isEdit,
  onBack,
  onSave,
  onClose,
  saving,
}: {
  form: FormState;
  patch: (p: Partial<FormState>) => void;
  isEdit: boolean;
  onBack: () => void;
  onSave: () => void;
  onClose: () => void;
  saving: boolean;
}) {
  const valid = form.name.trim().length > 0;

  const handleSetsChange = (newSets: number) => {
    const current = form.perSetReps.length;
    if (newSets > current) {
      const lastReps = form.perSetReps[current - 1] ?? (form.isTimer ? 1 : 10);
      const lastWeight = form.perSetWeights[current - 1] ?? null;
      patch({
        defaultSets: newSets,
        perSetReps: [...form.perSetReps, ...Array<number>(newSets - current).fill(lastReps)],
        perSetWeights: [...form.perSetWeights, ...Array<number | null>(newSets - current).fill(lastWeight)],
      });
    } else {
      patch({
        defaultSets: newSets,
        perSetReps: form.perSetReps.slice(0, newSets),
        perSetWeights: form.perSetWeights.slice(0, newSets),
      });
    }
  };

  const handleTimerToggle = () => {
    const newIsTimer = !form.isTimer;
    patch({ isTimer: newIsTimer, perSetReps: form.perSetReps.map(() => (newIsTimer ? 1 : 10)) });
  };

  const updateSetReps = (i: number, v: number) => {
    const next = [...form.perSetReps];
    next[i] = v;
    patch({ perSetReps: next });
  };

  const updateSetWeight = (i: number, v: number | null) => {
    const next = [...form.perSetWeights];
    next[i] = v;
    patch({ perSetWeights: next });
  };

  return (
    <div className="flex max-h-[85vh] flex-col">
      {/* Header */}
      <div className="shrink-0 px-6 pb-4 pt-6">
        {!isEdit && (
          <button
            type="button"
            onClick={onBack}
            className="mb-3 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> Back
          </button>
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {isEdit ? 'Edit exercise' : 'Step 2 of 2'}
        </p>
        <input
          value={form.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="Exercise name"
          className="mt-1 w-full bg-transparent text-xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40"
          autoFocus={isEdit}
        />
        {form.gifUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.gifUrl}
            alt={form.name}
            className="mt-4 h-48 w-full rounded-xl bg-muted object-contain"
          />
        )}
      </div>

      {/* Controls bar: Sets stepper + Timer + Unit */}
      <div className="shrink-0 flex items-center gap-4 border-y border-border px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-medium">Sets</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleSetsChange(clamp(form.defaultSets - 1, 1, 20))}
              disabled={form.defaultSets <= 1}
              className="grid size-7 place-items-center rounded-full border border-border bg-background text-sm font-light text-foreground transition-colors hover:bg-muted disabled:opacity-30"
            >
              −
            </button>
            <span className="w-6 text-center text-sm font-bold tabular-nums">{form.defaultSets}</span>
            <button
              type="button"
              onClick={() => handleSetsChange(clamp(form.defaultSets + 1, 1, 20))}
              disabled={form.defaultSets >= 20}
              className="grid size-7 place-items-center rounded-full border border-border bg-background text-sm font-light text-foreground transition-colors hover:bg-muted disabled:opacity-30"
            >
              +
            </button>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          {/* Timer toggle */}
          <button
            type="button"
            onClick={handleTimerToggle}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              form.isTimer
                ? 'border-primary/40 bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted'
            }`}
          >
            <Timer className="size-3.5" />
            {form.isTimer ? 'Timer on' : 'Timer'}
          </button>

          {/* Unit toggle */}
          <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
            {(['kg', 'lb'] as const).map((u) => (
              <button
                key={u}
                type="button"
                onClick={() => patch({ weightUnit: u })}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-colors ${
                  form.weightUnit === u
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {u}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Per-set table — scrollable */}
      <div className="min-h-0 flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-6 py-3">
        {/* Column headers */}
        <div className="mb-1.5 grid grid-cols-[2.5rem_1fr_1fr] gap-3 px-4">
          <div />
          <p className="text-center text-xs font-medium text-muted-foreground">
            {form.isTimer ? 'Minutes' : 'Reps'}
          </p>
          <p className="text-center text-xs font-medium text-muted-foreground">
            Weight ({form.weightUnit})
          </p>
        </div>

        <div className="space-y-1.5">
          {form.perSetReps.map((reps, i) => (
            <SetRow
              key={i}
              index={i}
              reps={reps}
              weight={form.perSetWeights[i] ?? null}
              isTimer={form.isTimer}
              onRepsChange={(v) => updateSetReps(i, v)}
              onWeightChange={(v) => updateSetWeight(i, v)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between border-t border-border px-6 py-4">
        <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={onSave} disabled={!valid || saving} className="min-w-32">
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add exercise'}
        </Button>
      </div>
    </div>
  );
}

// ─── Set Row ──────────────────────────────────────────────────────────────────

function SetRow({
  index,
  reps,
  weight,
  isTimer,
  onRepsChange,
  onWeightChange,
}: {
  index: number;
  reps: number;
  weight: number | null;
  isTimer: boolean;
  onRepsChange: (v: number) => void;
  onWeightChange: (v: number | null) => void;
}) {
  const repMin = isTimer ? 0.5 : 1;
  const repMax = isTimer ? 60 : 999;
  const repStep = isTimer ? 0.5 : 1;

  // Local string state lets the user clear the field and retype freely.
  // Syncs back from parent only when the stepper changes reps externally.
  const [repsInput, setRepsInput] = useState(String(reps));
  const repsInputRef = useRef(repsInput);
  repsInputRef.current = repsInput;

  useEffect(() => {
    const parsed = parseFloat(repsInputRef.current);
    if (parsed !== reps) setRepsInput(String(reps));
  }, [reps]);

  const handleRepsInput = (v: string) => {
    setRepsInput(v);
    const parsed = parseFloat(v);
    if (!isNaN(parsed)) onRepsChange(clamp(+parsed.toFixed(2), repMin, repMax));
  };

  const commitReps = () => {
    const parsed = parseFloat(repsInput);
    const valid = isNaN(parsed) ? repMin : clamp(+parsed.toFixed(2), repMin, repMax);
    setRepsInput(String(valid));
    onRepsChange(valid);
  };

  const inputCls =
    'w-16 rounded-lg bg-background px-2 py-1.5 text-center text-sm font-semibold tabular-nums outline-none ring-1 ring-border placeholder:text-muted-foreground/50 focus:ring-primary [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

  return (
    <div className="grid grid-cols-[2.5rem_1fr_1fr] items-center gap-3 rounded-xl bg-muted/40 px-4 py-2.5">
      <span className="text-xs font-semibold text-muted-foreground">S{index + 1}</span>

      {/* Reps — stepper + manual input */}
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => onRepsChange(clamp(+(reps - repStep).toFixed(2), repMin, repMax))}
          disabled={reps <= repMin}
          className="grid size-7 place-items-center rounded-full border border-border bg-background text-sm font-light transition-colors hover:bg-muted disabled:opacity-30"
        >
          −
        </button>
        <input
          type="number"
          value={repsInput}
          onChange={(e) => handleRepsInput(e.target.value)}
          onBlur={commitReps}
          min={repMin}
          max={repMax}
          step={repStep}
          className={inputCls}
        />
        <button
          type="button"
          onClick={() => onRepsChange(clamp(+(reps + repStep).toFixed(2), repMin, repMax))}
          disabled={reps >= repMax}
          className="grid size-7 place-items-center rounded-full border border-border bg-background text-sm font-light transition-colors hover:bg-muted disabled:opacity-30"
        >
          +
        </button>
      </div>

      {/* Weight — direct input */}
      <div className="flex items-center justify-center">
        <input
          type="number"
          value={weight ?? ''}
          onChange={(e) => {
            const v = e.target.value;
            onWeightChange(v === '' ? null : Math.max(0, Number(v)));
          }}
          placeholder="BW"
          className={inputCls}
          min={0}
          step={2.5}
        />
      </div>
    </div>
  );
}

// ─── Body-part filter dropdown ────────────────────────────────────────────────

function BodyPartFilter({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const activeLabel = value
    ? (BODY_PARTS.find((bp) => bp.key === value)?.label ?? 'Filter')
    : 'All';

  return (
    <div ref={ref} className="absolute right-1.5 top-1/2 -translate-y-1/2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
          value
            ? 'border-primary/40 bg-primary/10 text-primary'
            : 'border-border bg-background text-muted-foreground hover:bg-muted'
        }`}
      >
        <SlidersHorizontal className="size-3" />
        {activeLabel}
        <ChevronDown className={`size-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-40 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <div className="p-1">
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className={`w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted ${
                !value ? 'text-primary' : 'text-foreground'
              }`}
            >
              All muscles
            </button>
            {BODY_PARTS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => { onChange(value === key ? null : key); setOpen(false); }}
                className={`w-full rounded-lg px-3 py-1.5 text-left text-xs font-medium transition-colors hover:bg-muted ${
                  value === key ? 'text-primary' : 'text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared components ────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-muted">
        <Dumbbell className="size-7 text-muted-foreground/50" />
      </div>
      <p className="font-semibold">Your library is empty</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">
        Save your go-to exercises here. Pull from the ExerciseDB or add your own.
      </p>
      <Button onClick={onAdd} className="mt-6" size="sm">
        Add your first exercise
      </Button>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="flex items-start gap-3">
            <Skeleton className="size-11 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-1.5 pt-0.5">
              <Skeleton className="h-3.5 w-2/5" />
            </div>
          </div>
          <div className="mt-2.5 flex gap-1.5 pl-14">
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
