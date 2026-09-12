import { retrieveEvidenceForQuery } from "./firecrawl-rag";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_RULES = `You are Nagarik, a calm and practical assistant for Indian public-benefit schemes.

Rules:
- Help users discover schemes, understand eligibility, prepare documents, and navigate this app.
- Treat supplied local catalogue/RAG evidence as the primary source. Never invent eligibility, amounts, deadlines, documents, contacts, or application links.
- Distinguish clearly between "the cached source says" and "you should confirm".
- Never promise eligibility. Give a useful next step and mention the official source when available.
- If the question needs current information, recent deadlines, policy changes, or information not in the local evidence, use web search only when the configured Groq compound model supports it. Cite URLs in the response.
- Do not request Aadhaar numbers, passwords, OTPs, bank account numbers, or other secrets. Ask only for broad details needed to narrow options.
- Keep answers brief: usually 2-5 bullets or short paragraphs, ideally under 120 words. Use Markdown headings, bullets, bold labels, and links when useful.
- If the user asks for legal, medical, or financial certainty, explain that Nagarik provides guidance and they must confirm with the official department.
- The app supports "Myself" and "For Someone Else". The latter does not overwrite the signed-in user's saved profile.
- Answer in the user's language when obvious from the question; otherwise use clear English.`;

function cleanHistory(history: ChatMessage[]) {
  return history
    .filter((message) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
    .slice(-8)
    .map((message) => ({ role: message.role, content: message.content.slice(0, 1200) }));
}

function localContext(query: string) {
  return retrieveEvidenceForQuery(query, 8)
    .map((item, index) => `[${index + 1}] Scheme: ${item.schemeId}\nSource: ${item.source}\nURL: ${item.url ?? "not available"}\nEvidence: ${item.text.slice(0, 900)}`)
    .join("\n\n");
}

export async function answerChat(query: string, history: ChatMessage[], language = "en") {
  const apiKey = process.env["GROQ_API_KEY2"];
  if (!apiKey) throw new Error("GROQ_API_KEY2 is missing. Add it to the root .env file, then restart the API server.");
  const model = process.env["GROQ_CHAT_MODEL"] ?? "groq/compound-mini";
  const context = localContext(query);
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      max_tokens: 420,
      messages: [
        { role: "system", content: `${SYSTEM_RULES}\n- Respond in language code: ${language}.\n\nLocal evidence retrieved for this question:\n${context || "No matching local evidence was found."}` },
        ...cleanHistory(history),
        { role: "user", content: query.slice(0, 1600) },
      ],
    }),
  });
  if (!response.ok) throw new Error(`Groq chat failed (${response.status}).`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const answer = payload.choices?.[0]?.message?.content?.trim();
  if (!answer) throw new Error("Groq returned an empty answer.");
  return { answer, usedLocalEvidence: Boolean(context), model };
}