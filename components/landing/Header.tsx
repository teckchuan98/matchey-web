'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { SignInDialog } from './SignInDialog';
import { OnboardingDialog } from './OnboardingDialog';

export function Header() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/80 text-neutral-900 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <a href="#top" className="flex items-center gap-2.5">
            <Image
              src="/brand/logo.png"
              alt="Fittel"
              width={32}
              height={32}
              className="rounded-[8px]"
              priority
            />
            <span className="text-lg font-bold tracking-[-0.3px]">
              Fittel
              <span className="hidden font-normal text-neutral-500 sm:inline">: Coach Your Clients</span>
            </span>
          </a>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setSignInOpen(true)}
              className="cursor-pointer rounded-full transition-transform hover:scale-[1.04] border-neutral-300 bg-white px-5 text-neutral-900 hover:bg-neutral-100 hover:text-neutral-900 dark:border-neutral-300 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-100 dark:hover:text-neutral-900"
            >
              Sign in
            </Button>
            <Button
              onClick={() => setOnboardingOpen(true)}
              className="cursor-pointer rounded-full transition-transform hover:scale-[1.04] bg-[#4D8FFF] px-5 text-white hover:bg-[#4D8FFF]/90"
            >
              Start Now
            </Button>
          </div>
        </div>
      </header>

      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />
      <OnboardingDialog open={onboardingOpen} onOpenChange={setOnboardingOpen} />
    </>
  );
}
