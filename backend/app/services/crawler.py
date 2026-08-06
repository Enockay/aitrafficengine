import re
import time
import urllib.robotparser
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup

USER_AGENT = "AI Traffic Engine bot"
TIMEOUT_SECONDS = 30
MAX_REDIRECTS = 5
MAX_RETRIES = 3
DEFAULT_DISCOVERY_LIMIT = 20


class CrawlError(Exception):
    pass


def _fetch(client: httpx.Client, url: str) -> httpx.Response:
    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            response = client.get(url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            return response
        except (httpx.HTTPError, httpx.TimeoutException) as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                time.sleep(2**attempt)
    raise CrawlError(f"Failed to fetch {url}: {last_error}")


def _is_allowed_by_robots(client: httpx.Client, url: str) -> bool:
    parsed = urlparse(url)
    robots_url = f"{parsed.scheme}://{parsed.netloc}/robots.txt"
    parser = urllib.robotparser.RobotFileParser()
    try:
        response = client.get(robots_url, headers={"User-Agent": USER_AGENT}, timeout=10)
        if response.status_code >= 400:
            return True
        parser.parse(response.text.splitlines())
    except httpx.HTTPError:
        return True
    return parser.can_fetch(USER_AGENT, url)


def _extract_metadata(soup: BeautifulSoup) -> dict:
    def meta_content(*names: str) -> str | None:
        for name in names:
            tag = soup.find("meta", attrs={"property": name}) or soup.find("meta", attrs={"name": name})
            if tag and tag.get("content"):
                return tag["content"].strip()
        return None

    og_title = meta_content("og:title")
    og_description = meta_content("og:description")
    og_image = meta_content("og:image")

    title = og_title or (soup.title.get_text(strip=True) if soup.title else None)
    meta_description = og_description or meta_content("description")

    return {"title": title, "meta_description": meta_description, "og_image": og_image}


def _extract_content(soup: BeautifulSoup, meta_description: str | None) -> dict:
    for tag in soup(["script", "style", "nav", "footer", "header"]):
        tag.decompose()

    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    paragraphs = [p for p in paragraphs if len(p) > 40]
    content_text = "\n\n".join(paragraphs)[:20000]

    if meta_description:
        summary = meta_description
    else:
        full_text = " ".join(paragraphs)
        sentences = [s.strip() for s in full_text.replace("\n", " ").split(". ") if s.strip()]
        first_three = ". ".join(sentences[:3])
        key_paragraph = paragraphs[0] if paragraphs else ""
        summary = (first_three or key_paragraph)[:500]

    key_points: list[str] = []
    for heading in soup.find_all(["h2", "h3"]):
        text = heading.get_text(strip=True)
        if text and text not in key_points:
            key_points.append(text)
    for bold in soup.find_all(["b", "strong"]):
        text = bold.get_text(strip=True)
        if text and len(text) > 10 and text not in key_points:
            key_points.append(text)
    key_points = key_points[:15]

    keywords_tag = soup.find("meta", attrs={"name": "keywords"})
    keywords: list[str] = []
    if keywords_tag and keywords_tag.get("content"):
        keywords = [k.strip() for k in keywords_tag["content"].split(",") if k.strip()]

    return {"content_text": content_text, "summary": summary, "key_points": key_points, "keywords": keywords}


def _extract_hero_image(soup: BeautifulSoup, base_url: str, og_image: str | None) -> str | None:
    if og_image:
        return urljoin(base_url, og_image)

    best_src = None
    best_area = 0
    for img in soup.find_all("img"):
        src = img.get("src")
        if not src:
            continue
        try:
            width = int(img.get("width", 0))
            height = int(img.get("height", 0))
        except (TypeError, ValueError):
            width = height = 0
        area = width * height
        if area > best_area:
            best_area = area
            best_src = src

    if not best_src:
        first_img = soup.find("img")
        best_src = first_img.get("src") if first_img else None

    return urljoin(base_url, best_src) if best_src else None


def crawl_page(url: str) -> dict:
    """Fetch a single page and extract metadata, summary, key points, and hero image.

    Raises CrawlError if robots.txt disallows crawling or the fetch fails after retries.
    """
    with httpx.Client(follow_redirects=True, max_redirects=MAX_REDIRECTS) as client:
        if not _is_allowed_by_robots(client, url):
            raise CrawlError(f"Crawling disallowed by robots.txt for {url}")

        response = _fetch(client, url)
        soup = BeautifulSoup(response.text, "lxml")

        metadata = _extract_metadata(soup)
        content = _extract_content(soup, metadata["meta_description"])
        hero_image_url = _extract_hero_image(soup, str(response.url), metadata["og_image"])

        return {
            "title": metadata["title"],
            "meta_description": metadata["meta_description"],
            "summary": content["summary"],
            "content_text": content["content_text"],
            "hero_image_url": hero_image_url,
            "key_points": content["key_points"],
            "keywords": content["keywords"],
        }


def apply_crawl_result(page: Any, extracted: dict) -> None:
    """Copy a crawl_page() result onto a Page ORM instance and mark it crawled."""
    page.title = extracted["title"]
    page.meta_description = extracted["meta_description"]
    page.summary = extracted["summary"]
    page.content_text = extracted["content_text"]
    page.hero_image_url = extracted["hero_image_url"]
    page.key_points = extracted["key_points"]
    page.keywords = extracted["keywords"]
    page.status = "crawled"
    page.last_crawled_at = datetime.now(timezone.utc)


def _parse_sitemap_urls(xml_text: str) -> tuple[list[str], list[str]]:
    """Parse a sitemap XML document, returning (page_urls, sub_sitemap_urls)."""
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return [], []

    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}

    if root.tag.lower().endswith("sitemapindex"):
        sub_sitemaps = [loc.text.strip() for loc in root.findall(".//sm:sitemap/sm:loc", ns) if loc.text]
        if not sub_sitemaps:
            sub_sitemaps = [loc.text.strip() for loc in root.findall(".//loc") if loc.text]
        return [], sub_sitemaps

    page_urls = [loc.text.strip() for loc in root.findall(".//sm:url/sm:loc", ns) if loc.text]
    if not page_urls:
        page_urls = [loc.text.strip() for loc in root.findall(".//loc") if loc.text]
    return page_urls, []


def _discover_via_links(client: httpx.Client, homepage_url: str, limit: int) -> list[str]:
    try:
        response = _fetch(client, homepage_url)
    except CrawlError:
        return []

    soup = BeautifulSoup(response.text, "lxml")
    domain = urlparse(homepage_url).netloc
    urls: list[str] = []
    seen: set[str] = set()
    for a in soup.find_all("a", href=True):
        href = urljoin(homepage_url, a["href"])
        parsed = urlparse(href)
        if parsed.netloc != domain or parsed.scheme not in ("http", "https"):
            continue
        clean = href.split("#")[0]
        if clean not in seen:
            seen.add(clean)
            urls.append(clean)
        if len(urls) >= limit:
            break
    return urls


def _dedupe_by_path(urls: list[str]) -> list[str]:
    """Strip URL fragments (which the server never sees) and drop duplicates, preserving order."""
    seen: set[str] = set()
    deduped: list[str] = []
    for url in urls:
        without_fragment = url.split("#")[0].rstrip("/") or url.split("#")[0]
        if without_fragment not in seen:
            seen.add(without_fragment)
            deduped.append(without_fragment)
    return deduped


def discover_site_urls(domain: str, limit: int = DEFAULT_DISCOVERY_LIMIT) -> list[str]:
    """Discover page URLs for a site via its sitemap.xml, falling back to homepage links.

    Never raises — returns an empty list if discovery fails entirely.
    """
    domain = re.sub(r"^https?://", "", domain.strip(), flags=re.IGNORECASE).split("/")[0]
    base_url = f"https://{domain}"
    with httpx.Client(follow_redirects=True, max_redirects=MAX_REDIRECTS) as client:
        try:
            response = client.get(
                f"{base_url}/sitemap.xml", headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SECONDS
            )
            if response.status_code < 400:
                page_urls, sub_sitemaps = _parse_sitemap_urls(response.text)

                for sub_url in sub_sitemaps[:3]:
                    if len(page_urls) >= limit:
                        break
                    try:
                        sub_response = client.get(sub_url, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_SECONDS)
                        if sub_response.status_code < 400:
                            sub_pages, _ = _parse_sitemap_urls(sub_response.text)
                            page_urls.extend(sub_pages)
                    except httpx.HTTPError:
                        continue

                page_urls = _dedupe_by_path(page_urls)
                if page_urls:
                    return page_urls[:limit]
        except httpx.HTTPError:
            pass

        return _dedupe_by_path(_discover_via_links(client, base_url, limit))[:limit]
