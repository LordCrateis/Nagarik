import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Bot,
  Expand,
  MessageCircle,
  Minimize2,
  RotateCcw,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useAuthSession } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";
import { apiUrl } from "@/lib/api-url";

type Message = {
  id: number;
  role: "assistant" | "user";
  text: string;
};

const quickPrompts = [
  "How do I start a benefits check?",
  "What documents should I keep ready?",
  "Can I check for someone else?",
];

const initialMessages: Message[] = [
  {
    id: 1,
    role: "assistant",
    text: "Namaste. I’m Nagarik’s guide. I can help you understand the next step, find the right place to begin, or prepare for a benefits check.",
  },
];

function inlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index} className="rounded bg-[hsl(var(--muted))] px-1 py-0.5 text-[.9em]">{part.slice(1, -1)}</code>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="font-semibold text-[hsl(var(--primary))] underline underline-offset-2">{link[1]}</a>;
    return <span key={index}>{part}</span>;
  });
}

function MarkdownMessage({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const tableRow = (line: string) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  const isTableSeparator = (line: string) => /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
  const flushList = () => {
    if (!list.length) return;
    blocks.push(<ul key={`list-${blocks.length}`} className="my-2 list-disc space-y-1 pl-5">{list.map((item, index) => <li key={index}>{inlineMarkdown(item)}</li>)}</ul>);
    list = [];
  };
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    const clean = line.trim();
    if (clean.includes("|") && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      flushList();
      const headers = tableRow(clean);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(tableRow(lines[index]));
        index += 1;
      }
      blocks.push(
        <div key={`table-${index}`} className="my-3 overflow-x-auto rounded-xl border border-[hsl(var(--border))]">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="bg-[hsl(var(--secondary)/.65)] text-[hsl(var(--foreground))]"><tr>{headers.map((header, cellIndex) => <th key={cellIndex} className="whitespace-nowrap border-b border-[hsl(var(--border))] px-3 py-2.5 font-bold">{inlineMarkdown(header)}</th>)}</tr></thead>
            <tbody>{rows.map((row, rowIndex) => <tr key={rowIndex} className="odd:bg-[hsl(var(--background)/.45)]"><td className="border-b border-[hsl(var(--border)/.65)] px-3 py-2.5 align-top font-medium">{inlineMarkdown(row[0] ?? "")}</td>{headers.slice(1).map((_, cellIndex) => <td key={cellIndex} className="border-b border-[hsl(var(--border)/.65)] px-3 py-2.5 align-top text-[hsl(var(--muted-foreground))]">{inlineMarkdown(row[cellIndex + 1] ?? "")}</td>)}</tr>)}</tbody>
          </table>
        </div>,
      );
      continue;
    }
    const bullet = clean.match(/^(?:[-*]|\d+[.)])\s+(.+)/);
    if (bullet) {
      list.push(bullet[1]);
      index += 1;
      continue;
    }
    flushList();
    if (!clean) {
      index += 1;
      continue;
    }
    if (clean.startsWith("### ")) blocks.push(<h4 key={index} className="mt-3 font-bold">{inlineMarkdown(clean.slice(4))}</h4>);
    else if (clean.startsWith("## ")) blocks.push(<h3 key={index} className="mt-3 font-display text-lg font-bold">{inlineMarkdown(clean.slice(3))}</h3>);
    else if (clean.startsWith("# ")) blocks.push(<h3 key={index} className="mt-3 font-display text-xl font-bold">{inlineMarkdown(clean.slice(2))}</h3>);
    else blocks.push(<p key={index} className="my-1">{inlineMarkdown(clean)}</p>);
    index += 1;
  }
  flushList();
  return <div className="chat-markdown">{blocks}</div>;
}

export function NagarikChatbot() {
  const { session } = useAuthSession();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const endRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, typing]);

  const send = async (value = draft) => {
    const text = value.trim();
    if (!text || typing) return;
    const history = messages.map((message) => ({ role: message.role, content: message.text }));
    setDraft("");
    setMessages((current) => [
      ...current,
      { id: nextId.current++, role: "user", text },
    ]);
    setTyping(true);
    try {
      const response = await fetch(apiUrl("/api/chat"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history, language }),
      });
      const payload = await response.json() as { answer?: string; error?: string };
      const answer = payload.answer;
      if (!response.ok || !answer) throw new Error(payload.error || "The assistant is taking a short pause.");
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: answer },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        { id: nextId.current++, role: "assistant", text: error instanceof Error ? `${error.message} Please try again in a moment.` : "The assistant is unavailable. Please try again in a moment." },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const reset = () => {
    setMessages(initialMessages);
    setDraft("");
    setTyping(false);
    setFullscreen(false);
  };

  return (
    <div
      className="fixed bottom-5 right-5 z-[60] sm:bottom-7 sm:right-7"
      data-testid="chatbot-widget"
    >
      {open && (
        <section
          className={`${fullscreen ? "fixed inset-3 m-0 h-[calc(100dvh-1.5rem)] w-auto rounded-[1.75rem] sm:inset-6 sm:h-[calc(100dvh-3rem)]" : "mb-4 h-[min(680px,calc(100dvh-7rem))] w-[min(390px,calc(100vw-2rem))] rounded-[1.75rem]"} flex origin-bottom-right flex-col overflow-hidden border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-[0_24px_80px_hsl(var(--primary)/.22)] animate-rise-in`}
          role="dialog"
          aria-label="Nagarik assistant"
          data-testid="chatbot-panel"
        >
          <header className="relative overflow-hidden bg-[hsl(var(--primary))] px-5 pb-5 pt-5 text-[hsl(var(--primary-foreground))]">
            <div className="absolute -right-8 -top-10 size-32 rounded-full bg-[hsl(var(--accent)/.2)] blur-2xl" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-[0_8px_20px_hsl(var(--accent)/.25)]">
                  <Bot size={22} />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">
                    Nagarik guide
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[hsl(var(--primary-foreground)/.7)]">
                    <span className="size-1.5 rounded-full bg-[hsl(var(--accent))]" />{" "}
                    Ready to help
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFullscreen((value) => !value)}
                  className="grid size-8 place-items-center rounded-full text-[hsl(var(--primary-foreground)/.7)] transition-colors hover:bg-[hsl(var(--primary-foreground)/.1)] hover:text-[hsl(var(--primary-foreground))]"
                  aria-label={fullscreen ? "Exit fullscreen chat" : "Expand chat fullscreen"}
                  data-testid="button-chat-fullscreen"
                >
                  {fullscreen ? <Minimize2 size={16} /> : <Expand size={16} />}
                </button>
                <button
                  type="button"
                  onClick={() => { setOpen(false); setFullscreen(false); }}
                  className="grid size-8 place-items-center rounded-full text-[hsl(var(--primary-foreground)/.7)] transition-colors hover:bg-[hsl(var(--primary-foreground)/.1)] hover:text-[hsl(var(--primary-foreground))]"
                  aria-label="Close chat"
                  data-testid="button-chat-close"
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <p className="relative mt-5 max-w-[290px] text-xs leading-relaxed text-[hsl(var(--primary-foreground)/.72)]">
              A calm place to ask what to do next with public benefits.
            </p>
          </header>

          <div
            className="flex-1 space-y-4 overflow-y-auto bg-[hsl(var(--background)/.65)] px-4 py-5"
            data-testid="chatbot-messages"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-end gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  translate="no"
                  className={`max-w-[86%] rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${message.role === "user" ? "rounded-br-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]" : "rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-sm"}`}
                >
                  {message.role === "assistant" ? <MarkdownMessage text={message.text} /> : message.text}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
                <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-3">
                  <span className="size-1.5 animate-pulse rounded-full bg-[hsl(var(--primary))]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[hsl(var(--primary))] [animation-delay:150ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[hsl(var(--primary))] [animation-delay:300ms]" />
                </span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 pb-4 pt-3">
            {messages.length === 1 && (
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => send(prompt)}
                    className="shrink-0 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2 text-left text-[11px] font-semibold text-[hsl(var(--primary))] transition-colors hover:border-[hsl(var(--accent))] hover:bg-[hsl(var(--secondary))]"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            <form
              className="flex items-end gap-2 rounded-2xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] p-2 focus-within:border-[hsl(var(--primary))]"
              onSubmit={(event) => {
                event.preventDefault();
                send();
              }}
            >
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                rows={1}
                placeholder={
                  session
                    ? `Ask about your next step, ${session.name.split(" ")[0]}...`
                    : "Answer what you know."
                }
                className="max-h-24 min-h-9 flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[hsl(var(--muted-foreground))]"
                aria-label="Message Nagarik"
                data-testid="input-chat-message"
              />
              <button
                type="submit"
                disabled={!draft.trim() || typing}
                className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
                data-testid="button-chat-send"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <Sparkles size={11} /> Guidance, not a final decision
              </span>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 font-semibold hover:text-[hsl(var(--primary))]"
                data-testid="button-chat-reset"
              >
                <RotateCcw size={11} /> Reset
              </button>
            </div>
          </div>
        </section>
      )}

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative grid size-[4.25rem] place-items-center rounded-[1.55rem] bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-[0_14px_35px_hsl(var(--primary)/.28)] transition-all hover:-translate-y-1 hover:rounded-[1.35rem] hover:shadow-[0_18px_42px_hsl(var(--primary)/.35)] animate-float-soft"
          aria-label="Open Nagarik assistant"
          data-testid="button-chat-open"
        >
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full border-2 border-[hsl(var(--background))] bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]">
            <span className="size-1.5 rounded-full bg-current" />
          </span>
          <MessageCircle
            size={25}
            className="transition-transform group-hover:scale-110"
          />
          <span className="pointer-events-none absolute bottom-full right-0 mb-3 whitespace-nowrap rounded-lg bg-[hsl(var(--foreground))] px-3 py-2 text-xs font-semibold text-[hsl(var(--background))] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
            Ask Nagarik
          </span>
        </button>
      )}
    </div>
  );
}
