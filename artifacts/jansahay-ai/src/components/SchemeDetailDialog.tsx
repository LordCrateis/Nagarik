import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { Scheme } from '@workspace/api-client-react';
import { ArrowUpRight, Building2, CalendarDays, Check, FileText, Landmark, X } from 'lucide-react';
import { LoadingLines, SectionKicker } from '@/components/Primitives';
import { apiUrl } from '@/lib/api-url';

type Benefit = { description: string; amountInr?: number | null; frequency?: string | null };
type EligibilityRule = { rawText?: string; field?: string; operator?: string; value?: unknown };
type SchemeSource = { url: string; title?: string; authority?: string; sourceId?: string };

type SchemeDetail = {
  id: string;
  name: string;
  aliases?: string[];
  shortDescription?: string;
  fullDescription?: string;
  governmentLevel?: string;
  state?: string | null;
  department?: string | null;
  category?: string;
  benefits?: Benefit[];
  eligibilityRules?: EligibilityRule[];
  exclusions?: string[];
  requiredDocuments?: string[];
  applicationSteps?: string[];
  applicationUrl?: string | null;
  deadlines?: string[];
  sources?: SchemeSource[];
  confidence?: number;
};

const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

function EmptyFact() {
  return <p className="text-sm text-[hsl(var(--muted-foreground))]">Not stated in the available official source.</p>;
}

function DetailList({ items }: { items: string[] }) {
  if (!items.length) return <EmptyFact />;
  return <ul className="space-y-2.5">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2.5 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="mt-1.5 grid size-4 shrink-0 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Check size={10} strokeWidth={3} /></span>{item}</li>)}</ul>;
}

export function SchemeDetailDialog({ scheme, onClose }: { scheme: Scheme | null; onClose: () => void }) {
  const detailQuery = useQuery({
    queryKey: ['scheme-details', scheme?.id],
    enabled: Boolean(scheme),
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/schemes/${encodeURIComponent(scheme!.id)}/details`));
      if (!response.ok) throw new Error('Could not load scheme details.');
      return response.json() as Promise<SchemeDetail>;
    },
  });

  useEffect(() => {
    if (!scheme) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [scheme, onClose]);

  if (!scheme) return null;
  const detail = detailQuery.data;
  const rules = (detail?.eligibilityRules ?? []).map((rule) => rule.rawText || [rule.field, rule.operator, String(rule.value ?? '')].filter(Boolean).join(' '));

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.42)] p-0 backdrop-blur-[2px] sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="scheme-detail-title" data-testid="dialog-scheme-details">
    <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close scheme details" />
    <article className="relative flex max-h-[92dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-[2rem] bg-[hsl(var(--card))] shadow-2xl sm:rounded-[2rem]">
      <header className="flex shrink-0 items-start justify-between gap-5 border-b border-[hsl(var(--border))] px-5 py-5 sm:px-8 sm:py-6">
        <div className="min-w-0"><SectionKicker>Scheme details</SectionKicker><h2 id="scheme-detail-title" className="mt-1 font-display text-3xl font-bold leading-tight tracking-[-.04em] sm:text-4xl">{detail?.name ?? scheme.name}</h2><div className="mt-3 flex flex-wrap gap-2"><span className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{detail?.category ?? scheme.category}</span>{detail?.governmentLevel && <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-[11px] font-semibold capitalize text-[hsl(var(--muted-foreground))]">{detail.governmentLevel}</span>}{detail?.state && <span className="rounded-full border border-[hsl(var(--border))] px-3 py-1 text-[11px] font-semibold text-[hsl(var(--muted-foreground))]">{detail.state}</span>}</div></div>
        <button type="button" onClick={onClose} className="grid size-10 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--primary))]" aria-label="Close" data-testid="button-close-scheme-details"><X size={18} /></button>
      </header>

      <div className="min-h-0 overflow-y-auto px-5 py-6 sm:px-8 sm:py-7">
        {detailQuery.isLoading ? <LoadingLines count={5} /> : detailQuery.isError || !detail ? <div className="rounded-2xl bg-[hsl(var(--destructive)/.08)] p-5 text-sm text-[hsl(var(--destructive))]">The detailed record could not be loaded. Close this panel and try again.</div> : <div className="grid gap-7 lg:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-8">
            <section><h3 className="font-display text-2xl font-bold">What this scheme provides</h3><p className="mt-3 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{detail.fullDescription || detail.shortDescription || scheme.description}</p>{detail.benefits?.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{detail.benefits.map((benefit, index) => <div key={`${benefit.description}-${index}`} className="rounded-2xl bg-[hsl(var(--secondary)/.55)] p-4"><p className="text-sm font-semibold leading-6">{benefit.description}</p>{benefit.amountInr != null && <p className="mt-2 font-display text-2xl font-bold text-[hsl(var(--primary))]">{money.format(benefit.amountInr)}</p>}{benefit.frequency && <p className="mt-1 text-xs capitalize text-[hsl(var(--muted-foreground))]">{benefit.frequency}</p>}</div>)}</div> : <div className="mt-3"><EmptyFact /></div>}</section>
            <section><h3 className="mb-3 font-display text-2xl font-bold">Who may be eligible</h3><DetailList items={rules.filter(Boolean)} /></section>
            <section><h3 className="mb-3 font-display text-2xl font-bold">How to apply</h3>{detail.applicationSteps?.length ? <ol className="space-y-3">{detail.applicationSteps.map((step, index) => <li key={`${step}-${index}`} className="flex gap-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-[hsl(var(--primary))] text-xs font-bold text-[hsl(var(--primary-foreground))]">{index + 1}</span>{step}</li>)}</ol> : <EmptyFact />}</section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-[hsl(var(--border))] p-5"><div className="flex items-center gap-2 font-bold"><FileText size={17} className="text-[hsl(var(--primary))]" /> Documents to prepare</div><div className="mt-4"><DetailList items={detail.requiredDocuments ?? []} /></div></section>
            <section className="rounded-2xl border border-[hsl(var(--border))] p-5"><div className="flex items-center gap-2 font-bold"><Building2 size={17} className="text-[hsl(var(--primary))]" /> Administered by</div><p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">{detail.department || 'Department not stated in the available source.'}</p></section>
            <section className="rounded-2xl border border-[hsl(var(--border))] p-5"><div className="flex items-center gap-2 font-bold"><CalendarDays size={17} className="text-[hsl(var(--primary))]" /> Deadlines</div><div className="mt-3"><DetailList items={detail.deadlines ?? []} /></div></section>
            {detail.exclusions?.length ? <section className="rounded-2xl border border-[hsl(var(--accent)/.45)] bg-[hsl(var(--accent)/.08)] p-5"><p className="font-bold">Important exclusions</p><div className="mt-3"><DetailList items={detail.exclusions} /></div></section> : null}
            <section className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]"><div className="flex items-center gap-2 font-bold"><Landmark size={17} className="text-[hsl(var(--accent))]" /> Official sources</div><div className="mt-4 space-y-2">{detail.sources?.length ? detail.sources.map((source, index) => <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer" className="flex items-start justify-between gap-3 rounded-xl border border-[hsl(var(--primary-foreground)/.13)] bg-[hsl(var(--primary-foreground)/.06)] p-3 text-xs leading-5 text-[hsl(var(--primary-foreground)/.78)] hover:border-[hsl(var(--accent))]"><span>{source.title || source.authority || 'Government source'}</span><ArrowUpRight size={14} className="mt-0.5 shrink-0 text-[hsl(var(--accent))]" /></a>) : <p className="text-xs text-[hsl(var(--primary-foreground)/.65)]">No source link was captured.</p>}</div>{detail.applicationUrl && <a href={detail.applicationUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[hsl(var(--accent))] px-4 py-3 text-sm font-bold text-[hsl(var(--accent-foreground))]">Open application page <ArrowUpRight size={15} /></a>}</section>
          </aside>
        </div>}
      </div>
    </article>
  </div>;
}
