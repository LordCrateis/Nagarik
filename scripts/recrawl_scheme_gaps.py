"""Recrawl official scheme sources and cache evidence for missing catalogue fields.

This stage uses Firecrawl only. It never calls Groq and never changes the catalogue.
Run ``pnpm schemes:recrawl`` before the token-heavy enrichment stage.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
CATALOG_FILE = ROOT / "data" / "schemes" / "catalog.json"
MAPPINGS_FILE = ROOT / "config" / "scheme-source-mappings.json"
ENRICHMENT_DIR = ROOT / ".firecrawl" / "enrichment"
RECRAWL_DIR = ENRICHMENT_DIR / "recrawled"
SEARCH_DIR = ENRICHMENT_DIR / "search"
EVIDENCE_DIR = ENRICHMENT_DIR / "evidence"
MANIFEST_FILE = ENRICHMENT_DIR / "manifest.json"

CORE_FIELDS = (
    "fullDescription",
    "benefits",
    "eligibilityRules",
    "requiredDocuments",
    "applicationSteps",
    "applicationUrl",
    "deadlines",
)


def load_env() -> None:
    path = ROOT / ".env"
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")[:100]


def digest(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:20]


def missing_fields(scheme: dict) -> list[str]:
    return [field for field in CORE_FIELDS if scheme.get(field) in (None, "", [])]


def missing_benefit_amount(scheme: dict) -> bool:
    """Return true unless the catalogue has at least one confirmed positive INR value."""
    benefits = scheme.get("benefits") or []
    return not any(
        isinstance(benefit, dict)
        and isinstance(benefit.get("amountInr"), (int, float))
        and benefit["amountInr"] > 0
        for benefit in benefits
    )


def amount_evidence(page: dict) -> bool:
    """Keep only substantive official pages that mention a benefit and a monetary/rate cue."""
    markdown = str(page.get("markdown") or "")
    lower = markdown.lower()
    has_benefit_cue = any(term in lower for term in (
        "benefit", "financial assistance", "scholarship", "allowance", "reimbursement",
        "subsidy", "incentive", "grant", "support",
    ))
    has_value_cue = bool(re.search(
        r"(?:₹|\brs\.?|\binr\b|\bpercent(?:age)?\b|\bper month\b|\bper year\b|\bmonthly\b|\bannual(?:ly)?\b)",
        markdown,
        re.IGNORECASE,
    ))
    return has_benefit_cue and has_value_cue


def firecrawl_command() -> list[str]:
    executable = shutil.which("firecrawl")
    if executable:
        return [executable]
    npx = shutil.which("npx.cmd") or shutil.which("npx")
    if not npx:
        raise RuntimeError("Firecrawl CLI is unavailable and npx was not found on PATH.")
    return [npx, "--yes", "firecrawl-cli"]


def run_cli(arguments: list[str], timeout: int = 240) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [*firecrawl_command(), *arguments],
        cwd=ROOT,
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
    )


def read_firecrawl_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    try:
        payload = json.loads(text)
    except json.JSONDecodeError:
        return {"markdown": text, "links": [], "metadata": {}}

    if not isinstance(payload, dict):
        return {"markdown": "", "links": [], "metadata": {}, "raw": payload}
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    return {
        "markdown": data.get("markdown") or data.get("content") or "",
        "links": data.get("links") if isinstance(data.get("links"), list) else [],
        "metadata": data.get("metadata") if isinstance(data.get("metadata"), dict) else {},
    }


def scrape(url: str, output: Path, force: bool) -> dict:
    if output.exists() and not force:
        page = read_firecrawl_file(output)
        page.update({"url": url, "cacheFile": output.relative_to(ROOT).as_posix(), "cached": True})
        return page

    output.parent.mkdir(parents=True, exist_ok=True)
    result = run_cli([
        "scrape", url,
        "--only-main-content",
        "--wait-for", "3000",
        "--format", "markdown,links",
        "-o", str(output),
    ])
    if result.returncode != 0 or not output.exists():
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(detail[-1000:] or f"Firecrawl exited with {result.returncode}")
    page = read_firecrawl_file(output)
    page.update({"url": url, "cacheFile": output.relative_to(ROOT).as_posix(), "cached": False})
    return page


def useful_for_scheme(page: dict, scheme: dict) -> bool:
    markdown = str(page.get("markdown") or "")
    if len(markdown.strip()) < 250:
        return False
    lower = markdown.lower()
    bad_markers = ("page not found", "access denied", "captcha")
    if len(markdown) < 3000 and any(marker in lower[:1500] for marker in bad_markers):
        return False
    name_words = {
        word for word in re.findall(r"[a-z0-9]+", scheme["name"].lower())
        if len(word) >= 4 and word not in {"scheme", "yojana", "programme", "government"}
    }
    name_hits = sum(word in lower for word in name_words)
    detail_hits = sum(
        term in lower
        for term in ("eligibility", "eligible", "benefit", "documents", "how to apply", "application process")
    )
    return name_hits >= min(2, max(1, len(name_words))) and detail_hits >= 2


def allowed_official_hosts() -> set[str]:
    mappings = json.loads(MAPPINGS_FILE.read_text(encoding="utf-8"))
    return {
        host.lower()
        for source in mappings.get("sources", [])
        for host in source.get("hosts", [])
    }


def is_official_url(url: str, known_hosts: set[str]) -> bool:
    host = urlparse(url).hostname or ""
    host = host.lower().removeprefix("www.")
    normalized_known = {item.removeprefix("www.") for item in known_hosts}
    return (
        host in normalized_known
        or host.endswith(".gov.in")
        or host.endswith(".nic.in")
        or host in {"gov.in", "nic.in", "jansamarth.in"}
    )


def search_items(payload: dict) -> list[dict]:
    data = payload.get("data")
    if isinstance(data, dict):
        candidates = data.get("web", [])
    elif isinstance(data, list):
        candidates = data
    else:
        candidates = payload.get("web", [])
    return [item for item in candidates if isinstance(item, dict)]


def search_official(
    scheme: dict,
    output: Path,
    known_hosts: set[str],
    force: bool,
    amount_mode: bool = False,
) -> list[dict]:
    if not output.exists() or force:
        state = f' "{scheme["state"]}"' if scheme.get("state") else ""
        if amount_mode:
            query = (
                f'"{scheme["name"]}"{state} benefit amount financial assistance '
                "scholarship rate reimbursement subsidy site:gov.in OR site:nic.in"
            )
        else:
            query = (
                f'"{scheme["name"]}"{state} eligibility benefits required documents '
                "application site:gov.in OR site:nic.in"
            )
        output.parent.mkdir(parents=True, exist_ok=True)
        result = run_cli(["search", query, "--scrape", "--json", "-o", str(output)])
        if result.returncode != 0 or not output.exists():
            detail = (result.stderr or result.stdout).strip()
            raise RuntimeError(detail[-1000:] or f"Firecrawl search exited with {result.returncode}")

    payload = json.loads(output.read_text(encoding="utf-8", errors="replace"))
    accepted = []
    for item in search_items(payload):
        url = item.get("url") or (item.get("metadata") or {}).get("sourceURL")
        markdown = item.get("markdown") or item.get("content") or item.get("description") or ""
        if url and is_official_url(url, known_hosts) and len(markdown.strip()) >= 250:
            accepted.append({
                "url": url,
                "title": item.get("title") or (item.get("metadata") or {}).get("title") or "",
                "markdown": markdown,
                "cacheFile": output.relative_to(ROOT).as_posix(),
                "discoveredBy": "official-domain-search",
            })
    return accepted[:3]


def compact_page(page: dict) -> dict:
    return {
        "url": page.get("url"),
        "title": page.get("title") or (page.get("metadata") or {}).get("title") or "",
        "markdown": page.get("markdown") or "",
        "cacheFile": page.get("cacheFile"),
        "discoveredBy": page.get("discoveredBy", "catalogue-source-recrawl"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Cache official evidence for incomplete Nagarik schemes.")
    parser.add_argument("--scheme", help="Only process a scheme ID or a case-insensitive name fragment")
    parser.add_argument("--limit", type=int, default=0, help="Maximum number of schemes to prepare")
    parser.add_argument("--offset", type=int, default=0, help="Number of matching schemes to skip before applying --limit")
    parser.add_argument("--force", action="store_true", help="Refresh existing Firecrawl cache files")
    parser.add_argument(
        "--amount-gaps",
        action="store_true",
        help="Only cache official pages for schemes without a confirmed positive benefit amount",
    )
    parser.add_argument(
        "--search-official",
        action="store_true",
        help="Search gov.in/nic.in when existing sources do not contain useful details",
    )
    args = parser.parse_args()

    load_env()
    if not os.environ.get("FIRECRAWL_API_KEY"):
        print("FIRECRAWL_API_KEY is missing from .env.", file=sys.stderr)
        return 2

    payload = json.loads(CATALOG_FILE.read_text(encoding="utf-8"))
    schemes = payload.get("schemes", [])
    if args.amount_gaps:
        schemes = [scheme for scheme in schemes if missing_benefit_amount(scheme)]
    else:
        schemes = [scheme for scheme in schemes if missing_fields(scheme)]
    if args.scheme:
        needle = args.scheme.lower()
        schemes = [
            scheme for scheme in schemes
            if needle in scheme.get("id", "").lower() or needle in scheme.get("name", "").lower()
        ]
    if args.offset > 0:
        schemes = schemes[args.offset:]
    if args.limit > 0:
        schemes = schemes[:args.limit]

    known_hosts = allowed_official_hosts()
    url_cache: dict[str, dict] = {}
    failures: list[dict] = []
    searched = 0
    EVIDENCE_DIR.mkdir(parents=True, exist_ok=True)

    unique_urls = {
        source.get("url")
        for scheme in schemes
        for source in scheme.get("sources", [])
        if source.get("url")
    }
    scope = "missing benefit amounts" if args.amount_gaps else "incomplete scheme fields"
    print(
        f"Preparing official evidence for {len(schemes)} schemes with {scope} "
        f"from {len(unique_urls)} unique source URLs.",
        flush=True,
    )

    for index, scheme in enumerate(schemes, start=1):
        gaps = ["benefits"] if args.amount_gaps else missing_fields(scheme)
        label = "benefit amount" if args.amount_gaps else ", ".join(gaps)
        print(f"[{index}/{len(schemes)}] {scheme['name']} ({label})", flush=True)
        pages: list[dict] = []
        for source in scheme.get("sources", []):
            url = source.get("url")
            if not url:
                continue
            try:
                if url not in url_cache:
                    output = RECRAWL_DIR / f"{digest(url)}.json"
                    url_cache[url] = scrape(url, output, args.force)
                    status = "cached" if url_cache[url].get("cached") else "scraped"
                    print(f"  {status}: {url}", flush=True)
                pages.append({**url_cache[url], "title": source.get("title", "")})
            except Exception as error:
                failures.append({"schemeId": scheme["id"], "url": url, "error": str(error)})
                print(f"  scrape failed: {url}: {error}", file=sys.stderr, flush=True)

        def is_useful(page: dict) -> bool:
            if not useful_for_scheme(page, scheme):
                return False
            return amount_evidence(page) if args.amount_gaps else True
        useful = [page for page in pages if is_useful(page)]
        if args.search_official and not useful:
            search_file = SEARCH_DIR / f"{slug(scheme['id'])}.json"
            try:
                discovered = search_official(
                    scheme,
                    search_file,
                    known_hosts,
                    args.force,
                    amount_mode=args.amount_gaps,
                )
                searched += 1
                pages.extend(discovered)
                useful.extend(page for page in discovered if is_useful(page))
                print(f"  official search: {len(discovered)} accepted result(s)", flush=True)
            except Exception as error:
                failures.append({"schemeId": scheme["id"], "search": True, "error": str(error)})
                print(f"  official search failed: {error}", file=sys.stderr, flush=True)

        evidence = {
            "version": 1,
            "schemeId": scheme["id"],
            "schemeName": scheme["name"],
            "missingFields": gaps,
            "amountGap": args.amount_gaps,
            "existingScheme": scheme,
            "officialPages": [compact_page(page) for page in pages],
            "usefulPageCount": len(useful),
            "status": "ready" if useful else "insufficient-official-evidence",
        }
        evidence_file = EVIDENCE_DIR / f"{scheme['id']}.json"
        evidence_file.write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    manifest = {
        "version": 1,
        "schemeCount": len(schemes),
        "uniqueSourceUrlCount": len(unique_urls),
        "officialSearchCount": searched,
        "readyCount": sum(
            json.loads(path.read_text(encoding="utf-8")).get("status") == "ready"
            for path in EVIDENCE_DIR.glob("*.json")
        ),
        "failureCount": len(failures),
        "failures": failures,
    }
    MANIFEST_FILE.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_FILE.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"Evidence cache complete: {manifest['readyCount']} ready, "
        f"{len(failures)} Firecrawl failure(s)."
    )
    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())




