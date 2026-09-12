# Firecrawl cache

The JSON files in this directory are the initial public-source cache for Nagarik. They contain Firecrawl search metadata and scraped Markdown for official scheme pages, eligibility pages, and guideline PDFs (30 raw results, 29 distinct URLs).

- `search-myscheme-scraped.json`: 10 myScheme detail pages
- `search-eshram-scraped.json`: 5 e-Shram pages
- `search-nsp-scraped.json`: 5 National Scholarship Portal pages/PDFs
- `search-credit-schemes-scraped.json`: 5 credit-scheme discovery results
- `search-state-portals-scraped.json`: 5 Maharashtra scheme pages
- `cache-manifest.json`: counts and source mapping
- `deduped-schemes.json`: canonical scheme records with merged provenance
- `rag-documents.json`: source-aware documents ready for chunking and embeddings

Do not put `.env`, API keys, applicant records, Aadhaar numbers, bank details, OTRs, application statuses, or authenticated responses in this directory. Run `pnpm dedupe:schemes` after each refresh to regenerate the canonical records and RAG documents. Normalize these raw records into the application data model only after validating source URLs, dates, eligibility operators, and document lists.
