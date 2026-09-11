import { ArrowRight, CheckCircle2, ChevronRight, FileCheck2, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, useListDemoProfiles, useListSchemes } from '@workspace/api-client-react';
import { BrandMark } from '@/components/BrandMark';
import { DemoDisclaimer, EmptyState, LoadingLines, SectionKicker } from '@/components/Primitives';

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const health = useHealthCheck();
  const schemes = useListSchemes();
  const demos = useListDemoProfiles();

  return (
    <div className="grain min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10" data-testid="header-public">
        <BrandMark />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[hsl(var(--muted-foreground))] md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-[hsl(var(--foreground))]" data-testid="link-how-it-works">How it works</a>
          <a href="#schemes" className="transition-colors hover:text-[hsl(var(--foreground))]" data-testid="link-schemes">Explore schemes</a>
          <Link href="/app" className="rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5" data-testid="link-start-header">Start a check</Link>
        </nav>
        <Link href="/app" className="rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] md:hidden" data-testid="link-start-mobile">Start</Link>
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
          <div className="animate-rise-in">
            <div className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]"><span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--accent))]"><ShieldCheck size={14} /></span> A clearer route to public support</div>
            <h1 className="max-w-3xl font-display text-[clamp(3.5rem,8vw,7.5rem)] font-bold leading-[.9] tracking-[-.06em] text-[hsl(var(--foreground))]">Know what<br /><span className="text-[hsl(var(--primary))]">comes next.</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">JanSahay turns a complicated benefits search into a simple, explainable plan — what may fit, what cannot be combined, and which document to find first.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/app" className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_10px_24px_hsl(var(--primary)/.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_hsl(var(--primary)/.24)]" data-testid="link-start-journey">Find my possible benefits <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Takes about 2 minutes</span>
            </div>
            <div className="mt-7"><DemoDisclaimer /></div>
          </div>
          <div className="relative animate-rise-in delay-2">
            <div className="absolute -right-12 -top-12 size-48 rounded-full bg-[hsl(var(--accent)/.18)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--primary))] p-6 text-[hsl(var(--primary-foreground))] shadow-[0_24px_70px_hsl(var(--primary)/.18)] sm:p-8">
              <div className="flex items-start justify-between">
                <div><p className="text-xs font-bold uppercase tracking-[.15em] text-[hsl(var(--accent))]">Your support map</p><p className="mt-2 font-display text-3xl font-bold leading-tight">A plan that<br />makes sense.</p></div>
                <span className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--primary-foreground)/.11)]"><Sparkles size={20} className="text-[hsl(var(--accent))]" /></span>
              </div>
              <div className="mt-10 space-y-3">
                {['Find schemes that fit your situation', 'See compatible combinations', 'Get a document-first checklist'].map((item, index) => <div key={item} className="flex items-center gap-3 rounded-2xl border border-[hsl(var(--primary-foreground)/.12)] bg-[hsl(var(--primary-foreground)/.06)] p-3.5 text-sm"><span className="grid size-7 place-items-center rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]"><CheckCircle2 size={15} /></span><span>{item}</span><span className="ml-auto text-[hsl(var(--accent))]">0{index + 1}</span></div>)}
              </div>
              <div className="mt-9 flex items-center gap-2 border-t border-[hsl(var(--primary-foreground)/.12)] pt-5 text-xs text-[hsl(var(--primary-foreground)/.68)]"><span className={`size-2 rounded-full ${health.isError ? 'bg-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent))]'}`} /> {health.isLoading ? 'Connecting to service…' : 'Service ready for a demo check'}</div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="border-y border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)]">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[.8fr_1.2fr] lg:px-10 lg:py-20">
            <div><SectionKicker>The JanSahay way</SectionKicker><h2 className="max-w-md font-display text-4xl font-bold leading-[.98] tracking-[-.04em] sm:text-5xl">Less guesswork.<br /><span className="text-[hsl(var(--primary))]">More confidence.</span></h2><p className="mt-5 max-w-sm leading-relaxed text-[hsl(var(--muted-foreground))]">We show the reasoning behind every result so you can decide what to do with it.</p></div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[{ n: '01', icon: Search, title: 'Tell us about you', copy: 'A few practical details. No account or paperwork upload required.' }, { n: '02', icon: FileCheck2, title: 'We compare the rules', copy: 'Eligibility, overlaps, missing information and documents — together.' }, { n: '03', icon: MapPin, title: 'Take the next step', copy: 'A ranked bundle and a local-office-ready checklist.' }].map(({ n, icon: Icon, title, copy }) => <div key={n} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 transition-transform hover:-translate-y-1"><span className="text-xs font-bold text-[hsl(var(--accent-foreground))]">{n}</span><Icon className="my-7 text-[hsl(var(--primary))]" size={23} /><h3 className="font-display text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{copy}</p></div>)}
            </div>
          </div>
        </section>

        <section id="schemes" className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionKicker>Inside the navigator</SectionKicker><h2 className="font-display text-4xl font-bold tracking-[-.04em] sm:text-5xl">Built around real decisions.</h2></div><p className="max-w-xs text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">A focused set of synthetic public-benefit schemes for this prototype.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schemes.isLoading ? <div className="md:col-span-2 lg:col-span-3"><LoadingLines count={3} /></div> : schemes.isError ? <div className="md:col-span-2 lg:col-span-3"><EmptyState title="Scheme library is resting" detail="Start a check and we’ll reconnect automatically." /></div> : (schemes.data ?? []).slice(0, 6).map((scheme) => <div key={scheme.id} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 transition-all hover:-translate-y-1 hover:border-[hsl(var(--accent))]" data-testid={`card-scheme-${scheme.id}`}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{scheme.category}</span><ChevronRight size={16} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-8 font-display text-2xl font-bold">{scheme.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{scheme.description}</p><div className="mt-5 border-t border-[hsl(var(--border))] pt-4 text-sm font-semibold text-[hsl(var(--primary))]">{scheme.benefit}</div></div>)}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[hsl(var(--secondary)/.55)] p-6 sm:flex-row sm:items-center sm:px-8"><div><p className="font-display text-2xl font-bold">Want a personalised answer?</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Use a demo profile or start with your own details.</p></div><Link href="/app" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-start-bottom">Open the navigator <ArrowRight size={16} /></Link></div>
        </section>

        <section className="bg-[hsl(var(--primary))] px-5 py-16 text-[hsl(var(--primary-foreground))] lg:px-10"><div className="mx-auto max-w-7xl"><div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--accent))]">One-click demo profiles</p><h2 className="mt-3 max-w-2xl font-display text-4xl font-bold leading-tight sm:text-5xl">See how a clear answer feels.</h2></div><p className="max-w-sm text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.7)]">Choose a synthetic profile to skip typing and explore the full analysis workspace.</p></div><div className="mt-9 grid gap-3 md:grid-cols-3">{demos.isLoading ? <div className="md:col-span-3"><LoadingLines count={3} /></div> : (demos.data ?? []).slice(0, 3).map((demo) => <button key={demo.id} onClick={() => setLocation(`/app?demo=${encodeURIComponent(demo.id)}`)} className="group text-left rounded-2xl border border-[hsl(var(--primary-foreground)/.16)] bg-[hsl(var(--primary-foreground)/.06)] p-5 transition-all hover:-translate-y-1 hover:border-[hsl(var(--accent)/.8)]" data-testid={`button-demo-profile-${demo.id}`}><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--accent-foreground))]">{demo.name.slice(0, 1)}</span><ArrowRight size={17} className="text-[hsl(var(--accent))] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-7 font-display text-xl font-bold">{demo.label}</h3><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--primary-foreground)/.66)]">{demo.description}</p></button>)}</div></div></section>
      </main>
      <footer className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-7 text-xs text-[hsl(var(--muted-foreground))] sm:flex-row sm:items-center sm:justify-between lg:px-10"><BrandMark compact /><span>Prototype service · Synthetic data only · Not an official government portal</span></footer>
    </div>
  );
}