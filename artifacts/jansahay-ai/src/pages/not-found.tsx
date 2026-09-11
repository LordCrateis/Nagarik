import { ArrowLeft, Compass } from 'lucide-react';
import { Link } from 'wouter';
import { BrandMark } from '@/components/BrandMark';

export default function NotFound() {
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))] px-5 py-6">
      <div className="mx-auto max-w-5xl"><Link href="/" data-testid="link-404-logo"><BrandMark /></Link></div>
      <main className="mx-auto flex max-w-5xl flex-col items-center px-4 py-28 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]"><Compass size={30} /></span>
        <p className="mt-8 text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--primary))]">Wrong turn</p>
        <h1 className="mt-3 font-display text-5xl font-bold tracking-[-.05em] sm:text-6xl">This page is not on the map.</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">The link may have moved. Head back to JanSahay and start from a clearer place.</p>
        <Link href="/" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]" data-testid="link-404-home"><ArrowLeft size={16} /> Return home</Link>
      </main>
    </div>
  );
}
