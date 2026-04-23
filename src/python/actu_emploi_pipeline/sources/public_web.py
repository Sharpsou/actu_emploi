from __future__ import annotations

import hashlib
import json
import re
import time
import urllib.parse
import urllib.request
from html import unescape
from pathlib import Path
from typing import Any

from actu_emploi_pipeline.settings import Settings


DEFAULT_USER_AGENT = (
    "Mozilla/5.0 (compatible; ActuEmploiBot/0.1; +https://example.local/actu-emploi)"
)


class PublicWebFetcher:
    def __init__(self, settings: Settings, source_name: str) -> None:
        self.settings = settings
        self.source_name = source_name.lower().replace(" ", "-")
        self._last_request_at = 0.0
        self._request_count = 0
        self.cache_dir = Path(__file__).resolve().parents[3] / "data" / "runtime" / "http-cache" / self.source_name
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def fetch_text(self, url: str) -> str:
        cache_path = self._cache_path(url)
        cached = self._read_cache(cache_path)
        if cached is not None:
            return cached

        if self._request_count >= self.settings.public_max_requests_per_source:
            raise RuntimeError(
                f"Request budget reached for {self.source_name}: "
                f"{self.settings.public_max_requests_per_source} requests max per run."
            )

        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.settings.public_request_delay_seconds:
            time.sleep(self.settings.public_request_delay_seconds - elapsed)

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": DEFAULT_USER_AGENT,
                "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
            },
            method="GET",
        )
        with urllib.request.urlopen(request, timeout=self.settings.public_request_timeout_seconds) as response:
            content = response.read().decode("utf-8", errors="replace")

        self._last_request_at = time.monotonic()
        self._request_count += 1
        self._write_cache(cache_path, content)
        return content

    def _cache_path(self, url: str) -> Path:
        digest = hashlib.sha1(url.encode("utf-8")).hexdigest()
        return self.cache_dir / f"{digest}.html"

    def _read_cache(self, path: Path) -> str | None:
        if not path.exists():
            return None
        age_seconds = time.time() - path.stat().st_mtime
        if age_seconds > self.settings.public_cache_ttl_seconds:
            return None
        return path.read_text(encoding="utf-8")

    def _write_cache(self, path: Path, content: str) -> None:
        path.write_text(content, encoding="utf-8")


def slugify_for_path(value: str) -> str:
    lowered = value.strip().lower()
    lowered = re.sub(r"[^\w\s-]", "", lowered)
    lowered = re.sub(r"[\s_]+", "-", lowered)
    lowered = re.sub(r"-{2,}", "-", lowered)
    return lowered.strip("-")


def strip_html(value: str) -> str:
    text = re.sub(r"<[^>]+>", " ", value)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_ld_json_objects(html: str) -> list[Any]:
    objects: list[Any] = []
    matches = re.findall(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    for raw_payload in matches:
        payload = raw_payload.strip()
        if not payload:
            continue
        try:
            objects.append(json.loads(payload))
        except json.JSONDecodeError:
            continue

    return objects


def iter_ld_json_objects(payload: Any) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []

    if isinstance(payload, dict):
        objects.append(payload)
        graph = payload.get("@graph")
        if isinstance(graph, list):
            for item in graph:
                if isinstance(item, dict):
                    objects.append(item)
    elif isinstance(payload, list):
        for item in payload:
            if isinstance(item, dict):
                objects.extend(iter_ld_json_objects(item))

    return objects


def extract_item_list_urls(html: str) -> list[str]:
    urls: list[str] = []
    for payload in extract_ld_json_objects(html):
        for item in iter_ld_json_objects(payload):
            item_type = item.get("@type")
            if item_type != "ItemList":
                continue
            elements = item.get("itemListElement", [])
            if not isinstance(elements, list):
                continue
            for element in elements:
                if isinstance(element, dict):
                    if isinstance(element.get("url"), str):
                        urls.append(element["url"])
                        continue
                    item_value = element.get("item")
                    if isinstance(item_value, dict) and isinstance(item_value.get("url"), str):
                        urls.append(item_value["url"])
    return list(dict.fromkeys(urls))


def extract_links_by_pattern(html: str, pattern: str, base_url: str) -> list[str]:
    matches = re.findall(pattern, html, flags=re.IGNORECASE)
    urls = [absolute_url(base_url, match) for match in matches]
    return list(dict.fromkeys(urls))


def extract_job_posting(html: str) -> dict[str, Any] | None:
    for payload in extract_ld_json_objects(html):
        for item in iter_ld_json_objects(payload):
            if item.get("@type") == "JobPosting":
                return item
    return extract_job_posting_microdata(html)


def extract_job_posting_microdata(html: str) -> dict[str, Any] | None:
    if "itemtype=\"http://schema.org/JobPosting\"" not in html and "itemtype='http://schema.org/JobPosting'" not in html:
        return None

    posting: dict[str, Any] = {}

    identifier = _extract_itemprop_content(html, "value")
    if identifier:
        posting["identifier"] = {"value": identifier}

    title = _extract_itemprop_html(html, "title")
    if title:
        posting["title"] = strip_html(title)

    description = _extract_itemprop_html(html, "description")
    if description:
        posting["description"] = description

    date_posted = _extract_itemprop_content(html, "datePosted")
    if date_posted:
        posting["datePosted"] = date_posted

    employment_type = _extract_itemprop_content(html, "employmentType")
    if employment_type:
        posting["employmentType"] = employment_type

    qualifications = _extract_itemprop_html(html, "qualifications")
    if qualifications:
        posting["qualifications"] = strip_html(qualifications)

    industry = _extract_itemprop_html(html, "industry")
    if industry:
        posting["industry"] = strip_html(industry)

    company_name = _extract_hiring_organization_name(html)
    if company_name:
        posting["hiringOrganization"] = {"name": company_name}

    location = _extract_job_location(html)
    if location:
        posting["jobLocation"] = location

    skills = _extract_itemprop_list(html, "skills")
    if skills:
        posting["skills"] = skills

    return posting if posting else None


def absolute_url(base_url: str, maybe_relative_url: str) -> str:
    return urllib.parse.urljoin(base_url, maybe_relative_url)


def _extract_itemprop_content(html: str, itemprop: str) -> str | None:
    patterns = [
        rf'itemprop=["\']{re.escape(itemprop)}["\'][^>]*content=["\']([^"\']+)["\']',
        rf'content=["\']([^"\']+)["\'][^>]*itemprop=["\']{re.escape(itemprop)}["\']',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE)
        if match:
            return unescape(match.group(1)).strip()

    inline_value = _extract_itemprop_html(html, itemprop)
    if inline_value:
        return strip_html(inline_value)
    return None


def _extract_itemprop_html(html: str, itemprop: str) -> str | None:
    match = re.search(
        rf'<(?P<tag>[a-z0-9]+)[^>]*itemprop=["\']{re.escape(itemprop)}["\'][^>]*>(?P<content>.*?)</(?P=tag)>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    if not match:
        return None
    return match.group("content").strip()


def _extract_itemprop_list(html: str, itemprop: str) -> list[str]:
    matches = re.findall(
        rf'<[^>]*itemprop=["\']{re.escape(itemprop)}["\'][^>]*>(.*?)</[^>]+>',
        html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    values = [strip_html(match) for match in matches]
    return [value for value in values if value]


def _extract_hiring_organization_name(html: str) -> str | None:
    patterns = [
        r'itemprop=["\']hiringOrganization["\'][^>]*>.*?itemprop=["\']name["\'][^>]*content=["\']([^"\']*)["\']',
        r'itemprop=["\']hiringOrganization["\'][^>]*>.*?content=["\']([^"\']*)["\'][^>]*itemprop=["\']name["\']',
        r'itemprop=["\']hiringOrganization["\'][^>]*>.*?itemprop=["\']name["\'][^>]*>(.*?)</[^>]+>',
    ]
    for pattern in patterns:
        match = re.search(pattern, html, flags=re.IGNORECASE | re.DOTALL)
        if match:
            value = strip_html(unescape(match.group(1)))
            if value:
                return value
    return None


def _extract_job_location(html: str) -> dict[str, Any] | None:
    locality = _extract_itemprop_content(html, "addressLocality")
    region = _extract_itemprop_content(html, "addressRegion")
    country = _extract_itemprop_content(html, "addressCountry")
    postal_code = _extract_itemprop_content(html, "postalCode")

    address = {
        "addressLocality": locality or "",
        "addressRegion": region or "",
        "addressCountry": country or "",
        "postalCode": postal_code or "",
    }
    if not any(address.values()):
        return None
    return {"address": address}
