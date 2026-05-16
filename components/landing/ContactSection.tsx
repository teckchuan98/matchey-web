import { Mail } from 'lucide-react';

const WHATSAPP_URL = 'https://wa.me/601160882788';
const INSTAGRAM_URL = 'https://www.instagram.com/fittel_app/';
const EMAIL = 'fittelbusiness@gmail.com';

export function ContactSection() {
  return (
    <section id="contact" className="border-t border-neutral-200 bg-neutral-50">
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:py-24">
        <div className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">
          Custom requests
        </div>
        <h2 className="font-heading text-3xl font-bold tracking-[-0.01em] sm:text-4xl">
          Need something Fittel doesn&apos;t do yet?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-neutral-600">
          Drop me a message — I read every one. Whether it&apos;s a feature you wish existed, a
          bug, or a partnership idea, the fastest way to reach me is below.
        </p>

        <div className="mx-auto mt-8 flex max-w-xl flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
          <a
            href={WHATSAPP_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
          >
            <WhatsAppGlyph className="size-4 text-[#25D366]" /> WhatsApp
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
          >
            <InstagramGlyph className="size-4" /> Instagram
          </a>
          <a
            href={`mailto:${EMAIL}`}
            className="inline-flex cursor-pointer items-center justify-center gap-2.5 rounded-md border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.04] hover:bg-neutral-100"
          >
            <Mail className="size-4" /> Email
          </a>
        </div>
      </div>
    </section>
  );
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.81 11.81 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.695.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z" />
    </svg>
  );
}

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <radialGradient id="ig-bg" cx="30%" cy="107%" r="150%">
          <stop offset="0%" stopColor="#FDF497" />
          <stop offset="5%" stopColor="#FDF497" />
          <stop offset="45%" stopColor="#FD5949" />
          <stop offset="60%" stopColor="#D6249F" />
          <stop offset="90%" stopColor="#285AEB" />
        </radialGradient>
      </defs>
      <rect x="2" y="2" width="20" height="20" rx="5" fill="url(#ig-bg)" />
      <path
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.8"
        d="M12 7.6a4.4 4.4 0 100 8.8 4.4 4.4 0 000-8.8z"
      />
      <circle cx="17.2" cy="6.8" r="1.05" fill="#ffffff" />
    </svg>
  );
}
