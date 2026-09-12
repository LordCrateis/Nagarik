import { useEffect, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { languageNames, useLanguage, type Language } from "@/lib/i18n";

const languageMeta: Record<Language, { code: string; name: string }> = {
  en: { code: "EN", name: "English" }, hi: { code: "हि", name: "हिन्दी" }, mr: { code: "म", name: "मराठी" }, bn: { code: "বা", name: "বাংলা" },
  te: { code: "తె", name: "తెలుగు" }, ta: { code: "த", name: "தமிழ்" }, gu: { code: "ગુ", name: "ગુજરાતી" }, kn: { code: "ಕ", name: "ಕನ್ನಡ" },
  ml: { code: "മ", name: "മലയാളം" }, pa: { code: "ਪੰ", name: "ਪੰਜਾਬੀ" }, or: { code: "ଓ", name: "ଓଡ଼ିଆ" }, as: { code: "অ", name: "অসমীয়া" },
};

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);
  const active = languageMeta[language];

  return <div translate="no" className="relative" onClick={(event) => event.stopPropagation()}>
    <button type="button" onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="listbox" aria-label={t("Choose language")} className="inline-flex h-10 items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.88)] px-2.5 text-sm font-bold text-[hsl(var(--foreground))] shadow-sm transition-all hover:-translate-y-0.5 hover:border-[hsl(var(--primary)/.5)] hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[hsl(var(--primary)/.14)]" data-testid="button-language-menu">
      <span className="grid size-6 place-items-center rounded-full bg-[hsl(var(--secondary))] text-[11px] font-extrabold text-[hsl(var(--primary))]">{active.code}</span><span className="hidden sm:inline">{active.name}</span><Languages size={15} className="text-[hsl(var(--primary))]" /><ChevronDown size={14} className={`text-[hsl(var(--muted-foreground))] transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
    {open && <div role="listbox" className="absolute right-0 z-40 mt-2 grid max-h-[min(28rem,calc(100dvh-5rem))] w-56 grid-cols-1 touch-pan-y overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-1.5 shadow-[0_18px_45px_hsl(var(--foreground)/.18)] animate-in fade-in-0 zoom-in-95">
      <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">{t("Choose language")}</p>
      {(Object.keys(languageNames) as Language[]).map((key) => { const selected = key === language; return <button key={key} type="button" role="option" aria-selected={selected} onClick={() => { setLanguage(key); setOpen(false); }} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${selected ? "bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]" : "hover:bg-[hsl(var(--muted))]"}`}><span className="grid size-7 place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[11px] font-extrabold">{languageMeta[key].code}</span><span className="flex-1 font-semibold">{languageMeta[key].name}</span>{selected && <Check size={16} strokeWidth={2.5} />}</button>; })}
    </div>}
  </div>;
}

