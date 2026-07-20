import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics Admin',
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#f6f7f9] text-neutral-950">{children}</div>;
}
