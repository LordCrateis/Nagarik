import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoDir = path.resolve(scriptDir, "..");
const cacheDir = path.join(repoDir, ".firecrawl");
const outputPath = path.join(cacheDir, "deduped-schemes.json");
const ragPath = path.join(cacheDir, "rag-documents.json");

const sourcePriority = {
  myscheme: 1,
  "eshram-welfare": 2,
  "national-scholarship-portal": 2,
  jansamarth: 2,
  mahadbt: 3,
};

const aliasGroups = [
  ["ayushman bharat pmjay", "ayushman bharat pradhan mantri jan arogya yojana"],
  ["pmay g", "pradhan mantri awaas yojana gramin", "pradhan mantri awas yojana gramin"],
  ["pm kisan mandhan", "pradhan mantri kisan mandhan yojana"],
  ["pm svanidhi", "pradhan mantri street vendor atmanirbhar nidhi"],
  ["pmjjby", "pradhan mantri jeevan jyoti yojana"],
  ["pmsby", "pradhan mantri suraksha bima yojana"],
  ["atal pension yojana", "apy"],
  ["national scholarship postgraduate studies", "national scholarship for post graduate studies"],
];

const aliasMap = new Map();
for (const group of aliasGroups) {
  for (const alias of group) aliasMap.set(alias, group[0]);
}

function cleanName(value) {
  return value
    .replace(/\\+/g, "")
    .replace(/\[[^\]]*\]\([^)]*\)/g, "")
    // Remove acronym annotations such as (AB-PMJAY), but retain meaningful
    // geographic or eligibility qualifiers such as (Punjab).
    .replace(/\(([A-Z0-9][A-Z0-9-]{1,12})\)/g, "")
    .replace(/[–—]/g, "-")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalKey(name) {
  const cleaned = cleanName(name).toLowerCase();
  if (aliasMap.has(cleaned)) return aliasMap.get(cleaned);
  const tokens = cleaned
    .split(" ")
    .filter((token) => !["the", "scheme", "yojana", "programme", "program", "for", "of", "and", "to", "government", "india"].includes(token));
  return tokens.join(" ");
}

function providerFor(url) {
  if (url.includes("myscheme.gov.in/schemes/")) return "myscheme";
  if (url.includes("eshram.gov.in")) return "eshram-welfare";
  if (url.includes("scholarships.gov.in")) return "national-scholarship-portal";
  if (url.includes("mahadbt.maharashtra.gov.in")) return "mahadbt";
  if (url.includes("jansamarth.in") || url.includes("financialservices.gov.in") || url.includes("pib.gov.in")) return "jansamarth";
  return null;
}

function candidate(name, document, provider, content, extra = {}) {
  const cleanedName = cleanName(name);
  if (!cleanedName || !content || cleanedName.length < 4) return null;
  return {
    canonicalKey: canonicalKey(cleanedName),
    name: cleanedName,
    provider,
    url: document.url,
    title: document.title ?? cleanedName,
    content,
    sourcePriority: sourcePriority[provider] ?? 9,
    ...extra,
  };
}

function extractEshram(document, provider) {
  const lines = document.markdown.split("\n");
  const headings = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^##### (?:\[([^\]]+)\]\([^)]*\)|(.+))$/);
    if (!match) continue;
    const name = (match[1] ?? match[2]).trim();
    if (/^(Ministry of Labour|Stakeholders|Rate this)/i.test(name)) continue;
    headings.push({ index, name });
  }
  return headings.map((heading, position) => {
    const nextIndex = headings[position + 1]?.index ?? lines.length;
    return candidate(heading.name, document, provider, lines.slice(heading.index, nextIndex).join("\n"), { collectionUrl: document.url });
  }).filter(Boolean);
}

function extractDocument(document, provider) {
  const content = document.markdown;
  if (!content) return [];
  if (provider === "eshram-welfare") {
    const isSchemeCollection = /\/social-security-welfare-schemes$|\/employment-schemes$/.test(document.url);
    return isSchemeCollection ? extractEshram(document, provider) : [];
  }
  if (provider === "myscheme") {
    const slug = document.url.match(/\/schemes\/([^/?#]+)/)?.[1];
    const title = document.title?.replace(/\s+-\s+myScheme$/i, "") ?? slug;
    return [candidate(title, document, provider, content, { slug })].filter(Boolean);
  }
  if (provider === "mahadbt") {
    const heading = content.match(/^# (?!SchemeData)(.+)$/m)?.[1] ?? document.title;
    return [candidate(heading, document, provider, content)].filter(Boolean);
  }
  if (provider === "national-scholarship-portal") {
    if (document.url.includes("scholarshipEligibility") || document.url.includes("DEPDFAQ")) return [];
    const heading = content.match(/^# (NATIONAL SCHOLARSHIP[^\n]+|Rules for Award[^\n]+|STUDIES IN INDIA[^\n]+)/im)?.[1];
    return [candidate(heading ?? document.title?.replace(/^\[PDF\]\s*/i, ""), document, provider, content, { documentType: "guideline-or-faq" })].filter(Boolean);
  }
  // Credit-portal and PIB pages are retained as RAG context, but are not scheme records.
  return [];
}

const cacheFiles = fs.readdirSync(cacheDir).filter((file) => /^search-.*-scraped\.json$/.test(file));
const documents = [];
for (const file of cacheFiles) {
  const payload = JSON.parse(fs.readFileSync(path.join(cacheDir, file), "utf8"));
  for (const item of payload.data?.web ?? []) {
    const provider = providerFor(item.url ?? "");
    if (provider) documents.push({ ...item, cacheFile: file, provider });
  }
}

const candidates = documents.flatMap((document) => extractDocument(document, document.provider));
const grouped = new Map();
for (const item of candidates) {
  const existing = grouped.get(item.canonicalKey) ?? { canonicalSchemeId: `scheme-${item.canonicalKey.replace(/[^a-z0-9]+/g, "-")}`, names: new Set(), records: [] };
  existing.names.add(item.name);
  existing.records.push(item);
  grouped.set(item.canonicalKey, existing);
}

const schemes = [...grouped.values()].map((group) => {
  const records = group.records.sort((left, right) => left.sourcePriority - right.sourcePriority);
  return {
    canonicalSchemeId: group.canonicalSchemeId,
    name: records[0].name,
    aliases: [...group.names].filter((name) => name !== records[0].name),
    sourceCount: new Set(records.map((record) => `${record.provider}:${record.url}`)).size,
    sources: records.map(({ provider, url, title, cacheFile, sourcePriority: priority, documentType, collectionUrl }) => ({ provider, url, title, cacheFile, priority, documentType, collectionUrl })),
    records: records.map(({ name, provider, url, title, content, sourcePriority: priority }) => ({ name, provider, url, title, priority, content })),
  };
}).sort((left, right) => left.name.localeCompare(right.name));

const ragDocuments = schemes.flatMap((scheme) => scheme.records.map((record, index) => ({
  id: `${scheme.canonicalSchemeId}-${index + 1}`,
  schemeId: scheme.canonicalSchemeId,
  schemeName: scheme.name,
  source: record.provider,
  sourceUrl: record.url,
  title: record.title,
  text: record.content,
  metadata: { sourcePriority: record.priority, aliases: scheme.aliases },
})));

const result = {
  generatedAt: new Date().toISOString(),
  rawDocuments: documents.length,
  schemeCandidates: candidates.length,
  uniqueSchemes: schemes.length,
  duplicateRecordsCollapsed: candidates.length - schemes.length,
  schemes,
};

fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
fs.writeFileSync(ragPath, `${JSON.stringify({ generatedAt: result.generatedAt, documents: ragDocuments }, null, 2)}\n`);
console.log(JSON.stringify({ outputPath, ragPath, rawDocuments: result.rawDocuments, schemeCandidates: result.schemeCandidates, uniqueSchemes: result.uniqueSchemes, duplicateRecordsCollapsed: result.duplicateRecordsCollapsed }));
