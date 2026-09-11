import type { ReactNode } from 'react';
import { AlertCircle, Check, FileText, Info, LoaderCircle, Sparkles } from 'lucide-react';

export function DemoDisclaimer({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-[hsl(var(--accent)/.35)] bg-[hsl(var(--accent)/.12)] px-3 py-2.5 text-xs leading-relaxed text-[hsl(var(--accent-foreground))] ${compact ? '' : 'max-w-2xl'}`} data-testid="notice-demo-disclaimer">
      <Info size={15} className="mt-0.5 shrink-0" />
      <span><strong className="font-semibold">Synthetic demo service.</strong> Benefits and scheme names are illustrative. Always confirm final rules with your local government office.</span>
    </div>
  );
}

export function SectionKicker({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]" data-testid="text-section-kicker"><span className="h-px w-7 bg-[hsl(var(--accent))]" />{children}</div>;
}

export function LoadingLines({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-skeleton">{Array.from({ length: count }).map((_, index) => <div key={index} className="h-10 animate-pulse rounded-lg bg-[hsl(var(--muted))]" />)}</div>;
}

export function ErrorPanel({ message = 'Something went wrong while connecting to JanSahay.' }: { message?: string }) {
  return <div className="flex items-start gap-3 rounded-xl border border-[hsl(var(--destructive)/.25)] bg-[hsl(var(--destructive)/.06)] p-4 text-sm text-[hsl(var(--destructive))]" data-testid="state-error"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{message} Please try again in a moment.</span></div>;
}

export function SuccessTick({ children }: { children: ReactNode }) {
  return <div className="flex items-start gap-2 text-sm text-[hsl(var(--foreground))]" data-testid="status-success"><span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]"><Check size={11} strokeWidth={3} /></span>{children}</div>;
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card)/.7)] px-6 py-12 text-center" data-testid="state-empty"><Sparkles className="mx-auto mb-3 text-[hsl(var(--accent-foreground))]" size={22} /><h3 className="font-display text-xl font-bold">{title}</h3><p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{detail}</p></div>;
}

export function SchemeIcon({ category }: { category: string }) {
  return <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><FileText size={18} /></span>;
}

export function ProcessingNotice() {
  return <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--primary)/.18)] bg-[hsl(var(--primary)/.05)] px-4 py-3 text-sm" data-testid="status-processing"><LoaderCircle size={17} className="animate-spin text-[hsl(var(--primary))]" /><span>Reading your profile, checking rules, and finding a compatible path…</span></div>;
}