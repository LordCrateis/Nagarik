import type { AnalysisResult, BundleAlternative, BundleScheme, Checklist, CitizenProfile, Conflict, EligibilityResult, OptimizationResult, Scheme } from "@workspace/api-zod";
import { createHash } from "node:crypto";
import { analysisSchemes, schemeById, schemeDefinitions, schemeDetailsById, type SchemeDefinition } from "./schemes";
import { retrieveEvidenceByScheme } from "./firecrawl-rag";

const savedProfiles = new Map<string, CitizenProfile>();
const savedChecklists = new Map<string, Checklist>();
const analysisCache = new Map<string, { expiresAt: number; result: AnalysisResult }>();
const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;
const normalise = (value: string) => value.toLowerCase();

export function citizenIdFor(profile: CitizenProfile): string {
  const normalized = `${profile.name}|${profile.age}|${profile.state}|${profile.district}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) hash = (hash * 31 + normalized.charCodeAt(index)) | 0;
  return `citizen-${Math.abs(hash).toString(36)}`;
}

export function evaluateEligibility(profile: CitizenProfile): EligibilityResult[] {
  return schemeDefinitions.map((scheme) => {
    const passed = scheme.criteria.filter((criterion) => criterion.evaluate(profile));
    const failed = scheme.criteria.filter((criterion) => !criterion.evaluate(profile));
    if (failed.length) return { schemeId: scheme.id, status: "not_eligible", reasons: failed.map((criterion) => `Not met: ${criterion.label}`), missingInformation: [] };
    if (!scheme.criteria.length) return { schemeId: scheme.id, status: "missing_information", reasons: ["Nagarik could not map this scheme’s official rules to the profile yet."], missingInformation: scheme.eligibilityRules.slice(0, 2) };
    return { schemeId: scheme.id, status: "eligible", reasons: [...passed.map((criterion) => `Matches: ${criterion.label}`), "Confirm any remaining official requirements on the application portal."], missingInformation: [] };
  });
}

function hasExclusiveScholarshipRule(scheme: Scheme) {
  return /only one (?:scholarship|monetary benefit)|not receive any other (?:monetary benefit|scholarship)|one scholarship at a time/i.test(scheme.conflicts.join(" "));
}

export function detectConflicts(eligibleSchemeIds: string[]): Conflict[] {
  const selected = eligibleSchemeIds.map((id) => schemeById.get(id)).filter((scheme): scheme is SchemeDefinition => Boolean(scheme));
  const conflicts: Conflict[] = [];
  for (let left = 0; left < selected.length; left += 1) for (let right = left + 1; right < selected.length; right += 1) {
    const a = selected[left]; const b = selected[right];
    if (hasExclusiveScholarshipRule(a) && /scholarship/i.test(b.category)) conflicts.push({ schemeAId: a.id, schemeBId: b.id, reason: "This scheme’s official rules say only one scholarship or monetary benefit may be received at a time." });
    else if (hasExclusiveScholarshipRule(b) && /scholarship/i.test(a.category)) conflicts.push({ schemeAId: a.id, schemeBId: b.id, reason: "This scheme’s official rules say only one scholarship or monetary benefit may be received at a time." });
    else if (a.conflicts.includes(b.id) || b.conflicts.includes(a.id)) conflicts.push({ schemeAId: a.id, schemeBId: b.id, reason: "The catalogue marks these schemes as incompatible." });
  }
  return conflicts;
}

function documentReadiness(scheme: Scheme, profile: CitizenProfile): number {
  const required = scheme.requiredDocuments.filter((document) => document.trim() && document !== "* *");
  if (!required.length) return 100;
  const available = new Set(profile.availableDocuments.map(normalise));
  const matching = required.filter((document) => [...available].some((item) => normalise(document).includes(item) || item.includes(normalise(document)))).length;
  return Math.round((matching / required.length) * 100);
}

function conflictsWith(candidateId: string, selected: string[], conflicts: Conflict[]) { return conflicts.some((conflict) => (conflict.schemeAId === candidateId && selected.includes(conflict.schemeBId)) || (conflict.schemeBId === candidateId && selected.includes(conflict.schemeAId))); }

function scoreBundle(selected: SchemeDefinition[], profile: CitizenProfile): number {
  if (!selected.length) return 0;
  const totalValue = selected.reduce((sum, scheme) => sum + scheme.benefitValue, 0);
  const value = Math.min(100, (totalValue / 220000) * 100);
  const relevance = selected.reduce((sum, scheme) => sum + scheme.needMatch(profile), 0) / selected.length * 100;
  const readiness = selected.reduce((sum, scheme) => sum + documentReadiness(scheme, profile), 0) / selected.length;
  const diversity = Math.min(100, new Set(selected.map((scheme) => scheme.category)).size * 22);
  return Math.round(value * 0.3 + relevance * 0.35 + readiness * 0.2 + diversity * 0.15);
}

function optimize(profile: CitizenProfile, eligibleSchemeIds: string[], conflicts: Conflict[]): OptimizationResult {
  const candidates = eligibleSchemeIds.map((id) => schemeById.get(id)).filter((scheme): scheme is SchemeDefinition => Boolean(scheme)).sort((a, b) => (b.needMatch(profile) * 45 + b.benefitScore) - (a.needMatch(profile) * 45 + a.benefitScore));
  const selected: SchemeDefinition[] = [];
  for (const candidate of candidates) { if (selected.length >= 4) break; if (!conflictsWith(candidate.id, selected.map((scheme) => scheme.id), conflicts)) selected.push(candidate); }
  const score = scoreBundle(selected, profile);
  const selectedSchemes: BundleScheme[] = selected.map((scheme) => ({ schemeId: scheme.id, recommendation: scheme.needMatch(profile) >= 0.66 ? "STRONG PROFILE MATCH" : "POSSIBLE MATCH", reason: scheme.needMatch(profile) >= 0.66 ? `Ranks highly for this profile’s stated situation and ${scheme.category.toLowerCase()} needs.` : "Matches profile fields Nagarik can verify; confirm remaining official conditions before applying.", documentReadiness: documentReadiness(scheme, profile), compatibility: "Compatible with this bundle" }));
  const makeAlternative = (name: string, entries: SchemeDefinition[], delta: number): BundleAlternative => ({ name, schemeIds: entries.slice(0, 3).map((scheme) => scheme.id), score: Math.max(0, score - delta), compatibility: 100, coverage: Math.round(entries.slice(0, 3).reduce((sum, scheme) => sum + scheme.needMatch(profile), 0) / Math.max(1, Math.min(3, entries.length)) * 100), documentReadiness: Math.round(entries.slice(0, 3).reduce((sum, scheme) => sum + documentReadiness(scheme, profile), 0) / Math.max(1, Math.min(3, entries.length))) });
  return { selectedSchemes, excludedSchemeIds: eligibleSchemeIds.filter((id) => !selected.some((scheme) => scheme.id === id)), score, totalBenefitValue: selected.reduce((sum, scheme) => sum + scheme.benefitValue, 0), reasons: ["Official eligibility text was compared with profile fields Nagarik can verify.", "Need relevance, document readiness, value, and compatibility determine the order.", "Unmapped official rules must be confirmed before applying."], alternatives: [makeAlternative("Highest direct value", candidates, 7), makeAlternative("Document-ready plan", [...candidates].sort((a, b) => documentReadiness(b, profile) - documentReadiness(a, profile)), 4)] };
}

function createChecklist(citizenId: string, profile: CitizenProfile, selectedSchemes: Scheme[]): Checklist {
  const requiredDocuments = [...new Set(selectedSchemes.flatMap((scheme) => scheme.requiredDocuments).filter((document) => document.trim() && document !== "* *"))];
  const available = new Set(profile.availableDocuments.map(normalise));
  const missingDocuments = requiredDocuments.filter((document) => ![...available].some((item) => normalise(document).includes(item) || item.includes(normalise(document))));
  const items = [...missingDocuments.map((document, index) => ({ id: `document-${index}`, label: `Obtain ${document.toLowerCase()}`, detail: "Confirm this requirement in the official scheme portal before submitting.", completed: false })), ...selectedSchemes.flatMap((scheme, index) => [{ id: `verify-${scheme.id}`, label: `Verify ${scheme.name}`, detail: scheme.eligibilityRules[0] ?? "Review the official scheme details.", completed: index === 0 }, { id: `apply-${scheme.id}`, label: `Complete ${scheme.name} application`, detail: scheme.applicationSteps.at(-1) ?? "Use the official application portal.", completed: false }])];
  return { citizenId, requiredDocuments, availableDocuments: profile.availableDocuments, missingDocuments, items };
}

export function saveProfile(profile: CitizenProfile) { const citizenId = citizenIdFor(profile); savedProfiles.set(citizenId, profile); return { citizenId, profile }; }
type ModelDecision = {
  schemeId: string;
  status: "eligible" | "partial" | "ineligible";
  reasons?: string[];
  missingInformation?: string[];
};

type ModelAnalysis = {
  decisions?: ModelDecision[];
  bundleSchemeIds?: string[];
  bundleReasons?: string[];
  conflicts?: Array<{ schemeAId: string; schemeBId: string; reason: string }>;
};

function shorten(value: string, limit: number) {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > limit ? `${clean.slice(0, Math.max(0, limit - 1)).trimEnd()}…` : clean;
}

function catalogueForModel(candidates: SchemeDefinition[], profile: CitizenProfile) {
  // Retrieval scores every chunk across the local Firecrawl corpus. Gemini then
  // receives a compact inventory of all schemes plus the strongest official
  // passages, keeping the request below free-tier request limits.
  const evidenceByScheme = retrieveEvidenceByScheme(profile, 40, 1);
  type CatalogDetail = {
    name: string; aliases: string[]; shortDescription: string; fullDescription: string; governmentLevel: string; state: string | null;
    department: string | null; category: string; benefits: Array<{ description: string; amountInr: number | null; frequency: string | null }>;
    eligibilityRules: Array<{ rawText: string }>; exclusions: string[]; requiredDocuments: string[];
    conflicts: string[]; stackabilityNotes: string[]; applicationSteps: string[]; applicationUrl: string | null; deadlines: string[]; confidence: number;
    sources: Array<{ authority: string; url: string }>;
  };
  const allSchemes = candidates.map((fallback) => {
    const detail = schemeDetailsById.get(fallback.id) as CatalogDetail | undefined;
    if (!detail) return {
      id: fallback.id,
      name: fallback.name,
      aliases: [],
      scope: { level: "unknown", state: null, department: null, category: fallback.category },
      purpose: fallback.description,
      benefits: [{ description: fallback.benefit, amountInr: fallback.benefitValue || null, frequency: null }],
      eligibility: fallback.eligibilityRules,
      exclusions: [],
      requiredDocuments: fallback.requiredDocuments,
      conflicts: fallback.conflicts,
      applicationSteps: fallback.applicationSteps,
      applicationUrl: null,
      deadlines: [],
      confidence: 0,
      sources: [],
      retrievedEvidence: evidenceByScheme.get(fallback.id) ?? [],
    };
    return {
      id: fallback.id,
      name: detail.name,
      aliases: detail.aliases,
      scope: { level: detail.governmentLevel, state: detail.state, department: detail.department, category: detail.category },
      purpose: detail.fullDescription || detail.shortDescription,
      benefits: detail.benefits,
      eligibility: detail.eligibilityRules.map((rule) => rule.rawText),
      exclusions: detail.exclusions,
      requiredDocuments: detail.requiredDocuments,
      conflicts: [...detail.conflicts, ...detail.stackabilityNotes],
      applicationSteps: detail.applicationSteps,
      applicationUrl: detail.applicationUrl,
      deadlines: detail.deadlines,
      confidence: detail.confidence,
      sources: detail.sources.map((source) => ({ authority: source.authority, url: source.url })),
      retrievedEvidence: evidenceByScheme.get(fallback.id) ?? [],
    };
  });

  const inventory = allSchemes.map((scheme) => ({
    id: scheme.id,
    name: scheme.name,
    category: scheme.scope.category,
    scope: { level: scheme.scope.level, state: scheme.scope.state },
  }));
  const evidenceCandidates = allSchemes
    .filter((scheme) => scheme.retrievedEvidence.length > 0)
    .slice(0, 5)
    .map((scheme) => ({
      id: scheme.id,
      name: scheme.name,
      scope: scheme.scope,
      purpose: shorten(scheme.purpose, 110),
      benefits: scheme.benefits.slice(0, 1).map((benefit) => ({ ...benefit, description: shorten(benefit.description, 100) })),
      eligibility: scheme.eligibility.slice(0, 2).map((rule) => shorten(rule, 110)),
      exclusions: scheme.exclusions.slice(0, 1).map((item) => shorten(item, 80)),
      requiredDocuments: scheme.requiredDocuments.slice(0, 4),
      conflicts: scheme.conflicts.slice(0, 1).map((item) => shorten(item, 80)),
      applicationUrl: scheme.applicationUrl,
      officialEvidence: scheme.retrievedEvidence.map((entry) => ({ source: entry.source, url: entry.url, text: shorten(entry.text, 250) })),
    }));
  return { inventory, evidenceCandidates };
}

function jsonFromModel(content: string): ModelAnalysis {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? content;
  const firstBrace = fenced.indexOf("{");
  const lastBrace = fenced.lastIndexOf("}");
  const candidate = firstBrace >= 0 && lastBrace > firstBrace ? fenced.slice(firstBrace, lastBrace + 1) : fenced;

  try {
    const parsed: unknown = JSON.parse(candidate.trim());
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed as ModelAnalysis;
  } catch {
    // Models occasionally return JavaScript-style object keys despite being asked for JSON.
    // Repair only that harmless formatting issue; values and scheme decisions remain untouched.
    const repaired = candidate
      .replace(/([,{]\s*)([A-Za-z_$][\w$-]*)(\s*:)/g, '$1"$2"$3')
      .replace(/,\s*([}\]])/g, "$1");
    try {
      const parsed: unknown = JSON.parse(repaired.trim());
      if (!parsed || typeof parsed !== "object") throw new Error("not an object");
      return parsed as ModelAnalysis;
    } catch {
      throw new Error("Gemini returned an unreadable eligibility analysis. Please try the check again.");
    }
  }
}

async function analyzeWithGemini(profile: CitizenProfile, candidates: SchemeDefinition[]): Promise<ModelAnalysis> {
  const apiKey = process.env["GEMINI_API_KEY"];
  if (!apiKey) throw new Error("GEMINI_API_KEY is missing. Add it to the root .env file, then restart the API server.");
  const models = [...new Set([
    process.env["GEMINI_MODEL"] ?? "gemini-2.5-flash-lite",
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
  ])];
  const ragPackage = catalogueForModel(candidates, profile);
  const modelRules = "Use only supplied facts. studentStatus is required for scholarships/education; farmerStatus is required for farmer/agriculture; disabilityStatus is required for disability schemes. Category, age, state, gender, income, and documents apply only where official evidence explicitly says so. Missing a required fact or document means partial. Exclude a known conflict. Choose up to four compatible schemes that maximise practical official value; do not stack incompatible scholarships.";
  const prompt = `You are Nagarik's source-grounded benefit engine. Local RAG searched all ${candidates.length} schemes and their cached official Firecrawl pages. The inventory lists all schemes. Detailed evidence covers the best profile-relevant retrievals. Use no outside knowledge. ${modelRules}\n\nReturn JSON only: {"decisions":[{"schemeId":"...","status":"eligible|partial","reasons":["catalog reason"],"missingInformation":["specific missing item"]}],"bundleSchemeIds":["up to four eligible ids"],"bundleReasons":["short reasoning"],"conflicts":[{"schemeAId":"...","schemeBId":"...","reason":"catalog conflict"}]}. Return at most 6 eligible or partial schemes and omit every irrelevant or ineligible scheme.\n\nProfile:${JSON.stringify(profile)}\nAllSchemeInventory:${JSON.stringify(ragPackage.inventory)}\nRetrievedOfficialEvidence:${JSON.stringify(ragPackage.evidenceCandidates)}`;
  let lastFailure = "Gemini could not process the analysis.";
  for (const model of models) {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: "You are Nagarik's source-grounded government-benefit decision engine. Return only valid JSON. Do not browse or use external knowledge." }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 800, responseMimeType: "application/json" },
      }),
    });
    if (response.ok) {
      const payload = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
      const content = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("");
      if (!content) throw new Error("Gemini returned no eligibility analysis.");
      return jsonFromModel(content);
    }
    lastFailure = `Gemini analysis failed (${response.status}): ${await response.text()}`;
    if (response.status !== 429 && response.status !== 503) break;
  }
  throw new Error(lastFailure);
}

/**
 * Continuity path for a provider outage. It only considers schemes surfaced by
 * the same full-corpus RAG retrieval and applies explicit catalogue criteria.
 * Gemini remains the normal path for contextual explanations and bundling.
 */
function analyzeFromRetrievedOfficialRules(profile: CitizenProfile, candidates: SchemeDefinition[]): ModelAnalysis {
  const retrievedSchemeIds = new Set(retrieveEvidenceByScheme(profile, 40, 1).keys());
  const localDecisions = evaluateEligibility(profile)
    .filter((decision) => retrievedSchemeIds.has(decision.schemeId))
    .filter((decision) => decision.status === "eligible" || decision.status === "missing_information")
    .slice(0, 8);
  const eligibleIds = localDecisions.filter((decision) => decision.status === "eligible").map((decision) => decision.schemeId);
  const conflicts = detectConflicts(eligibleIds);
  const bundle = optimize(profile, eligibleIds, conflicts);
  return {
    decisions: localDecisions.map((decision) => ({
      schemeId: decision.schemeId,
      status: decision.status === "eligible" ? "eligible" : "partial",
      reasons: decision.reasons.slice(0, 2),
      missingInformation: decision.missingInformation.slice(0, 2),
    })),
    bundleSchemeIds: bundle.selectedSchemes.map((scheme) => scheme.schemeId),
    bundleReasons: ["A source-grounded shortlist was prepared from the cached official scheme evidence while the AI service was unavailable."],
    conflicts,
  };
}

export async function analyzeProfile(profile: CitizenProfile): Promise<AnalysisResult> {
  const cacheKey = createHash("sha256")
    .update(JSON.stringify({ profile, catalogue: schemeDefinitions.map((scheme) => scheme.id) }))
    .digest("hex");
  const cached = analysisCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.result;
  const citizenId = citizenIdFor(profile);
  // Gemini receives every locally cached record and makes the contextual decision.
  // The relationship guide tells it how profile facts and documents relate to catalog rules.
  const candidates = schemeDefinitions;
  let modelAnalysis: ModelAnalysis;
  let usedContinuityPath = false;
  try {
    modelAnalysis = await analyzeWithGemini(profile, candidates);
  } catch {
    usedContinuityPath = true;
    modelAnalysis = analyzeFromRetrievedOfficialRules(profile, candidates);
  }
  const validIds = new Set(candidates.map((scheme) => scheme.id));
  const decisions = new Map<string, ModelDecision>();
  for (const item of modelAnalysis.decisions ?? []) {
    if (validIds.has(item.schemeId) && ["eligible", "partial"].includes(item.status)) decisions.set(item.schemeId, item);
  }
  const eligibility: EligibilityResult[] = schemeDefinitions.map((scheme) => {
    const decision = decisions.get(scheme.id);
    if (!decision) return { schemeId: scheme.id, status: "not_eligible", reasons: ["Not recommended for this profile by the source-grounded review."], missingInformation: [] };
    return { schemeId: scheme.id, status: decision.status === "partial" ? "missing_information" : decision.status === "eligible" ? "eligible" : "not_eligible", reasons: decision.reasons?.slice(0, 3) ?? [], missingInformation: decision.missingInformation?.slice(0, 3) ?? [] };
  });
  const eligibleIds = eligibility.filter((result) => result.status === "eligible").map((result) => result.schemeId);
  const partialIds = eligibility.filter((result) => result.status === "missing_information").map((result) => result.schemeId);
  const bundleIds = [...new Set(modelAnalysis.bundleSchemeIds ?? [])].filter((id) => eligibleIds.includes(id)).slice(0, 4);
  const selectedSchemes = bundleIds.map((id) => schemeById.get(id)).filter((scheme): scheme is SchemeDefinition => Boolean(scheme));
  const conflicts = (modelAnalysis.conflicts ?? []).filter((conflict) => bundleIds.includes(conflict.schemeAId) && bundleIds.includes(conflict.schemeBId) && conflict.schemeAId !== conflict.schemeBId).slice(0, 8);
  const optimization: OptimizationResult = {
    selectedSchemes: selectedSchemes.map((scheme) => ({ schemeId: scheme.id, recommendation: "RECOMMENDED", reason: decisions.get(scheme.id)?.reasons?.[0] ?? "Matches the supplied profile and official rules.", documentReadiness: documentReadiness(scheme, profile), compatibility: "Reviewed by Nagarik" })),
    excludedSchemeIds: eligibleIds.filter((id) => !bundleIds.includes(id)), score: 0, totalBenefitValue: selectedSchemes.reduce((sum, scheme) => sum + scheme.benefitValue, 0), reasons: modelAnalysis.bundleReasons?.slice(0, 3) ?? ["Gemini reviewed the supplied profile against the cached official catalogue."], alternatives: [],
  };
  const checklist = createChecklist(citizenId, profile, selectedSchemes);
  savedProfiles.set(citizenId, profile); savedChecklists.set(citizenId, checklist);
  const result = { citizenId, profile, eligibility, eligibleSchemes: analysisSchemes.filter((scheme) => eligibleIds.includes(scheme.id)), ineligibleSchemes: analysisSchemes.filter((scheme) => eligibility.find((result) => result.schemeId === scheme.id)?.status === "not_eligible"), missingInformationSchemes: analysisSchemes.filter((scheme) => partialIds.includes(scheme.id)), conflicts, optimization, checklist, analysisSummary: [usedContinuityPath ? "Nagarik prepared this source-grounded result from the cached official scheme rules while the AI service was busy." : "Nagarik compared your details with the locally cached official scheme catalogue.", `${eligibleIds.length} eligible matches found`, `${partialIds.length} schemes need more information`, `${conflicts.length} bundle conflicts identified`, "Confirm final eligibility on the official application portal."] } satisfies AnalysisResult;
  analysisCache.set(cacheKey, { expiresAt: Date.now() + ANALYSIS_CACHE_TTL_MS, result });
  return result;
}
export function checklistFor(citizenId: string) { return savedChecklists.get(citizenId); }
export function optimizeBundle(profile: CitizenProfile, eligibleSchemeIds: string[], conflicts: Conflict[]) { return optimize(profile, eligibleSchemeIds, conflicts); }
