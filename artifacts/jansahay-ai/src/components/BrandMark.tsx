import { ShieldCheck } from 'lucide-react';

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="brand-mark">
      <span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--accent))] text-[hsl(var(--primary))] shadow-sm">
        <ShieldCheck size={20} strokeWidth={2.3} />
      </span>
      {!compact && (
        <span className="font-display text-[1.35rem] font-bold tracking-[-.035em]">
          JanSahay <span className="text-[hsl(var(--accent-foreground))]">AI</span>
        </span>
      )}
    </span>
  );
}