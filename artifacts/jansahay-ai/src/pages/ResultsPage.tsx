import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Scale, X } from 'lucide-react';
import { Link } from 'wouter';
import type { AnalysisResult, Checklist, Scheme } from '@workspace/api-client-react';
import { useGetChecklist, useGetScheme } from '@workspace/api-client-react';
import { BrandMark } from '@/components/BrandMark';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { EmptyState, ErrorPanel, LoadingLines, SchemeIcon, SectionKicker, SuccessTick } from '@/components/Primitives';
import { loadLatestAnalysis, useAuthSession } from '@/lib/auth';
import { apiUrl } from '@/lib/api-url';

function money(value: number) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
}

function plainSourceText(value?: string | null) {
  return (value ?? '')
    .replace(/\*\s*\*/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function benefitText(scheme: Scheme) {
  const value = plainSourceText(scheme.benefit);
  return value.length >= 3 ? value : 'Benefit details are being verified from the official source.';
}

function benefitAmount(scheme: Scheme) {
  if (scheme.benefitValue > 0) return `Up to ${money(scheme.benefitValue)}`;
  const statedAmount = benefitText(scheme).match(/(?:₹|Rs\.?|INR)\s?[\d,.]+(?:\s?(?:lakh|lac|crore))?/i)?.[0];
  return statedAmount ? `Official amount: ${statedAmount}` : 'Amount not listed';
}

function SchemeRow({ scheme, recommendation, reason, status = 'eligible', onDetails }: { scheme: Scheme; recommendation?: string; reason?: string; status?: 'eligible' | 'partial'; onDetails: () => void }) {
  const isEligible = status === 'eligible';
  return <div className={`flex min-w-0 flex-col gap-4 rounded-2xl border bg-[hsl(var(--card))] p-4 sm:flex-row sm:items-center ${isEligible ? 'border-[hsl(var(--primary)/.35)]' : 'border-[hsl(var(--accent)/.55)] bg-[hsl(var(--accent)/.06)]'}`} data-testid={`row-result-scheme-${scheme.id}`}><SchemeIcon category={scheme.category} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 translate="no" className="min-w-0 break-words font-display text-xl font-bold leading-tight">{scheme.name}</h3><span translate="no" className="rounded-full bg-[hsl(var(--secondary))] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{scheme.category}</span></div>{reason && <p translate="no" className="mt-2 break-words text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{reason}</p>}<p className="mt-2 break-words text-sm leading-relaxed text-[hsl(var(--foreground))]"><span className="font-bold text-[hsl(var(--primary))]">Benefit: </span><span translate="no">{benefitText(scheme)}</span></p></div><div className="flex shrink-0 flex-wrap items-center gap-2 sm:max-w-[11rem] sm:flex-col sm:items-end"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${isEligible ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{isEligible ? 'Profile match' : 'Check conditions'}</span><span translate="no" className="max-w-full break-words text-sm font-bold text-[hsl(var(--primary))]">{benefitAmount(scheme)}</span><button type="button" onClick={onDetails} className="text-xs font-bold text-[hsl(var(--muted-foreground))] underline-offset-4 hover:text-[hsl(var(--primary))] hover:underline" data-testid={`button-details-${scheme.id}`}>View details & apply</button>{recommendation && <span translate="no" className="text-right text-[11px] font-semibold text-[hsl(var(--accent-foreground))]">{recommendation}</span>}</div></div>;
}

type SchemeDetail = {
  id: string;
  name: string;
  shortDescription?: string;
  fullDescription?: string;
  eligibilityRules: Array<{ rawText?: string } | string>;
  applicationSteps: string[];
  applicationUrl?: string | null;
  sources?: Array<{ authority?: string; title?: string; url?: string }>;
};
function usableUrl(value?: string | null) {
  const match = value?.match(/https?:\/\/[^\s\])]+/i);
  return match?.[0] ?? null;
}

function ChecklistCard({ checklist }: { checklist: Checklist }) {
  const [open, setOpen] = useState(true);
  const completed = checklist.items.filter((item) => item.completed).length;
  return <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]" data-testid="section-checklist"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-4 p-5 text-left" data-testid="button-toggle-checklist"><div><SectionKicker>Ready to move</SectionKicker><h2 className="font-display text-2xl font-bold">Your application checklist</h2><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">{completed} of {checklist.items.length} preparation steps complete</p></div>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</button>{open && <div className="space-y-3 border-t border-[hsl(var(--border))] p-5">{checklist.items.map((item) => <div key={item.id} className="flex gap-3 rounded-xl bg-[hsl(var(--background))] p-3.5" data-testid={`checklist-item-${item.id}`}><span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${item.completed ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--input))]'}`}>{item.completed && <Check size={13} strokeWidth={3} />}</span><div><p className="text-sm font-semibold">{item.label}</p><p className="mt-1 text-xs leading-relaxed text-[hsl(var(--muted-foreground))]">{item.detail}</p></div></div>)}</div>}</section>;
}

function MissingDocumentsCard({ documents }: { documents: string[] }) {
  const [open, setOpen] = useState(false);
  return <div className="relative" data-testid="stat-documents"><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))]"><button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 p-5 text-left"><div><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Documents to find</p><p className="mt-3 font-display text-4xl font-bold">{documents.length}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{documents.length ? 'View the exact document list' : 'All listed documents are ready'}</p></div>{documents.length ? <span className="grid size-9 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span> : null}</button></div><div className={`absolute inset-x-0 top-full z-20 grid transition-[grid-template-rows,opacity,transform] duration-300 ease-out ${open && documents.length ? 'mt-3 grid-rows-[1fr] translate-y-0 opacity-100' : 'mt-0 grid-rows-[0fr] -translate-y-2 opacity-0 pointer-events-none'}`}><div className="overflow-hidden"><div className="max-h-80 overflow-y-auto rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 shadow-[0_20px_45px_hsl(var(--foreground)/.15)]"><p className="mb-3 text-xs font-bold uppercase tracking-wider text-[hsl(var(--primary))]">Find these first</p><ul className="space-y-2">{documents.map((document) => <li key={document} className="flex gap-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-[hsl(var(--accent))]" />{document}</li>)}</ul></div></div></div></div>;
}

export default function ResultsPage() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('nagarik-analysis') || 'null') as AnalysisResult | null; } catch { return null; }
  });
  const [detailSchemeId, setDetailSchemeId] = useState<string | null>(null);
  const [schemeDetail, setSchemeDetail] = useState<SchemeDetail | null>(null);
  const [schemeDetailLoading, setSchemeDetailLoading] = useState(false);
  const { session } = useAuthSession();
  const [restoring, setRestoring] = useState(false);
  useEffect(() => {
    if (analysis || !session) return;
    setRestoring(true);
    void loadLatestAnalysis().then((saved) => {
      if (saved) {
        sessionStorage.setItem('nagarik-analysis', JSON.stringify(saved));
        setAnalysis(saved);
      }
    }).finally(() => setRestoring(false));
  }, [analysis, session]);
  const citizenId = analysis?.citizenId ?? '';
  const checklistQuery = useGetChecklist(citizenId, { query: { enabled: Boolean(citizenId), queryKey: [`/api/checklist/${citizenId}`] } });
  const schemeQuery = useGetScheme(detailSchemeId ?? '', { query: { enabled: Boolean(detailSchemeId), queryKey: [`/api/schemes/${detailSchemeId ?? ''}`] } });
  const schemesById = useMemo(() => new Map((analysis?.eligibleSchemes ?? []).concat(analysis?.ineligibleSchemes ?? [], analysis?.missingInformationSchemes ?? []).map((scheme) => [scheme.id, scheme])), [analysis]);

  useEffect(() => {
    if (!detailSchemeId) { setSchemeDetail(null); return; }
    let cancelled = false;
    setSchemeDetailLoading(true);
    fetch(apiUrl(`/api/schemes/${detailSchemeId}/details`))
      .then((response) => response.ok ? response.json() : null)
      .then((detail: SchemeDetail | null) => { if (!cancelled) setSchemeDetail(detail); })
      .catch(() => { if (!cancelled) setSchemeDetail(null); })
      .finally(() => { if (!cancelled) setSchemeDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailSchemeId]);

  if (!analysis) return <div className="min-h-[100dvh] bg-[hsl(var(--background))]"><header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]"><div className="mx-auto max-w-7xl px-5 py-4 lg:px-10"><Link href="/" data-testid="link-results-home"><BrandMark /></Link></div></header><main className="mx-auto max-w-xl px-5 py-20">{restoring ? <LoadingLines count={4} /> : <><EmptyState title="Your analysis is not open" detail="Start a profile check first. Your results will appear here at the end." /><Link href="/app" className="mx-auto mt-6 flex w-fit items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-start-results">Start a check <ArrowRight size={16} /></Link></>}</main></div>;

  const displayedChecklist = checklistQuery.data ?? analysis.checklist;
  const selected = analysis.optimization.selectedSchemes.map((entry) => ({ ...entry, scheme: schemesById.get(entry.schemeId) })).filter((entry): entry is typeof entry & { scheme: Scheme } => Boolean(entry.scheme));
  const selectedSchemeIds = new Set(selected.map((entry) => entry.schemeId));
  const remainingEligibleSchemes = analysis.eligibleSchemes.filter((scheme) => !selectedSchemeIds.has(scheme.id));
  const remainingPartialSchemes = analysis.missingInformationSchemes.filter((scheme) => !selectedSchemeIds.has(scheme.id));
  const missingDocuments = displayedChecklist.missingDocuments.map(plainSourceText).filter((document) => document.length >= 3);
  return <div className="grain min-h-[100dvh] bg-[hsl(var(--background))]">
    <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/.85)]"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-10"><Link href="/" data-testid="link-results-logo"><BrandMark /></Link><div className="flex items-center gap-4"><Link href="/app" className="inline-flex items-center gap-2 text-sm font-semibold text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))]" data-testid="link-new-check"><ArrowLeft size={16} /> New check</Link>{session && <Link href="/profile" aria-label="Open profile settings" data-testid="link-results-profile"><ProfileAvatar name={session.name} avatarUrl={session.avatarUrl} /></Link>}</div></div></header>
    <main className="mx-auto max-w-7xl px-5 py-9 lg:px-10 lg:py-14">
      <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end"><div><SectionKicker>Analysis complete</SectionKicker><h1 className="font-display text-4xl font-bold tracking-[-.05em] sm:text-6xl">A clearer path<br /><span className="text-[hsl(var(--primary))]">starts here.</span></h1><p translate="no" className="mt-4 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{analysis.analysisSummary[0] || 'Here is what your profile may qualify for, what to prepare, and how the options fit together.'}</p></div></div>
      <div className="mt-9 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]" data-testid="stat-eligible"><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--accent))]">Possible matches</p><p className="mt-3 font-display text-4xl font-bold">{analysis.eligibleSchemes.length}</p><p className="mt-1 text-xs text-[hsl(var(--primary-foreground)/.68)]">match the profile fields checked</p></div><div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid="stat-bundle-value"><p className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Bundle value</p><p className="mt-3 font-display text-4xl font-bold text-[hsl(var(--primary))]">{money(analysis.optimization.totalBenefitValue)}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">estimated combined support</p></div><MissingDocumentsCard documents={missingDocuments} /></div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_.7fr]">
        <div className="space-y-8">
          <section data-testid="section-optimized-bundle"><div className="mb-4"><SectionKicker>Recommended together</SectionKicker><h2 className="font-display text-3xl font-bold">Your best-fit bundle</h2></div><div className="space-y-3">{selected.length ? selected.map((entry) => <SchemeRow key={entry.schemeId} scheme={entry.scheme} recommendation={entry.recommendation} reason={entry.reason} onDetails={() => setDetailSchemeId(entry.schemeId)} />) : <EmptyState title="No bundle found yet" detail="No compatible confirmed matches were found. Update the situation details and try again." />}</div></section>
          {(remainingEligibleSchemes.length || remainingPartialSchemes.length) ? <section data-testid="section-eligibility"><div className="mb-4"><SectionKicker>What the rules say</SectionKicker><h2 className="font-display text-3xl font-bold">Schemes worth checking</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Green matches the profile fields Nagarik can verify. Yellow needs an official-rule check. Schemes that do not match are not shown.</p></div><div className="space-y-3">{remainingEligibleSchemes.map((scheme) => <SchemeRow key={scheme.id} scheme={scheme} status="eligible" reason={analysis.eligibility.find((item) => item.schemeId === scheme.id)?.reasons.join(' ')} onDetails={() => setDetailSchemeId(scheme.id)} />)}{remainingPartialSchemes.map((scheme) => <SchemeRow key={scheme.id} scheme={scheme} status="partial" reason={analysis.eligibility.find((item) => item.schemeId === scheme.id)?.missingInformation.join(' ') || 'Check the official eligibility rules to confirm this scheme.'} onDetails={() => setDetailSchemeId(scheme.id)} />)}</div></section> : null}
          <ChecklistCard checklist={displayedChecklist} />
        </div>
        <aside className="space-y-5">
          <section className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid="section-next-actions"><SectionKicker>Do this first</SectionKicker><h2 className="font-display text-2xl font-bold">Your next three moves</h2><div className="mt-5 space-y-4"><SuccessTick>Gather the {missingDocuments.length || 'required'} missing document{missingDocuments.length === 1 ? '' : 's'}.</SuccessTick><SuccessTick>Ask your local office to confirm current scheme rules.</SuccessTick><SuccessTick>Apply to the highest-priority scheme first.</SuccessTick></div><Link href="/app" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full border border-[hsl(var(--primary))] px-4 py-2.5 text-sm font-bold text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))]" data-testid="link-run-another">Run another profile <ArrowRight size={15} /></Link></section>
          <section className="rounded-2xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))]" data-testid="section-conflicts"><div className="flex items-center gap-2 text-[hsl(var(--accent))]"><Scale size={18} /><span className="text-xs font-bold uppercase tracking-wider">Compatibility</span></div><h2 className="mt-4 font-display text-2xl font-bold">{analysis.conflicts.length ? 'A couple of overlaps to know' : 'Your bundle is compatible'}</h2>{analysis.conflicts.length ? <div className="mt-4 space-y-3">{analysis.conflicts.map((conflict, index) => <div key={`${conflict.schemeAId}-${conflict.schemeBId}-${index}`} className="rounded-xl border border-[hsl(var(--primary-foreground)/.13)] bg-[hsl(var(--primary-foreground)/.06)] p-3 text-xs leading-relaxed text-[hsl(var(--primary-foreground)/.78)]">{schemesById.get(conflict.schemeAId)?.name || conflict.schemeAId} and {schemesById.get(conflict.schemeBId)?.name || conflict.schemeBId}: {conflict.reason}</div>)}</div> : <p className="mt-3 text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.7)]">The recommended schemes can be pursued together according to the scheme rules.</p>}</section>
        </aside>
      </div>
    </main>
    {detailSchemeId && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--foreground)/.35)] p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" data-testid="dialog-scheme-details"><div className="max-h-[88vh] w-full max-w-xl overflow-auto rounded-t-3xl bg-[hsl(var(--card))] p-6 shadow-2xl sm:rounded-3xl"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><SectionKicker>Scheme detail</SectionKicker><h2 className="break-words font-display text-3xl font-bold">{schemeDetail?.name || schemeQuery.data?.name || schemesById.get(detailSchemeId)?.name}</h2></div><button type="button" onClick={() => setDetailSchemeId(null)} className="grid size-9 shrink-0 place-items-center rounded-full bg-[hsl(var(--muted))]" data-testid="button-close-details"><X size={17} /></button></div>{schemeQuery.isLoading || schemeDetailLoading ? <div className="mt-6"><LoadingLines count={4} /></div> : schemeQuery.isError ? <div className="mt-6"><ErrorPanel /></div> : schemeQuery.data && <div className="mt-6 space-y-6 text-sm"><p className="leading-relaxed text-[hsl(var(--muted-foreground))]">{schemeDetail?.fullDescription || schemeDetail?.shortDescription || schemeQuery.data.description}</p><div><p className="mb-2 font-bold">Eligibility signals</p><div className="space-y-2">{(schemeDetail?.eligibilityRules || schemeQuery.data.eligibilityRules).map((rule) => { const text = typeof rule === 'string' ? rule : rule.rawText; return text ? <SuccessTick key={text}>{text}</SuccessTick> : null; })}</div></div><div><p className="mb-2 font-bold">How to apply</p><ol className="space-y-2 text-[hsl(var(--muted-foreground))]">{(schemeDetail?.applicationSteps || schemeQuery.data.applicationSteps).map((step, index) => <li key={step} className="flex gap-2"><span className="font-bold text-[hsl(var(--primary))]">{index + 1}.</span><span className="min-w-0 break-words">{step}</span></li>)}</ol></div>{schemeDetail?.sources?.length ? <div><p className="mb-2 font-bold">Official source</p>{schemeDetail.sources.slice(0, 2).map((source) => usableUrl(source.url) ? <a key={source.url} href={usableUrl(source.url) ?? undefined} target="_blank" rel="noreferrer" className="block break-words text-xs font-semibold text-[hsl(var(--primary))] underline underline-offset-4">{source.authority || source.title || 'Open official source'}</a> : null)}</div> : null}{usableUrl(schemeDetail?.applicationUrl) && <a href={usableUrl(schemeDetail?.applicationUrl) ?? undefined} target="_blank" rel="noreferrer" className="inline-flex w-full items-center justify-center rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-official-application">Open official application</a>}</div>}</div></div>}
  </div>;
}
