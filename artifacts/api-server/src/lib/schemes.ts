import type { CitizenProfile, Scheme } from "@workspace/api-zod";
import { generatedSchemeDetails, generatedSchemes } from "../generated/scheme-catalog";

type Criterion = { label: string; evaluate: (profile: CitizenProfile) => boolean };

export type SchemeDefinition = Scheme & {
  criteria: Criterion[];
  /** A transparent local relevance score; it never claims official approval. */
  needMatch: (profile: CitizenProfile) => number;
};

const INDIAN_STATES = ["andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura", "uttar pradesh", "uttarakhand", "west bengal", "delhi", "jammu and kashmir", "ladakh", "puducherry"];
const lower = (value: string) => value.toLowerCase();

function incomeLimit(rule: string): number | null {
  const normalized = lower(rule).replace(/,/g, "");
  if (!/(income|annual income|family income|household income)/.test(normalized)) return null;
  const lakh = normalized.match(/(?:rs\.?|₹)?\s*(\d+(?:\.\d+)?)\s*(?:lakh|lac)/);
  if (lakh) return Number(lakh[1]) * 100000;
  const rupees = normalized.match(/(?:rs\.?|₹)\s*(\d{4,7})/);
  if (!rupees) return null;
  const amount = Number(rupees[1]);
  return /(monthly|per month)/.test(normalized) ? amount * 12 : amount;
}

function criteriaFor(scheme: Scheme): Criterion[] {
  const criteria: Criterion[] = [];
  const seen = new Set<string>();
  const add = (key: string, label: string, evaluate: (profile: CitizenProfile) => boolean) => { if (!seen.has(key)) { seen.add(key); criteria.push({ label, evaluate }); } };
  for (const rule of scheme.eligibilityRules) {
    const text = lower(rule);
    const state = INDIAN_STATES.find((name) => text.includes(name));
    if (state) add(`state:${state}`, `Residence requirement: ${state.replace(/\b\w/g, (letter) => letter.toUpperCase())}`, (profile) => lower(profile.state).includes(state));
    const ageRange = text.match(/(?:age (?:group |between )?|aged?\s+)(\d{1,3})\s*(?:to|[-–])\s*(\d{1,3})/);
    if (ageRange) { const minimum = Number(ageRange[1]); const maximum = Number(ageRange[2]); add(`age:${minimum}-${maximum}`, `Age must be ${minimum}–${maximum}`, (profile) => profile.age >= minimum && profile.age <= maximum); }
    else {
      const minimumAge = text.match(/(?:age|aged?)\s*(?:of\s*)?(\d{1,3})\s*(?:years?)?\s*(?:or|and)?\s*(?:above|older|more)/);
      if (minimumAge) { const minimum = Number(minimumAge[1]); add(`age-min:${minimum}`, `Age must be ${minimum} or above`, (profile) => profile.age >= minimum); }
      const maximumAge = text.match(/(?:below|under|less than)\s*(\d{1,3})\s*(?:years?|year)?/);
      if (maximumAge && /age|years? old/.test(text)) { const maximum = Number(maximumAge[1]); add(`age-max:${maximum}`, `Age must be below ${maximum}`, (profile) => profile.age < maximum); }
    }
    const limit = incomeLimit(rule);
    if (limit !== null && /(below|less than|not exceed|up to|maximum|under|within)/.test(text)) add(`income:${limit}`, `Income must be at most ₹${limit.toLocaleString("en-IN")}`, (profile) => profile.annualIncome > 0 && profile.annualIncome <= limit);
    if (/\bsc\b|scheduled caste/.test(text)) add("category:sc", "Reserved for Scheduled Caste applicants", (profile) => lower(profile.category) === "sc");
    if (/\bst\b|scheduled tribe/.test(text)) add("category:st", "Reserved for Scheduled Tribe applicants", (profile) => lower(profile.category) === "st");
    if (/\bobc\b|other backward class/.test(text)) add("category:obc", "Reserved for OBC applicants", (profile) => lower(profile.category) === "obc");
    if (/disabilit|divyang|pwd|persons? with disabilities/.test(text)) add("disability", "For persons with disabilities", (profile) => profile.disabilityStatus);
    if (/student|studying|education|college|university|school/.test(text)) add("student", "For students", (profile) => profile.studentStatus || /student/.test(lower(profile.occupation)));
    if (/farmer|agricultur|cultivator|landholder/.test(text)) add("farmer", "For farmers or cultivators", (profile) => profile.farmerStatus || /farmer|agricultur/.test(lower(profile.occupation)));
    if (/women|woman|female|girl/.test(text)) add("woman", "For women applicants", (profile) => lower(profile.gender) === "woman");
  }
  return criteria;
}

function needMatchFor(scheme: Scheme, profile: CitizenProfile): number {
  const text = lower(`${scheme.name} ${scheme.category} ${scheme.description} ${scheme.benefit} ${scheme.eligibilityRules.join(" ")}`);
  let matched = 0; let signals = 0;
  const score = (condition: boolean, terms: RegExp) => { if (terms.test(text)) { signals += 1; if (condition) matched += 1; } };
  score(profile.studentStatus, /scholarship|student|education|college|school/);
  score(profile.farmerStatus, /farmer|agricultur|crop|land|cultiv/);
  score(profile.disabilityStatus, /disabilit|divyang|pwd/);
  score(profile.age >= 60, /senior|old age|pension|elderly/);
  score(["Renting", "Homeless", "Temporary housing"].includes(profile.housingStatus), /housing|home|shelter|hostel|rent/);
  score(profile.annualIncome > 0 && profile.annualIncome <= 300000, /income|financial|assistance|subsid|allowance|welfare/);
  score(profile.urgency === "high", /health|medical|food|insurance|pension|assistance|support/);
  return signals ? matched / signals : 0.35;
}

// Parsed only from official eligibility text already in the local catalogue.
export const schemeDefinitions: SchemeDefinition[] = generatedSchemes.map((scheme) => ({ ...scheme, criteria: criteriaFor(scheme), needMatch: (profile) => needMatchFor(scheme, profile) }));
export const analysisSchemes: Scheme[] = generatedSchemes;
export const schemes: Scheme[] = generatedSchemes;
export const schemeById = new Map(schemeDefinitions.map((scheme) => [scheme.id, scheme]));
export const publicSchemeById = new Map(generatedSchemes.map((scheme) => [scheme.id, scheme]));
export const schemeDetailsById = new Map(generatedSchemeDetails.map((scheme) => [scheme.id, scheme]));
