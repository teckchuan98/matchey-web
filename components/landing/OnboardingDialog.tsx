'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const IOS_URL = 'https://apps.apple.com/app/id6762073840';
const ANDROID_URL = 'https://play.google.com/store/apps/details?id=com.teckchuan.fittel';

export function OnboardingDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white text-neutral-900 ring-1 ring-neutral-200">
        <DialogHeader>
          <DialogTitle className="text-neutral-900">Finish setup in the app</DialogTitle>
          <DialogDescription className="text-neutral-500">
            Onboarding is done in the Fittel mobile app. Download it, create your trainer
            account, then come back here to manage clients from the web.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <a
            href={IOS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
          >
            <AppleGlyph className="size-4" /> App Store
          </a>
          <a
            href={ANDROID_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
          >
            <PlayGlyph className="size-4" /> Google Play
          </a>
        </div>
        <p className="mt-1 text-center text-[11px] leading-snug text-neutral-500">
          Android is currently in closed testing on Google Play — if you have any trouble
          installing it, message me and I&apos;ll add you to the testers list.
        </p>
      </DialogContent>
    </Dialog>
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
