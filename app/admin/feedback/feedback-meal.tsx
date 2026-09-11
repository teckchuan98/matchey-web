'use client';

import Image from 'next/image';
import { useState } from 'react';

export type FeedbackMealContext = {
  mealType: string;
  logDate: string | null;
  kcal: number | null;
  description: string | null;
  imageUrls: string[];
  foods: { name: string; quantity: string; kcal: number }[];
};

export function FeedbackMeal({ meal }: { meal?: FeedbackMealContext | null }) {
  if (!meal) return <p className="mt-5 rounded-xl bg-neutral-50 p-4 text-sm text-neutral-500">The linked meal is unavailable. It may have been deleted; the report is still shown below.</p>;

  return <section aria-label="Reported meal" className="mt-5 rounded-xl border border-neutral-200 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-sm font-semibold text-neutral-900">Reported meal{meal.mealType ? ` · ${meal.mealType}` : ''}</h2>{meal.logDate && <p className="mt-1 text-xs text-neutral-500">{new Intl.DateTimeFormat('en-MY', { dateStyle: 'medium' }).format(new Date(`${meal.logDate}T12:00:00`))}</p>}</div>
      <div className="text-right"><div className="text-lg font-semibold tabular-nums text-neutral-900">{meal.kcal == null ? 'Calories unavailable' : `${new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 }).format(meal.kcal)} kcal`}</div><p className="text-xs text-neutral-500">Saved estimate</p></div>
    </div>
    <div className="mt-4 grid gap-5 md:grid-cols-2">
      <div className="space-y-3">
        {meal.imageUrls.length ? meal.imageUrls.map((url, index) => <MealPhoto key={url} url={url} index={index} />) : <div className="flex min-h-36 items-center justify-center rounded-lg bg-neutral-100 p-4 text-sm text-neutral-500">No meal photo available</div>}
      </div>
      <div className="min-w-0">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Food description</h3>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-neutral-800">{meal.description?.trim() || (meal.foods.length ? meal.foods.map(food => [food.quantity, food.name].filter(Boolean).join(' ')).join(', ') : 'No food description stored.')}</p>
        {meal.foods.length > 0 && <div className="mt-5"><h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Food breakdown</h3><ul className="mt-2 divide-y divide-neutral-100">{meal.foods.map((food, index) => <li key={index} className="flex items-start justify-between gap-3 py-2 text-sm"><div className="min-w-0"><div className="break-words text-neutral-800">{food.name}</div><div className="text-xs text-neutral-500">{food.quantity}</div></div><span className="shrink-0 tabular-nums text-neutral-600">{Math.round(food.kcal)} kcal</span></li>)}</ul></div>}
        <p className="mt-4 text-xs leading-5 text-neutral-400">Current saved meal values; later edits or recalculations may differ from the original report.</p>
      </div>
    </div>
  </section>;
}

function MealPhoto({ url, index }: { url: string; index: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className="rounded-lg bg-neutral-100 p-5 text-sm text-neutral-500">Photo {index + 1} could not be loaded. Refresh feedback to retry.</div>;
  return <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open meal photo ${index + 1} at full size`} className="block overflow-hidden rounded-lg bg-neutral-100">
    <Image src={url} alt={`Reported meal photo ${index + 1}`} width={800} height={600} unoptimized className="max-h-80 w-full object-contain" onError={() => setFailed(true)} />
  </a>;
}
