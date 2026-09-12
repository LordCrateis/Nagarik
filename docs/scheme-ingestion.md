# Government scheme ingestion for Nagarik

## Recommended source order

1. **[myScheme](https://www.myscheme.gov.in/schemes)** should be the primary catalogue. Its official FAQ confirms that scheme pages include eligibility criteria, benefits, application procedures, required documents, FAQs, and sources. It covers both Central and State/UT schemes.
2. **[National Portal of India](https://www.india.gov.in/my-government/schemes?page=1)** should provide discovery, categories, government level, department ownership, and cross-check links.
3. Add specialist official sources for fields that change quickly or need more detail:
   - [e-Shram welfare schemes](https://eshram.gov.in/social-security-welfare-schemes) for worker, pension, insurance, housing, and food-security schemes.
   - [National Scholarship Portal](https://scholarships.gov.in/All-Scholarships) for scholarship specifications, FAQs, academic years, and application deadlines.
   - [JanSamarth](https://financialservices.gov.in/node/4300) for credit-linked schemes.
4. Add State portals only for the states Nagarik supports, beginning with [MahaDBT](https://mahadbt.maharashtra.gov.in/Home/Index) and [Antyodaya SARAL Haryana](https://www.haryana.gov.in/project/e-services-saral-haryana/).

The machine-readable registry is in [`config/scheme-sources.json`](../config/scheme-sources.json).

## Fields to extract and cache

Every normalized scheme record should contain:

- `canonicalSchemeId`, `slug`, official name, aliases, and acronym
- short description, objective, categories, tags, and target groups
- government level, State/UT coverage, ministry, department, and implementing agency
- benefit type, amount, frequency, duration, subsidy/loan terms, and benefit text
- positive eligibility rules and explicit exclusions
- age, income, gender, social category, disability, occupation, residence, domicile, education, landholding, family, and prior-benefit constraints when present
- required and optional documents, issuer requirements, validity rules, file type, file size, and attestation requirements
- online/offline application modes, ordered steps, application URL, office/CSC destination, fees, and acknowledgement/tracking instructions
- opening date, deadline, renewal window, academic/financial year, and verification deadlines
- FAQs, contact/helpline, grievance route, source/reference URLs, guideline/PDF URLs, and official application URL
- page language, source last-updated value, scrape time, last verification time, HTTP status, content hash, parser version, and raw Markdown

Keep each eligibility statement in two forms: the exact source text and a normalized predicate. A normalized income rule, for example, should record amount, period, comparison operator, household/individual scope, geography, and exceptions. Nagarik should show the source wording whenever normalization is uncertain.

## Cache behavior

- Cache public scheme content only. Never cache applicant profiles, Aadhaar, bank details, OTRs, contact details entered by users, application status, or authenticated responses.
- Use `sourceId + canonicalUrl + language` as the raw-page key and `canonicalSchemeId` as the merged scheme key.
- Store raw Markdown beside normalized JSON so parsing can be repeated without spending another scrape credit.
- Hash normalized page content. Create a new version only when the hash changes.
- Revalidate myScheme and JanSamarth daily, scholarship pages every 12 hours during application season, and slower catalogues every 72 hours.
- Serve the last verified record while a refresh runs. Mark it stale in the UI after seven days and show the official source and verification date.
- Treat a missing page as withdrawn only after three consecutive crawls; government sites often fail temporarily.
- Resolve duplicate schemes by preferring the responsible ministry/department, then myScheme, then India.gov. Retain every source URL as provenance.

## Firecrawl workflow

1. Map each discovery URL and keep only public catalogue, scheme-detail, specification, FAQ, and guideline/PDF URLs.
2. Scrape detail pages as Markdown and links. Use a structured extraction schema matching the fields above.
3. Normalize into one scheme record, preserving source text for each eligibility rule and document requirement.
4. Validate URLs, dates, currency values, and threshold operators. Send low-confidence or conflicting records to review instead of making them eligible automatically.
5. Write raw and normalized records to the cache, update the content hash, and keep the prior version for auditability.

Do not crawl search-result combinations, personalized questionnaires, chatbots, login pages, application forms, CAPTCHA-protected pages, applicant lists, or tracking endpoints. These add little scheme knowledge and can expose personal data.

## Current Firecrawl status

An initial cache is available in [`.firecrawl/`](../.firecrawl/). It contains 30 raw scraped results across myScheme, e-Shram, the National Scholarship Portal, credit-scheme discovery, and MahaDBT (29 distinct URLs). The cache is intentionally raw; it has not been promoted to eligibility decisions. Use [`cache-manifest.json`](../.firecrawl/cache-manifest.json) for batch counts and [`config/scheme-sources.json`](../config/scheme-sources.json) for refresh intervals. The source list and first cache were verified against public official pages on 11 September 2026.

The current deterministic pass extracts 37 scheme candidates and collapses them to 34 canonical records. It merges exact/known aliases such as Ayushman Bharat PM-JAY and the two postgraduate scholarship naming variants, while retaining every provider URL as provenance. Run `pnpm dedupe:schemes` after a refresh; review uncertain matches before using the records for eligibility decisions or embeddings.
