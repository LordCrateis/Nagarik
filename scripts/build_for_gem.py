from __future__ import annotations

import json
import re
from collections import defaultdict
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
FIRECRAWL = ROOT / ".firecrawl"
OUTPUT = FIRECRAWL / "for_gem.json"
CATALOG = ROOT / "data" / "schemes" / "catalog.json"

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in",
    "is", "it", "of", "on", "or", "that", "the", "their", "this", "to", "with",
    "will", "under", "only", "all", "any", "can", "may", "not", "should", "must",
    "scheme", "schemes", "government", "india", "official", "information", "details",
}


def load_json(path: Path) -> Any:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError):
        return None


def add_unique(target: list[str], values: Any) -> None:
    if isinstance(values, str):
        values = [values]
    if not isinstance(values, list):
        return
    seen = {item.casefold() for item in target}
    for value in values:
        if isinstance(value, str):
            value = re.sub(r"\s+", " ", value).strip()
            if value and value.casefold() not in seen:
                target.append(value)
                seen.add(value.casefold())


def phrase_keywords(values: list[str]) -> list[str]:
    phrases: list[str] = []
    seen: set[str] = set()
    for value in values:
        clean = re.sub(r"https?://\S+", " ", value)
        clean = re.sub(r"[^\w₹%/&+.-]+", " ", clean, flags=re.UNICODE)
        words = [word.strip(".-") for word in clean.split() if word.strip(".-")]
        for size in (1, 2, 3, 4):
            for index in range(len(words) - size + 1):
                phrase = " ".join(words[index:index + size])
                normalized = phrase.casefold()
                if len(phrase) < 3 or normalized in STOPWORDS or all(word.casefold() in STOPWORDS for word in words[index:index + size]):
                    continue
                if size == 1 and (len(phrase) < 4 or phrase.isdigit()):
                    continue
                if normalized not in seen:
                    phrases.append(phrase)
                    seen.add(normalized)
    return phrases


def keyword_lines(value: Any) -> list[str]:
    text = text_from(value)
    lines = []
    for line in text.splitlines():
        line = re.sub(r"^\s*(?:[-*•]|\d+[.)])\s*", "", line).strip()
        if line.startswith("#") or len(line) >= 4:
            lines.append(line)
    return lines


def source_inventory() -> list[dict[str, Any]]:
    files = []
    for path in sorted(FIRECRAWL.rglob("*.json")):
        if path == OUTPUT:
            continue
        payload = load_json(path)
        files.append({
            "path": path.relative_to(ROOT).as_posix(),
            "bytes": path.stat().st_size,
            "topLevelType": type(payload).__name__ if payload is not None else "unreadable",
            "topLevelKeys": sorted(payload.keys()) if isinstance(payload, dict) else [],
        })
    return files


def text_from(value: Any, limit: int = 0) -> str:
    if isinstance(value, str):
        return value[:limit] if limit else value
    if isinstance(value, list):
        return "\n".join(text_from(item, limit) for item in value)
    if isinstance(value, dict):
        return "\n".join(text_from(item, limit) for item in value.values())
    return ""


def main() -> None:
    catalog = load_json(CATALOG) or {"schemes": []}
    catalog_schemes = catalog.get("schemes", []) if isinstance(catalog, dict) else []
    schemes: dict[str, dict[str, Any]] = {}
    keyword_inputs: dict[str, list[str]] = defaultdict(list)

    for scheme in catalog_schemes:
        if not isinstance(scheme, dict) or not scheme.get("id"):
            continue
        scheme_id = scheme["id"]
        schemes[scheme_id] = {
            "schemeId": scheme_id,
            "name": scheme.get("name", ""),
            "aliases": scheme.get("aliases", []),
            "shortDescription": scheme.get("shortDescription", ""),
            "fullDescription": scheme.get("fullDescription", ""),
            "governmentLevel": scheme.get("governmentLevel"),
            "state": scheme.get("state"),
            "department": scheme.get("department"),
            "category": scheme.get("category"),
            "benefits": scheme.get("benefits", []),
            "eligibilityRules": scheme.get("eligibilityRules", []),
            "exclusions": scheme.get("exclusions", []),
            "requiredDocuments": scheme.get("requiredDocuments", []),
            "applicationSteps": scheme.get("applicationSteps", []),
            "applicationUrl": scheme.get("applicationUrl"),
            "deadlines": scheme.get("deadlines", []),
            "conflicts": scheme.get("conflicts", []),
            "stackabilityNotes": scheme.get("stackabilityNotes", []),
            "sourceEvidence": scheme.get("sourceEvidence", []),
            "confidence": scheme.get("confidence"),
            "sources": scheme.get("sources", []),
            "rawLocalEvidence": [],
            "enrichmentOverlays": [],
            "searchAndRagDocuments": [],
            "keywords": [],
        }
        for field in (
            "name", "aliases", "shortDescription", "fullDescription", "category",
            "department", "benefits", "eligibilityRules", "exclusions",
            "requiredDocuments", "applicationSteps", "deadlines", "stackabilityNotes",
        ):
            keyword_inputs[scheme_id].extend(keyword_lines(scheme.get(field)))

    for path in sorted((FIRECRAWL / "enrichment" / "evidence").glob("*.json")):
        item = load_json(path)
        if not isinstance(item, dict):
            continue
        scheme_id = item.get("schemeId")
        if scheme_id not in schemes:
            continue
        schemes[scheme_id]["rawLocalEvidence"].append({
            "file": path.relative_to(ROOT).as_posix(),
            "schemeName": item.get("schemeName"),
            "missingFields": item.get("missingFields", []),
            "officialPages": item.get("officialPages", []),
            "existingScheme": item.get("existingScheme", {}),
        })
        for page in item.get("officialPages", []):
            keyword_inputs[scheme_id].extend(keyword_lines(page.get("markdown", "")))

    for path in sorted((FIRECRAWL / "enrichment" / "groq").glob("*.json")):
        item = load_json(path)
        if not isinstance(item, dict):
            continue
        scheme_id = item.get("schemeId")
        if scheme_id not in schemes:
            continue
        schemes[scheme_id]["enrichmentOverlays"].append({
            "file": path.relative_to(ROOT).as_posix(),
            "version": item.get("version"),
            "fields": item.get("fields", {}),
            "fieldEvidence": item.get("fieldEvidence", []),
            "unresolvedFields": item.get("unresolvedFields", []),
        })
        keyword_inputs[scheme_id].extend(keyword_lines(item.get("fields", {})))
        keyword_inputs[scheme_id].extend(keyword_lines(item.get("fieldEvidence", [])))

    rag = load_json(FIRECRAWL / "rag-documents.json") or {}
    for document in rag.get("documents", []) if isinstance(rag, dict) else []:
        if not isinstance(document, dict):
            continue
        scheme_id = document.get("schemeId")
        if scheme_id not in schemes:
            continue
        schemes[scheme_id]["searchAndRagDocuments"].append({
            "id": document.get("id"),
            "source": document.get("source"),
            "sourceUrl": document.get("sourceUrl"),
            "title": document.get("title"),
            "text": document.get("text", ""),
            "metadata": document.get("metadata", {}),
        })
        keyword_inputs[scheme_id].extend(keyword_lines(document.get("text", "")))

    for scheme_id, scheme in schemes.items():
        for source in scheme.get("sources", []):
            if isinstance(source, dict):
                keyword_inputs[scheme_id].extend([str(source.get("title", "")), str(source.get("url", "")), str(source.get("sourceId", ""))])
        scheme["keywords"] = phrase_keywords(keyword_inputs[scheme_id])

    raw_files = []
    for path in sorted(FIRECRAWL.rglob("*.json")):
        if path == OUTPUT:
            continue
        payload = load_json(path)
        if payload is not None:
            raw_files.append({"path": path.relative_to(ROOT).as_posix(), "data": payload})

    result = {
        "format": "nagarik-for-gem",
        "version": 1,
        "generatedFrom": {
            "inputFolder": ".firecrawl",
            "catalogFile": "data/schemes/catalog.json",
            "externalAccess": False,
            "purpose": "Complete local scheme knowledge package for Gemini ingestion.",
        },
        "schemeShape": {
            "description": "One record represents one public-benefit scheme. Empty arrays, nulls, and empty strings mean the local evidence did not provide that field.",
            "requiredIdentity": ["schemeId", "name"],
            "fields": {
                "schemeId": "Stable canonical identifier.",
                "name": "Official scheme name.",
                "aliases": "Alternative names, abbreviations, and portal labels.",
                "shortDescription": "One-line summary.",
                "fullDescription": "Complete scheme overview.",
                "governmentLevel": "Central, state, union territory, mixed, or unknown.",
                "state": "Applicable Indian state or null for national schemes.",
                "department": "Implementing ministry, department, or authority.",
                "category": "Benefit domain such as scholarship, pension, health, agriculture, housing, or employment.",
                "benefits": "Each benefit with description, amountInr, and frequency when known.",
                "eligibilityRules": "Structured rules with field/operator/value/unit/rawText.",
                "exclusions": "Conditions or applicant groups explicitly excluded.",
                "requiredDocuments": "Documents explicitly requested for application or verification.",
                "applicationSteps": "Ordered application instructions.",
                "applicationUrl": "Official application or scheme URL.",
                "deadlines": "Explicit dates, periods, or deadline statements only.",
                "conflicts": "Known incompatible schemes or restrictions.",
                "stackabilityNotes": "Whether and how the benefit combines with others.",
                "sourceEvidence": "Supporting quotes and source URLs.",
                "confidence": "Extraction confidence from the local pipeline.",
                "sources": "Canonical source metadata.",
                "rawLocalEvidence": "Cached official page captures and missing-field context.",
                "enrichmentOverlays": "Local overlay additions with field-level evidence.",
                "searchAndRagDocuments": "Cached search/RAG text associated with the scheme.",
                "keywords": "All useful single-word and multi-word phrases for retrieval, matching, and user queries.",
            },
        },
        "sourceInventory": source_inventory(),
        "rawLocalFiles": raw_files,
        "schemes": sorted(schemes.values(), key=lambda item: item["name"].casefold()),
    }
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(schemes)} schemes and {len(result['sourceInventory'])} local JSON inputs.")


if __name__ == "__main__":
    main()
