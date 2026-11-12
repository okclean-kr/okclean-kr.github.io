# 공식 블로그 새 글 자동 갱신

`.github/workflows/sync-blog-cases.yml`이 매시간 17분에 두 공식 네이버 블로그의 RSS를 확인합니다. GitHub 일정 실행은 지연되거나 생략될 수 있으므로 실시간 반영을 보장하지는 않습니다. `main`의 workflow가 활성화되어야 일정이 시작됩니다.

수집 workflow·두 Python 스크립트·검증 테스트가 `main`에 반영될 때도 한 번 실행합니다. 따라서 첫 배포에서 초기 실행을 확인할 수 있습니다. `cases.json`만 바뀌는 수집 커밋은 이 `push` 경로 조건에 포함하지 않아 반복 실행을 만들지 않습니다.

- `https://rss.blog.naver.com/boss6008.xml`
- `https://rss.blog.naver.com/cleankoreacoop.xml`

별도 서버, 유료 서비스, 새 secret 없이 Python 표준 라이브러리와 저장소의 기본 `GITHUB_TOKEN`을 사용합니다. workflow 권한은 `contents: write`, `pages: write`입니다. 쓰기 권한이나 branch protection 때문에 거부되면 실패로 보고하며 다른 계정이나 토큰으로 우회하지 않습니다.

외부 Action은 2026-11-12 공식 저장소의 release tag와 일치하는 커밋으로 고정했습니다: `actions/checkout` v7.0.1 (`3d3c42e5aac5ba805825da76410c181273ba90b1`), `actions/setup-python` v7.1.0 (`6d4fd22b20465ccc0f7354476588e8df7c9ca0e0`).

## 무엇을 갱신하는가

`cases.json`에서 각 블로그의 가장 최근 발행 시각을 찾고, 그보다 새로우며 아직 없는 글만 추가합니다. RSS에 함께 노출되는 오래된 누락 글은 자동으로 가져오지 않습니다. 기존 58건의 필드·순서·원본 링크·이미지·분류는 보존합니다. `case-classification.json`, `featured-cases.json`과 대표 사례 사진은 자동으로 바꾸지 않습니다. 새 글이 없으면 `cases.json`의 바이트와 `updated`도 그대로 둡니다.

분류는 제목과 RSS 본문 발췌의 명시적 근거를 사용합니다.

| 조건 | 저장하는 분류 | 홈페이지 표시 |
| --- | --- | --- |
| 방법·관리법·질문·주의사항 등 정보성 제목 | `tip` | 청소 정보 |
| 공지·이벤트·모집·서비스 안내 | `notice` | 공지와 다른 블로그 기록 |
| 여행·맛집·생각/마음 청소 등 개인 글 | `personal` | 공지와 다른 블로그 기록 |
| 청소 서비스가 식별되고 원문이 직접 작업 또는 실제 작업 영상/사진을 명시 | `case` | 작업 사례 |
| 그 밖의 모호한 글, 설명용 이미지 표시 | `review` | 공지와 다른 블로그 기록 |

팁·공지·개인 글 판정을 작업 판정보다 먼저 적용합니다. 제목에 ‘춘천’, ‘청소’, ‘후기’가 있다는 이유만으로 작업 사례로 인정하지 않습니다. RSS가 짧아 실제 작업 근거가 빠지면 `review`로 남을 수 있습니다. 검토 후 필요한 항목만 기존 `case-classification.json`에서 별도로 보정할 수 있습니다.

새 항목의 `source`, `publishedAt`, `classificationReason`으로 출처와 자동 분류 근거를 확인합니다. `date`는 블로그 게시 시각이며 시공일이 아닙니다. 지역은 본문의 ‘화천에 있는’처럼 직접적인 위치 문장이 하나로 확인될 때만 입력합니다. 제목의 홍보 지역은 현장 위치로 추정하지 않습니다. RSS 썸네일은 관련 이미지이며, 직접 검토한 대표 현장 사진이나 전후 비교 사진으로 승격하지 않습니다.

## 데이터와 동시 실행 보호

- 두 RSS 중 하나라도 수신 또는 검증에 실패하면 전체 갱신을 중단하고 기존 파일을 보존합니다. HTTP 403은 그대로 실패 처리합니다.
- 승인된 두 블로그의 HTTPS 글 주소만 허용합니다. 모바일 주소와 RSS 추적 쿼리는 같은 글 주소로 정규화해 중복을 막습니다.
- XML 크기·항목 수·발행일을 검증하고 외부 엔터티 선언을 거부합니다. HTML은 텍스트로 정리하고 승인된 Naver 이미지 호스트의 HTTPS URL만 보관합니다.
- GitHub concurrency와 로컬 파일 잠금으로 중복 실행을 막습니다. 저장 직전 원본 바이트가 달라졌다면 덮어쓰지 않습니다.
- 임시 파일을 같은 디렉터리에 쓴 뒤 원자적으로 교체합니다. 원격 `main`이 다른 작업으로 바뀌었다면 일반 `git push`가 거부되며 강제 푸시는 하지 않습니다. 다음 실행은 최신 `main`에서 다시 수집합니다.

## 공개 사이트까지 반영

GitHub 문서상 기본 `GITHUB_TOKEN`으로 푸시한 커밋은 Pages 빌드를 자동으로 유발하지 않습니다. 따라서 workflow가 `scripts/ensure_case_pages.py`를 통해 현재 `main` / 루트의 기존 branch-based Pages 설정을 확인한 뒤 공식 Pages build API를 호출합니다. Pages 설정 자체는 변경하지 않습니다.

공개 `https://okclean-kr.github.io/cases.json`의 바이트와 저장소 후보의 SHA-256이 같아야 성공입니다. 새 글이 없는 실행도 공개 자료가 최신인지 확인하므로, 직전 커밋 후 빌드만 실패했을 때 다음 실행에서 재시도할 수 있습니다. 권한 거부·네트워크 오류·빌드 오류·검증 시간 초과는 성공으로 숨기지 않습니다. 실패한 빌드는 마지막 성공한 공개 자료를 대체하지 않습니다.

## 수동 실행과 확인

GitHub 저장소의 **Actions → Sync official blog posts → Run workflow**에서 `main`을 선택합니다.

1. `dry_run: true`: RSS와 분류를 검증하고 추가 예정 건수를 확인합니다. 커밋·빌드하지 않습니다.
2. `dry_run: false`: 새 글을 추가하고 일반 푸시한 뒤 Pages 공개 반영을 확인합니다.
3. 실행 Summary의 수집 결과와 ‘공개 cases.json과 저장소 파일의 SHA-256이 일치합니다’를 확인합니다. 실패하면 해당 step의 HTTP 상태 또는 검증 오류를 확인합니다.

로컬에서는 다음 명령으로 파일 변경 없이 실제 RSS를 점검합니다.

```bash
python scripts/sync_blog_cases.py --dry-run --report /tmp/okclean-case-sync-report.json
python -m unittest discover -s tests -p 'test_case_sync.py' -v
```

일정 실행이 장기간 멈추면 Actions의 workflow 활성화 상태도 확인합니다. GitHub는 공개 저장소에서 60일 동안 활동이 없을 때 일정 workflow를 자동 비활성화할 수 있습니다. 필요하면 Actions에서 다시 활성화합니다. 중단하려면 이 workflow를 Disable하고 `cases.json`은 그대로 두면 됩니다.

## 최초 운영 성공 확인 — 2026-11-12

[PR #39](https://github.com/okclean-kr/okclean-kr.github.io/pull/39)가 `main`에 병합된 뒤 실제 자동 갱신과 공개 배포를 확인했습니다. 아래 수치와 해시는 최초 검증 시점의 기록입니다.

| 확인 항목 | 실제 결과 |
| --- | --- |
| 배포 전 기준 | 병합 커밋 `a7fe1373d2298dd0aef5b3541e68bc0b51209e0d`의 기존 58건 |
| 최초 RSS 실행 | [43169207974](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43169207974), `push` 이벤트, `completed / success` |
| 추가 내용 | 새 글 11건: 관리 팁(`tip`) 9건, 원문에 작업 근거가 명시된 작업 기록(`case`) 2건 |
| 갱신 커밋 | [da13bc457c26148b87ce4e7f468061393edb6c79](https://github.com/okclean-kr/okclean-kr.github.io/commit/da13bc457c26148b87ce4e7f468061393edb6c79) |
| Pages 배포 | [43169230456](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43169230456), `completed / success` |
| 공개 자료 | [cases.json](https://okclean-kr.github.io/cases.json), HTTP 200, 총 69건, 26,816바이트 |
| 기존 자료 보존 | `a7fe1373d2298dd0aef5b3541e68bc0b51209e0d`의 58개 객체 내용과 순서가 갱신 후에도 동일 |
| 학교 현장 지역 | 글 `224367465550`의 `region`은 `화천`, 원문 제목은 보존 |

봇 커밋의 파일과 공개 파일의 크기·SHA-256이 일치했습니다.

```text
947a057ba250f00c4ec99c9c22c114d29b3f00ea566ea3389ff808d23929733f
```

RSS 실행의 보호 검사·수집·자료 커밋·Pages 빌드 요청 및 공개 자료 검증 단계가 모두 성공했습니다. Pages 실행의 `build`, `report-build-status`, `deploy` 작업과 각 단계도 모두 성공했습니다.

운영 `main`의 [workflow 설정](https://github.com/okclean-kr/okclean-kr.github.io/blob/main/.github/workflows/sync-blog-cases.yml)은 `17 * * * *`, 즉 매시간 17분 실행입니다. 이번 최초 성공은 `push` 실행으로 확인했으며, 일정 실행은 GitHub의 처리 상황에 따라 지연되거나 생략될 수 있습니다. 공개 사이트 주소는 [https://okclean-kr.github.io/](https://okclean-kr.github.io/)입니다.

## 공식 동작 근거

- [GitHub Actions schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [workflow concurrency](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency)
- [GITHUB_TOKEN 커밋과 Pages 빌드](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#troubleshooting-publishing-from-a-branch)
- [Request a GitHub Pages build](https://docs.github.com/en/rest/pages/pages#request-a-github-pages-build)
