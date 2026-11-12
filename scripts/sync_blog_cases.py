#!/usr/bin/env python3
"""Append new posts from the two owned Naver blogs; keep existing records intact."""

from __future__ import annotations

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
import fcntl
import hashlib
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener
import xml.etree.ElementTree as ET

BLOGS = ("boss6008", "cleankoreacoop")
FEEDS = {blog: f"https://rss.blog.naver.com/{blog}.xml" for blog in BLOGS}
KST = timezone(timedelta(hours=9))
MAX_FEED_BYTES = 2_000_000
IMAGE_HOSTS = {"blogthumb.pstatic.net", "blogfiles.pstatic.net", "postfiles.pstatic.net",
               "mblogthumb-phinf.pstatic.net"}


class SyncError(Exception):
    pass


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        # A changed source endpoint needs review, not an automatic new trust boundary.
        raise SyncError(f"HTTP {code}: redirect refused for the configured endpoint")


def canonical_post_url(value: str, blog: str | None = None) -> str:
    if not isinstance(value, str) or re.search(r"[\x00-\x20\x7f]", value):
        raise SyncError("Invalid post URL")
    parsed = urlsplit(value)
    if (parsed.scheme != "https" or parsed.netloc not in ("blog.naver.com", "m.blog.naver.com")
            or parsed.fragment):
        raise SyncError("Post URL is not an allowed HTTPS Naver blog URL")
    match = re.fullmatch(r"/([a-zA-Z0-9_]+)/([0-9]{6,20})/?", parsed.path)
    if match:
        owner, post_id = match.groups()
    elif parsed.path == "/PostView.naver":
        query = parse_qs(parsed.query)
        if len(query.get("blogId", [])) != 1 or len(query.get("logNo", [])) != 1:
            raise SyncError("Invalid Naver PostView URL")
        owner, post_id = query["blogId"][0], query["logNo"][0]
        if not re.fullmatch(r"[0-9]{6,20}", post_id):
            raise SyncError("Invalid Naver post ID")
    else:
        raise SyncError("Invalid Naver post path")
    if owner not in BLOGS or (blog and owner != blog):
        raise SyncError("Post belongs to an unapproved blog")
    return f"https://blog.naver.com/{owner}/{post_id}"


class ExcerptParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.words: list[str] = []
        self.images: list[str] = []
        self.hidden = 0

    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.hidden += 1
        if tag == "img":
            value = dict(attrs).get("src", "")
            parsed = urlsplit(value)
            if (parsed.scheme == "https" and parsed.netloc in IMAGE_HOSTS
                    and not re.search(r"[\x00-\x20\x7f]", value)):
                self.images.append(value)
        if tag in ("br", "p", "div", "li"):
            self.words.append(" ")

    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.hidden:
            self.hidden -= 1
        self.words.append(" ")

    def handle_data(self, data):
        if not self.hidden:
            self.words.append(data)

    def text(self) -> str:
        return re.sub(r"\s+", " ", re.sub(r"[\x00-\x1f\x7f]", " ", "".join(self.words))).strip()


def excerpt(value: str) -> ExcerptParser:
    parser = ExcerptParser()
    parser.feed(value)
    return parser


def fetch_feed(blog: str) -> bytes:
    request = Request(FEEDS[blog], headers={
        "User-Agent": "OKClean-CaseSync/1.0 (+https://okclean-kr.github.io/)",
        "Accept": "application/rss+xml, application/xml, text/xml",
    })
    for attempt in range(2):
        try:
            with build_opener(NoRedirect()).open(request, timeout=20) as response:
                if response.status != 200:
                    raise SyncError(f"{blog}: HTTP {response.status}")
                data = response.read(MAX_FEED_BYTES + 1)
            if len(data) > MAX_FEED_BYTES:
                raise SyncError(f"{blog}: RSS exceeds the size limit")
            return data
        except HTTPError as error:
            # Do not retry permission blocks, change identities, or use proxy endpoints.
            if error.code not in (500, 502, 503, 504) or attempt:
                raise SyncError(f"{blog}: HTTP {error.code}; existing data preserved") from error
        except (URLError, TimeoutError, OSError) as error:
            if attempt:
                raise SyncError(f"{blog}: RSS network failure; existing data preserved") from error
        time.sleep(1)
    raise SyncError(f"{blog}: RSS unavailable")


def parse_feed(raw: bytes, blog: str, now: datetime) -> list[dict]:
    if len(raw) > MAX_FEED_BYTES or re.search(br"<!\s*(DOCTYPE|ENTITY)", raw, re.I):
        raise SyncError(f"{blog}: oversized RSS or forbidden XML declaration")
    try:
        # The configured feeds are UTF-8. Decode before checking XML declarations so
        # a UTF-16/32 document cannot hide entity declarations behind zero bytes.
        xml = raw.decode("utf-8-sig")
        if "\x00" in xml:
            raise ValueError("unexpected encoding")
        root = ET.fromstring(xml)
    except (ET.ParseError, UnicodeError, ValueError) as error:
        raise SyncError(f"{blog}: invalid RSS XML") from error
    channel = root.find("channel")
    if root.tag != "rss" or channel is None:
        raise SyncError(f"{blog}: expected an RSS channel")
    items = channel.findall("item")
    if not items or len(items) > 250:
        raise SyncError(f"{blog}: unexpected RSS item count")
    posts = []
    for item in items:
        link = canonical_post_url((item.findtext("link") or "").strip(), blog)
        title = excerpt(item.findtext("title") or "").text()
        if not title or len(title) > 250:
            raise SyncError(f"{blog}: missing or excessive title")
        try:
            published = parsedate_to_datetime(item.findtext("pubDate") or "")
        except (ValueError, TypeError, OverflowError) as error:
            raise SyncError(f"{blog}: invalid publication date") from error
        if published.tzinfo is None or published > now + timedelta(minutes=10):
            raise SyncError(f"{blog}: missing timezone or future publication date")
        body = excerpt(item.findtext("description") or "")
        posts.append({"title": title, "link": link, "published": published.astimezone(KST),
                      "description": body.text(), "img": next(iter(body.images), ""), "blog": blog})
    return posts


def service_for(title: str) -> str:
    for service, pattern in (
        ("special-home", r"쓰레기집|특수청소|고독사|저장강박"),
        ("washer", r"세탁기|세탁조|통돌이|통세척"),
        ("aircon", r"에어컨"), ("carpet", r"카펫|카페트"),
        ("mattress", r"매트리스"), ("post-build", r"준공|공사\s*후"),
        ("move-in", r"입주|이사"), ("window", r"창문|유리창|외창"),
        ("disinfect", r"소독|방역"), ("clinic", r"병원|의원"),
        ("office", r"사무실|상가"),
        ("regular", r"학교|계단|논슬립|바닥|대청소|정기청소|후드|욕실|주방"),
    ):
        if re.search(pattern, title):
            return service
    return ""


def classify(title: str, body: str) -> tuple[str, str]:
    """A cleaning keyword or a promotional title alone never proves a job."""
    if re.search(r"공지|이벤트|모집|서비스\s*안내|교육\s*(안내|모집)|창업\s*(안내|교육)", title):
        return "notice", "notice-title"
    if re.search(r"생각\s*청소|마음\s*청소|여행|맛집|가볼\s*만한|영화|독서|책\s*(리뷰|추천)", title):
        return "personal", "personal-title"
    if re.search(r"방법|사용법|관리법|주의|알려주는|할까요|될까요|하는\s*법|지우는\s*법|닦는\s*법|이유|차이|꿀팁|체크리스트|[0-9]+\s*단계|확인할\s*[0-9]+가지", title):
        return "tip", "instruction-title"
    if re.search(r"AI\s*(이미지|생성)|인공지능.{0,12}(이미지|사진)|설명을\s*돕기|자료\s*(이미지|화면)", body, re.I):
        return "review", "illustration-or-unverified"
    if re.search(r"(?:직접|실제).{0,45}(?:아닙|아니라|아닌)|참고용|가상\s*(?:현장|작업)|(?:현장|작업|사진).{0,15}예시", body):
        return "review", "negated-or-example-work"
    direct_work = re.search(
        r"(?:저희|제가|직접).{0,16}(?:작업한|작업했|청소한|청소했)|실제\s*작업\s*(?:영상|사진|기록)"
        r"|(?:작업|청소)(?:을|를)?\s*(?:진행했|진행하였|마쳤|완료했)", body)
    if direct_work and service_for(title) and re.search(r"청소|세척|소독|코팅", title):
        return "case", "explicit-work-in-source"
    return "review", "insufficient-work-evidence"


def location_from(body: str) -> str:
    # SEO titles can contain service areas unrelated to the actual job location.
    matches = set(re.findall(r"(춘천|화천|홍천|양구|인제|가평|원주|횡성|강릉)(?:시|군)?에\s*(?:있는|위치한)", body))
    return next(iter(matches)) if len(matches) == 1 else ""


def record_date(record: dict) -> datetime:
    try:
        if record.get("publishedAt"):
            value = datetime.fromisoformat(record["publishedAt"])
            if value.tzinfo is None:
                raise ValueError("timezone missing")
            return value.astimezone(KST)
        return datetime.strptime(record["date"], "%Y-%m-%d %H:%M").replace(tzinfo=KST)
    except (KeyError, TypeError, ValueError) as error:
        raise SyncError("Existing record has an invalid publication date") from error


def plan_update(document: dict, feed_data: dict[str, bytes], now: datetime) -> tuple[dict, dict]:
    if not isinstance(document, dict) or not isinstance(document.get("cases"), list) or not document["cases"]:
        raise SyncError("Existing cases.json must contain a nonempty cases list")
    seen, watermarks = set(), {}
    for record in document["cases"]:
        if not isinstance(record, dict) or record.get("blog") not in BLOGS:
            raise SyncError("Existing record has an unexpected blog")
        link = canonical_post_url(record.get("link"), record["blog"])
        seen.add(link)
        stamp = record_date(record)
        if stamp > now + timedelta(minutes=10):
            raise SyncError("Existing record has a future publication date")
        watermarks[record["blog"]] = max(watermarks.get(record["blog"], stamp), stamp)
    if set(watermarks) != set(BLOGS) or set(feed_data) != set(BLOGS):
        raise SyncError("Both owned blogs need existing records and successful RSS responses")
    # Parse every source before planning any write. One invalid source rejects the batch.
    parsed = {blog: parse_feed(feed_data[blog], blog, now) for blog in BLOGS}
    additions, skipped = [], Counter()
    for blog in BLOGS:
        for post in sorted(parsed[blog], key=lambda x: (x["published"], x["link"])):
            if post["link"] in seen:
                skipped["duplicate"] += 1
                continue
            if post["published"] <= watermarks[blog]:
                skipped["older_than_watermark"] += 1
                continue
            kind, reason = classify(post["title"], post["description"])
            additions.append({"title": post["title"], "link": post["link"],
                              "date": post["published"].strftime("%Y-%m-%d %H:%M"),
                              "img": post["img"], "svc": service_for(post["title"]),
                              "kind": kind, "region": location_from(post["description"]), "blog": blog,
                              "publishedAt": post["published"].isoformat(), "source": "naver-rss",
                              "classificationReason": reason})
            seen.add(post["link"])
    additions.sort(key=lambda x: (x["publishedAt"], x["link"]), reverse=True)
    updated = dict(document)
    if additions:
        # Original records, fields, order, classifications and local images are retained.
        updated["cases"] = document["cases"] + additions
        updated["updated"] = now.astimezone(KST).isoformat(timespec="seconds")
    report = {"status": "ok", "before": len(document["cases"]), "added": len(additions),
              "after": len(updated["cases"]), "kinds": dict(Counter(x["kind"] for x in additions)),
              "skipped": dict(skipped), "additions": additions,
              "sources": {blog: {"url": FEEDS[blog], "http": 200, "items": len(parsed[blog]),
                                  "sha256": hashlib.sha256(feed_data[blog]).hexdigest(),
                                  "watermark": watermarks[blog].isoformat()} for blog in BLOGS}}
    return updated, report


@contextmanager
def data_lock(path: Path):
    lock_id = hashlib.sha256(str(path.resolve()).encode()).hexdigest()[:24]
    lock = Path(tempfile.gettempdir()) / f"okclean-case-sync-{lock_id}.lock"
    with lock.open("a") as handle:
        try:
            fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as error:
            raise SyncError("Another local case sync is running") from error
        try:
            yield
        finally:
            fcntl.flock(handle, fcntl.LOCK_UN)


def atomic_replace(path: Path, original: bytes, replacement: bytes):
    if path.read_bytes() != original:
        raise SyncError("cases.json changed during the sync; refusing to overwrite it")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(dir=path.parent, prefix=".cases-sync-", delete=False) as output:
            temporary = Path(output.name)
            output.write(replacement)
            output.flush()
            os.fsync(output.fileno())
        temporary.chmod(path.stat().st_mode & 0o777)
        if path.read_bytes() != original:
            raise SyncError("cases.json changed before replacement; refusing to overwrite it")
        os.replace(temporary, path)
    finally:
        if temporary and temporary.exists():
            temporary.unlink()


def sync(data_path: Path, *, dry_run=False, fetch=fetch_feed, now=None) -> dict:
    now = now or datetime.now(KST)
    with data_lock(data_path):
        original = data_path.read_bytes()
        try:
            document = json.loads(original)
        except (ValueError, UnicodeError) as error:
            raise SyncError("Existing cases.json is invalid; no write performed") from error
        with ThreadPoolExecutor(max_workers=2) as pool:
            futures = {blog: pool.submit(fetch, blog) for blog in BLOGS}
            feeds = {blog: future.result() for blog, future in futures.items()}
        updated, report = plan_update(document, feeds, now)
        replacement = (json.dumps(updated, ensure_ascii=False, indent=2) + "\n").encode("utf-8") if report["added"] else original
        report.update({"dry_run": dry_run, "written": bool(report["added"] and not dry_run),
                       "before_sha256": hashlib.sha256(original).hexdigest(),
                       "candidate_sha256": hashlib.sha256(replacement).hexdigest()})
        if report["added"] and not dry_run:
            atomic_replace(data_path, original, replacement)
        return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("cases.json"))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    try:
        report = sync(args.data, dry_run=args.dry_run)
        result = 0
    except (SyncError, OSError, ValueError) as error:
        report, result = {"status": "error", "error": str(error), "written": False}, 1
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in report.items() if k != "additions"}, ensure_ascii=False))
    summary_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary_path:
        with open(summary_path, "a", encoding="utf-8") as summary:
            summary.write("## 블로그 새 글 갱신\n\n")
            if result:
                summary.write("수집 또는 검증에 실패하여 기존 자료를 보존했습니다. 오류는 실행 로그를 확인하세요.\n")
            else:
                summary.write(f"기존 {report['before']}건 · 새 글 {report['added']}건 · 예상 합계 {report['after']}건\n\n")
                summary.write(f"분류: `{json.dumps(report['kinds'], ensure_ascii=False)}`\n\n")
                summary.write("두 공식 RSS 수신·검증 완료. " + ("Dry run: 파일 변경 없음.\n" if args.dry_run else "기존 항목 보존.\n"))
    return result


if __name__ == "__main__":
    raise SystemExit(main())
