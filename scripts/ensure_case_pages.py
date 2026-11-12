#!/usr/bin/env python3
"""Request the existing branch-based Pages build and verify public case data."""

import argparse
import hashlib
import json
import os
from pathlib import Path
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, build_opener

from sync_blog_cases import NoRedirect, SyncError

REPOSITORY = "okclean-kr/okclean-kr.github.io"
PUBLIC_URL = "https://okclean-kr.github.io/cases.json"
API_URL = f"https://api.github.com/repos/{REPOSITORY}/pages"
MAX_BYTES = 8_000_000


def request(url, *, method="GET", token=None):
    headers = {"User-Agent": "OKClean-CaseSync/1.0"}
    if token:
        # Never send a GitHub credential to the public site, RSS, or a redirect.
        if url not in (API_URL, API_URL + "/builds", API_URL + "/builds/latest"):
            raise SyncError("Refusing a credential outside this repository's Pages API")
        headers.update({"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json",
                        "X-GitHub-Api-Version": "2026-03-10"})
    else:
        headers["Cache-Control"] = "no-cache"
    if method == "POST":
        headers["Content-Type"] = "application/json"
    req = Request(url, data=b"{}" if method == "POST" else None, headers=headers, method=method)
    try:
        with build_opener(NoRedirect()).open(req, timeout=20) as response:
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise SyncError("Pages response exceeds the size limit")
            return body
    except HTTPError as error:
        # HTTP 401/403 is an explicit stop; never switch credentials or endpoints.
        raise SyncError(f"Pages {method} HTTP {error.code}; no permission workaround attempted") from error
    except (URLError, TimeoutError, OSError) as error:
        raise SyncError("Pages network request failed") from error


def verify_and_build(data_path: Path, token: str, *, timeout=240, fetch=request, pause=time.sleep):
    expected = data_path.read_bytes()
    digest = hashlib.sha256(expected).hexdigest()
    public_url = f"{PUBLIC_URL}?case_sync={digest[:24]}"
    if fetch(public_url) == expected:
        return {"status": "current", "sha256": digest, "build_requested": False}
    if not token:
        raise SyncError("GH_TOKEN is missing; existing public site remains unchanged")
    config = json.loads(fetch(API_URL, token=token))
    source = config.get("source", {})
    if (config.get("build_type", "legacy") != "legacy" or source.get("branch") != "main"
            or source.get("path") != "/"):
        raise SyncError("Pages source is no longer main/root legacy publishing; review configuration")
    fetch(API_URL + "/builds", method="POST", token=token)
    started = time.monotonic()
    while time.monotonic() - started < timeout:
        pause(10)
        if fetch(public_url) == expected:
            return {"status": "published", "sha256": digest, "build_requested": True}
        latest = json.loads(fetch(API_URL + "/builds/latest", token=token))
        if latest.get("status") == "errored":
            raise SyncError("GitHub Pages build errored; last successful public build is preserved")
    raise SyncError("Pages did not publish the expected cases.json before the verification timeout")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", type=Path, default=Path("cases.json"))
    args = parser.parse_args()
    try:
        report = verify_and_build(args.data, os.environ.get("GH_TOKEN", ""))
        result = 0
    except (SyncError, OSError, ValueError) as error:
        report, result = {"status": "error", "error": str(error)}, 1
    print(json.dumps(report, ensure_ascii=False))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as summary:
            summary.write("\n## 공개 사이트 반영 확인\n\n")
            summary.write("공개 cases.json과 저장소 파일의 SHA-256이 일치합니다.\n" if not result else
                          "공개 반영 상태를 확인하지 못했습니다. 다음 실행에서 다시 확인합니다. 자동 롤백은 수행하지 않습니다.\n")
    return result


if __name__ == "__main__":
    raise SystemExit(main())
