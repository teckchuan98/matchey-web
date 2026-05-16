'use client';

import { Dialog, DialogContent } from '@/components/ui/dialog';

export const DEMO_VIDEO_URL =
  'https://pub-519e4c1b5c8e4c64b68955e6ca57992d.r2.dev/video.mp4';

export function DemoVideoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen w-screen max-w-none rounded-none bg-black p-0 sm:h-auto sm:w-auto sm:max-w-[calc(100vw-2rem)] sm:rounded-xl">
        <video
          src={DEMO_VIDEO_URL}
          autoPlay
          controls
          playsInline
          preload="auto"
          className="block h-full w-full object-contain sm:h-[80vh] sm:max-h-[720px] sm:w-auto sm:rounded-xl"
        />
      </DialogContent>
    </Dialog>
  );
}
