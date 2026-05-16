'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SignInProviders } from '@/components/auth/SignInProviders';

export function SignInDialog({
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
          <DialogTitle className="text-neutral-900">Sign in to Fittel</DialogTitle>
          <DialogDescription className="text-neutral-500">
            Trainer dashboard.
          </DialogDescription>
        </DialogHeader>
        <SignInProviders surface="light" />
      </DialogContent>
    </Dialog>
  );
}
