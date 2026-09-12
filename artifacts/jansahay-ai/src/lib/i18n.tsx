import { Children, cloneElement, createContext, isValidElement, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from "react";
import sharedMessages from "@/i18n/messages.json";
import { nagarikMessages } from "@/i18n/nagarikMessages";

export type Language = "en" | "hi" | "mr" | "bn" | "te" | "ta" | "gu" | "kn" | "ml" | "pa" | "or" | "as";

export const languageNames: Record<Language, string> = {
  en: "English", hi: "हिन्दी", mr: "मराठी", bn: "বাংলা", te: "తెలుగు", ta: "தமிழ்",
  gu: "ગુજરાતી", kn: "ಕನ್ನಡ", ml: "മലയാളം", pa: "ਪੰਜਾਬੀ", or: "ଓଡ଼ିଆ", as: "অসমীয়া",
};

const localeCodes: Record<Language, string> = {
  en: "en-IN", hi: "hi-IN", mr: "mr-IN", bn: "bn-IN", te: "te-IN", ta: "ta-IN",
  gu: "gu-IN", kn: "kn-IN", ml: "ml-IN", pa: "pa-IN", or: "or-IN", as: "as-IN",
};

const catalogs = sharedMessages as Record<string, Record<string, string>>;
const legacyKeys: Record<string, string> = {
  language: "Language", openWorkspace: "Open workspace", profileSettings: "Profile settings", profile: "Profile", logOut: "Log out", login: "Log in", createAccount: "Create account", findBenefits: "Find my possible benefits", howItWorks: "How it works", exploreSchemes: "Explore schemes", benefitNavigator: "Benefit navigator", myself: "Myself", forSomeoneElse: "For Someone Else", situation: "Situation", documents: "Documents", continue: "Continue", previous: "Previous", findPossibleBenefits: "Find my possible benefits", buildingPlan: "Building your plan", yourSituation: "Your situation", theirSituation: "Their situation", documentsYouHave: "Documents you have", whatYouKnow: "Answer what you know.",
};
const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
const escapePattern = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function dictionaryFor(language: Language) {
  return { ...(catalogs[language] ?? {}), ...(nagarikMessages[language] ?? {}) };
}

function translateTree(root: ParentNode, language: Language) {
  const shouldSkip = (element: Element | null) => Boolean(element?.closest("[translate='no'], script, style, code, pre, textarea"));
  const textWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (textWalker.nextNode()) textNodes.push(textWalker.currentNode as Text);
  for (const node of textNodes) {
    if (!node.nodeValue || shouldSkip(node.parentElement)) continue;
    const source = originalText.get(node) ?? node.nodeValue;
    originalText.set(node, source);
    const translated = translateText(source, language);
    if (node.nodeValue !== translated) node.nodeValue = translated;
  }
  const attributeElements = root.querySelectorAll?.("[placeholder], [title], [alt], [aria-label]") ?? [];
  for (const element of attributeElements) {
    if (shouldSkip(element)) continue;
    const originals = originalAttributes.get(element) ?? {};
    for (const attribute of ["placeholder", "title", "alt", "aria-label"]) {
      const current = element.getAttribute(attribute);
      if (current === null) continue;
      const source = originals[attribute] ?? current;
      originals[attribute] = source;
      const translated = translateText(source, language);
      if (current !== translated) element.setAttribute(attribute, translated);
    }
    originalAttributes.set(element, originals);
  }
}

function translateText(text: string, language: Language): string {
  if (language === "en" || !text.trim()) return text;
  const dictionary = dictionaryFor(language);
  const key = normalize(text);
  const exact = dictionary[key];
  if (exact) return text.replace(text.trim(), exact);

  for (const [source, target] of Object.entries(dictionary)) {
    if (!/\{\d+\}/.test(source)) continue;
    const pattern = new RegExp(`^${source.split(/(\{\d+\})/).map((part) => /^\{\d+\}$/.test(part) ? "(.+?)" : escapePattern(part)).join("")}$`);
    const match = key.match(pattern);
    if (match) return target.replace(/\{(\d+)\}/g, (_, index) => dictionary[normalize(match[Number(index) + 1])] ?? match[Number(index) + 1]);
  }

  return text.split(/(\s*[·|]\s*|\n)/).map((part) => dictionary[normalize(part)] ?? part).join("");
}

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (text: string) => string;
  formatDate: (value: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
};
const LanguageContext = createContext<LanguageContextValue | null>(null);

function validLanguage(value: string | null): value is Language {
  return Boolean(value && Object.prototype.hasOwnProperty.call(languageNames, value));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = typeof window === "undefined" ? null : localStorage.getItem("nagarik-locale");
    return validLanguage(saved) ? saved : "en";
  });

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try { localStorage.setItem("nagarik-locale", next); } catch { /* The UI still works when browser storage is unavailable. */ }
  };

  useEffect(() => {
    document.documentElement.lang = localeCodes[language];
    const run = () => translateTree(document.body, language);
    run();
    const observer = new MutationObserver(() => queueMicrotask(run));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["placeholder", "title", "alt", "aria-label"] });
    return () => observer.disconnect();
  }, [language]);

  const value = useMemo<LanguageContextValue>(() => ({
    language,
    setLanguage,
    t: (text) => translateText(legacyKeys[text] ?? text, language),
    formatDate: (input, options) => new Intl.DateTimeFormat(localeCodes[language], options).format(new Date(input)),
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage must be used inside LanguageProvider");
  return value;
}

/** Localizes interface copy at React boundaries. Dynamic/user/API values use translate="no". */
export function LocalizedContent({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const visit = (node: ReactNode): ReactNode => {
    if (typeof node === "string") return t(node);
    if (Array.isArray(node)) return Children.map(node, visit);
    if (!isValidElement(node)) return node;
    const element = node as ReactElement<Record<string, unknown>>;
    if (element.props.translate === "no") return element;
    const props: Record<string, unknown> = {};
    if (typeof element.type === "string") {
      for (const attribute of ["placeholder", "title", "alt", "aria-label"]) {
        if (typeof element.props[attribute] === "string") props[attribute] = t(element.props[attribute] as string);
      }
      if (element.type === "option" && element.props.value === undefined && typeof element.props.children === "string") props.value = element.props.children;
    }
    if (element.props.children !== undefined) props.children = visit(element.props.children as ReactNode);
    return cloneElement(element, props);
  };
  return <>{visit(children)}</>;
}
