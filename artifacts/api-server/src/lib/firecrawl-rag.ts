import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { CitizenProfile } from "@workspace/api-zod";

type Chunk = { schemeId: string; source: string; url?: string; text: string; terms: Set<string>; requiresStudent: boolean; requiresFarmer: boolean; requiresDisability: boolean };
type LocalScheme = {
  schemeId?: string;
  name?: string; shortDescription?: string; fullDescription?: string; category?: string; eligibilityRules?: unknown;
  rawLocalEvidence?: Array<{ officialPages?: Array<{ url?: string; markdown?: string }> }>;
  enrichmentOverlays?: Array<{ fields?: unknown; fieldEvidence?: unknown }>;
  searchAndRagDocuments?: Array<{ sourceUrl?: string; title?: string; text?: string }>;
};

let chunks: Chunk[] | undefined;

function words(value: string): string[] {
  return value.toLowerCase().replace(/[^a-z0-9₹]+/g, " ").split(" ").filter((word) => word.length > 2 || /^\d+$/.test(word) || word === "sc" || word === "st");
}

function splitIntoChunks(text: string): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  const result: string[] = [];
  for (let start = 0; start < clean.length; start += 850) {
    const piece = clean.slice(start, start + 1000).trim();
    if (piece) result.push(piece);
  }
  return result;
}

function inferredProfileContext(profile: CitizenProfile) {
  const occupation = profile.occupation.toLowerCase();
  const documents = profile.availableDocuments.join(" ").toLowerCase();
  return {
    student: profile.studentStatus || /student|school|college|university|course/.test(occupation),
    farmer: profile.farmerStatus || /farmer|agricultur|cultivat|kisan/.test(occupation),
    disability: profile.disabilityStatus || /disabilit|divyang|pwd/.test(documents),
  };
}

function flatten(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(flatten).join("\n");
  if (value && typeof value === "object") return Object.values(value).map(flatten).join("\n");
  return "";
}

function loadChunks(): Chunk[] {
  if (chunks) return chunks;
  try {
    // The source path and bundled dist path differ, so accept either layout as
    // well as the normal API-server working directory.
    const files = [
      new URL("../../../../.firecrawl/for_gem.json", import.meta.url),
      new URL("../../../.firecrawl/for_gem.json", import.meta.url),
      resolve(process.cwd(), ".firecrawl/for_gem.json"),
      resolve(process.cwd(), "../../.firecrawl/for_gem.json"),
    ];
    const file = files.find((candidate) => existsSync(candidate));
    if (!file) throw new Error("Local Firecrawl RAG corpus not found.");
    const payload = JSON.parse(readFileSync(file, "utf8")) as { schemes?: LocalScheme[] };
    chunks = (payload.schemes ?? []).flatMap((scheme) => {
      if (!scheme.schemeId) return [];
      const schemeText = `${scheme.name ?? ""}\n${scheme.shortDescription ?? ""}\n${scheme.fullDescription ?? ""}\n${flatten(scheme.eligibilityRules)}`.toLowerCase();
      const requiresStudent = /\bstudents?\b|\bscholarship\b|pre[- ]?matric|post[- ]?matric|\bschool\b|\bcollege\b|\buniversity\b|\beducation\b|\btuition\b|\bvocational\b/.test(schemeText);
      const requiresFarmer = /\bfarmer\b|\bkrishak\b|\bcultivator\b|\bagricultur/.test(schemeText);
      const requiresDisability = /disabilit|divyang|\bpwd\b/.test(schemeText);
      const evidence: Array<{ source: string; url?: string; text: string }> = [];
      for (const entry of scheme.rawLocalEvidence ?? []) for (const page of entry.officialPages ?? []) {
        if (page.markdown) evidence.push({ source: "cached official page", url: page.url, text: page.markdown });
      }
      for (const overlay of scheme.enrichmentOverlays ?? []) {
        const text = `${flatten(overlay.fields)}\n${flatten(overlay.fieldEvidence)}`.trim();
        if (text) evidence.push({ source: "cached enrichment evidence", text });
      }
      for (const document of scheme.searchAndRagDocuments ?? []) {
        if (document.text) evidence.push({ source: document.title ?? "cached RAG document", url: document.sourceUrl, text: document.text });
      }
      return evidence.flatMap((item) => splitIntoChunks(item.text).map((text) => ({ schemeId: scheme.schemeId!, source: item.source, url: item.url, text, terms: new Set(words(text)), requiresStudent, requiresFarmer, requiresDisability })));
    });
  } catch {
    chunks = [];
  }
  return chunks;
}

function profileQuery(profile: CitizenProfile): Set<string> {
  const context = inferredProfileContext(profile);
  const facts = [
    profile.name,
    String(profile.age),
    profile.gender,
    profile.state,
    profile.district,
    profile.occupation,
    String(profile.annualIncome),
    `family size ${profile.familySize}`,
    profile.category,
    profile.employmentStatus,
    profile.housingStatus,
    profile.maritalStatus,
    profile.landSize === null ? "no land size recorded" : `land size ${profile.landSize}`,
    profile.urgency ?? "",
    ...profile.availableDocuments,
  ];
  if (context.student) facts.push("student education scholarship school college course");
  if (context.farmer) facts.push("farmer agriculture cultivation land crop irrigation");
  if (context.disability) facts.push("disability divyang pwd");
  const gender = profile.gender.toLowerCase();
  if (gender === "woman") facts.push("woman female girl");
  if (gender === "man") facts.push("man male");
  if (gender === "non-binary") facts.push("non binary transgender");
  const category = profile.category.toLowerCase();
  if (category === "sc") facts.push("sc scheduled caste");
  if (category === "st") facts.push("st scheduled tribe");
  if (category === "obc") facts.push("obc other backward class");
  if (category === "ews") facts.push("ews economically weaker section");
  facts.push("age");
  if (profile.age >= 60) facts.push("senior elderly pension old age");
  if (profile.annualIncome > 0) facts.push("income annual family household financial assistance");
  return new Set(words(facts.join(" ")));
}

function profileSignals(profile: CitizenProfile): Set<string> {
  const context = inferredProfileContext(profile);
  const values = [profile.state, profile.district, profile.occupation, profile.category, profile.gender];
  if (context.student) values.push("student education scholarship school college course");
  if (context.farmer) values.push("farmer agriculture cultivation land crop irrigation");
  if (context.disability) values.push("disability divyang pwd");
  if (profile.landSize !== null && profile.landSize !== undefined) values.push("land holder cultivation");
  if (profile.gender.toLowerCase() === "woman") values.push("female girl");
  if (profile.gender.toLowerCase() === "man") values.push("male");
  if (profile.category.toLowerCase() === "sc") values.push("scheduled caste");
  if (profile.category.toLowerCase() === "st") values.push("scheduled tribe");
  if (profile.category.toLowerCase() === "obc") values.push("other backward class");
  if (profile.category.toLowerCase() === "ews") values.push("economically weaker section");
  return new Set(words(values.join(" ")));
}

/**
 * Standard RAG retrieval: rank the whole cache first, then group the strongest
 * passages by scheme. Generic document/income language alone cannot retrieve a
 * passage; it must also match a profile-specific signal such as state, category,
 * gender, occupation, student/farmer/disability status, or land.
 */
export function retrieveEvidenceByScheme(profile: CitizenProfile, globalLimit = 64, perSchemeLimit = 2) {
  const query = profileQuery(profile);
  const signals = profileSignals(profile);
  const context = inferredProfileContext(profile);
  const matches = loadChunks()
    .map((chunk) => ({
      chunk,
      score: [...query].reduce((sum, term) => sum + (chunk.terms.has(term) ? 1 : 0), 0),
      signalScore: [...signals].reduce((sum, term) => sum + (chunk.terms.has(term) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.signalScore > 0)
    .filter(({ chunk }) => !((chunk.requiresStudent && !context.student) || (chunk.requiresFarmer && !context.farmer) || (chunk.requiresDisability && !context.disability)))
    .sort((left, right) => right.score - left.score)
    .slice(0, globalLimit);
  const grouped = new Map<string, Array<{ source: string; url?: string; text: string }>>();
  for (const { chunk } of matches) {
    const evidence = grouped.get(chunk.schemeId) ?? [];
    if (evidence.length < perSchemeLimit) evidence.push({ source: chunk.source, url: chunk.url, text: chunk.text });
    grouped.set(chunk.schemeId, evidence);
  }
  return grouped;
}

export function firecrawlRagStatus() {
  const indexed = loadChunks();
  return { indexedChunks: indexed.length, indexedSchemes: new Set(indexed.map((chunk) => chunk.schemeId)).size };
}

export function retrieveEvidenceForQuery(query: string, limit = 8) {
  const queryTerms = new Set(words(query));
  return loadChunks()
    .map((chunk) => ({
      chunk,
      score: [...queryTerms].reduce((sum, term) => sum + (chunk.terms.has(term) ? 1 : 0), 0),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ chunk }) => ({ schemeId: chunk.schemeId, source: chunk.source, url: chunk.url, text: chunk.text }));
}
