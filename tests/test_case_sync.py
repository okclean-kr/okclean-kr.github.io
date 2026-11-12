"""Guard the unattended RSS writer against lost data and misleading case labels."""

from copy import deepcopy
from datetime import datetime, timedelta
from email.utils import format_datetime
import json
from pathlib import Path
import sys
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import Mock, patch
from urllib.error import HTTPError
import xml.etree.ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import sync_blog_cases as syncer
import ensure_case_pages as pages

NOW = datetime(2026, 11, 12, 18, 0, tzinfo=syncer.KST)


def post(blog="boss6008", number="224472697204", title="세탁기 청소 현장 기록",
         body="이번 글은 저희가 직접 작업한 현장의 기록입니다.", when=None):
    return {"title": title, "link": f"https://blog.naver.com/{blog}/{number}?fromRss=true",
            "pubDate": format_datetime(when or NOW - timedelta(hours=1)), "description": body}


def feed(*posts):
    root = ET.Element("rss", version="2.0")
    channel = ET.SubElement(root, "channel")
    for values in posts:
        item = ET.SubElement(channel, "item")
        for key, value in values.items():
            ET.SubElement(item, key).text = value
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


def baseline():
    return {"updated": "2026-11-02T16:00:00+09:00", "unknownTopLevel": {"preserve": True}, "cases": [
        {"title": "기존 원문", "link": f"https://blog.naver.com/{blog}/224400000001", "blog": blog,
         "date": "2026-11-02 15:54", "kind": "case", "img": "case-images/original.png",
         "svc": "regular", "region": "춘천", "extra": {"untouched": [1, 2, 3]}}
        for blog in syncer.BLOGS]}


def feeds(*boss_posts):
    return {"boss6008": feed(*(boss_posts or [post(number="224400000001")])),
            "cleankoreacoop": feed(post(blog="cleankoreacoop", number="224400000001"))}


class SourceValidationTests(unittest.TestCase):
    def test_normalizes_mobile_tracking_and_postview_to_one_url(self):
        urls = ["https://blog.naver.com/boss6008/224472697204?fromRss=true",
                "https://m.blog.naver.com/boss6008/224472697204",
                "https://blog.naver.com/PostView.naver?logNo=224472697204&blogId=boss6008"]
        for url in urls:
            self.assertEqual(syncer.canonical_post_url(url), "https://blog.naver.com/boss6008/224472697204")

    def test_rejects_unapproved_urls(self):
        urls = ["javascript:alert(1)", "http://blog.naver.com/boss6008/224472697204",
                "https://blog.naver.com.attacker.invalid/boss6008/224472697204",
                "https://blog.naver.com@attacker.invalid/boss6008/224472697204",
                "https://blog.naver.com:443/boss6008/224472697204",
                "https://blog.naver.com/stranger/224472697204",
                "https://blog.naver.com/boss6008/../../secret", "https://blog.naver.com/boss6008/224472697204\n",
                "https://blog.naver.com/PostView.naver?blogId=boss6008&blogId=stranger&logNo=224472697204"]
        for url in urls:
            with self.subTest(url=url), self.assertRaises(syncer.SyncError):
                syncer.canonical_post_url(url)
        with self.assertRaises(syncer.SyncError):
            syncer.canonical_post_url("https://blog.naver.com/cleankoreacoop/224472697204", "boss6008")

    def test_403_is_a_stop_without_retry_or_other_endpoint(self):
        opener = Mock()
        opener.open.side_effect = HTTPError(syncer.FEEDS["boss6008"], 403, "Forbidden", {}, None)
        with patch.object(syncer, "build_opener", return_value=opener), self.assertRaisesRegex(syncer.SyncError, "HTTP 403"):
            syncer.fetch_feed("boss6008")
        self.assertEqual(opener.open.call_count, 1)

    def test_rejects_empty_malformed_oversized_or_entity_xml(self):
        bad = [b"<html>blocked</html>", b"<rss><channel>", b"<rss><channel/></rss>",
               b"<!DOCTYPE rss [<!ENTITY x 'bad'>]><rss><channel/></rss>",
               "<!DOCTYPE rss [<!ENTITY x 'bad'>]><rss><channel/></rss>".encode("utf-16"),
               b"x" * (syncer.MAX_FEED_BYTES + 1)]
        for raw in bad:
            with self.subTest(size=len(raw)), self.assertRaises(syncer.SyncError):
                syncer.parse_feed(raw, "boss6008", NOW)

    def test_rejects_missing_future_or_naive_dates(self):
        for value in ("", "not a date", "Thu, 12 Nov 2026 09:00:00", format_datetime(NOW + timedelta(days=1))):
            values = post()
            values["pubDate"] = value
            with self.subTest(value=value), self.assertRaises(syncer.SyncError):
                syncer.parse_feed(feed(values), "boss6008", NOW)

    def test_strips_html_and_only_keeps_allowed_https_images(self):
        value = post(title="<b>새 글</b><script>bad()</script>", body=
                     '<img src="javascript:bad()"><img src="https://attacker.invalid/x.png">'
                     '<p>본문 &amp; 내용</p><img src="https://blogthumb.pstatic.net/sample.png?type=s3">')
        parsed = syncer.parse_feed(feed(value), "boss6008", NOW)[0]
        self.assertEqual(parsed["title"], "새 글")
        self.assertEqual(parsed["description"], "본문 & 내용")
        self.assertEqual(parsed["img"], "https://blogthumb.pstatic.net/sample.png?type=s3")


class ClassificationTests(unittest.TestCase):
    def test_tips_notices_and_personal_posts_never_become_cases(self):
        titles = {"세탁기 청소 방법을 알려주는 실제 작업": "tip",
                  "드럼세탁기 고무패킹 곰팡이, 어디부터 닦아야 할까요?": "tip",
                  "표면 소독제 사용 전 확인할 5가지": "tip", "에어컨 청소 5단계": "tip",
                  "오케이청소 서비스 안내·시공 사례": "notice", "리뷰 이벤트 청소 후기": "notice",
                  "생각청소, 마음을 가볍게": "personal", "춘천 맛집 여행": "personal"}
        for title, expected in titles.items():
            with self.subTest(title=title):
                self.assertEqual(syncer.classify(title, "저희가 직접 작업한 현장입니다.")[0], expected)

    def test_title_alone_or_illustration_does_not_prove_a_job(self):
        for body in ("춘천 세탁기 청소 서비스를 제공합니다.", "설명을 돕기 위한 AI 이미지. 직접 작업한 현장입니다."):
            self.assertEqual(syncer.classify("춘천 세탁기 청소 후기", body)[0], "review")

    def test_negated_work_and_reference_examples_are_not_cases(self):
        for body in ("이 사진은 저희가 직접 작업한 현장이 아닙니다.",
                     "실제 작업 사진이 아니라 참고용 예시입니다.",
                     "가상 현장을 통해 설명합니다. 실제 작업 영상과 비교해 보세요."):
            with self.subTest(body=body):
                self.assertEqual(syncer.classify("춘천 학교 대청소 기록", body)[0], "review")

    def test_explicit_work_evidence_in_real_new_posts_is_accepted(self):
        examples = [("쓰레기집 청소 3일의 기록 함께 정리한 단독주택", "이번 글은 저희가 직접 작업한 현장의 기록입니다."),
                    ("춘천 세탁기청소 안쪽과 틈새까지 살핀 분해청소", "세척하고 재조립하는 과정을 실제 작업 영상으로 보여드립니다.")]
        for title, body in examples:
            self.assertEqual(syncer.classify(title, body), ("case", "explicit-work-in-source"))

    def test_location_needs_explicit_body_evidence(self):
        self.assertEqual(syncer.location_from("화천에 있는 상*초등학교 대청소를 진행하였습니다."), "화천")
        self.assertEqual(syncer.location_from("춘천·화천 청소 문의를 받습니다."), "")
        self.assertEqual(syncer.location_from("춘천에 있는 건물과 화천에 있는 학교"), "")
        self.assertEqual(syncer.service_for("춘천 카페 청소"), "")


class PreservationTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "cases.json"
        self.document = baseline()
        self.original = json.dumps(self.document, ensure_ascii=False, separators=(",", ":")).encode()
        self.path.write_bytes(self.original)

    def run_sync(self, values, **kwargs):
        return syncer.sync(self.path, fetch=values.__getitem__, now=NOW, **kwargs)

    def test_only_appends_new_posts_preserving_every_existing_value_and_order(self):
        unchanged = deepcopy(self.document)
        updated, report = syncer.plan_update(self.document, feeds(post()), NOW)
        self.assertEqual(self.document, unchanged)
        self.assertEqual(updated["cases"][:2], unchanged["cases"])
        self.assertEqual(updated["unknownTopLevel"], unchanged["unknownTopLevel"])
        self.assertEqual(report["added"], 1)

    def test_dedupes_tracking_links_and_skips_old_unseen_rss_backlog(self):
        old = post(number="224300000001", when=NOW - timedelta(days=30))
        duplicate = post()
        duplicate["link"] = duplicate["link"].replace("blog.naver", "m.blog.naver")
        report = self.run_sync(feeds(post(), old, duplicate))
        self.assertEqual(report["added"], 1)
        self.assertEqual(report["skipped"]["older_than_watermark"], 1)
        before_again = self.path.read_bytes()
        self.assertEqual(self.run_sync(feeds(post(), old, duplicate))["added"], 0)
        self.assertEqual(self.path.read_bytes(), before_again)

    def test_dry_run_and_no_new_posts_preserve_exact_bytes(self):
        self.assertEqual(self.run_sync(feeds(post()), dry_run=True)["added"], 1)
        self.assertEqual(self.path.read_bytes(), self.original)
        self.assertEqual(self.run_sync(feeds())["added"], 0)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_one_failed_source_cannot_partially_write(self):
        def failing_fetch(blog):
            if blog == "cleankoreacoop":
                raise syncer.SyncError("HTTP 403")
            return feed(post())
        with self.assertRaises(syncer.SyncError):
            syncer.sync(self.path, fetch=failing_fetch, now=NOW)
        self.assertEqual(self.path.read_bytes(), self.original)
        invalid = feeds(post())
        invalid["cleankoreacoop"] = b"<html>invalid</html>"
        with self.assertRaises(syncer.SyncError):
            self.run_sync(invalid)
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_refuses_missing_baseline_instead_of_bootstrapping_or_replacing(self):
        for document in ({"cases": []}, {"cases": self.document["cases"][:1]}, {"cases": [{"blog": "other"}]}):
            with self.subTest(document=document), self.assertRaises(syncer.SyncError):
                syncer.plan_update(document, feeds(post()), NOW)

    def test_compare_and_swap_retains_a_concurrent_edit(self):
        concurrent = self.original + b"\n"
        self.path.write_bytes(concurrent)
        with self.assertRaises(syncer.SyncError):
            syncer.atomic_replace(self.path, self.original, b"replacement")
        self.assertEqual(self.path.read_bytes(), concurrent)

    def test_local_lock_prevents_concurrent_syncs(self):
        with syncer.data_lock(self.path), self.assertRaises(syncer.SyncError):
            self.run_sync(feeds(post()))


class PagesTests(unittest.TestCase):
    def setUp(self):
        self.temp = TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name) / "cases.json"
        self.path.write_bytes(b'{"cases": ["expected"]}')

    def test_already_public_data_does_not_request_a_build_or_need_a_token(self):
        fetch = Mock(return_value=self.path.read_bytes())
        result = pages.verify_and_build(self.path, "", fetch=fetch)
        self.assertEqual(result["status"], "current")
        self.assertEqual(fetch.call_count, 1)

    def test_explicit_build_and_public_byte_verification(self):
        fetch = Mock(side_effect=[b"old", b'{"build_type":"legacy","source":{"branch":"main","path":"/"}}',
                                  b'{"status":"queued"}', self.path.read_bytes()])
        result = pages.verify_and_build(self.path, "fake-test-token", fetch=fetch, pause=lambda _: None)
        self.assertEqual(result["status"], "published")
        self.assertEqual(fetch.call_args_list[2].kwargs, {"method": "POST", "token": "fake-test-token"})
        self.assertNotIn("token", fetch.call_args_list[0].kwargs)
        self.assertNotIn("token", fetch.call_args_list[3].kwargs)

    def test_permission_failure_stops_without_alternate_requests(self):
        fetch = Mock(side_effect=[b"old", syncer.SyncError("HTTP 403")])
        with self.assertRaisesRegex(syncer.SyncError, "403"):
            pages.verify_and_build(self.path, "fake-test-token", fetch=fetch, pause=lambda _: None)
        self.assertEqual(fetch.call_count, 2)

    def test_changed_pages_source_cannot_be_reconfigured(self):
        fetch = Mock(side_effect=[b"old", b'{"build_type":"workflow","source":{"branch":"main","path":"/"}}'])
        with self.assertRaisesRegex(syncer.SyncError, "source"):
            pages.verify_and_build(self.path, "fake-test-token", fetch=fetch)
        self.assertEqual(fetch.call_count, 2)

    def test_build_error_is_reported_as_failure(self):
        fetch = Mock(side_effect=[b"old", b'{"source":{"branch":"main","path":"/"}}', b"{}",
                                  b"old", b'{"status":"errored"}'])
        with self.assertRaisesRegex(syncer.SyncError, "errored"):
            pages.verify_and_build(self.path, "fake-test-token", fetch=fetch, pause=lambda _: None)


if __name__ == "__main__":
    unittest.main()
