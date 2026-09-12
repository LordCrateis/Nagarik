export function NagarikEmblem({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M32 8.5 51 16v14.2c0 11.8-7.5 20.3-19 25.3-11.5-5-19-13.5-19-25.3V16l19-7.5Z" fill="currentColor" />
      <circle cx="32" cy="24" r="4.7" fill="hsl(var(--accent))" />
      <path d="M22.5 43.5c1.8-7 5-10.5 9.5-10.5s7.7 3.5 9.5 10.5" stroke="hsl(var(--accent))" strokeWidth="4" strokeLinecap="round" />
      <path d="m43.3 18.1 1.25 2.85 2.85 1.25-2.85 1.25-1.25 2.85-1.25-2.85-2.85-1.25 2.85-1.25 1.25-2.85Z" fill="hsl(var(--accent))" />
    </svg>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="brand-mark">
      <span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-sm">
        <NagarikEmblem className="size-5" />
      </span>
      {!compact && <span className="font-sans text-[1.35rem] font-bold tracking-[-.035em]">Nagarik</span>}
    </span>
  );
}
