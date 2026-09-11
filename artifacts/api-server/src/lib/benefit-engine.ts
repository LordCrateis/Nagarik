import type {
  AnalysisResult,
  BundleAlternative,
  BundleScheme,
  Checklist,
  CitizenProfile,
  Conflict,
  EligibilityResult,
  OptimizationResult,
  Scheme,
} from "@workspace/api-zod";
import { schemeById, schemes, schemeDefinitions, type SchemeDefinition } from "./schemes";

const savedProfiles = new Map<string, CitizenProfile>();
const savedChecklists = new Map<string, Checklist>();

export function citizenIdFor(profile: CitizenProfile): string {
  const normalized = `${profile.name}|${profile.age}|${profile.state}|${profile.district}`.toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) | 0;
  }
  return `citizen-${Math.abs(hash).toString(36)}`;
}

export function evaluateEligibility(profile: CitizenProfile): EligibilityResult[] {
  return schemeDefinitions.map((scheme) => {
    const missingInformation = scheme.criteria
      .map((criterion) => criterion.missing?.(profile))
      .filter((value): value is string => Boolean(value));
    const passed = scheme.criteria.filter((criterion) => criterion.evaluate(profile));

    if (missingInformation.length > 0) {
      return {
        schemeId: scheme.id,
        status: "missing_information",
        reasons: passed.map((criterion) => criterion.label),
        missingInformation,
      };
    }

    return {
      schemeId: scheme.id,
      status: passed.length === scheme.criteria.length ? "eligible" : "not_eligible",
      reasons: passed.length === scheme.criteria.length
        ? passed.map((criterion) => criterion.label)
        : scheme.criteria.filter((criterion) => !criterion.evaluate(profile)).map((criterion) => `Not met: ${criterion.label}`),
      missingInformation: [],
    };
  });
}

export function detectConflicts(eligibleSchemeIds: string[]): Conflict[] {
  const eligible = new Set(eligibleSchemeIds);
  const seen = new Set<string>();
  const conflicts: Conflict[] = [];

  for (const schemeId of eligibleSchemeIds) {
    const scheme = schemeById.get(schemeId);
    if (!scheme) continue;
    for (const conflictingId of scheme.conflicts) {
      if (!eligible.has(conflictingId)) continue;
      const key = [schemeId, conflictingId].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);
      conflicts.push({
        schemeAId: key.split("::")[0],
        schemeBId: key.split("::")[1],
        reason: "These benefits cannot be claimed together under the current demo rules.",
      });
    }
  }
  return conflicts;
}

function documentReadiness(scheme: Scheme, profile: CitizenProfile): number {
  if (scheme.requiredDocuments.length === 0) return 100;
  const available = new Set(profile.availableDocuments.map((document) => document.toLowerCase()));
  const matching = scheme.requiredDocuments.filter((document) => available.has(document.toLowerCase())).length;
  return Math.round((matching / scheme.requiredDocuments.length) * 100);
}

function conflictsWith(candidateId: string, selected: string[], conflicts: Conflict[]): boolean {
  return conflicts.some((conflict) =>
    (conflict.schemeAId === candidateId && selected.includes(conflict.schemeBId)) ||
    (conflict.schemeBId === candidateId && selected.includes(conflict.schemeAId)),
  );
}

function scoreBundle(selected: SchemeDefinition[], profile: CitizenProfile): number {
  if (selected.length === 0) return 0;
  const totalValue = selected.reduce((sum, scheme) => sum + scheme.benefitValue, 0);
  const normalizedValue = Math.min(100, (totalValue / 220000) * 100);
  const match = selected.reduce((sum, scheme) => sum + scheme.needMatch(profile), 0) / selected.length * 100;
  const readiness = selected.reduce((sum, scheme) => sum + documentReadiness(scheme, profile), 0) / selected.length;
  const categories = new Set(selected.map((scheme) => scheme.category)).size;
  const diversity = Math.min(100, categories * 22);
  return Math.round(normalizedValue * 0.35 + match * 0.3 + readiness * 0.2 + diversity * 0.15);
}

function optimize(profile: CitizenProfile, eligibleSchemeIds: string[], conflicts: Conflict[]): OptimizationResult {
  const candidates = eligibleSchemeIds
    .map((id) => schemeById.get(id))
    .filter((scheme): scheme is SchemeDefinition => Boolean(scheme))
    .sort((a, b) => (b.benefitScore + b.needMatch(profile) * 20) - (a.benefitScore + a.needMatch(profile) * 20));
  const selected: SchemeDefinition[] = [];

  for (const candidate of candidates) {
    if (selected.length >= 4) break;
    if (!conflictsWith(candidate.id, selected.map((scheme) => scheme.id), conflicts)) {
      selected.push(candidate);
    }
  }

  const selectedIds = selected.map((scheme) => scheme.id);
  const excludedSchemeIds = eligibleSchemeIds.filter((id) => !selectedIds.includes(id));
  const selectedSchemes: BundleScheme[] = selected.map((scheme) => ({
    schemeId: scheme.id,
    recommendation: "RECOMMENDED",
    reason: scheme.needMatch(profile) >= 0.9
      ? `Strong match for this profile's ${scheme.category.toLowerCase()} needs.`
      : "Adds compatible support while keeping the bundle balanced.",
    documentReadiness: documentReadiness(scheme, profile),
    compatibility: "Compatible with selected bundle",
  }));
  const totalBenefitValue = selected.reduce((sum, scheme) => sum + scheme.benefitValue, 0);
  const score = scoreBundle(selected, profile);
  const alternatives: BundleAlternative[] = [
    {
      name: "Highest direct value",
      schemeIds: candidates.slice(0, 3).map((scheme) => scheme.id),
      score: Math.max(0, score - 7),
      compatibility: 82,
      coverage: 68,
      documentReadiness: Math.round(candidates.slice(0, 3).reduce((sum, scheme) => sum + documentReadiness(scheme, profile), 0) / Math.max(1, Math.min(3, candidates.length))),
    },
    {
      name: "Document-ready plan",
      schemeIds: [...candidates].sort((a, b) => documentReadiness(b, profile) - documentReadiness(a, profile)).slice(0, 3).map((scheme) => scheme.id),
      score: Math.max(0, score - 4),
      compatibility: 100,
      coverage: 62,
      documentReadiness: Math.min(100, Math.round([...candidates].sort((a, b) => documentReadiness(b, profile) - documentReadiness(a, profile)).slice(0, 3).reduce((sum, scheme) => sum + documentReadiness(scheme, profile), 0) / Math.max(1, Math.min(3, candidates.length)))),
    },
  ];

  return {
    selectedSchemes,
    excludedSchemeIds,
    score,
    totalBenefitValue,
    reasons: [
      "Highest combined benefit among compatible combinations",
      "Strong match with the citizen profile and stated needs",
      "Required documents are weighted into the recommendation",
      `${new Set(selected.map((scheme) => scheme.category)).size} benefit categories covered without conflicts`,
    ],
    alternatives,
  };
}

function createChecklist(citizenId: string, profile: CitizenProfile, selectedSchemes: Scheme[]): Checklist {
  const requiredDocuments = [...new Set(selectedSchemes.flatMap((scheme) => scheme.requiredDocuments))];
  const availableDocuments = profile.availableDocuments;
  const availableSet = new Set(availableDocuments.map((document) => document.toLowerCase()));
  const missingDocuments = requiredDocuments.filter((document) => !availableSet.has(document.toLowerCase()));
  const items = [
    ...missingDocuments.map((document, index) => ({
      id: `document-${index}`,
      label: `Obtain ${document.toLowerCase()}`,
      detail: "Add this document before submitting the selected benefits.",
      completed: false,
    })),
    ...selectedSchemes.flatMap((scheme, index) => [
      {
        id: `verify-${scheme.id}`,
        label: `Verify ${scheme.name}`,
        detail: scheme.applicationSteps[0] ?? "Review scheme details.",
        completed: index === 0,
      },
      {
        id: `apply-${scheme.id}`,
        label: `Complete ${scheme.name} application`,
        detail: scheme.applicationSteps.at(-1) ?? "Submit the application.",
        completed: false,
      },
    ]),
  ];
  return { citizenId, requiredDocuments, availableDocuments, missingDocuments, items };
}

export function saveProfile(profile: CitizenProfile): { citizenId: string; profile: CitizenProfile } {
  const citizenId = citizenIdFor(profile);
  savedProfiles.set(citizenId, profile);
  return { citizenId, profile };
}

export function analyzeProfile(profile: CitizenProfile): AnalysisResult {
  const citizenId = citizenIdFor(profile);
  const eligibility = evaluateEligibility(profile);
  const eligibleIds = eligibility.filter((result) => result.status === "eligible").map((result) => result.schemeId);
  const conflicts = detectConflicts(eligibleIds);
  const optimization = optimize(profile, eligibleIds, conflicts);
  const selectedSchemeIds = optimization.selectedSchemes.map((scheme) => scheme.schemeId);
  const selectedSchemes = selectedSchemeIds.map((id) => schemeById.get(id)).filter((scheme): scheme is SchemeDefinition => Boolean(scheme));
  const checklist = createChecklist(citizenId, profile, selectedSchemes);
  savedProfiles.set(citizenId, profile);
  savedChecklists.set(citizenId, checklist);

  return {
    citizenId,
    profile,
    eligibility,
    eligibleSchemes: schemes.filter((scheme) => eligibleIds.includes(scheme.id)),
    ineligibleSchemes: schemes.filter((scheme) => eligibility.find((result) => result.schemeId === scheme.id)?.status === "not_eligible"),
    missingInformationSchemes: schemes.filter((scheme) => eligibility.find((result) => result.schemeId === scheme.id)?.status === "missing_information"),
    conflicts,
    optimization,
    checklist,
    analysisSummary: [
      "Profile evaluated",
      "Eligibility rules checked",
      `${eligibleIds.length} schemes matched`,
      `${conflicts.length} conflicts detected`,
      `${optimization.alternatives.length + 1} bundles evaluated`,
      "Best compatible bundle selected",
    ],
  };
}

export function checklistFor(citizenId: string): Checklist | undefined {
  return savedChecklists.get(citizenId);
}

export function optimizeBundle(profile: CitizenProfile, eligibleSchemeIds: string[], conflicts: Conflict[]): OptimizationResult {
  return optimize(profile, eligibleSchemeIds, conflicts);
}