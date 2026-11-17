# 오케이청소 견적 접수 운영 검증 결과 — 2026-11-17

현재 홈페이지와 상세 견적 접수는 운영 중이다. PR #56까지 반영했고 기존 회원·쿠폰·계산기·자동화를 유지했다. 실제 세탁기 세척 과정 사진 2장을 추가했으며, 서버의 기존 시험 견적 조회 → 실제 고객 알림에서 제외 확인 → 별도 시험 메일 수신을 2026-11-17 12:58 KST에 검증했다. 직후 12:58:06 KST 예약 회차도 정상 완료됐다. 실제 신규 고객 접수 메일의 첫 수신은 이번 검증에서 확인하지 않았다. 추가로 작업 내용·날짜 오류를 해당 단계에서 수정하도록 개선하고 운영 PC·390px 화면에서 확인했다.

| 항목 | 완료 여부 | 실제 검증 결과 |
|---|---|---|
| 기존 홈페이지 백업 | 완료 | 변경 전 126개 소스 파일을 ZIP과 Git 백업 브랜치로 보존. 고객 자료는 별도로 11월 16일 23:21 KST에 암호화 내보내기하고 복호화·체크섬을 검증했다. |
| 간편 견적 계산 | 완료 | 기존 계산기를 유지하고 296개 가격 조합을 비교. 확인된 기존 기준을 사용하며 확정 견적으로 표시하지 않는다. |
| 상세 견적 신청 | 완료 | 운영 서버 시험 접수 2건에서 저장·접수증 재조회·같은 번호 재시도·저장 실패 후 입력 보존을 확인. 실제 고객 집계와 분리. |
| 서비스별 맞춤 질문 | 완료 | 기존 홈페이지에서 확인한 12개 서비스에 맞게 질문 표시. 작업 내용·날짜 오류는 해당 단계에서 안내하고 입력칸에 초점 이동. 마지막 검증에서도 앞 단계 오류를 보여주며 기존 입력·사진 유지. 임의 서비스·가격이나 새로운 접수 제한을 추가하지 않았다. |
| 현장 사진 첨부 | 완료 | 최대 5장 형식·헤더·디코딩·용량 검사와 JPEG 압축 후 비공개 저장. 운영 시험에서 5장 저장·관리자 열람·다른 고객 접근 거부 확인. |
| 관리자 접수 관리 | 완료 | 기존 Google 관리자 로그인·신규 목록·필터·상태·메모·견적 전달 이력·시험 계약·재접속 검증. 실제 계약이 발생한 것으로 집계하지 않는다. |
| 상담 알림 | 가동·시험 수신 확인 | 기존 서버 시험 견적의 최소 필드 조회와 고객 알림 제외를 확인한 뒤, 별도 시험 메일 1통의 실제 도착을 12:58 KST에 확인. 운영 커서·대기 상태 불변. 실제 신규 고객 메일의 수신은 이번 시험으로 확인한 것이 아니다. 단일 5분 트리거와 변경 후 실제 예약 실행 완료 확인. |
| 작업 사진·후기 | 부분 완료 | 기존 실제 작업 3건·지역 필터 유지. 원본 영상에서 얼굴·주소가 없는 세탁기 세척 과정 사진 2장을 추가하고 해당 견적으로 연결. WebP 합계 69,668바이트. 확인된 동일 현장 완료 후 사진과 동의된 후기 원문은 미확보. |
| 서비스 지역 안내 | 완료 | 기존 지역 안내와 모바일 선택 사용. 지역 선택만으로 출장 가능 여부를 확정하지 않고 일정·거리·작업 규모 및 추가비를 상담에서 확인하도록 안내. |
| 상담 전환 통계 | 완료 | 견적 시작·단계·계산·저장 성공·카카오톡·전화·관리자 계약 처리 연결 및 날짜·서비스·유입 출처별 집계. 시험 접수 분리. 페이지 조회·클릭·신청·계약 의미를 구분. |
| 보안·모바일 테스트 | 완료 / 범위 명시 | 266개 자동 검사 통과, 실패·제외 0. 고객 간 접근 차단과 관리자 권한 검사. PC 및 실제 브라우저 390px 모바일 화면 검증. 물리 휴대전화 시험과 신규 운영 회원가입·쿠폰 발급은 수행하지 않았다. |
| 실제 운영 배포 | 완료 | PR #41~#56 반영. PR #56 병합 SHA `325c4c44ecffcde93a7420d5f7ffcf48ba6d8553`. CI·Pages 성공, 이번 운영 파일 11개 HTTP 200·검사 소스와 바이트 일치. 실제 PC·모바일 화면에서 작업 오류 안내와 수정 후 정상 진행 확인. 비공개 이메일 시험 수신 검증도 유지. |

## 작업 입력 오류 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/56
- 수정 전 오류 3건을 재현했다. 기존 작업 검증을 단계 진행 전에 재사용하며, 마지막 검증의 오류도 해당 입력 화면으로 안내한다. 기존 접수 기준·가격·저장 방식은 바꾸지 않았다.
- Node 173개, 견적·회원·백업·메일 REST 70개, Python 23개, 합계 266개 통과. 실패·생략 0개. UI 검사 22개에는 정상 서비스 12종, 사진 6장 거부·5장 유지·삭제, 오류 이동 후 연락처·사진 유지가 포함된다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44020075511
- main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44020261221
- Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44020260922
- 실제 운영 PC에서 상가 업종 오류의 초점 이동과 수정 후 연락처 단계 진행을 확인했다. 실제 운영 사이트를 연 390px iframe에서 날짜 오류 초점·작업 수량 유지·날짜 수정 후 연락처 단계 진행·가로 넘침 없음을 확인했다. 미리보기의 최종 접수 버튼은 계속 비활성이다.
- 로컬 Chrome 미리보기에서 기존 공개 JPEG 5장을 실제 압축하고, 한 장 삭제 후 나머지 4장과 입력값 유지를 확인했다. 6장 초과 거부와 최종 검증에서 앞 단계 오류로 이동한 뒤 사진·연락처 유지까지는 격리 DOM 검사다. 이 후속 검증에서는 운영 서버에 사진·견적을 새로 저장하지 않았다.
- 한글 문자 입력·유지 및 합성 조합 Enter 예외 검사는 확인했지만 실물 휴대전화·물리 IME 입력 시험은 수행하지 않았다.
- 상세 기록: `quote-work-validation-20261117.json`. 화면 증빙: `evidence/quote-work-validation-mobile-20261117.jpg`.
- 백업: `backup/work-validation-before-20261117-845cc8d`. 복구 시 `quote/index.html`, `quote/quote-core.js`, `quote/quote-form.mjs`를 같은 버전으로 되돌린다. 고객 데이터·접수번호·후속 자동화 변경은 되돌리지 않는다.

## 12:58 KST 후속 검증

- 저장 견적 메일 연결 검사 PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/55
- PR 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44013543692 (261개 통과).
- main 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44013756845
- Pages 배포: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44013754719
- 실제 비공개 편집기 저장 원문 SHA-256: `70348aa3504f0ea4b952fb80b715afca12443875dbf985fc3a753d950f00c06e`.
- 수동 시험 실행: 12:58:03 KST 시작, 1.899초로 완료. 로그의 `testQuoteRead`, `excludedFromCustomerNotification`, `productionStateUnchanged` 모두 true. 받은편지함의 정확한 시험 제목 1건과 12:58 수신 시각을 별도 확인.
- 변경 후 실제 시간 기반 회차: 12:58:06 KST 시작, 2.654초로 완료, 12:58:09 로그 `no-new-quotes`. 트리거 1개, 표시 오류율 0%.
- 이번에 고객·시험 견적을 새로 생성하지 않았고 고객 데이터·운영 알림 처리 위치·OAuth 범위·수신 계정·트리거를 변경하지 않았다.
- 상세 근거: `stored-quote-mail-verification-20261117.json`. 소스·복구 기준 백업: `backup/stored-mail-test-before-20261117-d92142b`.
- 실제 작업 사진 PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/54. 사진 출처와 복구 기록은 `work-process-provenance-20261117.json`, `work-process-photos-20261117.md`.

## 주소와 근거

- 홈페이지: https://okclean-kr.github.io/
- 상세 견적: https://okclean-kr.github.io/quote/
- 견적 관리: https://okclean-kr.github.io/admin/quotes.html
- 고객 자료 백업 도구: https://okclean-kr.github.io/admin/backup.html
- 알림 소스 PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/51
- 실제 연결 검증·관리자 안내 PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/52
- 안내 변경 및 검증 PR 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43915000109
- 알림 소스 PR 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43906386405
- 연결 검증 최종 PR 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43915536450
- 운영 브랜치 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43915742967
- 소스 배포: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43915742088

검사 250개는 Node·DOM 158개, 견적 규칙 45개, 회원 규칙 12개, 백업 규칙 6개, 메일 REST 격리 검사 6개, 작업 사례 Python 23개의 합이다. 메일 REST 검사는 loopback Emulator에서만 실행했으며 Google OAuth/IAM 또는 실제 메일 수신 검사를 대신하지 않는다. 검사 수는 고객·계약 건수가 아니다.

세부 증거는 `ops/quote-verification-20261116.json`, `ops/intake-reconnect-verification-20261116.json`, `ops/customer-backup-verification-20261116.json`, `ops/private-email-alert-verification-20261117.json`에 보관한다.

## 변경 파일

이번 PR #51은 `notifications/apps-script/Code.gs`, `notifications/apps-script/appsscript.json`, `notifications/apps-script/README.md`, `tests/mail-notifications.test.cjs`, `tests/mail-notifications-rest.test.mjs`, `package.json`, `.github/workflows/quote-checks.yml`, `ops/private-email-alert-verification-20261117.json`을 변경했다. PR #52는 `admin/quotes.html`의 알림 안내와 실제 연결 증거 JSON, 본 결과 문서를 갱신한다. 관리자 기존 기능 DOM 검사 14개도 통과했다.

견적 본체 변경은 `quote/`, `admin/quotes.html`, `admin/quotes.mjs`와 기존 홈페이지·통계 연결에 반영돼 있다. 이번 메일 작업에서 홈페이지 실행 코드·Firebase 규칙·요금제·고객 자료·블로그·Threads 자동화는 변경하지 않았다.

## 백업과 복구

- 변경 전 홈페이지 Git 백업: `backup/quote-before-20261116-70495bb` / `70495bb770959b45bd4f6f42e956ccb9fc0a2f7e`.
- 변경 전 소스 ZIP: `OKClean_before_quote_20261116_70495bb.zip`. 공개 소스만 포함하며 비공개 파일로 저장·전달했다.
- 메일 소스 반영 직전: `backup/mail-source-release-before-20261117-ad1fd16` / `ad1fd168992b51a506f310dec51a566706bf92a2`.
- 실제 알림 연결·관리자 안내 반영 직전: `backup/mail-activation-before-20261117-0ad1e1e` / `0ad1e1ef0e84a3449a90f9ef7093c20f8ed50c9c`.
- 고객 자료 암호화 파일: `OKClean_customers_20261116232103_KST.okcbackup`. 복구키는 별도 비공개 파일로 보관한다. 공개 저장소에는 둘 다 올리지 않는다.
- 고객 백업은 알려진 회원·견적 스키마 17문서의 해당 시점 내보내기다. 변경 전 데이터베이스 스냅샷이나 Firebase 전체 DB·Auth 백업이 아니며, 운영 복원은 수행하지 않았다.
- 소스 문제는 해당 변경 커밋만 `git revert`로 복구하고 Pages 성공을 확인한다. 뒤에 추가된 자동화 자료를 과거 브랜치로 강제 덮어쓰지 않는다.
- 새 접수를 긴급 중지할 때는 `quote/config.js`의 enabled·verified를 false로 바꾸되 기존 접수 데이터는 보존한다. Firebase 규칙은 적용 직전 백업과 현재 차이를 확인한 후 별도로 복구한다.
- 코드 기본값은 비활성이고 현재 비공개 프로젝트는 명시적으로 활성화했다. 중지할 때 `pauseNotifications`를 실행하며 대기·커서를 보존한다. 복구 절차는 `notifications/apps-script/README.md`에 있다.

## 남은 확인

1. 사용자가 Google 권한 요청을 직접 승인했으며 운영 읽기 전용 사전검사를 통과했다. 시험 메일은 2026-11-17 02:01 KST에 실제 받은편지함에서 확인했다.
2. 2026-11-17 02:03 KST에 이메일을 활성화하고 시간 기반 트리거 한 개를 확인했다. 첫 실제 자동 회차가 02:08:06 KST에 1.294초로 완료됐으며 로그는 `no-new-quotes`였다. 수동 poll 실행을 예약 실행으로 보고하지 않았다. 실제 고객 신규 접수 메일의 수신은 별도 확인이 필요하다.
3. 실제 현장 전후 사진과 동의된 후기 원문이 확보돼야 해당 콘텐츠를 추가할 수 있다.

현재 유료 결제·Firebase 요금제 변경·고객 삭제·기존 자동화 변경은 수행하지 않았다.
