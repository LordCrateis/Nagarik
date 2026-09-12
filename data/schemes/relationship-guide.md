# Nagarik relationship guide

This guide tells the model how user facts relate to government-scheme records. It does not replace official eligibility. The cached catalog remains the source of truth.

## Core meanings

- **Student** means `studentStatus` is true. Being a teacher, farmer, adult, low-income person, or a past student does not qualify someone for a current education or scholarship scheme.
- **Farmer** means `farmerStatus` is true. It relates to agriculture, cultivation, land, irrigation, crop, farmer welfare, rural livelihood, and similar schemes only.
- **Disability** means `disabilityStatus` is true. A disability certificate helps with readiness but does not establish an unstated percentage threshold.
- **Caste/category** is used only when the catalog explicitly targets that category.
- **State and district** are used only when an official record specifies a geographical restriction.
- **Age** must meet an explicitly stated age range. Senior status is not inferred before age 60 unless a catalog record gives another threshold.
- **Income** is annual income unless a record clearly requires another type. Parent, guardian, household, monthly, and annual income are not interchangeable.
- **Occupation and employment** may relate to worker, livelihood, skill, self-employment, and employment schemes. They never replace student, farmer, caste, disability, age, or income requirements.

## Documents

Available documents show readiness. Aadhaar can support identity proof, a bank passbook can support bank details, and a land record can support land ownership. A document alone does not prove a condition that the profile does not state. A missing required document should normally make an otherwise matching scheme **partial**.

## Decision and bundle policy

Gemini must use the full cached catalog, omit schemes that conflict with known facts, mark uncertain but plausible matches as partial, and select up to four compatible schemes. Its primary goal is to maximise the total practical benefit available to the user using official benefit amounts and meaningful non-cash support. It must avoid duplicate benefits and respect scholarship or monetary-benefit conflicts recorded in the catalog.
