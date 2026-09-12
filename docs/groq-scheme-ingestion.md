# Groq scheme ingestion

This pipeline turns cached Firecrawl Markdown into a source-aware scheme catalogue. Groq is called only by the explicit extraction command. Starting the API or frontend never calls Groq.

## Data flow

The entire pipeline is implemented in one dependency-free file: `scripts/extract_schemes.py`.

1. It reads cached JSON under `.firecrawl/`, rejects account and application-status URLs, maps every document to an official provider, removes exact URL duplicates, and writes `.firecrawl/normalized/source-documents.ndjson`.
2. It sends each selected public document to Groq using JSON Object Mode. Each response is cached by document ID and Firecrawl content hash under `.firecrawl/groq/`, so unchanged documents are not charged twice.
3. It merges canonical names, ranks State or department sources above aggregators, and writes:
   - `data/schemes/catalog.json`: rich records for RAG, review and future rule evaluation.
   - `artifacts/api-server/src/generated/scheme-catalog.ts`: the card-compatible catalogue served by the API.

## Configure

Keep these values in `.env`:

```env
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-120b
```

The pipeline defaults to `openai/gpt-oss-120b`, a Groq production model that supports strict JSON-schema output. The environment setting remains configurable so the model can be changed without editing the pipeline.

## Run

Use a small source-specific pass first:

```powershell
python scripts/extract_schemes.py --source=myscheme --limit=3
```

After reviewing the cached extraction JSON, process everything:

```powershell
python scripts/extract_schemes.py
```

Use `--force` only when the prompt or schema changed and existing content-hash results must be regenerated.

## Trust and safety rules

- Firecrawl content is passed to the model as untrusted source material.
- Missing facts remain empty; the extraction prompt forbids guessing.
- Every canonical record retains its URLs, authority, content hashes, evidence snippets, model and extraction time.
- Records below `0.45` confidence are excluded from the generated catalogue.
- Similar-looking scheme names are not automatically merged unless an extracted alias connects them. This favours duplicate review over combining distinct schemes.
- Generated eligibility rules are data. They do not become executable code.
- The current demo eligibility engine stays separate until the eligibility AST has a reviewed deterministic evaluator.
