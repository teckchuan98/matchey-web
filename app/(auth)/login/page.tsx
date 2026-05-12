'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup } from 'firebase/auth';
import { toast } from 'sonner';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/auth/firebase';
import { useAuth } from '@/lib/auth/AuthProvider';
import { sendEmailCode, verifyEmailCode } from '@/lib/auth/emailSession';
import { ApiError } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

type EmailStep = 'idle' | 'enter-email' | 'enter-code';

export default function LoginPage() {
  const auth = useAuth();
  const router = useRouter();
  const configured = isFirebaseConfigured();

  const [busy, setBusy] = useState<null | 'google' | 'apple' | 'send' | 'verify'>(null);
  const [emailStep, setEmailStep] = useState<EmailStep>('idle');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  useEffect(() => {
    if (auth.status === 'authenticated') router.replace('/dashboard');
  }, [auth.status, router]);

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

  let content: ReactNode;

  if (auth.status === 'verifying') {
    content = (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Verifying trainer access…</CardTitle>
          <CardDescription>
            Checking your account against Fittel
            {auth.identity.email ? ` (${auth.identity.email})` : ''}.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  } else if (auth.status === 'denied') {
    const isClient = auth.response.role === 'CLIENT';
    content = (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            {isClient ? 'This dashboard is trainer-only' : 'No trainer profile found'}
          </CardTitle>
          <CardDescription>
            {isClient
              ? 'Your account is registered as a client. Open the Fittel mobile app instead.'
              : 'You signed in successfully, but the backend has no trainer record linked to your account.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
              <span className="text-muted-foreground">Email</span>
              <span className="font-mono break-all">{auth.identity.email ?? '—'}</span>
              <span className="text-muted-foreground">UID</span>
              <span className="font-mono break-all">{auth.identity.uid ?? '—'}</span>
              <span className="text-muted-foreground">Method</span>
              <span>{auth.identity.kind}</span>
              <span className="text-muted-foreground">Backend role</span>
              <span className="font-mono">{auth.response.role}</span>
              <span className="text-muted-foreground">isNewUser</span>
              <span className="font-mono">{String(auth.response.isNewUser)}</span>
            </div>
          </div>
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer select-none">Raw /auth/check response</summary>
            <pre className="mt-2 overflow-auto rounded border bg-background p-2 text-[11px]">
              {JSON.stringify(auth.response, null, 2)}
            </pre>
          </details>
          <Button variant="outline" onClick={() => auth.signOut()}>
            Sign out and try a different account
          </Button>
        </CardContent>
      </Card>
    );
  } else if (auth.status === 'error') {
    content = (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Couldn&apos;t verify your account</CardTitle>
          <CardDescription>{auth.message}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Button onClick={auth.retryVerify}>Try again</Button>
          <Button variant="outline" onClick={() => auth.signOut()}>
            Sign out
          </Button>
        </CardContent>
      </Card>
    );
  } else {
    content = (
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in to Fittel</CardTitle>
          <CardDescription>Trainer dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!configured && (
            <div className="rounded-md border border-[#FFB454]/40 bg-[#FFB454]/10 p-3 text-xs text-[#FFB454]">
              Firebase web app isn&apos;t configured. Register a Web App in the{' '}
              <a
                className="underline"
                href="https://console.firebase.google.com/project/fitboi-9e2d8/settings/general"
                target="_blank"
                rel="noreferrer"
              >
                Firebase console
              </a>{' '}
              and paste <code>apiKey</code> + <code>appId</code> into{' '}
              <code>.env.local</code>, then restart the dev server.
            </div>
          )}

          {emailStep === 'idle' && (
            <>
              <button
                type="button"
                onClick={() => signInWith('google')}
                disabled={busy !== null || !configured}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-white px-4 text-sm font-semibold text-[#1F1F1F] shadow-sm transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <GoogleLogo className="size-[18px]" />
                {busy === 'google' ? 'Signing in…' : 'Continue with Google'}
              </button>
              <button
                type="button"
                onClick={() => signInWith('apple')}
                disabled={busy !== null || !configured}
                className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-black/85 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <AppleLogo className="size-[18px]" />
                {busy === 'apple' ? 'Signing in…' : 'Continue with Apple'}
              </button>

              <div className="relative my-1">
                <Separator />
                <span className="absolute inset-0 -top-2 mx-auto w-fit bg-card px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  or
                </span>
              </div>

              <Button
                variant="ghost"
                onClick={() => setEmailStep('enter-email')}
                disabled={busy !== null}
              >
                Continue with email
              </Button>
            </>
          )}

          {emailStep === 'enter-email' && (
            <form onSubmit={handleSendCode} className="flex flex-col gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  disabled={busy !== null}
                />
              </div>
              <Button type="submit" disabled={busy !== null || !email.trim()}>
                {busy === 'send' ? 'Sending…' : 'Send code'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={resetEmailFlow}
                disabled={busy !== null}
              >
                Back
              </Button>
            </form>
          )}

          {emailStep === 'enter-code' && (
            <form onSubmit={handleVerify} className="flex flex-col gap-3">
              <p className="text-xs text-muted-foreground">
                We emailed an 8-digit code to <span className="font-medium">{email}</span>.
              </p>
              <div className="grid gap-1.5">
                <Label htmlFor="code">Code</Label>
                <Input
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
                />
              </div>
              <Button type="submit" disabled={busy !== null || code.length !== 8}>
                {busy === 'verify' ? 'Verifying…' : 'Verify & sign in'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEmailStep('enter-email')}
                disabled={busy !== null}
              >
                Use a different email
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Hero column — desktop only */}
      <div className="relative hidden lg:flex lg:w-[55%] flex-col overflow-hidden bg-card">
        <Image
          src="/brand/hero.jpg"
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover animate-kenburns"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="relative mt-auto p-12 max-w-2xl">
          <h1 className="text-[34px] font-bold leading-[1.1] tracking-[-0.5px] text-white">
            Your coaching
            <br />
            dashboard.
          </h1>
          <p className="mt-4 text-[15px] leading-[1.4] text-white/85">
            Manage clients, schedules, and programs from your desk.
          </p>
        </div>
      </div>

      {/* Brand + form column */}
      <div className="flex flex-1 flex-col lg:w-[45%]">
        <header className="flex items-center gap-3 p-6">
          <Image
            src="/brand/logo.png"
            alt="Fittel logo"
            width={40}
            height={40}
            className="rounded-[12px]"
            priority
          />
          <span className="text-[22px] font-bold tracking-[-0.3px]">Fittel</span>
        </header>
        <div className="flex flex-1 items-center justify-center p-6">{content}</div>
      </div>
    </div>
  );
}

function messageFor(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message || fallback;
  if (err instanceof Error) return err.message || fallback;
  return fallback;
}

function GoogleLogo({ className }: { className?: string }) {
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

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 384 512"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}
