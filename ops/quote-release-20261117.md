# 오케이청소 견적 접수 운영 검증 결과 — 2026-11-18 갱신

현재 홈페이지와 상세 견적 접수는 운영 중이다. 기능 개선 PR #56·#58·#59·#61·#62·#63·#66·#67·#68과 정기 소스 백업 PR #57·#64·#65와 첫 화면 글꼴 로딩 PR #69를 반영했고 기존 회원·쿠폰·계산기·자동화를 유지했다. 실제 세탁기 세척 과정 사진 2장을 추가했으며, 서버의 기존 시험 견적 조회 → 실제 고객 알림에서 제외 확인 → 별도 시험 메일 수신을 2026-11-17 12:58 KST에 검증했다. 직후 12:58:06 KST 예약 회차도 정상 완료됐다. 실제 신규 고객 접수 메일의 첫 수신은 이번 검증에서 확인하지 않았다. 작업 내용·날짜 오류 안내에 더해 한글 조합 확정 Enter의 잘못된 단계 이동을 보완하고 운영 PC·390px 화면에서 확인했다. 한글 조합 회귀는 합성 이벤트 검사이며 실물 IME 시험으로 표현하지 않는다.

| 항목 | 완료 여부 | 실제 검증 결과 |
|---|---|---|
| 기존 홈페이지 백업 | 완료 | 첫 예약 실행 [44201605700](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700) 성공. 실제 ZIP 해시 일치, 233개 파일·6,755,670바이트 격리 복원 및 Git 원본 대조 완료. [산출물 14382050626](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700/artifacts/14382050626)은 12월 2일 08:41:55 KST 만료. 범위는 공개 Git 소스. |
| 간편 견적 계산 | 완료 | 기존 계산기·296개 가격 조합 검증 유지. PR #69에서 정상 글꼴 연결과 글꼴 실패 시에도 PC/390px 계산·상세 견적 연결 확인. 기존 벽걸이 2대 참고 금액 20만원부터, 임의 가격 추가 없음. 계산기 설정 원문 동일. |
| 상세 견적 신청 | 완료 | 기존 운영 시험 접수의 저장·접수증 재조회 검증 유지. PR #67에서 실패 시 실제 생성된 확인용 번호를 접수 미확인으로 표시하고, 번호 발급 전 실패·오프라인 재시도 구분. 입력·사진·동일 번호 재시도 유지. 새 실패→재시도 동선은 격리 응답으로 시험했으며 새 운영 견적은 만들지 않음. PR #70에서 저장 후 상담 버튼 중복을 줄이고 접수번호 전달 방법을 안내한다. |
| 서비스별 맞춤 질문 | 완료 | 기존 홈페이지에서 확인한 12개 서비스에 맞게 질문 표시. 작업 내용·날짜 오류는 해당 단계에서 안내하고 입력칸에 초점 이동. 마지막 검증에서도 앞 단계 오류를 보여주며 기존 입력·사진 유지. 임의 서비스·가격이나 새로운 접수 제한을 추가하지 않았다. |
| 현장 사진 첨부 | 완료 | 최대 5장 비공개 저장·관리자 열람·다른 고객 접근 거부 기존 검증 유지. PR #62에서 압축 가로·세로 모두 1280 이하로 제한하고 잘못된 canvas/JPEG 결과 거부·한국어 오류 안내 추가. Chrome PC/390px 실제 코덱 검사 및 운영 미리보기의 공개 작업 사진 선택→JPEG 압축 확인. 새 운영 사진·견적은 저장하지 않음. |
| 관리자 접수 관리 | 완료 | 기존 Google 관리자·목록·필터·상태·메모·금액·전달 이력·시험 계약·재접속 검증 유지. PR #68에서 목록 재생성 뒤에도 접수번호별 저장 성공 안내·초점 유지. 응답 전 완료 표시 금지, 실패 초안 재시도와 이전 로그인 세션의 지연 안내 차단 검증. 새 동선은 합성 자료로 시험하며 운영 고객 상태·계약을 변경하지 않음. |
| 상담 알림 | 가동·시험 수신 확인 | 기존 시험 메일 실제 수신 확인 유지. 11월 18일 추가 읽기 점검에서 03:58~08:03 KST의 최근 예약 실행 50회 모두 완료, 최신 로그 새 접수 없음·트리거 1개·표시 오류율 0%. 새 시험 메일·수동 poll·설정/커서 변경 없음. 실제 신규 고객 메일의 첫 수신은 여전히 미확인. |
| 작업 사진·후기 | 부분 완료 | 기존 실제 작업 3건·지역 필터 유지. 원본 영상에서 얼굴·주소가 없는 세탁기 세척 과정 사진 2장을 추가하고 해당 견적으로 연결. WebP 합계 69,668바이트. 확인된 동일 현장 완료 후 사진과 동의된 후기 원문은 미확보. |
| 서비스 지역 안내 | 완료 | 기존 지역 안내와 모바일 선택 사용. 지역 선택만으로 출장 가능 여부를 확정하지 않고 일정·거리·작업 규모 및 추가비를 상담에서 확인하도록 안내. |
| 상담 전환 통계 | 완료 | 견적 시작·단계·계산·저장 성공·카카오톡·전화·관리자 계약 처리 및 날짜·서비스·유입별 집계. PR #63에서 빠른 서비스 변경 후 지연 계산 이벤트가 다른 서비스로 기록되던 오류 수정. 800ms 중복 억제·시험 제외 유지, 과거 통계 수정 없음. 조회·클릭·신청·계약 의미 구분. PR #71에서 홈페이지 가격 입력에 따라 금액이 표시된 경우만 예상 비용 계산으로 기록하도록 바로잡았다. |
| 보안·모바일 테스트 | 완료 / 범위 명시 | 최신 CI 297개 검사 통과, 실패·생략 0. Chrome PC/390px 정상 글꼴/연결 실패에서 화면·계산기·상세 견적 진입·가로 넘침 없음 확인. 회원·쿠폰·권한 회귀 유지. 실제 네트워크별 LCP/FCP/CLS·실물 휴대전화/Safari·JavaScript 미사용 브라우저는 미검증. |
| 실제 운영 배포 | 완료 | 기능 PR #41~#56·#58·#59·#61·#62·#63·#66·#67·#68, 백업 PR #57·#64·#65 및 로딩 PR #69 반영. 최신 PR CI·main·Pages 성공. 주요 파일 10개 HTTP 200·병합 소스 일치. 통계를 끈 운영 미리보기에서 새 글꼴 적용·서비스 12종·기존 계산 결과·견적 링크·쿠폰 혜택 확인. |




## 2026-11-18 홈페이지 예상 비용 집계 검증

- 기존 홈페이지에서 지역·날짜 변경이나 금액 없는 현장 견적도 `quote_calculate`로 기록됐음을 재현했다. 서비스·종류·면적/수량·옵션 조작으로 금액이 표시된 경우만 기록한다. 800ms 안의 연속 가격 입력을 묶고, 현장 견적으로 전환하면 그 시간 안에 대기 중인 건을 취소한다. 서비스는 계산할 때의 값을 사용한다. 기존 기록은 보존했다. [PR #71](https://github.com/okclean-kr/okclean-kr.github.io/pull/71)
- 격리 Chrome PC에서 지역·날짜 변경 0건, 벽걸이 에어컨 3대 30만원부터 1건, 유리창 현장 견적 전환 뒤에도 1건을 확인했다. 같은 세션의 390px 화면에서 에어컨 2대 20만원부터 계산할 때 1건이 추가됐고, 유리창으로 바꿔도 건수는 유지됐다. 금액과 상세 견적 링크가 서비스 선택을 따르고 가로 넘침이 없었다. [격리 모바일 화면](evidence/home-calculation-mobile-20261118.jpg)
- PR 검사 298개 통과(실패·생략 0), main 및 Pages 성공. 통계 수집을 끈 운영 미리보기에서 에어컨 2대 20만원부터 → 3대 30만원부터, 상세 견적 연결과 서비스 12종을 확인했다. 운영 파일 10개 HTTP 200 및 Git 원본 일치. 운영 시험 이벤트, 실물 휴대전화 및 Safari 검증은 범위에 포함하지 않았다. [검증 기록](home-calculation-verification-20261118.json)

## 2026-11-18 견적 접수 후 상담 동선

- 저장 확인 후 전화·카카오톡이 각각 두 번 노출되던 화면을 전화·카카오톡 각 한 개로 정리했다. 접수번호를 카카오톡 채팅창에 직접 보내거나 전화 상담에서 알려주도록 안내한다. 저장 대기·실패·접수 비활성 상태에서는 기존 예상 비용·사진 상담·전화 연결이 남는다. [PR #70](https://github.com/okclean-kr/okclean-kr.github.io/pull/70)
- 이전 코드의 성공 화면에서 상담 링크 4개를 재현했다. 변경 후 격리 Chrome PC와 390px 화면에서 저장 실패 → 같은 번호로 재시도 → 접수 완료 제목에 초점 이동 → 상담 링크 2개와 접수번호 전달 안내를 확인했다. 모바일 문서 폭과 스크롤 폭은 모두 375px였다. 시험은 합성 저장 응답을 사용했다. [모바일 검증 화면](evidence/quote-contact-isolated-20261118.jpg)
- PR CI 297개 통과(실패·생략 0), main CI와 Pages 배포 성공. 운영 미리보기에서 서비스 12개와 기존 상담 링크·접수 버튼 비활성을 확인했다. 운영 주요 파일 10개가 HTTP 200이고 Git 원본과 일치했다. 실제 고객 저장·전화 발신·메시지 전송은 시험 범위에 포함하지 않았다. 실물 휴대전화와 Safari는 확인하지 않았다. [검증 기록](quote-contact-verification-20261118.json)

## 2026-11-18 첫 예약 소스 백업 검증

- 2026-11-18 08:41:46 KST에 생성된 첫 예약 실행 `44201605700`(`schedule`, 최초 시도)이 성공했다. 08:00 예약 시각과 실제 실행 시각은 약 42분 차이가 났다. 백업 검사 6개, 압축, 격리 복원, 산출물 업로드 단계가 모두 성공했다. [GitHub 실행 기록](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700) · [작업 상세](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700/job/134456840661)
- 산출물 `14382050626`는 2026-11-18 08:41:56 KST에 생성됐고 2026-12-02 08:41:55 KST에 만료된다. 내려받은 ZIP은 **5,283,402바이트**이며 SHA-256 `06566358385ab333a512cc896013798dfa38231714857f51fa8b314bcb4ed075`가 GitHub 기록과 일치했다. 내부는 `manifest.json`과 `source.tar.gz` 두 파일이다. [백업 ZIP](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700/artifacts/14382050626)
- 별도 빈 폴더에 **233개 파일·6,755,670바이트**를 복원했다. 커밋 `6806ed480e6b25cdcb845abc6b1ea78f28adc250`의 파일 목록·내용·Git 파일 모드와 모두 일치했다. 내부 압축 파일 SHA-256은 `19a2bdf8a6a33d5ab7dab4a29bffbdd8ed49bc66c7d6c150464e3f73e2ef6baf`다. 검증 범위는 공개 Git 소스다. [검증 기록](first-scheduled-source-backup-verification-20261118.json)

## 2026-11-18 아침 관리자 알림 읽기 점검

- 실제 비공개 Apps Script 실행 표에서 **03:58:06~08:03:06 KST의 최근 시간 기반 실행 50회 모두 완료**, 실패 0건을 확인했다. 최신 실행은 1.779초, 08:03:08 로그는 `no-new-quotes`다. 트리거는 기존 1개이며 표시 오류율은 0%다. 이 50건을 모든 밤사이 실행이나 실제 신규 고객 메일 수신 증거로 확대하지 않는다.
- 고객 자료·대기 상태·커서·권한·수신처·트리거·소스를 변경하지 않았다. 수동 poll·새 시험 메일·고객 신청·계약·전환 이벤트도 만들지 않았다. 계정·개인 프로젝트 주소·고객 정보는 공개 증거에 넣지 않는다.
- 08:07 KST 조회까지 첫 08시 소스 백업의 `schedule` 이벤트는 아직 관측되지 않았다. 기존 push 성공을 예약 성공으로 대체하지 않으며 실패로 단정하지도 않는다. 기존 **08:30 KST 첫 예약 확인 task 활성·실행 이력 없음**을 재확인했다. 매일 백업·한정 확인 task와 기존 블로그·Threads 자동화는 변경하지 않았다.
- 이번 변경은 점검 문서와 화면 증거뿐이다. 기존 **297개 통과** 애플리케이션·시험 소스가 동일해 전체 검사를 반복하지 않았다. 근거: `quote-operations-health-20261118.json`, `private-email-alert-verification-20261117.json`, `evidence/mail-trigger-health-20261118.jpg`.

## 2026-11-18 내부 연결·운영 파일 점검

- 공개 애플리케이션 HTML **27개**, 내부 링크/파일 참조 **662개**, 고유 대상 파일 **68개**를 확인했다. 없는 파일과 정적 이동 위치 누락은 모두 0건이었다. 견적·회원 혜택·서비스·지역·제품 추천·관리자 정적 화면 연결을 포함하며 ops 문서와 Git/개발 의존성은 검사 범위에서 제외했다.
- **07:57:39 KST**에 운영 대상 68개 모두 HTTP 200·소스 바이트/해시 일치를 확인했다. GET으로 정적 응답만 받아 브라우저 스크립트·통계·회원가입·견적·계약·알림을 실행하지 않았다. 외부 블로그/SNS/제휴 목적지 방문·게시도 하지 않았다.
- 점검 소스는 `c77171e06ea5bfe16c33a13c10ec83bde748f6d7`이며 기능 코드는 수정하지 않았다. 기존 297개 통과 소스가 동일하므로 같은 전체 검사를 반복하지 않았다. 정적 연결 점검을 인증·서버 저장 시험으로 표현하지 않는다. 근거: `internal-routes-verification-20261118.json`.

## 2026-11-18 첫 화면 글꼴 로딩 개선

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/69 — 병합 `018083bca4bcfbec9f712871cca9efcf2796dc84`.
- 기존 head의 외부 글꼴 CSS는 일반 stylesheet로 연결돼 첫 화면의 렌더링을 기다리게 하는 자원이었다. 실제 응답은 **53,513바이트·font-face 92개**이며 font-display:swap 선언도 92개다. 레이아웃 선택자는 없음을 확인했다. 기존 URL과 글꼴은 유지하고 media=print로 먼저 받아 성공한 뒤 all로 적용하며, JavaScript 미사용 시 기존 stylesheet를 제공하는 noscript 경로를 둔다. 첫 화면용 로컬 CSS·이미지 우선순위·지연 이미지·계산기·가격·쿠폰·가입·문의/제품/작업 사례·기존 스크립트와 자동화는 동일하다. 글꼴 이외 HTML과 cfg 원문을 바이트 비교했다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44190248604. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44191099728. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44191099802. 기존 **Node 204 + Firestore/REST 70 + Python 23 = 297개 통과, 실패·생략 0**. 이 두 줄의 HTML 변경을 그대로 따라 쓰는 새 테스트는 추가하지 않았다.
- 격리 Chrome PC/390px에서 정상 연결 시 실제 load 이벤트 뒤 media=all을 확인했다. 글꼴 실패는 로컬 존재하지 않는 CSS로만 재현했고 media=print 상태에서도 제목·화면·계산기·상세 견적 버튼이 정상 표시됐다. 벽걸이 3대 30만원부터→2대 20만원부터 재계산, 서비스 aircon을 넘긴 상세 견적 진입·맞춤 질문을 확인했다. 두 모바일 조건 모두 문서/스크롤 폭 375px로 가로 넘침이 없었다. 격리 화면은 실제 스타일/계산기 소스를 사용하되 통계·설치 스크립트를 제외하고 온라인 저장을 껐다. 실제 고객 접수·가입·메시지·계약을 만들지 않았다.
- 운영 `/?quote_preview=1`에서도 글꼴 media=all, 기존 화면용 CSS, 서비스 12종, 벽걸이 2대 20만원부터, aircon 상세 견적 링크와 1만원 할인/무료 서비스 혜택을 확인했다. 이 미리보기 표식은 기존 통계 수집을 끄며 문의·가입·사진·계약 저장은 수행하지 않았다. 주요 파일 10개 HTTP 200·병합 소스 바이트 일치. 기존 관리자 모듈·Firebase 규칙·메일/Threads/블로그/백업 workflow는 변경하지 않았다.
- **속도 향상 초·백분율, LCP/FCP/CLS 수치를 측정하거나 주장하지 않는다.** 외부 글꼴 CSS의 렌더링 대기 의존성을 제거한 것이며 총 글꼴 다운로드 바이트 감소가 아니다. noscript는 소스에서 확인했으며 JavaScript를 끈 실브라우저·실물 휴대전화/Safari는 시험하지 않았다. 기술 근거: https://web.dev/learn/performance/understanding-the-critical-path 및 https://shopify.dev/docs/storefronts/themes/best-practices/performance/defer-non-critical-resources.
- 변경 전 `backup/font-before-20261118-0167748`: **228파일·6,641,014바이트** 전체 격리 복원. 정상 소스 `backup/verified-font-20261118-018083b`: **228파일·6,641,241바이트** 전체 격리 복원. 같은 저장소 Git 스냅샷이며 독립 영구 외부 백업이 아니다. 고객 DB/Auth·비공개 메일 상태·스냅샷 이후 문서 갱신은 포함하지 않는다.
- 첫 예약 결과 확인 task는 활성이고 다음 확인은 **11월 18일 08:30 KST**, 실행 이력 없음으로 재확인했다. 이 task와 기존 매일 08시 백업은 수정하지 않았다. 미래 실행 성공을 뜻하지 않는다. 복구는 현재 index.html의 글꼴 link/noscript 변경만 되돌리며 이후 홈페이지/자동화 변경과 고객 자료를 보존한다. 근거: `home-font-verification-20261118.json`, `evidence/home-font-fallback-mobile-20261118.jpg`.

## 관리자 저장 성공 안내 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/68 — 병합 `65b9fbd427903d89144d5d019591bfcc9ab8b792`.
- 기존 성공 안내는 저장 후 닫힌 상세 화면 안의 요소에 기록돼, 목록 재생성 시 그 요소와 함께 사라졌다. 새 안내는 목록 밖에 두고 **서버 저장 응답 이후에만** 접수번호와 함께 표시·초점 이동한다. 새 저장 시도와 로그인 변경 때 비우며, 로그아웃 전 요청의 지연 응답이 새 세션에 옛 성공 안내를 띄우지 않도록 확인한다. 이미 서버로 보낸 쓰기 자체를 취소하는 기능은 아니다.
- 수정 전 관리자 회귀 20개 중 새 검사 2개 실패 재현 → 최종 PR CI에서 관리자 20개 포함 Node 204 + Firestore/REST 70 + Python 23 = **297개 통과, 실패·생략 0**. 대기 중 완료 숨김·실패 메모/금액 보존·같은 초안 재시도·서버 응답 후 목록 재생성에도 식별 안내 유지·초점 및 로그아웃/재로그인 지연 응답을 포함한다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44095577790. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44095844819. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44095843883. 모두 성공.
- Chrome PC/390px에서 실제 관리자 모듈 원문과 격리 응답/합성 시험 접수로 저장 대기→실패→같은 메모·금액을 Enter로 재시도→상담 중 갱신·목록 밖 성공 안내·접수번호·초점 이동을 확인했다. 각 요청 2회·로컬 저장 이력 1건이며 모바일 문서/스크롤 폭 모두 375px. 실제 Firebase·고객 문서·계약·메일·전환 통계를 만들거나 수정하지 않았다. 실물 휴대전화/Safari·스크린리더 음성은 미검증이다.
- 운영에서는 새 관리자 모듈 `20261117-adminsave1`·초기 숨김 상태 영역과 기존 관리자 연결을 읽기 확인했다. 일반 고객 견적의 접수 가능·서비스 12종과 주요 파일 10개 HTTP 200·병합 소스 바이트 일치도 확인했다. 운영에서 저장 실패를 주입하거나 고객 상태·금액·메모를 바꿔 시험하지 않았다. 일반 고객 화면 검토는 기존 page_view에 포함될 수 있는 내부 방문이며 고객 신청·계약이 아니다. 과거 통계 수정 없음.
- 변경 파일: `admin/quotes.html`, `admin/quotes.mjs`, `tests/quote-admin.test.cjs` 및 검증 문서/화면. 고객 신청·사진 압축·서버 트랜잭션/보안 규칙·가격·회원·쿠폰·알림·Threads/블로그/백업 workflow·첫 예약 확인 task는 동일하다. 식별 접수번호는 기존 관리자 전용 화면에만 표시하며 URL·공개 통계로 보내지 않는다.
- 변경 전 `backup/admin-save-before-20261117-5842170`: **226파일·6,553,954바이트** 전체 격리 복원. 수정 소스 `backup/verified-admin-save-20261117-65b9fbd`: **226파일·6,558,370바이트** 전체 격리 복원. 지속 보존은 같은 저장소 Git 브랜치/커밋이며 임시 tar·고객 DB/Auth·비공개 메일 상태·이후 문서 갱신까지 포함하는 독립 외부 백업으로 표현하지 않는다.
- 복구는 `admin/quotes.html`, `admin/quotes.mjs`를 함께 되돌리고 고객 문서·이후 자동화·통계를 보존한다. 근거: `quote-admin-save-verification-20261117.json`, `evidence/quote-admin-save-isolated-20261117.jpg`.

## 22시대 운영 상태 읽기 점검

- 애플리케이션·권한·고객 자료·알림 상태를 수정하지 않고 기존 비공개 Apps Script의 실제 실행 표와 트리거를 확인했다. **18:13:06~22:23:06 KST의 시간 기반 `pollQuoteNotifications` 51회가 모두 완료**됐으며, 최신 실행은 1.721초였다. 22:23:08 로그는 `no-new-quotes`다. 모든 과거 실행이나 실제 신규 고객 메일 수신까지 검증한 것으로 표현하지 않는다.
- 기존 트리거 1개·시간 기반·표시 오류율 0%를 확인했다. 코드·OAuth·수신처·트리거·처리 위치·발송 대기 상태를 변경하지 않았고 수동 poll·시험 메일·견적·계약을 추가하지 않았다. 한도 부족 시 대기 보존·불확실 발송의 자동 중복 방지·동일 알림 번호 수동 복구·접수 저장 분리 처리가 기존 코드에 있음을 확인했고 수정이 필요한 오류를 발견하지 않았다.
- 현재 정상 소스 `505c49946abff316978b278f332da036787af8e4` 기준 운영 주요 파일 10개가 HTTP 200·Git 원본과 일치했다. 기존 PR #67의 294개 통과 소스는 동일해 전체 검사를 반복하지 않았다. 같은 소스 이후 블로그 사례 동기화 예약 run `44072450498`, `44080414112`도 성공했으며 해당 workflow는 변경하지 않았다.
- 첫 예약 백업 확인 task는 활성 상태이며 다음 점검 **2026-11-18 08:30 KST**, 실행 이력 없음으로 확인했다. 이 조회는 예약 설정·활성 상태·기존 매일 08시 백업을 바꾸지 않았다. 미래 실행이나 복원 성공을 확인한 것이 아니다.
- 기존 정상 소스 백업 `backup/verified-retry-reference-20261117-cc17a97`와 222파일 복원 증거를 유지했다. 이번 변경은 읽기 점검 문서·개인정보 없는 화면 증빙뿐이며 앱 실행 파일을 배포하지 않는다. 근거: `quote-operations-health-20261117.json`, `private-email-alert-verification-20261117.json`, `evidence/mail-trigger-health-20261117.jpg`.

## 저장 실패 확인용 번호 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/67 — 병합 `cc17a9734ba9615444f83ef9d42a6cd8109bdb89`.
- 기존 오류는 ‘같은 접수번호’를 언급하면서 실제 번호를 보여주지 않았고, 번호 생성 전 오류도 구분하지 않았다. 생성된 ID만 **확인용 번호 (접수 완료 미확인)**로 표시하며 번호가 없으면 아직 만들지 못했다고 안내한다. 기존 ID가 있는 오프라인 재시도에서도 번호를 유지한다. 확인용 번호는 저장 성공이나 계약의 증거가 아니다. 서버 저장 확인 전 완료 화면을 열지 않으며 기존 입력·사진·같은 ID/스냅샷 재시도를 보존한다. 페이지를 새로 연 뒤 복구하는 기능은 추가하지 않았다.
- 수정 전 UI 40개 중 신규 3개 실패 재현 → 수정 후 UI 40개 포함 Node 201 + Firestore/REST 70 + Python 23 = **294개 통과, 실패·생략 0**. 권한 오류, ID 생성 전 실패, 최초 오프라인 및 미확인 신청의 오프라인 재시도를 포함한다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44069970379. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44070221811. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44070221127. 모두 성공.
- 격리 Chrome PC/390px에서 실제 form 원문과 로컬 응답/시험 계정 스텁으로 실패→확인용 번호 표시·완료 화면 숨김→Enter 재시도→성공 시 동일 번호·완료 제목 초점을 확인했다. 요청 2회·접수번호 1개·동일 스냅샷이며 모바일 문서/스크롤 폭 모두 375px. 합성 0 번호를 사용했으며 실제 Firebase·통계·메일·고객 접수를 만들지 않았다. 실물 휴대전화/Safari는 미검증이다.
- 실제 운영 미리보기의 새 모듈 `20261117-retryid1`·에어컨 맞춤 질문과 접수 버튼 비활성, 일반 운영의 온라인 접수 가능·서비스 12종·다음 버튼 활성 확인. 주요 파일 10개 HTTP 200·병합 소스와 바이트 일치. 운영 저장 실패를 일부러 일으키거나 새 접수·사진·메일·상담 발신을 만들지 않았다. 일반 운영 방문은 기존 page_view에 포함될 수 있는 내부 검토이며 고객 신청·계약이 아니다. 과거 통계 삭제·재작성 없음.
- 변경 파일: `quote/index.html`, `quote/quote-form.mjs`, `tests/quote-ui.test.cjs` 및 검증 문서/화면 증빙. 가격·계산기·사진·관리자·Firebase 규칙·회원·쿠폰·알림·Threads/블로그/백업 workflow·기존 예약 확인 task는 동일하다. 번호나 개인정보를 URL·통계에 추가하지 않았다.
- 변경 전 `backup/retry-reference-before-20261117-cdcb0da`: **222파일·6,445,569바이트** 전체 격리 복원. 수정 소스 `backup/verified-retry-reference-20261117-cc17a97`: **222파일·6,449,162바이트** 전체 격리 복원. 영구 보존 위치는 같은 저장소 Git 브랜치/커밋이며 임시 tar를 독립 영구 외부 백업으로 표현하지 않는다. 고객 DB/Auth·비공개 메일 상태 및 이 스냅샷 이후 문서 갱신은 포함하지 않는다.
- 복구는 `quote/index.html`, `quote/quote-form.mjs`를 함께 되돌리고 고객 자료·이후 자동화·통계를 보존한다. 근거: `quote-retry-reference-verification-20261117.json`, `evidence/quote-retry-reference-isolated-20261117.jpg`.

## 전화번호 붙여넣기 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/66 — 병합 `e96fe49ce2f27461f241de8c2c58d8bbdfa6d35d`.
- 공백이 포함된 기존 허용 형식의 휴대폰 번호가 저장 전에 거절됐다. 기존 maxlength 13에서는 공백·하이픈 혼합 표시가 길이 제한도 넘었다. 입력 제한을 20자로 조정하고 제출용 값을 읽을 때 공백만 제거한다. 화면 원문은 실패 후에도 유지하며 같은 접수번호·동일 스냅샷 재시도를 보존한다. 기존 번호 접두부·문자·구분자 검증과 서버 저장/권한·회원가입/쿠폰 연락처 처리는 변경하지 않았다. 과거 고객 번호도 재작성하지 않았다.
- 수정 전 UI 37개 중 신규 검사 2개 실패 재현 → 수정 후 UI 37개 포함 Node 198 + Firestore/REST 70 + Python 23 = **291개 통과, 실패·생략 0**. 일반 공백·NBSP·하이픈 혼합, 실패 후 원문 보존/동일 번호 재시도, 문자·잘못된 구분자·빈 번호 거부를 포함한다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44063826778. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44064153726. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44064152864. 모두 성공.
- 격리 Chrome PC/390px에서 실제 form 원문과 로컬 응답/시험 계정 스텁으로 합성 `010 - 0000 - 0000` 입력→전달 `010-0000-0000`→실패→Enter 재시도→완료를 확인했다. 각 요청 2회·접수번호 1개·동일 스냅샷이며 완료 제목으로 초점 이동. 모바일 문서/스크롤 폭 모두 375px. 실제 Firebase·전환 통계·메일·고객 접수를 만들지 않았다. 실물 휴대전화/Safari는 미검증이다.
- 실제 운영 미리보기에서도 새 모듈 `20261117-phone1`, 번호 제한 20자와 합성 공백 번호 입력을 확인했다. 미리보기 접수 버튼은 비활성이며 저장하지 않았다. 일반 운영의 온라인 접수 가능·서비스 12종 확인. 주요 파일 10개 HTTP 200·병합 소스와 바이트 일치. 일반 운영 열기는 기존 page_view에 포함될 수 있는 내부 방문이며 신청·계약이 아니다. 통계 삭제·재작성 없음.
- 변경 파일: `quote/index.html`, `quote/quote-form.mjs`, `tests/quote-ui.test.cjs`, 검증 JSON. 기존 계산기·가격·사진 압축·관리자·Firebase 규칙·회원·쿠폰·알림·Threads/블로그/백업 workflow·첫 예약 확인 task는 그대로 유지했다.
- 변경 전 `backup/phone-input-before-20261117-f1e1e49`: **220파일·6,368,639바이트** 전체 격리 복원. 수정 소스 `backup/verified-phone-20261117-e96fe49`: **221파일·6,374,352바이트** 전체 격리 복원. 영구 보존 위치는 같은 저장소 Git 브랜치/커밋이며 임시 tar를 독립 영구 백업으로 표현하지 않는다. 실제 업로드 ZIP에 대한 앞선 PR #65의 218파일 검증과는 다른 스냅샷이다.
- 복구는 `quote/index.html`, `quote/quote-form.mjs`를 함께 되돌리고 고객 자료·이후 자동화·통계를 보존한다. 근거: `quote-phone-verification-20261117.json`, `evidence/quote-phone-input-isolated-20261117.jpg`.

## 백업 런타임 경고 보완 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/65 — 병합 `71ef5afda739209104b524507696dc16a8c2fdcd`. 기존 성공 job은 Node.js 20 대상 checkout→24 강제 실행 경고 1개와 Ubuntu 레이블 전환 안내 1개가 있었다.
- 공식 `actions/checkout` v6.1.0 태그를 정확한 커밋 `d23441a48e516b6c34aea4fa41551a30e30af803`으로 확인했고, GitHub 서명 검증과 원본 action.yml의 `using: node24`를 확인했다. `runs-on`은 직전 실제 정상 job의 이미지와 같은 `ubuntu-26.04`로 명시했다. 새 OS로 바꾼 것이 아니라 자동 선택 레이블을 고정했다.
- 변경 파일은 `.github/workflows/source-backup.yml` 2줄뿐이다. 매일 08:00 KST·14일 보관·읽기 권한·인증 정보 미보존·checkout 깊이·실행 잠금·백업/복원/업로드 단계와 기존 임시 예약 확인 task를 유지했다. 홈페이지·회원·쿠폰·견적·고객 DB/Auth·메일·Threads·블로그 실행 파일은 변경하지 않았다. 기존 애플리케이션 288개 통과 소스는 동일해 전체 검사를 반복하지 않았다.
- PR 백업 검사 6개 통과: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44059063457. main push 검사 6개→압축→복원→업로드 성공: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44059187296. 두 job 모두 로그의 **경고 0·안내 0**이고 실제 성공 화면에서도 경고 항목이 없었다. runner 2.338.2·Ubuntu 26.04 확인. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44059187732 성공.
- GitHub artifact `14317271992`를 실제 다운로드했다. ZIP **4,977,602바이트**, SHA-256 `4428fbb17e1016ee5cbccefe21886dd6c4980e1f97d1a9b267926bd0c11abb9e`가 GitHub digest와 일치한다. 내부 tar **4,922,196바이트**, SHA-256 `7fa38a48bf4a868c5ec3fc041500e644dab6500984d6bdc55bea6e284ce1b5ae`. **218파일·6,291,560바이트** 전부 새 폴더에 복원한 뒤 Git blob·목록·실행 모드와 일치했다. 생성 **11월 17일 18:50:10 KST**, 만료 **12월 1일 18:50:09 KST**다.
- 변경 전 `backup/runtime-before-20261117-f0ac5d3`, 정상 소스 `backup/verified-runtime-20261117-71ef5af` 보존. 복구는 이 workflow의 두 런타임 설정만 되돌리며 이후 고객/자동화 자료·코드·통계를 과거로 덮어쓰지 않는다. 같은 저장소의 브랜치와 14일 artifact를 독립 영구 외부 백업으로 표현하지 않는다. 운영 복구·고객 DB/Auth 포함 없음.
- 이번 결과는 push이며 첫 미래 예약 성공을 뜻하지 않는다. 내일 08:30부터 시작하는 기존 임시 점검을 유지했다. 상세 근거: `source-backup-runtime-verification-20261117.json`, `evidence/source-backup-runtime-20261117.jpg`.

## 최신 GitHub 백업 산출물 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/64 — 병합 `2a65c08fb3befc0ea29b69e5dad1e2e9cd4175f5`. 변경은 `.github/workflows/source-backup.yml`의 `run-name` 한 줄이다. 실행 이름에 실제 트리거와 브랜치를 표시한다. 주기·권한·백업/복원 단계·14일 보관·홈페이지 실행 코드는 동일하다.
- PR 백업 검사 6개 통과: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44056023547. 최신 **push** 백업도 검사 6개→압축→격리 복원→artifact 업로드 전부 성공: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44056193089. 이 실행은 예약 실행이 아니다. 기존 애플리케이션 288개 통과 소스는 변경되지 않아 전체 검사를 반복하지 않았다.
- Artifact ID `14315507832`, ZIP **4,919,185바이트**, SHA-256 `677e9995efe801ef13e35a45c3dd91c4f6b9660ba5ff449583e5f3370b825d1a`. GitHub에서 실제 내려받은 ZIP의 해시가 GitHub 제공 digest와 일치했다. 구성은 `manifest.json`, `source.tar.gz` 두 파일이다. 생성 **2026-11-17 18:30:37 KST**, 만료 **2026-12-01 18:30:36 KST**로 확인했다.
- 내부 tar **4,864,325바이트**, SHA-256 `28920c8db2db5bab6dc121f0a606ab44c8e6734db81048f1d5d65dd1cc3b55af`. 새 폴더에 **216파일·6,207,905바이트** 전부 복원한 뒤 해당 커밋의 Git blob·파일 목록·실행 모드까지 대조해 일치했다. 현재 작업 폴더의 사본만 검사한 결과가 아니다.
- 지속 스냅샷 `backup/verified-artifact-20261117-2a65c08`, 변경 전 `backup/checkpoint-before-20261117-05596a2`를 보존했다. artifact는 14일 후 만료될 수 있고 같은 저장소의 Git 브랜치는 독립된 외부 백업이 아니다. 내려받은 ZIP·복원 폴더는 임시 검증 출력이다. 고객 DB·Auth·비공개 메일 상태는 포함하지 않았고 운영 복구·고객 자료 수정은 하지 않았다.
- 기존 매일 08시 견적·제품 백업 task와 다른 자동화는 변경하지 않았다. 첫 예약 결과만 확인하는 임시 점검을 **11월 18일 08:30부터 시간 간격, 최대 6회**로 등록했다. 첫 `schedule` 실행의 실제 artifact를 내려받아 같은 검증을 마친 경우에만 성공으로 보고하고 결과 확인 후 이 임시 점검만 종료한다. task 등록은 미래 실행 성공 증거가 아니다.
- 실제 job은 성공했으며 기존 checkout의 Node.js 20 대상→24 강제 실행 경고 1개와 Ubuntu runner 전환 안내 1개가 표시됐다. action 실행 버전은 이번 메타데이터 변경에서 수정하지 않았다. 상세 근거: `checkpoint-source-backup-verification-20261117.json`, `evidence/source-backup-checkpoint-20261117.jpg`.

## 예상 비용 계산 통계 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/63 — 병합 `19f9bc584ae1730ea2291e04ef40c2df58a88bea`.
- 에어컨 예상 비용 계산 후 기존 800ms 지연 안에 특수 주거 청소로 바꾸면 `quote_calculate`가 특수청소로 잘못 기록됐다. 지연 콜백에 계산 당시 서비스 ID를 넘겨 표시한 계산과 서비스 분류를 일치시켰다. 다른 이벤트의 기본 현재 서비스, 기존 중복 억제 시간·형식·가격·저장·미리보기/시험 제외를 유지했다. 과거 통계는 수정하지 않았다.
- 수정 전 UI 34개 중 신규 서비스 전환 검사 1개 실패 재현. 수정 후 UI 34개 포함 Node 195 + Firestore/REST 70 + Python 23 = **288개 통과, 실패·생략 0**. 연속 수량 변경 계산 이벤트 1회, 미리보기·관리자 시험의 지연 계산 전송 차단 회귀도 포함한다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44049694349. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44049927956. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44049927356. 모두 성공.
- 격리 Chrome PC와 390px iframe에서 실제 form 원문·브라우저 타이머로 에어컨 계산→특수청소 전환→에어컨 계산 이벤트 1회 기록을 확인했다. 통계·저장은 로컬 스텁이고 실제 전환을 생성하지 않았다. 모바일 문서 폭·스크롤 폭은 모두 375px였다. 화면의 검사 패널은 개발 검증용이며 운영 화면 추가가 아니다.
- 운영 미리보기에서 벽걸이 에어컨 2대의 기존 참고 금액 200,000원부터 표시와 특수청소 전환 후 맞춤 질문·현장 확인 비용 안내를 확인했다. 일반 운영의 접수 가능·서비스 12종·새 모듈 `20261117-calculate1` 확인. 운영 주요 파일 10개 HTTP 200·병합 소스와 바이트 일치. 견적·사진·계약·메일·상담 발신·계산 전환 이벤트는 추가하지 않았다. 일반 운영 열기는 기존 page_view에 포함될 수 있는 내부 방문이며 신청·계약이 아니다. 과거 통계 삭제·재작성 없음.
- 변경 파일: `quote/quote-form.mjs`, form 캐시 버전용 `quote/index.html`, `tests/quote-ui.test.cjs`, 검증 JSON. 기존 사진 압축·가격·회원·쿠폰·서버 접수·Firebase 규칙·관리자·알림·Threads/블로그/백업 workflow는 이 PR에서 변경하지 않았다.
- 변경 전 `backup/calculate-event-before-20261117-8946b4f`: **214파일·6,133,648바이트** 전체 격리 복원. 수정 정상 버전 `backup/verified-calculate-20261117-19f9bc5`: **215파일·6,139,426바이트** 전체 격리 복원. 영구 보존은 Git 브랜치·커밋이며 임시 tar를 독립 영구 백업으로 표현하지 않는다.
- 복구는 `quote/index.html`, `quote/quote-form.mjs` 두 파일을 함께 되돌리며 이후 자동화·고객 문서·과거 통계를 보존한다. 실제 휴대전화/Safari 미검증. 근거: `quote-calculate-verification-20261117.json`, `evidence/quote-calculate-service-isolated-20261117.jpg`.

## 사진 압축·실패 복구 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/62 — 병합 `f04abc238aeda60d7adceb072e2fcc9b64ae2cc2`.
- 기존 압축은 너비만 제한해 세로로 긴 사진의 높이가 커졌고, `data:,`·PNG 대체 등 짧은 오류 결과가 첨부 성공으로 반환될 수 있었다. 새 압축은 긴 변을 1280 이하로 줄이고 JPEG 서두·base64 형태·기존 160,000자 한도를 확인한다. 읽기·변환 실패는 한국어 재시도 안내로 처리한다. 기존 10MB·4800만 화소·5장 기준과 6회 압축 재시도는 유지했다.
- 수정 전 새 압축기 검사 7개 중 6개 실패 재현. 수정 후 압축기 7개·UI 31개 포함 Node 192 + Firestore/REST 70 + Python 23 = **285개 통과, 실패·생략 0**. 사진 묶음 실패 시 기존 사진·연락처 보존, 재선택 후 정상 제출, 압축 대기 중 제출 차단도 검증했다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44046832536. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44047081315. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44047079816. 모두 성공.
- 격리 Chrome PC/390px에서 실제 브라우저 디코더·canvas로 기존 공개 작업 사진 720×1280→720×1280 JPEG(75,587자), 합성 세로 사진 320×12,000→34×1280 JPEG(12,207자), 손상 사진 한국어 거부를 각각 확인했다. 출력 JPEG를 다시 디코딩해 크기도 확인했다. 모바일 문서·스크롤 폭은 모두 390px. 운영 미리보기에서도 실제 파일 선택기로 공개 작업 사진을 선택해 같은 JPEG 압축 결과를 확인했다. 미리보기 접수 버튼은 비활성이고 연락처를 입력하지 않았다.
- 실제 운영 주요 파일 10개 HTTP 200·병합 소스와 바이트 일치. 일반 운영 접수 가능·서비스 12종·새 form 버전 확인. 관리자 공용 사진 import와 HTML 모듈의 새 버전도 HTTP로 확인했다. 새 견적·사진 저장·메일·상담 메시지·전화는 만들지 않았다. 일반 운영 페이지 열기는 기존 page_view에 포함될 수 있는 내부 점검 방문이며 고객 신청·계약이 아니다. 통계 삭제·재작성 없음.
- c799d04에 이미 포함된 다른 작업의 Threads 개선을 보존했다. 계산기·가격·회원·쿠폰·서버 접수·Firebase 규칙·알림·기존 게시/백업 workflow는 이 PR에서 변경하지 않았다. 변경 파일은 `quote/photos.mjs`, 공용 import/cache 버전용 `quote/quote-form.mjs`, `quote/index.html`, `admin/quotes.mjs`, `admin/quotes.html`, 테스트 3개, `package.json`, 검증 JSON이다. 별도 증빙 문서·화면 갱신이 뒤따른다.
- 변경 전 백업 `backup/photo-compression-before-20261117-c799d04`: **211파일·6,056,634바이트** 전체 격리 복원. 수정 정상 버전 `backup/verified-photo-20261117-f04abc2`: **213파일·6,068,308바이트** 전체 격리 복원. Git 브랜치·커밋이 지속 보존 위치이며 임시 tar를 독립 영구 백업으로 표현하지 않는다. 고객 DB·Auth 복구는 수행하지 않았다.
- 복구 시 `quote/photos.mjs`, `quote/quote-form.mjs`, `quote/index.html`, `admin/quotes.mjs`, `admin/quotes.html` 다섯 파일을 함께 되돌린다. 이후 자동화 자료·고객 문서는 유지한다. 실제 휴대전화/Safari는 미검증이고, 기존 4800만 화소 검사는 디코딩 후 적용하므로 사전 디코딩 자원 한도 보장을 주장하지 않는다. 근거: `quote-photo-verification-20261117.json`, `evidence/quote-photo-compression-isolated-20261117.jpg`.

## 접수 완료·재시도 동선 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/61 — 병합 `28205a6d12322e3834d1e6c52b406ab9d26db370`.
- 서버 접수 확인 후에도 남던 저장 중 상태를 해제했다. 저장 중 이탈 보호는 유지하고 완료 후에는 경고를 만들지 않는다. 별도 완료 표식으로 완료 후 추가 submit·완료 통계 중복을 차단하며, 확인을 마친 연락처 스냅샷은 메모리에서 해제한다. 저장 방식·서버 접수증 재조회는 바꾸지 않았다.
- 성공 시 완료 제목으로 초점 이동 후 Tab으로 상담 링크에 접근한다. 실패 시 입력·사진·같은 접수번호를 유지하고 재시도 버튼에 초점을 둔다. 신규 4개 검사를 포함해 UI 29개, 전체 Node 183 + Firestore/REST 70 + Python 23 = **276개 통과, 실패·생략 0**.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44039738581. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44040358072. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44040356754. 모두 성공.
- Chrome PC 및 390px iframe에서 합성 입력·메모리 응답으로 실패→활성 재시도 버튼 초점→Enter로 같은 번호 재시도(각 요청 2회·번호 1개)→완료 제목 초점→Tab으로 카카오톡 링크 이동을 확인했다. PC 완료 화면에서 다른 페이지로 실제 이동했고 이탈 확인창이 없었다. 모바일 문서 폭·스크롤 폭은 모두 375px였다. 실물 휴대전화·스크린리더 시험은 수행하지 않았다.
- 실제 운영 URL에서 접수 가능·기존 서비스 12종·새 form 버전·완료 제목 속성을 읽기 확인했다. 주요 파일 8개 HTTP 200·병합 원본과 바이트 일치. 새 고객/시험 견적·사진·메일·카카오톡 메시지·전화는 생성·발신하지 않았다. 일반 운영 페이지 열기는 기존 page_view에 포함될 수 있는 내부 점검 방문이며 고객 신청·계약으로 해석하지 않는다. 통계 문서 삭제·재작성은 하지 않았다.
- 기존 계산기·가격·회원·쿠폰·관리자·권한·알림·게시 및 백업 workflow는 그대로 유지했다. 변경 전 백업: `backup/receipt-completion-before-20261117-dd6e4f6`. 정상 소스: `backup/verified-receipt-completion-20261117-28205a6`, **193파일·5,875,754바이트** 격리 복원 통과.
- 이 변경 복구는 `quote/index.html`, `quote/quote-form.mjs`를 함께 되돌린다. 고객 자료·접수번호·후속 자동화 자료는 보존한다. 증거: `quote-completion-verification-20261117.json`, `evidence/quote-completion-mobile-isolated-20261117.jpg`.

## 관리자 동시 수정 복구 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/59 — 병합 `695fbaae30cbb1592ae079972d9b16056be9bccc`.
- 열린 접수의 서버 버전이 달라져도 작성 중인 상태·금액·메모는 유지하고 갱신 안내를 표시한다. 최신 내용으로 재열기 전에 입력 초기화를 확인하며 취소하면 입력을 유지한다. 확인하면 클릭 시점의 최신 버전으로 다시 연다. 이전 버전 저장은 서버 호출 전에 차단하고 기존 transaction 충돌 보호도 유지한다.
- 수정 전 신규 검사 3개 실패 → 관리자 DOM 17개 통과. 전체 Node 179 + Firestore/REST 70 + Python 23 = **272개 통과, 실패·생략 0**. 알림 실패·재시도·로그아웃·이전 세션 응답 폐기·권한 검사도 유지한다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44036124320. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44036621727. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44036620761. 모두 성공.
- Chrome의 격리 메모리 backend와 합성 `test:true` 접수로 메모·금액 유지, 오래된 저장 0회, native 확인창 취소 후 보존, 확인 후 최신 상태·금액·메모 로딩, 최신 내용에서 정상 저장 1회를 확인했다. 이 저장은 메모리에만 발생하며 Firebase 고객 자료를 변경하지 않는다. 격리 화면은 관련 없는 패널을 숨긴 QA 배치이며 운영 CSS 변경이 아니다.
- 실제 운영 관리자 화면은 기존 Google 세션으로 서버 목록 연결과 새 모듈 버전을 읽기 확인했다. 추가 로그인 입력·OAuth 권한·시험 접수·사진·메일·고객 수정·알림 수동 재시도·만료 삭제는 수행하지 않았다. 고객 집계·개인정보는 공개 기록에 싣지 않는다.
- 운영 주요 파일 8개 HTTP 200·병합 소스와 바이트 일치. 고객 견적·가격·회원·쿠폰·Firebase 규칙·메일 및 게시·백업 workflow는 변경하지 않았다.
- 변경 전 백업: `backup/admin-refresh-before-20261117-c3fc185`. 정상 소스: `backup/verified-admin-refresh-20261117-695fbaa`. 해당 커밋의 임시 tar에서 **191파일·5,792,212바이트** 전부 격리 복원 검증. 고객 DB·Auth 복원이 아니다.
- 복구 시 `admin/quotes.html`, `admin/quotes.mjs`를 함께 되돌린다. 고객 문서·Firebase 권한·후속 자동화 자료는 보존한다. 상세 근거: `quote-admin-refresh-verification-20261117.json`, `evidence/quote-admin-refresh-isolated-20261117.jpg`.

## 한글 입력 확정 후속 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/58 — 병합 `a3c98a83c55e5aef268d40db428c48f7036efc57`.
- 기존 작업 단계 Enter 처리에서 조합 종료 뒤 `isComposing=false`·`keyCode=229`인 이벤트가 일반 Enter로 처리됐다. 조합 중 상태·229를 확인하고, 조합 확정 키는 그대로 두며 해당 키에서 생기는 submit만 억제한다. 확정 후 일반 Enter·명시적 접수·중복 방지·실패 후 같은 번호 재시도는 기존대로 동작한다.
- 수정 전 신규 합성 이벤트 검사 3개 실패 재현 → 수정 후 UI 25개 통과. 전체 Node 176 + Firestore/REST 70 + Python 23 = **269개 통과, 실패·생략 0**. PR·main 모두 성공. 실제 Safari·물리 IME 시험은 수행하지 않았다.
- PR CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44031354119. main CI: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44031593651. Pages: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44031593101.
- 운영 PC 및 실제 운영 URL을 연 390px iframe에서 한글 작업 입력·일반 Enter의 연락처 단계 진행·이전/다음 후 작업 및 연락처 입력 보존을 확인했다. iframe 문서 폭 375px·스크롤 폭 375px로 가로 넘침 없음. 미리보기의 접수 버튼은 비활성이며 운영 접수·사진·메일을 추가하지 않았다. 일반 운영 견적 화면의 온라인 접수 가능 안내도 별도 확인했다.
- 운영 주요 파일 7개 HTTP 200·병합 Git 소스와 바이트 일치. `quote/index.html`은 form 모듈 캐시만 갱신하며 `quote/quote-form.mjs`의 입력 이벤트를 수정했다. 가격·기본 검증·서버 저장·회원·쿠폰·게시 및 백업 workflow는 변경하지 않았다.
- 변경 전 백업: `backup/ime-input-before-20261117-c7e2c73`. 수정된 정상 소스: `backup/verified-ime-20261117-a3c98a8`. 후자는 임시 tar에서 **189파일·5,743,778바이트** 전부 격리 복원 검증했다. 고객 DB·Auth 복원을 뜻하지 않는다.
- 복구 시 `quote/index.html`과 `quote/quote-form.mjs`를 함께 되돌리며 고객 접수·이후 자동화 자료를 보존한다. 증거: `quote-ime-validation-20261117.json`, `evidence/quote-ime-mobile-20261117.jpg`.

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

최신 PR #61 변경 파일은 `quote/index.html`, `quote/quote-form.mjs`, `tests/quote-ui.test.cjs`, `ops/quote-completion-verification-20261117.json`이다. 배포 후 검증 기록은 해당 JSON·본 결과 문서·복구 안내서·`ops/evidence/quote-completion-mobile-isolated-20261117.jpg`에 보완했다. PR의 전체 diff: https://github.com/okclean-kr/okclean-kr.github.io/pull/61/files.

이번 PR #51은 `notifications/apps-script/Code.gs`, `notifications/apps-script/appsscript.json`, `notifications/apps-script/README.md`, `tests/mail-notifications.test.cjs`, `tests/mail-notifications-rest.test.mjs`, `package.json`, `.github/workflows/quote-checks.yml`, `ops/private-email-alert-verification-20261117.json`을 변경했다. PR #52는 `admin/quotes.html`의 알림 안내와 실제 연결 증거 JSON, 본 결과 문서를 갱신한다. 관리자 기존 기능 DOM 검사 14개도 통과했다.

견적 본체 변경은 `quote/`, `admin/quotes.html`, `admin/quotes.mjs`와 기존 홈페이지·통계 연결에 반영돼 있다. 이번 메일 작업에서 홈페이지 실행 코드·Firebase 규칙·요금제·고객 자료·블로그·Threads 자동화는 변경하지 않았다.

## 최신 정상 소스 복구 검증

- 지속 스냅샷: `backup/verified-release-20261117-755805d` / `755805d2c91adcf1f4023474627cc5eab72db622`.
- 격리 Git bundle clone·checkout·strict fsck, 182개 파일과 실행 모드 전부 일치. 전체 142커밋 이력 확인. 주요 스크립트 5개 문법 검사 통과. 운영 복원·고객 데이터 쓰기 없음.
- 기존 Google 관리자 서버 목록 연결과 14:43:06 KST의 실제 예약 메일 회차 완료를 확인. 트리거 1개·표시 오류율 0%. 추가 시험 메일·견적은 만들지 않았다. 고객 집계·개인정보는 공개 기록에 넣지 않는다.
- 기존 게시 자동화와 분리한 `source-backup.yml`을 추가했다(PR #57). 공개 Git 소스만 매일 08:00 KST 요청·14일 artifact 보관, 매회 격리 복원 후 업로드한다. 신규 백업 검사 6개는 PR·main에서 모두 통과했다. 홈페이지 기능 소스는 변경하지 않았다. 첫 main push 실행과 향후 예약 실행은 구분한다.
- 첫 실제 main 백업: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44028168716 — 성공. Pages https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44028168309 성공. 커밋 `8b5246d137cc97fb27e50ecae94097dc98c07669`와 `backup/verified-source-20261117-8b5246d`에 보존.
- GitHub artifact `14304226758`을 실제 내려받아 ZIP digest 일치·188파일 5,733,112바이트 복원·Git blob 대조 전부 통과. ZIP은 4,655,144바이트이며 생성 2026-11-17 15:01:38 KST, 만료 2026-12-01 15:01:38 KST. 운영 데이터 복구는 하지 않았다.
- 다음 예약 요청 시각은 2026-11-18 08:00 KST다. 첫 미래 예약 회차는 아직 검증하지 않았다. GitHub 시간 지연·비활성 중지 가능성과 수동 실행·복구 방법은 복구 안내서에 기록했다.
- 세부 근거: `release-source-restore-verification-20261117.json`, `verified-release-recovery-20261117.md`. 고객 DB·Auth와 비공개 메일 상태는 소스 백업 대상이 아니다.

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
