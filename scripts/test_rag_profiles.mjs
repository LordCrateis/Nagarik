import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const corpus = JSON.parse(await readFile(path.join(root, ".firecrawl", "for_gem.json"), "utf8"));
const states = ["Maharashtra", "West Bengal", "Karnataka", "Tamil Nadu", "Andhra Pradesh"];
const categories = ["General", "SC", "ST", "OBC", "EWS"];
const genders = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const names = new Map((corpus.schemes ?? []).map((scheme) => [scheme.schemeId, scheme.name]));
const words = (value) => value.toLowerCase().replace(/[^a-z0-9₹]+/g, " ").split(" ").filter((word) => word.length > 2 || /^\d+$/.test(word) || word === "sc" || word === "st");
const flatten = (value) => typeof value === "string" ? value : Array.isArray(value) ? value.map(flatten).join("\n") : value && typeof value === "object" ? Object.values(value).map(flatten).join("\n") : "";
const splitIntoChunks = (value) => { const clean = value.replace(/\s+/g, " ").trim(), parts = []; for (let start = 0; start < clean.length; start += 850) { const part = clean.slice(start, start + 1000).trim(); if (part) parts.push(part); } return parts; };
const chunks = (corpus.schemes ?? []).flatMap((scheme) => {
  const schemeText = `${scheme.name ?? ""}\n${scheme.shortDescription ?? ""}\n${scheme.fullDescription ?? ""}\n${flatten(scheme.eligibilityRules)}`.toLowerCase();
  const requiresStudent = /\bstudents?\b|\bscholarship\b|pre[- ]?matric|post[- ]?matric|\bschool\b|\bcollege\b|\buniversity\b|\beducation\b|\btuition\b|\bvocational\b/.test(schemeText), requiresFarmer = /\bfarmer\b|\bkrishak\b|\bcultivator\b|\bagricultur/.test(schemeText), requiresDisability = /disabilit|divyang|\bpwd\b/.test(schemeText);
  const sources = [];
  for (const item of scheme.rawLocalEvidence ?? []) for (const page of item.officialPages ?? []) if (page.markdown) sources.push(page.markdown);
  for (const item of scheme.enrichmentOverlays ?? []) sources.push(`${flatten(item.fields)}\n${flatten(item.fieldEvidence)}`);
  for (const item of scheme.searchAndRagDocuments ?? []) if (item.text) sources.push(item.text);
  return sources.flatMap(splitIntoChunks).map((text) => ({ schemeId: scheme.schemeId, terms: new Set(words(text)), requiresStudent, requiresFarmer, requiresDisability }));
});

function profileFor(index) {
  const studentStatus = index % 2 === 0, farmerStatus = index % 3 === 0, disabilityStatus = index % 5 === 0;
  const category = categories[Math.floor(index / 5) % 5];
  const availableDocuments = ["Aadhaar / identity proof", "Residence proof", "Bank account details"];
  if (studentStatus) availableDocuments.push("Income certificate"); if (category !== "General") availableDocuments.push("Caste certificate"); if (disabilityStatus) availableDocuments.push("Disability certificate"); if (farmerStatus) availableDocuments.push("Land ownership record");
  return { name: `RAG Test ${index + 1}`, age: 18 + index % 53, gender: genders[Math.floor(index / 25) % 4], state: states[index % 5], district: ["Pune", "Nadia", "Mysuru", "Madurai", "Guntur"][index % 5], occupation: studentStatus ? "Student" : farmerStatus ? "Farmer" : ["Tailor", "Driver", "Shop assistant"][index % 3], annualIncome: 60000 + index % 8 * 70000, familySize: 1 + index % 7, category, disabilityStatus, studentStatus, employmentStatus: studentStatus ? "Unemployed" : ["Self-employed", "Casual worker", "Salaried"][index % 3], farmerStatus, housingStatus: ["Renting", "Own home", "Homeless", "Temporary housing"][index % 4], maritalStatus: ["Single", "Married", "Widowed", "Separated"][index % 4], landSize: farmerStatus ? 0.5 + index % 5 : null, urgency: ["low", "medium", "high"][index % 3], availableDocuments };
}

function termsFor(profile) {
  const values = [profile.name, `${profile.age}`, profile.gender, profile.state, profile.district, profile.occupation, `${profile.annualIncome}`, `family size ${profile.familySize}`, profile.category, profile.employmentStatus, profile.housingStatus, profile.maritalStatus, profile.landSize === null ? "" : `land ${profile.landSize}`, profile.urgency, ...profile.availableDocuments];
  if (profile.studentStatus) values.push("student education scholarship school college course"); if (profile.farmerStatus) values.push("farmer agriculture cultivation land crop irrigation"); if (profile.disabilityStatus) values.push("disability divyang pwd");
  if (profile.gender === "Woman") values.push("woman female girl"); if (profile.gender === "Man") values.push("man male"); if (profile.gender === "Non-binary") values.push("non binary transgender");
  if (profile.category === "SC") values.push("sc scheduled caste"); if (profile.category === "ST") values.push("st scheduled tribe"); if (profile.category === "OBC") values.push("obc other backward class"); if (profile.category === "EWS") values.push("ews economically weaker section");
  return new Set(words(values.join(" ")));
}

function retrieve(profile) {
  const query = termsFor(profile);
  const signalValues = [profile.state, profile.district, profile.occupation, profile.category, profile.gender, profile.studentStatus ? "student education scholarship" : "", profile.farmerStatus ? "farmer agriculture cultivation" : "", profile.disabilityStatus ? "disability divyang pwd" : "", profile.landSize !== null ? "land holder cultivation" : "", profile.gender === "Woman" ? "female girl" : "", profile.gender === "Man" ? "male" : "", profile.category === "SC" ? "scheduled caste" : "", profile.category === "ST" ? "scheduled tribe" : "", profile.category === "OBC" ? "other backward class" : "", profile.category === "EWS" ? "economically weaker section" : ""];
  const signals = new Set(words(signalValues.join(" ")));
  const ranked = chunks.map((chunk) => ({ chunk, score: [...query].filter((term) => chunk.terms.has(term)).length, signalScore: [...signals].filter((term) => chunk.terms.has(term)).length })).filter((entry) => entry.signalScore > 0).filter(({ chunk }) => !((chunk.requiresStudent && !profile.studentStatus) || (chunk.requiresFarmer && !profile.farmerStatus) || (chunk.requiresDisability && !profile.disabilityStatus))).sort((a, b) => b.score - a.score).slice(0, 64);
  const grouped = new Map(); for (const { chunk } of ranked) { const items = grouped.get(chunk.schemeId) ?? []; if (items.length < 2) items.push(chunk); grouped.set(chunk.schemeId, items); } return grouped;
}

const cases = Array.from({ length: 100 }, (_, index) => {
  const input = profileFor(index), output = retrieve(input), ids = [...output.keys()].sort(), schemeNames = ids.map((id) => names.get(id) ?? id);
  return { id: index + 1, input, output: { retrievedSchemeCount: output.size, retrievedPassageCount: [...output.values()].flat().length, retrievedSchemeIds: ids, studentNamedSchemes: schemeNames.filter((name) => /student|scholarship|education/i.test(name)), farmerNamedSchemes: schemeNames.filter((name) => /farmer|krishak|agricultur|crop/i.test(name)) } };
});
const anomalies = { noRetrievedEvidence: cases.filter((item) => item.output.retrievedSchemeCount === 0).map((item) => item.id), studentEvidenceForNonStudents: cases.filter((item) => !item.input.studentStatus && item.output.studentNamedSchemes.length).map((item) => item.id), farmerEvidenceForNonFarmers: cases.filter((item) => !item.input.farmerStatus && item.output.farmerNamedSchemes.length).map((item) => item.id), corpusMissingRawEvidenceFor: (corpus.schemes ?? []).filter((scheme) => !scheme.rawLocalEvidence?.length && !scheme.enrichmentOverlays?.length && !scheme.searchAndRagDocuments?.length).map((scheme) => ({ id: scheme.schemeId, name: scheme.name })) };
const report = { generatedAt: new Date().toISOString(), modelCallsMade: 0, ragIndex: { indexedChunks: chunks.length, indexedSchemes: new Set(chunks.map((chunk) => chunk.schemeId)).size }, summary: { testedProfiles: 100, retrievedSchemeRange: [Math.min(...cases.map((item) => item.output.retrievedSchemeCount)), Math.max(...cases.map((item) => item.output.retrievedSchemeCount))], retrievedPassageRange: [Math.min(...cases.map((item) => item.output.retrievedPassageCount)), Math.max(...cases.map((item) => item.output.retrievedPassageCount))] }, anomalies, cases };
await mkdir(path.join(root, "reports"), { recursive: true }); await writeFile(path.join(root, "reports", "rag-profile-test-report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report.summary, ragIndex: report.ragIndex, anomalies: Object.fromEntries(Object.entries(anomalies).map(([key, value]) => [key, value.length])) }, null, 2));
