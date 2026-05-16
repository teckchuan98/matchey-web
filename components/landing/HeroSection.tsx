'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowRight, Check, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignInDialog } from './SignInDialog';
import { DemoVideoDialog, DEMO_VIDEO_URL } from './DemoVideoDialog';

let demoPrefetched = false;
function prefetchDemo() {
  if (demoPrefetched || typeof window === 'undefined') return;
  demoPrefetched = true;
  // Kick off a low-priority fetch so the bytes land in the HTTP cache.
  // The video element will reuse them when the dialog mounts.
  fetch(DEMO_VIDEO_URL, { mode: 'cors', credentials: 'omit' }).catch(() => {
    demoPrefetched = false;
  });
}

export function HeroSection() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section id="top" className="relative overflow-hidden bg-white text-neutral-900">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-24 pt-6 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:pb-32 lg:pt-8">
        <div className="flex flex-col justify-center animate-fade-rise">
          <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-[-0.02em] sm:text-6xl lg:text-[68px]">
            <span className="text-sheen block" data-text="Run your entire">
              Run your entire
            </span>
            <span className="text-sheen block" data-text="coaching">
              coaching
            </span>
            <span className="text-sheen block" data-text="business">
              business
            </span>
            <span className="block">
              <span className="text-sheen" data-text="from ">
                from{' '}
              </span>
              <span className="bg-brand-gradient bg-clip-text text-transparent">one place</span>.
            </span>
          </h1>
          <p className="mt-8 max-w-md text-base leading-relaxed text-neutral-600 sm:text-lg">
            Build workout libraries, manage clients, schedule sessions, and track progress —
            without spreadsheets, scattered chats, or messy tools.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => setSignInOpen(true)}
              className="h-12 cursor-pointer rounded-full bg-[#4D8FFF] px-8 text-base font-semibold text-white transition-transform hover:scale-[1.04] hover:bg-[#4D8FFF]/90"
            >
              Start Coaching <ArrowRight className="ml-2 size-5" />
            </Button>
            <button
              type="button"
              onClick={() => setDemoOpen(true)}
              onMouseEnter={prefetchDemo}
              onFocus={prefetchDemo}
              onTouchStart={prefetchDemo}
              onPointerDown={prefetchDemo}
              className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-neutral-300 bg-white px-5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
            >
              <Play className="size-3.5 fill-current" /> Watch Demo
            </button>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-600">
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" /> Completely free
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Check className="size-3.5 text-emerald-600" /> No credit card
            </span>
          </div>

        </div>

        <HeroVisual />
      </div>
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      <DemoVideoDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}

function AppleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 384 512" className={className} fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M3 2.5v19c0 .6.7.9 1.1.5l10.6-9.5c.3-.3.3-.8 0-1L4.1 2C3.7 1.6 3 1.9 3 2.5z" opacity=".9" />
    </svg>
  );
}

function HeroVisual() {
  return (
    <div className="relative flex flex-col items-center justify-end gap-6 lg:items-end">
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/images/img-4.png"
          alt="Fittel mobile session"
          width={275}
          height={560}
          quality={100}
          priority
          sizes="(min-width: 1024px) 560px, 70vh"
          style={{ height: 'min(70vh, 560px)', width: 'auto' }}
          className="block select-none rounded-3xl"
        />

        <div className="flex flex-col items-center">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
            Get the mobile app
          </div>
          <div className="mt-3 flex flex-wrap justify-center gap-3">
            <a
              href="https://apps.apple.com/app/id6762073840"
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
            >
              <AppleGlyph className="size-4" /> App Store
            </a>
            <a
              href="https://play.google.com/store/apps/details?id=com.teckchuan.fittel"
              target="_blank"
              rel="noreferrer"
              className="inline-flex cursor-pointer items-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
            >
              <PlayGlyph className="size-4" /> Google Play
            </a>
          </div>
          <p className="mt-3 max-w-[280px] text-center text-[11px] leading-snug text-neutral-500">
            Android is currently in closed testing on Google Play — if you have any trouble
            installing it, message me and I&apos;ll add you to the testers list.
          </p>
        </div>
      </div>
    </div>
  );
}
