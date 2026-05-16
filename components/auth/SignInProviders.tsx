'use client';

import { useState, type ReactNode } from 'react';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/auth/firebase';
import { sendEmailCode, verifyEmailCode } from '@/lib/auth/emailSession';
import { ApiError } from '@/lib/api/client';

type EmailStep = 'idle' | 'enter-email' | 'enter-code';

// Light surface = white dialog/card on the marketing site.
// Other variants kept so existing callers continue to type-check.
type Surface = 'card' | 'popover' | 'light';

const PRIMARY_BTN =
  'inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md bg-[#4D8FFF] px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-[#4D8FFF]/90 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100';
const GHOST_BTN =
  'inline-flex h-10 w-full cursor-pointer items-center justify-center rounded-md px-4 text-sm font-semibold text-neutral-700 transition-transform hover:scale-[1.03] hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100';
const INPUT_CLS =
  'h-10 w-full rounded-md border border-neutral-300 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-[#4D8FFF] focus:outline-none focus:ring-2 focus:ring-[#4D8FFF]/30 disabled:opacity-50';

export function SignInProviders({ surface = 'light' }: { surface?: Surface }) {
  const configured = isFirebaseConfigured();
  const [busy, setBusy] = useState<null | 'google' | 'apple' | 'send' | 'verify'>(null);
  const [emailStep, setEmailStep] = useState<EmailStep>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  // The little "or" pill needs to match whatever surface the divider sits on.
  const dividerBg =
    surface === 'popover' ? 'bg-popover' : surface === 'card' ? 'bg-card' : 'bg-white';

  const signInWith = async (kind: 'google' | 'apple') => {
    setBusy(kind);
    try {
      const provider =
        kind === 'google' ? new GoogleAuthProvider() : new OAuthProvider('apple.com');
      await signInWithPopup(getFirebaseAuth(), provider);
    } catch (e) {
      toast.error(messageFor(e, `${kind} sign-in failed`));
    } finally {
      setBusy(null);
    }
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setBusy('send');
    try {
      await sendEmailCode(trimmed, 'sign_in');
      setEmailStep('enter-code');
      toast.success('Code sent. Check your email.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        try {
          await sendEmailCode(trimmed, 'sign_up');
          setEmailStep('enter-code');
          toast.success('Code sent. Check your email.');
        } catch (err2) {
          toast.error(messageFor(err2, 'Could not send code'));
        }
      } else {
        toast.error(messageFor(err, 'Could not send code'));
      }
    } finally {
      setBusy(null);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{8}$/.test(code)) {
      toast.error('Enter the 8-digit code from your email.');
      return;
    }
    setBusy('verify');
    try {
      try {
        await verifyEmailCode(email.trim().toLowerCase(), code, 'sign_in');
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          await verifyEmailCode(email.trim().toLowerCase(), code, 'sign_up');
        } else {
          throw err;
        }
      }
    } catch (err) {
      toast.error(messageFor(err, 'Could not verify code'));
    } finally {
      setBusy(null);
    }
  };

  const resetEmailFlow = () => {
    setEmailStep('idle');
    setEmail('');
    setCode('');
  };

  return (
    <div className="flex flex-col gap-3">
      {!configured && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Firebase web app isn&apos;t configured. Set <code>NEXT_PUBLIC_FIREBASE_*</code> in{' '}
          <code>.env.local</code>, then restart the dev server.
        </div>
      )}

      {emailStep === 'idle' && (
        <>
          <button
            type="button"
            onClick={() => signInWith('google')}
            disabled={busy !== null || !configured}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-sm transition-transform hover:scale-[1.03] hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <GoogleLogo className="size-[18px]" />
            {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
          </button>
          <button
            type="button"
            onClick={() => signInWith('apple')}
            disabled={busy !== null || !configured}
            className="flex h-11 w-full cursor-pointer items-center justify-center gap-2.5 rounded-md bg-black px-4 text-sm font-semibold text-white transition-transform hover:scale-[1.03] hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
          >
            <AppleLogo className="size-[18px]" />
            {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </button>

          <div className="relative my-1">
            <div className="h-px w-full bg-neutral-200" />
            <span
              className={`absolute inset-0 -top-2 mx-auto w-fit px-2 text-[10px] uppercase tracking-wider text-neutral-400 ${dividerBg}`}
            >
              or
            </span>
          </div>

          <button
            type="button"
            onClick={() => setEmailStep('enter-email')}
            disabled={busy !== null}
            className={GHOST_BTN}
          >
            Continue with email
          </button>
        </>
      )}

      {emailStep === 'enter-email' && (
        <form onSubmit={handleSendCode} className="flex flex-col gap-3">
          <div className="grid gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-neutral-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={busy !== null}
              className={INPUT_CLS}
            />
          </div>
          <button
            type="submit"
            disabled={busy !== null || !email.trim()}
            className={PRIMARY_BTN}
          >
            {busy === 'send' ? 'Sending…' : 'Send code'}
          </button>
          <button
            type="button"
            onClick={resetEmailFlow}
            disabled={busy !== null}
            className={GHOST_BTN}
          >
            Back
          </button>
        </form>
      )}

      {emailStep === 'enter-code' && (
        <form onSubmit={handleVerify} className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            We emailed an 8-digit code to <span className="font-medium text-neutral-700">{email}</span>.
          </p>
          <div className="grid gap-1.5">
            <label htmlFor="code" className="text-sm font-medium text-neutral-700">
              Code
            </label>
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              maxLength={8}
              pattern="\d{8}"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              placeholder="12345678"
              disabled={busy !== null}
              className={INPUT_CLS}
            />
          </div>
          <button
            type="submit"
            disabled={busy !== null || code.length !== 8}
            className={PRIMARY_BTN}
          >
            {busy === 'verify' ? 'Verifying…' : 'Verify & sign in'}
          </button>
          <button
            type="button"
            onClick={() => setEmailStep('enter-email')}
            disabled={busy !== null}
            className={GHOST_BTN}
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function GoogleLogo({ className }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0124 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 01-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

function AppleLogo({ className }: { className?: string }): ReactNode {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
