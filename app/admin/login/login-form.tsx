'use client';

import { FormEvent, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json()) as { message?: string };
      if (!response.ok) throw new Error(body.message ?? 'Could not sign in.');
      router.replace('/admin'); router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally { setLoading(false); }
  }

  return (
    <main className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white p-7 shadow-xl shadow-black/5">
        <div className="flex items-center gap-3">
          <Image src="/brand/logo.png" width={42} height={42} alt="Fittel" className="rounded-xl" priority />
          <div><div className="font-bold">Fittel</div><div className="text-xs text-neutral-500">Private analytics</div></div>
        </div>
        <h1 className="mt-8 text-2xl font-bold tracking-tight">See what users actually do.</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">This area is restricted to the Fittel owner.</p>
        <label className="mt-7 block text-xs font-semibold uppercase tracking-wider text-neutral-500" htmlFor="password">Admin password</label>
        <input id="password" type="password" autoFocus autoComplete="current-password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 outline-none transition focus:border-[#4D8FFF] focus:ring-4 focus:ring-[#4D8FFF]/10" />
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <button disabled={loading || !password} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#111318] font-semibold text-white transition hover:bg-black disabled:opacity-50">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <>Continue <ArrowRight className="size-4" /></>}
        </button>
      </form>
    </main>
  );
}
