import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FileCheck2, LogOut, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useHealthCheck, useListSchemes } from '@workspace/api-client-react';
import { BrandMark } from '@/components/BrandMark';
import { EmptyState, LoadingLines, SectionKicker } from '@/components/Primitives';
import { SchemeDetailDialog } from '@/components/SchemeDetailDialog';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { logOut, useAuthSession } from '@/lib/auth';

const SCHEMES_PER_PAGE = 6;

function paginationItems(currentPage: number, pageCount: number): Array<number | 'ellipsis'> {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, index) => index + 1);

  const pages = [...new Set([1, pageCount, currentPage - 1, currentPage, currentPage + 1])]
    .filter((page) => page >= 1 && page <= pageCount)
    .sort((a, b) => a - b);
  const items: Array<number | 'ellipsis'> = [];
  pages.forEach((page, index) => {
    if (index > 0 && page - pages[index - 1] > 1) items.push('ellipsis');
    items.push(page);
  });
  return items;
}

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const health = useHealthCheck();
  const schemes = useListSchemes();
  const [schemePage, setSchemePage] = useState(1);
  const [selectedSchemeId, setSelectedSchemeId] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const { session } = useAuthSession();
  const benefitsPath = session ? '/app' : '/login';
  const schemeList = schemes.data ?? [];
  const selectedScheme = schemeList.find((scheme) => scheme.id === selectedSchemeId) ?? null;
  const schemePageCount = Math.max(1, Math.ceil(schemeList.length / SCHEMES_PER_PAGE));
  const visibleSchemes = schemeList.slice(
    (schemePage - 1) * SCHEMES_PER_PAGE,
    schemePage * SCHEMES_PER_PAGE,
  );

  useEffect(() => {
    if (schemePage > schemePageCount) setSchemePage(schemePageCount);
  }, [schemePage, schemePageCount]);

  const goToSchemePage = (page: number) => {
    setSchemePage(page);
    document.getElementById('schemes')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="grain min-h-[100dvh] overflow-hidden bg-[hsl(var(--background))]">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 lg:px-10" data-testid="header-public">
        <div className="flex items-center gap-3"><BrandMark /><LanguageSwitcher /></div>
        <nav className="hidden items-center gap-7 text-sm font-semibold text-[hsl(var(--muted-foreground))] md:flex">
          <a href="#how-it-works" className="transition-colors hover:text-[hsl(var(--foreground))]" data-testid="link-how-it-works">How it works</a>
          <a href="#schemes" className="transition-colors hover:text-[hsl(var(--foreground))]" data-testid="link-schemes">Explore schemes</a>
          {session ? <div className="relative"><button type="button" onClick={() => setProfileOpen((open) => !open)} className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] px-3.5 py-2 text-[hsl(var(--foreground))] transition-colors hover:border-[hsl(var(--primary))]" data-testid="button-profile-header" aria-expanded={profileOpen}><ProfileAvatar name={session.name} avatarUrl={session.avatarUrl} /><span className="max-w-28 truncate">{session.name || 'Profile'}</span><ChevronDown size={15} className={`transition-transform ${profileOpen ? 'rotate-180' : ''}`} /></button>{profileOpen && <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-xl"><Link href="/app" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--secondary))]">Open workspace</Link><Link href="/profile" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--secondary))]">Profile settings</Link><button type="button" onClick={() => { logOut(); setProfileOpen(false); setLocation('/'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]" data-testid="button-log-out"><LogOut size={15} /> Log out</button></div>}</div> : <><Link href="/login" className="transition-colors hover:text-[hsl(var(--foreground))]" data-testid="link-login-header">Log in</Link><Link href="/create-account" className="rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5" data-testid="link-start-header">Create account</Link></>}
        </nav>
        {session ? <div className="relative md:hidden"><button type="button" onClick={() => setProfileOpen((open) => !open)} className="grid size-10 place-items-center rounded-full border border-[hsl(var(--border))]" data-testid="button-profile-mobile" aria-expanded={profileOpen} aria-label="Open profile menu"><ProfileAvatar name={session.name} avatarUrl={session.avatarUrl} size="size-7" /></button>{profileOpen && <div className="absolute right-0 top-full z-20 mt-2 w-40 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-xl"><Link href="/app" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--secondary))]">Workspace</Link><Link href="/profile" onClick={() => setProfileOpen(false)} className="block rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-[hsl(var(--secondary))]">Profile</Link><button type="button" onClick={() => { logOut(); setProfileOpen(false); setLocation('/'); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/.08)]" data-testid="button-log-out-mobile"><LogOut size={15} /> Log out</button></div>}</div> : <Link href="/create-account" className="rounded-full bg-[hsl(var(--primary))] px-4 py-2 text-sm font-semibold text-[hsl(var(--primary-foreground))] md:hidden" data-testid="link-start-mobile">Create account</Link>}
      </header>

      <main>
        <section className="relative mx-auto grid max-w-7xl gap-12 px-5 pb-20 pt-12 lg:grid-cols-[1.04fr_.96fr] lg:items-center lg:px-10 lg:pb-28 lg:pt-20">
          <div className="animate-rise-in">
            <div className="mb-7 flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--primary))]"><span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--accent))]"><ShieldCheck size={14} /></span> A clearer route to public support</div>
            <h1 className="max-w-3xl font-display text-[clamp(3.5rem,8vw,7.5rem)] font-bold leading-[.9] tracking-[-.06em] text-[hsl(var(--foreground))]">Know what<br /><span className="text-[hsl(var(--primary))]">comes next.</span></h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-[hsl(var(--muted-foreground))]">Nagarik turns a complicated benefits search into a simple, explainable plan — what may fit, what cannot be combined, and which document to find first.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href={benefitsPath} className="group inline-flex items-center justify-center gap-3 rounded-full bg-[hsl(var(--primary))] px-6 py-3.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-[0_10px_24px_hsl(var(--primary)/.18)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_28px_hsl(var(--primary)/.24)]" data-testid="link-start-journey">Find my possible benefits <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" /></Link>
              <span className="text-xs text-[hsl(var(--muted-foreground))]">Takes about 2 minutes</span>
            </div>
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
            <div><SectionKicker>The Nagarik way</SectionKicker><h2 className="max-w-md font-display text-4xl font-bold leading-[.98] tracking-[-.04em] sm:text-5xl">Less guesswork.<br /><span className="text-[hsl(var(--primary))]">More confidence.</span></h2><p className="mt-5 max-w-sm leading-relaxed text-[hsl(var(--muted-foreground))]">We show the reasoning behind every result so you can decide what to do with it.</p></div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[{ n: '01', icon: Search, title: 'Tell us about you', copy: 'A few practical details. No account or paperwork upload required.' }, { n: '02', icon: FileCheck2, title: 'We compare the rules', copy: 'Eligibility, overlaps, missing information and documents — together.' }, { n: '03', icon: MapPin, title: 'Take the next step', copy: 'A ranked bundle and a local-office-ready checklist.' }].map(({ n, icon: Icon, title, copy }) => <div key={n} className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-5 transition-transform hover:-translate-y-1"><span className="text-xs font-bold text-[hsl(var(--accent-foreground))]">{n}</span><Icon className="my-7 text-[hsl(var(--primary))]" size={23} /><h3 className="font-display text-xl font-bold">{title}</h3><p className="mt-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{copy}</p></div>)}
            </div>
          </div>
        </section>

        <section id="schemes" className="mx-auto max-w-7xl px-5 py-16 lg:px-10 lg:py-24">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><SectionKicker>Inside the navigator</SectionKicker><h2 className="font-display text-4xl font-bold tracking-[-.04em] sm:text-5xl">Built around real decisions.</h2></div><p className="max-w-xs text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">Explore sourced government schemes with eligibility, benefits, and application requirements.</p></div>
          <div className="mt-9 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {schemes.isLoading ? <div className="md:col-span-2 lg:col-span-3"><LoadingLines count={3} /></div> : schemes.isError ? <div className="md:col-span-2 lg:col-span-3"><EmptyState title="Scheme library is resting" detail="Start a check and we’ll reconnect automatically." /></div> : visibleSchemes.map((scheme) => <button type="button" onClick={() => setSelectedSchemeId(scheme.id)} key={scheme.id} className="group rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5 text-left transition-all hover:-translate-y-1 hover:border-[hsl(var(--accent))] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--primary)/.15)]" data-testid={`card-scheme-${scheme.id}`}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[hsl(var(--secondary))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[hsl(var(--primary))]">{scheme.category}</span><ChevronRight size={16} className="text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-1" /></div><h3 className="mt-8 font-display text-2xl font-bold">{scheme.name}</h3><p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">{scheme.description}</p><div className="mt-5 border-t border-[hsl(var(--border))] pt-4 text-sm font-semibold text-[hsl(var(--primary))]">{scheme.benefit}</div></button>)}
          </div>
          {!schemes.isLoading && !schemes.isError && schemePageCount > 1 && <nav className="mt-8 flex items-center justify-center gap-1.5" aria-label="Scheme pages" data-testid="pagination-schemes">
            <button type="button" onClick={() => goToSchemePage(schemePage - 1)} disabled={schemePage === 1} className="grid size-9 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))] disabled:pointer-events-none disabled:opacity-35" aria-label="Previous scheme page" data-testid="button-schemes-previous"><ChevronLeft size={16} /></button>
            {paginationItems(schemePage, schemePageCount).map((item, index) => item === 'ellipsis' ? <span key={`ellipsis-${index}`} className="grid size-9 place-items-center text-sm text-[hsl(var(--muted-foreground))]" aria-hidden="true">…</span> : <button key={item} type="button" onClick={() => goToSchemePage(item)} aria-current={item === schemePage ? 'page' : undefined} className={`grid size-9 place-items-center rounded-full text-sm font-bold transition-colors ${item === schemePage ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'border border-[hsl(var(--border))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))]'}`} data-testid={`button-schemes-page-${item}`}>{item}</button>)}
            <button type="button" onClick={() => goToSchemePage(schemePage + 1)} disabled={schemePage === schemePageCount} className="grid size-9 place-items-center rounded-full border border-[hsl(var(--border))] text-[hsl(var(--primary))] transition-colors hover:bg-[hsl(var(--secondary))] disabled:pointer-events-none disabled:opacity-35" aria-label="Next scheme page" data-testid="button-schemes-next"><ChevronRight size={16} /></button>
          </nav>}
          <div className="mt-10 flex flex-col items-start justify-between gap-5 rounded-2xl bg-[hsl(var(--secondary)/.55)] p-6 sm:flex-row sm:items-center sm:px-8"><div><p className="font-display text-2xl font-bold">Want a personalised answer?</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Create your profile once, then continue with your situation.</p></div><Link href="/create-account" className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-start-bottom">Create my account <ArrowRight size={16} /></Link></div>
        </section>

      </main>
      <footer className="bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]">
        <div className="mx-auto max-w-7xl px-5 py-12 lg:px-10 lg:py-16">
          <div className="grid gap-10 border-b border-[hsl(var(--sidebar-foreground)/.14)] pb-10 md:grid-cols-2 lg:grid-cols-[1.4fr_.7fr_.9fr]">
            <div className="max-w-md">
              <BrandMark />
              <p className="mt-5 text-sm leading-7 text-[hsl(var(--sidebar-foreground)/.68)]">
                A clearer, calmer way to understand possible public benefits and prepare for the next step.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--sidebar-foreground)/.14)] bg-[hsl(var(--sidebar-foreground)/.06)] px-3 py-2 text-xs font-medium text-[hsl(var(--sidebar-foreground)/.78)]">
                <ShieldCheck size={14} className="text-[hsl(var(--accent))]" />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--accent))]">Explore</p>
              <nav className="mt-5 flex flex-col items-start gap-3 text-sm text-[hsl(var(--sidebar-foreground)/.72)]" aria-label="Footer navigation">
                <a href="#how-it-works" className="transition-colors hover:text-[hsl(var(--sidebar-foreground))]">How it works</a>
                <a href="#schemes" className="transition-colors hover:text-[hsl(var(--sidebar-foreground))]">Explore schemes</a>
                <Link href="/create-account" className="transition-colors hover:text-[hsl(var(--sidebar-foreground))]">Create an account</Link>
                <Link href="/login" className="transition-colors hover:text-[hsl(var(--sidebar-foreground))]">Log in</Link>
              </nav>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[.16em] text-[hsl(var(--accent))]">Built with clarity</p>
              <p className="mt-5 text-sm leading-7 text-[hsl(var(--sidebar-foreground)/.68)]">
                Results explain possible matches, scheme conflicts, and document requirements in plain language.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-[hsl(var(--sidebar-foreground)/.5)] sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Nagarik. Public support, made easier to understand.</p>
            <p>Public support, made easier to understand.</p>
          </div>
        </div>
      </footer>
      <SchemeDetailDialog scheme={selectedScheme} onClose={() => setSelectedSchemeId(null)} />
    </div>
  );
}
