/**
 * Nagarik relationship guide
 *
 * This is decision context for the model, not a second source of government
 * rules. Government eligibility always comes from the cached scheme catalog.
 */
export const RELATIONSHIP_GUIDE = `
# Nagarik relationship guide

## Source of truth
Treat the supplied CandidateCatalog as the only source for a scheme's eligibility,
benefits, documents, exclusions, and stackability. The user profile is the only
source for the person's facts. Never fill a missing fact with a stereotype.

## Profile facts and their relationships
- studentStatus=true means the person is currently studying. A job title, age,
  low income, being a teacher, or being a farmer does not make someone a student.
  Education and scholarship schemes require studentStatus=true or another explicit
  current-study fact in the profile unless the catalog clearly says otherwise.
- farmerStatus=true means the person reports farming or cultivation. It can support
  agriculture, land, irrigation, crop, farmer welfare, or rural livelihood schemes.
  It does not support education, disability, pension, or caste-only schemes by itself.
- disabilityStatus=true supports disability-targeted schemes only when the catalog
  requires disability. A disability certificate in availableDocuments is evidence
  that the person can prepare an application, not proof of a percentage threshold
  the profile does not state.
- category is a social-category fact. Use it for schemes explicitly limited to that
  category. Do not infer a category from name, state, occupation, or documents.
- state and district are location facts. Prefer a scheme that serves the stated state
  when its catalog scope requires that state. A central scheme is not state-limited
  unless its official record says it is.
- age is a factual range check. Do not recommend a scheme with a stated age range
  that excludes the user. Do not infer senior status before age 60 unless the catalog
  gives a different threshold.
- annualIncome is the reported annual income. Compare it only with an explicit income
  rule in the catalog. Do not confuse family, parent, guardian, monthly, and annual
  income: when the required income type is missing, mark the scheme partial.
- occupation and employmentStatus describe work. They can support livelihood,
  skill, worker, self-employment, or employment schemes when the catalog matches.
  They are not substitutes for student, farmer, disability, caste, age, or income facts.
- housingStatus and urgency indicate need and may help prioritize suitable eligible
  schemes. They do not prove eligibility unless the official scheme record says so.
- gender applies only when the catalog explicitly targets a gender.

## Documents
availableDocuments means the user says the item is available now. Match document
names by meaning (for example Aadhaar is identity proof; bank passbook is bank
details; land record is land ownership evidence). A document can make a scheme more
ready to apply for, but it cannot prove an eligibility condition that it does not
establish. Missing a required document normally makes a matching scheme partial,
not eligible; list that specific document in missingInformation.

## Eligibility outcomes
- eligible: each material catalog condition is directly supported by profile facts
  and available documents, or the catalog does not state a condition.
- partial: the scheme plausibly matches, but one concrete fact or document is absent
  or unclear. State exactly what is missing.
- omit: an official condition conflicts with a known profile fact, the scheme is
  unrelated to the user's profile/need, or the record is too incomplete to support a
  meaningful recommendation.

## Bundling
Choose up to four schemes using reasoning across the whole catalog. The primary goal
is to maximise the total practical benefit available to this person: prefer higher
official benefit amounts or stronger non-cash support after confirming the match.
Then favour different needs, practical document readiness, and direct application
value. Do not stack scholarships, fellowships, or monetary benefits when a catalog
conflict or stackability note says they cannot coexist. Do not select several versions
of the same benefit just because each is individually plausible. Explain each bundle
choice using a profile fact and catalog fact.
`;
