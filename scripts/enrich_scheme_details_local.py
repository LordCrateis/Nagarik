"""Create scheme overlays from cached official Firecrawl evidence only."""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_DIR = ROOT / ".firecrawl" / "enrichment" / "evidence"
OUTPUT_DIR = ROOT / ".firecrawl" / "enrichment" / "groq"

SECTION_NAMES = {
    "fullDescription": ("details", "about", "overview", "scheme details"),
    "benefits": ("benefits", "benefit", "financial assistance", "incentives"),
    "eligibilityRules": ("eligibility", "who can apply", "eligibility criteria"),
    "requiredDocuments": ("documents required", "documents", "required documents"),
    "applicationSteps": ("application process", "how to apply", "application steps", "apply now"),
    "applicationUrl": ("application process", "how to apply", "application steps", "apply now"),
    "deadlines": ("deadline", "deadlines", "important dates", "last date", "validity"),
}


def normalized(value: str) -> str:
    return re.sub(r"[^a-z0-9 ]+", " ", value.lower()).strip()


def is_heading(line: str) -> bool:
    return bool(re.match(r"^\s{0,3}#{1,6}\s+", line))


def heading_name(line: str) -> str:
    return normalized(re.sub(r"^\s{0,3}#{1,6}\s+", "", line)).strip(" :")


def section(markdown: str, names: tuple[str, ...]) -> list[str]:
    lines = markdown.splitlines()
    start = None
    for index, line in enumerate(lines):
        if not is_heading(line):
            continue
        title = heading_name(line)
        if any(title == normalized(name) or title.startswith(normalized(name) + " ") for name in names):
            start = index + 1
            break
    if start is None:
        return []
    end = len(lines)
    for index in range(start, len(lines)):
        if is_heading(lines[index]):
            end = index
            break
    return lines[start:end]


def exact_items(lines: list[str]) -> list[str]:
    items = []
    for line in lines:
        stripped = line.strip()
        if not stripped or is_heading(stripped):
            continue
        if re.match(r"^(?:[-*•]|\d+[.)])\s+", stripped):
            items.append(stripped)
    if items:
        return items
    return [line.strip() for line in lines if len(line.strip()) >= 35 and not line.strip().startswith(("#", "["))]


def value_text(item: str) -> str:
    return re.sub(r"^(?:[-*•]|\d+[.)])\s+", "", item).strip()


def amount(item: str) -> int | None:
    match = re.search(r"(?:₹|Rs\.?|INR)\s*([\d][\d,]*)", item, re.IGNORECASE)
    if not match:
        return None
    return int(match.group(1).replace(",", ""))


def frequency(item: str) -> str | None:
    lowered = item.lower()
    if "monthly" in lowered or "per month" in lowered:
        return "monthly"
    if "yearly" in lowered or "annual" in lowered or "per year" in lowered:
        return "yearly"
    if "one-time" in lowered or "one time" in lowered or "lump sum" in lowered:
        return "one-time"
    return None


def first_description(lines: list[str]) -> str | None:
    blocks = re.split(r"\n\s*\n", "\n".join(lines))
    for block in blocks:
        quote = " ".join(line.strip() for line in block.splitlines() if line.strip())
        if len(quote) >= 45 and not quote.startswith(("-", "*", "•")):
            return quote
    return None


def deadline_items(markdown: str) -> list[str]:
    matches = []
    for line in markdown.splitlines():
        stripped = line.strip()
        if not stripped or is_heading(stripped):
            continue
        has_date = bool(re.search(
            r"(?:\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b|\b20\d{2}\b)",
            stripped,
            re.IGNORECASE,
        ))
        explicit_status = bool(re.search(r"\b(?:ongoing|no deadline|no fixed deadline)\b", stripped, re.IGNORECASE))
        if has_date or explicit_status:
            matches.append(stripped)
    return matches


def official_url(markdown: str, page_url: str, application_lines: list[str]) -> tuple[str, str] | None:
    for line in application_lines:
        match = re.search(r"https?://[^\s)]+", line)
        if match and match.group(0).rstrip(".,") != page_url.rstrip("/"):
            return match.group(0).rstrip(".,"), line.strip()
    return None


def extract(evidence: dict) -> dict:
    pages = [page for page in evidence.get("officialPages", []) if page.get("url") and page.get("markdown")]
    fields: dict = {}
    field_evidence: list[dict] = []

    def add_evidence(field: str, quote: str, url: str) -> None:
        field_evidence.append({"field": field, "quote": quote, "url": url})

    for field in evidence.get("missingFields", []):
        if field == "fullDescription":
            for page in pages:
                quote = first_description(section(str(page["markdown"]), SECTION_NAMES[field]))
                if quote:
                    fields[field] = quote
                    add_evidence(field, quote, page["url"])
                    break
        elif field == "benefits":
            values = []
            for page in pages:
                for item in exact_items(section(str(page["markdown"]), SECTION_NAMES[field])):
                    values.append({"description": value_text(item), "amountInr": amount(item), "frequency": frequency(item)})
                    add_evidence(field, item, page["url"])
            if values:
                fields[field] = values
        elif field == "eligibilityRules":
            values = []
            for page in pages:
                for item in exact_items(section(str(page["markdown"]), SECTION_NAMES[field])):
                    values.append({"field": "unknown", "operator": "unknown", "value": None, "unit": None, "rawText": value_text(item)})
                    add_evidence(field, item, page["url"])
            if values:
                fields[field] = values
        elif field in ("requiredDocuments", "applicationSteps"):
            values = []
            for page in pages:
                for item in exact_items(section(str(page["markdown"]), SECTION_NAMES[field])):
                    values.append(value_text(item))
                    add_evidence(field, item, page["url"])
            if values:
                fields[field] = values
        elif field == "deadlines":
            values = []
            for page in pages:
                for item in deadline_items(str(page["markdown"])):
                    values.append(value_text(item))
                    add_evidence(field, item, page["url"])
            if values:
                fields[field] = values
        elif field == "applicationUrl":
            for page in pages:
                result = official_url(str(page["markdown"]), page["url"], section(str(page["markdown"]), SECTION_NAMES[field]))
                if result:
                    url, quote = result
                    fields[field] = url
                    add_evidence(field, quote, page["url"])
                    break

    return {
        "version": 1,
        "schemeId": evidence["schemeId"],
        "amountGap": bool(evidence.get("amountGap")),
        "fields": fields,
        "fieldEvidence": field_evidence,
        "unresolvedFields": [field for field in evidence.get("missingFields", []) if field not in fields],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract catalogue overlays from cached official Firecrawl evidence.")
    parser.add_argument("--force", action="store_true", help="Refresh local overlays after new evidence is cached")
    parser.add_argument("--amount-only", action="store_true", help="Only process amount-gap evidence produced by schemes:amounts")
    args = parser.parse_args()

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for evidence_path in sorted(EVIDENCE_DIR.glob("*.json")):
        evidence = json.loads(evidence_path.read_text(encoding="utf-8"))
        if args.amount_only and not evidence.get("amountGap"):
            continue
        output_path = OUTPUT_DIR / evidence_path.name
        if output_path.exists() and not args.force:
            print(f"cached {evidence_path.stem}")
            continue
        existed = output_path.exists()
        output_path.write_text(json.dumps(extract(evidence), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"updated {output_path.name}" if existed else f"created {output_path.name}")


if __name__ == "__main__":
    main()
