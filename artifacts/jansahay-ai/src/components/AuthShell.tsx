import type { ReactNode } from 'react';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import { Link } from 'wouter';
import { BrandMark } from '@/components/BrandMark';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

export const authInputClass = 'w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-3.5 py-3 text-sm outline-none transition-all placeholder:text-[hsl(var(--muted-foreground))] focus:border-[hsl(var(--primary))] focus:ring-4 focus:ring-[hsl(var(--primary)/.1)]';

export function AuthField({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-[.08em] text-[hsl(var(--muted-foreground))]">{label}</span>{children}</label>;
}

export function AuthShell({ eyebrow, title, description, points, children }: { eyebrow: string; title: ReactNode; description: string; points: string[]; children: ReactNode }) {
  return <div className="grain h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
    <header className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-10">
      <Link href="/"><BrandMark /></Link>
      <div className="flex items-center gap-3"><LanguageSwitcher /><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--primary))]"><ArrowLeft size={15} /> Back home</Link></div>
    </header>
    <main className="mx-auto grid h-[calc(100dvh-72px)] max-w-7xl min-h-0 gap-5 px-5 pb-5 lg:grid-cols-[.82fr_1.18fr] lg:px-10 lg:pb-8">
      <section className="relative hidden overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] p-9 text-[hsl(var(--primary-foreground))] lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-14 -top-14 size-52 rounded-full bg-[hsl(var(--accent)/.22)] blur-3xl" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]"><Sparkles size={15} /> {eyebrow}</span>
          <h1 className="mt-5 max-w-md font-display text-5xl font-bold leading-[.94] tracking-[-.05em]">{title}</h1>
          <p className="mt-5 max-w-md text-sm leading-7 text-[hsl(var(--primary-foreground)/.72)]">{description}</p>
        </div>
        <div className="relative space-y-3">
          {points.map((point) => <div key={point} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary-foreground)/.13)] bg-[hsl(var(--primary-foreground)/.06)] p-3.5 text-sm"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><Check size={14} strokeWidth={3} /></span>{point}</div>)}
        </div>
      </section>
      <section className="min-h-0 overflow-y-auto rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_18px_60px_hsl(var(--primary)/.08)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </section>
    </main>
  </div>;
}
