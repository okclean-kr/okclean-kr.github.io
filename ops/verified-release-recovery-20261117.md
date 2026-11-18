# 현재 정상 소스의 백업·복구 검증

## 2026-11-18 홈페이지 예상 비용 집계 복구

- 변경 전 `backup/home-calculation-before-20261118-2ccc6de`와 배포 소스 `backup/verified-home-calculation-20261118-b7ebc36`를 복구 기준점으로 보존했다. 각 공개 Git 소스 236개 파일의 격리 복원을 확인했다.
- 집계 연동을 복구해야 하면 PR #71의 `index.html`, `app.js`, `analytics.js` 변경을 함께 되돌린다. 뒤에 적용한 변경이 있으면 세 파일의 차이를 비교하고 관련 부분만 되돌린다. 복구 후 통계를 끈 미리보기에서 표시 금액과 상세 견적 링크를 확인한다. [검증 기록](home-calculation-verification-20261118.json)

## 2026-11-18 견적 상담 화면 복구

- 변경 전 `backup/quote-contact-before-20261118-d83ac46`와 배포 소스 `backup/verified-quote-contact-20261118-5e135c9`를 같은 저장소의 복구 기준점으로 보존했다. 각각 234개 파일 전체의 격리 복원을 확인했다. 검증 범위는 공개 Git 소스다. [검증 기록](quote-contact-verification-20261118.json)
- 이번 화면만 복구하려면 PR #70에서 바뀐 `quote/index.html`과 `quote/quote-form.mjs`를 함께 되돌린다. 이후 변경이 있으면 먼저 차이를 확인하고 해당 상담 화면 변경만 취소한다. 배포 뒤 운영 미리보기에서 기존 상담 버튼과 접수 비활성 상태를 확인한다.

## 2026-11-18 첫 예약 소스 백업 검증

- 2026-11-18 08:41:46 KST에 생성된 첫 예약 실행 `44201605700`(`schedule`, 최초 시도)이 성공했다. 08:00 예약 시각과 실제 실행 시각은 약 42분 차이가 났다. 백업 검사 6개, 압축, 격리 복원, 산출물 업로드 단계가 모두 성공했다. [GitHub 실행 기록](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700) · [작업 상세](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700/job/134456840661)
- 산출물 `14382050626`는 2026-11-18 08:41:56 KST에 생성됐고 2026-12-02 08:41:55 KST에 만료된다. 내려받은 ZIP은 **5,283,402바이트**이며 SHA-256 `06566358385ab333a512cc896013798dfa38231714857f51fa8b314bcb4ed075`가 GitHub 기록과 일치했다. 내부는 `manifest.json`과 `source.tar.gz` 두 파일이다. [백업 ZIP](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44201605700/artifacts/14382050626)
- 별도 빈 폴더에 **233개 파일·6,755,670바이트**를 복원했다. 커밋 `6806ed480e6b25cdcb845abc6b1ea78f28adc250`의 파일 목록·내용·Git 파일 모드와 모두 일치했다. 내부 압축 파일 SHA-256은 `19a2bdf8a6a33d5ab7dab4a29bffbdd8ed49bc66c7d6c150464e3f73e2ef6baf`다. 검증 범위는 공개 Git 소스다. [검증 기록](first-scheduled-source-backup-verification-20261118.json)

복구할 때는 해당 [Git 커밋](https://github.com/okclean-kr/okclean-kr.github.io/tree/6806ed480e6b25cdcb845abc6b1ea78f28adc250)이나 위 백업 ZIP을 사용한다. ZIP을 풀어 두 파일을 준비한 뒤 이 커밋의 검증 도구로 빈 폴더에 복원한다.

```sh
python3 scripts/source_backup.py --verify source.tar.gz --manifest manifest.json --restore ./restored-source
```

운영 소스는 복원한 파일과 현재 main의 차이를 검토한 뒤 필요한 변경만 되돌린다. 이 절차의 범위는 공개 Git 소스다.

2026년 11월 17일 운영 소스 커밋 `755805d2c91adcf1f4023474627cc5eab72db622`를 `backup/verified-release-20261117-755805d` 브랜치에 보존했다. 견적 입력 오류 개선 PR #56까지 포함하는 버전이다. 이후 PR #57에서는 공개 소스 백업 job과 검증 도구·문서를 추가했다. 홈페이지·견적·회원·관리자 실행 코드는 바꾸지 않았다. 아래 기존 정상 버전의 Git 이력 복원과 PR #57의 실제 artifact 복원은 별도로 검증했다.

## 실제 수행한 검증

- 소스 Git bundle을 만들고 `git bundle verify`를 통과했다.
- 별도 임시 폴더에서 bundle을 clone하고 지정 커밋으로 checkout했다. 운영 서버를 덮어쓰지 않았다.
- 추적 파일 **182개, 5,644,678바이트** 전부를 Git 원본 blob과 비교했고 내용·실행 권한이 일치했다. 전체 이력과 `git fsck --strict` 검사도 통과했다.
- 견적 core·form·사진 처리·관리자·백업 주요 스크립트 5개의 `node --check` 문법 검사를 통과했다.
- PR #56의 266개 검사 통과 이후 기능 코드가 달라지지 않았음을 확인했다. 문서·읽기 전용 점검 때문에 동일한 전체 검사를 다시 실행하지 않았다.
- 기존 Google 관리자 로그인 후 서버 접수 목록과 브라우저 알림 연결을 확인했다. 고객 건수·개인정보는 이 공개 문서와 화면 증빙에 포함하지 않았다.
- 기존 이메일 트리거는 1개, 표시 오류율 0%였다. 14:43:06 KST 실제 시간 기반 실행이 1.694초로 완료됐고 로그를 별도로 확인했다. 수동 poll을 예약 실행으로 보고하지 않았다. 시험 메일·견적을 추가로 만들지 않았다.

전체 파일별 SHA-256과 Git blob은 `release-source-restore-verification-20261117.json`에 기록했다. 개인정보와 고객 집계가 없는 관리자 연결 화면은 `evidence/quote-admin-connection-audit-20261117.jpg`에 보존했다.

## 2026-11-18 글꼴 로딩 개선 후 최신 정상 소스

PR #69 병합 `018083bca4bcfbec9f712871cca9efcf2796dc84`를 `backup/verified-font-20261118-018083b`에 보존했다. 임시 tar **5,158,940바이트**, SHA-256 `75acf2c752573550578c61b6012bcf4643d37dbc7e47c4a55a47648da4804a97`에서 **228파일·6,641,241바이트** 전부 격리 복원 일치했다. 변경 전 `backup/font-before-20261118-0167748` / `016774807e1197a7ba9437394778dc6155f481ad`도 **228파일·6,641,014바이트** 복원했다. 변경 전 tar **5,158,900바이트**, SHA-256 `054641f86cc654ab33d9898af2cbeb41ead4ec91a23e0ccfa1b5f0561a3e3772`다.

이 변경만 복구할 때는 현재 main의 새 브랜치에서 index.html의 글꼴 link/noscript 두 줄 변경만 되돌린다. 위 변경 전 스냅샷을 기준으로 하되, 이후 홈페이지 내용이 바뀌었다면 index.html 전체를 과거로 덮어쓰지 않는다. 가격·계산기·회원·쿠폰·관리자·서버 저장/규칙·기존 자동화는 이 PR에서 수정하지 않았다. 고객 문서·통계·후속 코드도 보존한다.

기존 297개 검사·PR CI·main·Pages 성공, Chrome PC/390px의 정상 글꼴과 로컬 글꼴 실패에서 계산·상세 견적 진입·가로 넘침 없음 확인. 운영 통계 미수집 미리보기에서 새 글꼴 적용·계산 결과·기존 링크/혜택과 주요 파일 10개 소스 일치를 확인했다. 실제 고객 접수·메일·계약은 생성하지 않았다. 속도 향상 수치나 실측 LCP/FCP/CLS 개선은 검증하지 않았다. 지속 보존은 같은 저장소 Git이며 임시 tar를 독립 외부 백업으로 보고하지 않는다. 고객 DB/Auth·비공개 메일 상태·이후 문서 갱신 포함 없음. 근거: `home-font-verification-20261118.json`.

## 관리자 저장 안내 개선 후 최신 정상 소스

PR #68 병합 `65b9fbd427903d89144d5d019591bfcc9ab8b792`를 `backup/verified-admin-save-20261117-65b9fbd`에 보존했다. 임시 tar **5,098,835바이트**, SHA-256 `9c53b9ae01979f8036317adfcfb6126ca8e43d9b44badfe73fd3c9cf57c6d47d`에서 **226파일·6,558,370바이트** 전부 격리 복원 일치했다. 변경 전 `backup/admin-save-before-20261117-5842170` / `5842170fc19b75163ebd3d14f54f2a4322ca2553`도 **226파일·6,553,954바이트** 복원했다. 변경 전 tar **5,098,216바이트**, SHA-256 `4c32af35dcc6d947fa23c1b31a7570a5a2f1e359206cdaee0325b2ebd7349491`다.

이 변경만 복구할 때는 변경 전 브랜치에서 `admin/quotes.html`, `admin/quotes.mjs`를 함께 가져온다. 저장 성공 안내를 목록 밖에서 유지하고 응답 뒤에만 표시하도록 수정했으며 세션 변경 시 옛 안내를 버린다. 기존 트랜잭션·권한·고객 접수/사진·회원·쿠폰·가격·알림·다른 자동화는 변경하지 않았다. 이후 고객 문서·통계·자동화 코드를 과거로 덮어쓰지 않는다.

297개 검사·PR CI·main·Pages 성공, PC/390px 격리 응답에서 저장 대기→실패 시 초안 보존→동일 초안 재시도→저장 후 목록 갱신에도 접수번호별 안내·초점을 확인했다. 운영에서는 새 모듈/상태 영역·기존 관리자 연결과 주요 파일 원본 일치만 읽기 확인했고 고객 상태·메모·금액·계약·메일을 추가하거나 수정하지 않았다. 같은 저장소 Git 브랜치와 임시 tar를 독립 외부 백업으로 보고하지 않으며 고객 DB/Auth·비공개 메일 상태·이후 문서 갱신도 포함하지 않는다. 근거: `quote-admin-save-verification-20261117.json`.

## 저장 실패 확인용 번호 개선 후 최신 정상 소스

PR #67 병합 `cc17a9734ba9615444f83ef9d42a6cd8109bdb89`를 `backup/verified-retry-reference-20261117-cc17a97`에 보존했다. 임시 tar **5,028,275바이트**, SHA-256 `d5d289561ad1f957232dbcb3f8cd654e8a5dac62b7c21475eb9944c408df136f`에서 **222파일·6,449,162바이트** 전부 격리 복원 일치했다. 변경 전 `backup/retry-reference-before-20261117-cdcb0da` / `cdcb0da6162c743c40635f9758f5e1ff473381bb`도 **222파일·6,445,569바이트** 복원했다. 변경 전 tar **5,027,630바이트**, SHA-256 `7eafc7dd3c1ea12d204a02f754ed76492b8d802d55d8c63edd2e6c7605299ab7`다.

이 변경만 복구할 때는 변경 전 브랜치에서 `quote/index.html`, `quote/quote-form.mjs`를 함께 가져온다. 실패 문구의 확인용 번호 표시만 추가했으며 생성되지 않은 번호를 만들지 않는다. 기존 저장 확인·입력/사진 보존·같은 ID 재시도·가격·회원·쿠폰·권한·알림·다른 자동화는 변경하지 않았다. 이후 고객 자료·통계·자동화 코드를 과거로 덮어쓰지 않는다.

294개 검사·PR CI·main·Pages 성공, PC/390px 격리 응답에서 실패→미확인 번호→같은 번호 재시도→성공 시 같은 번호와 완료 초점을 확인했다. 운영에서는 새 모듈·맞춤 질문·접수 가능·서비스 12종 및 주요 파일 10개 원본 일치만 확인했고 접수·사진·메일은 추가하지 않았다. Git 브랜치는 같은 저장소의 지속 스냅샷이며 독립 외부 백업이 아니다. 고객 DB/Auth·비공개 메일 상태·이후 문서 갱신을 포함하지 않는다. 근거: `quote-retry-reference-verification-20261117.json`.

## 전화번호 입력 개선 후 최신 정상 소스

PR #66 병합 `e96fe49ce2f27461f241de8c2c58d8bbdfa6d35d`를 `backup/verified-phone-20261117-e96fe49`에 보존했다. 임시 tar **4,974,881바이트**, SHA-256 `0b6dfc1d81a58b735375d52d2fed8b5ef9c77dc8a52b8879021c0de1c5757b67`에서 **221파일·6,374,352바이트** 전부 격리 복원 일치했다. 변경 전 `backup/phone-input-before-20261117-f1e1e49` / `f1e1e49a2e9ccfd5d9e9f6f5f7b331c4b1354c4c`도 **220파일·6,368,639바이트** 전부 복원했다. 변경 전 tar **4,973,365바이트**, SHA-256 `7b91b214dbc1431656114f2ff61d6b4122bacf63cde6d8f4e28959d6fc32efba`다.

이 변경만 복구할 때는 변경 전 브랜치에서 `quote/index.html`, `quote/quote-form.mjs`를 함께 가져온다. 수정은 전화번호 입력 여유와 제출 직전 공백 정리이며 실패 시 원문·같은 번호 재시도를 유지했다. 기존 고객 연락처·회원가입/쿠폰 형식·가격·사진·권한·관리자·알림·게시/백업 workflow를 변경하지 않았다. 이후 고객/자동화 자료·통계·코드를 과거로 덮어쓰지 않는다.

CI 291개·main·Pages 성공. Chrome PC/390px 격리 실제 form에서 공백 혼합 번호의 정리·실패·Enter 동일 신청 재시도·완료를 확인했고, 운영 미리보기의 새 입력 제한과 일반 접수 가능·주요 파일 10개 원본 일치도 확인했다. 새 운영 견적·사진·메일·계약은 만들지 않았다. Git 브랜치는 같은 저장소의 지속 스냅샷이며 임시 tar·고객 DB/Auth·비공개 메일 상태·이후 문서까지 포함하는 독립 영구 외부 백업이 아니다. 앞선 실제 GitHub ZIP의 218파일 검증도 유지한다. 근거: `quote-phone-verification-20261117.json`.

## 경고 없는 백업 런타임의 최신 정상 소스

PR #65 병합 `71ef5afda739209104b524507696dc16a8c2fdcd`를 `backup/verified-runtime-20261117-71ef5af`에 보존했다. `.github/workflows/source-backup.yml`의 checkout을 공식 서명 확인한 v6.1.0 커밋 `d23441a48e516b6c34aea4fa41551a30e30af803`(Node.js 24)으로 고정하고, 직전 실제 정상 이미지와 같은 Ubuntu 26.04 레이블을 명시했다. 매일 08시·14일 보관·권한·인증 정보 미보존·백업/복원 단계·임시 예약 확인 task는 유지한다.

PR 검사 6개 및 main 검사·압축·복원·업로드 성공, 로그 경고 0·안내 0과 실제 성공 화면 확인. 실행은 https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44059187296 이며 `push`다. 첫 미래 예약 성공으로 보고하지 않는다. 홈페이지 기능 코드는 동일하고 기존 288개 통과 소스에 대한 전체 검사를 반복하지 않았다.

Artifact `14317271992`를 실제 내려받았다. ZIP **4,977,602바이트**, SHA-256 `4428fbb17e1016ee5cbccefe21886dd6c4980e1f97d1a9b267926bd0c11abb9e`가 GitHub digest와 일치한다. 내부 tar **4,922,196바이트**, SHA-256 `7fa38a48bf4a868c5ec3fc041500e644dab6500984d6bdc55bea6e284ce1b5ae`를 검사하고 **218파일·6,291,560바이트** 전부 새 빈 폴더에 복원한 뒤 Git 원본 blob·목록·실행 모드까지 일치했다. 생성 2026-11-17 18:50:10 KST, 만료 2026-12-01 18:50:09 KST다. 실제 ZIP 구성은 `manifest.json`, `source.tar.gz` 두 파일이다.

이 변경만 복구할 때는 `backup/runtime-before-20261117-f0ac5d3`에서 workflow의 checkout SHA와 runs-on 두 줄만 가져온다. 이후 코드·고객 문서·자동화·통계는 보존한다. Git 브랜치는 같은 저장소의 지속 스냅샷이며 독립 외부 백업이 아니다. artifact 14일 보관을 유지하고 임시 로컬 출력·고객 DB/Auth·비공개 메일 상태·이후 문서 갱신까지 포함한다고 주장하지 않는다. 근거: `source-backup-runtime-verification-20261117.json`.

## 최신 업로드 산출물의 실제 다운로드·복원 검증

PR #64 병합 `2a65c08fb3befc0ea29b69e5dad1e2e9cd4175f5`의 정상 소스를 `backup/verified-artifact-20261117-2a65c08`에 보존했다. 기존 `source-backup.yml`은 실행 유형/브랜치를 보여주는 `run-name` 한 줄만 추가했고 주기·권한·검증·보관을 유지했다. PR 검사 6개와 main push의 검사·압축·복원·업로드가 성공했다. 실제 실행: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44056193089.

GitHub artifact `14315507832`를 실제 내려받았다. ZIP **4,919,185바이트**, SHA-256 `677e9995efe801ef13e35a45c3dd91c4f6b9660ba5ff449583e5f3370b825d1a`가 GitHub digest와 일치한다. 내부 tar **4,864,325바이트**, SHA-256 `28920c8db2db5bab6dc121f0a606ab44c8e6734db81048f1d5d65dd1cc3b55af`를 검사하고 새 빈 폴더에 **216파일·6,207,905바이트** 전부 복원한 뒤 Git 원본 blob·파일 목록·실행 모드와 대조해 일치했다. 이 검증은 업로드된 실제 산출물을 대상으로 했으며 운영 소스를 덮어쓰지 않았다.

ZIP은 `manifest.json`, `source.tar.gz` 두 파일만 포함한다. 생성은 **2026-11-17 18:30:37 KST**, 만료는 **2026-12-01 18:30:36 KST**다. artifact는 기존 14일 보관이며 Git 브랜치는 같은 저장소의 지속 스냅샷이다. 임시 로컬 ZIP이나 같은 저장소 브랜치를 독립 영구 외부 백업으로 보고하지 않는다. 고객 DB/Auth·비공개 메일 상태를 포함하지 않고 이 스냅샷 뒤의 검증 문서 갱신도 포함하지 않는다.

이름 표시만 복구할 때는 `backup/checkpoint-before-20261117-05596a2`에서 `.github/workflows/source-backup.yml`의 `run-name` 줄만 되돌리거나 PR #64를 revert한다. 다른 게시 workflow·고객 자료·후속 코드·통계 문서를 과거로 덮어쓰지 않는다. 실제 job 성공과 별도로 기존 Node.js 20 대상 checkout 경고 및 runner 전환 안내가 남았고, 이번 변경은 action 버전을 수정하지 않았다.

이 실행은 `push`이며 첫 미래 `schedule` 실행은 아직 미검증이다. 기존 매일 08시 견적·제품 백업 task는 유지했다. 11월 18일 08:30부터 시간 간격·최대 6회의 임시 점검을 등록해 실제 첫 예약 run의 산출물까지 검증하고 결과 확인 후 그 점검만 종료하도록 했다. 등록 사실을 미래 실행 성공으로 표현하지 않는다. 근거는 `checkpoint-source-backup-verification-20261117.json`이다.

## 예상 비용 계산 통계 개선 후 최신 정상 소스

PR #63까지 포함한 정상 소스는 `backup/verified-calculate-20261117-19f9bc5` / `19f9bc584ae1730ea2291e04ef40c2df58a88bea`에 보존했다. 임시 tar에서 **215파일·6,139,426바이트** 전부 격리 복원했다. tar 4,815,736바이트, SHA-256 `81f96bbe177f574b9f327108605cbd3b0ff4c81ac2a4db93b79e90cfca5403e7`다. 변경 전 `backup/calculate-event-before-20261117-8946b4f` / `8946b4fe651c4a5b695863cb27613a01ab4c2b3d`도 **214파일·6,133,648바이트** 격리 복원했다. 변경 전 tar 4,814,488바이트, SHA-256 `f45a913ca5550b32797f1ab6fa611401f3b3ae829ae50befdac5953c8515b32b`다. Git 브랜치·커밋이 지속 보존 위치이며 임시 tar·고객 DB/Auth·이후 문서 갱신까지 포함하는 것으로 보고하지 않는다.

이 변경만 복구할 때는 변경 전 브랜치에서 `quote/index.html`, `quote/quote-form.mjs`를 함께 가져온다. 기존 사진 압축·가격·회원·쿠폰·접수번호·서버 저장·Firebase 규칙·알림·관리자·기존 자동화는 이 PR에서 변경하지 않았다. 과거 통계를 삭제·재작성하거나 고객 문서·이후 자동화 변경을 과거 소스로 덮어쓰지 않는다. CI 288개·main·Pages 성공, Chrome PC/390px 격리 form·실제 타이머에서 서비스 전환 후 계산 당시 서비스로 기록됨을 확인했다. 운영 미리보기의 기존 참고 금액·맞춤 질문, 일반 접수 가능·새 모듈 및 주요 파일 10개 원본 일치도 확인했다. 새 견적·사진·계산 전환·메일은 생성하지 않았다. 근거: `quote-calculate-verification-20261117.json`.

## 사진 압축 개선 후 최신 정상 소스

PR #62까지 포함한 정상 소스는 `backup/verified-photo-20261117-f04abc2` / `f04abc238aeda60d7adceb072e2fcc9b64ae2cc2`에 추가 보존했다. 임시 tar에서 **213파일·6,068,308바이트**를 전부 격리 복원했다. tar 4,770,832바이트, SHA-256 `fe1533f4836d1cfb413edc7f5fd794dddb54d0c846864f55200ddfba940e5ac1`다. 변경 전 `backup/photo-compression-before-20261117-c799d04` / `c799d043e38357363d632b4be9bab782e6507960`도 **211파일·6,056,634바이트** 격리 복원했다. 변경 전 tar 4,767,289바이트, SHA-256 `b86ef2b5725bc39a6fb8018a14c1c1ae8249d93de4ed41012b3915b414de8420`다. 영구 보존은 Git 브랜치·커밋이며 임시 tar나 이번 스냅샷 이후 문서까지 포함한다고 주장하지 않는다.

이 변경만 복구할 때는 변경 전 브랜치에서 `quote/photos.mjs`, `quote/quote-form.mjs`, `quote/index.html`, `admin/quotes.mjs`, `admin/quotes.html` 다섯 파일을 함께 가져온다. 관리자와 고객이 사진 압축기를 공유하므로 import 버전을 함께 맞춘다. 같은 시점의 회원·쿠폰·고객 자료·접수번호·Firebase 규칙·알림·기존 자동화는 이 PR에서 변경하지 않았다. c799d04의 다른 Threads 개선과 이후 자동화 변경도 보존한다. CI 285개·main·Pages 성공, 격리 Chrome PC/390px 실제 이미지 압축·손상 사진 거부와 운영 미리보기 파일 선택 압축을 확인했다. 운영 주요 파일 10개가 원본과 일치했다. 새 견적·사진·메일 저장이나 운영 복구는 수행하지 않았다. 근거는 `quote-photo-verification-20261117.json`이다.

## 접수 완료 개선 후 최신 정상 소스

PR #61까지 포함한 정상 소스는 `backup/verified-receipt-completion-20261117-28205a6` / `28205a6d12322e3834d1e6c52b406ab9d26db370`에 추가 보존했다. 임시 tar에서 193파일·5,875,754바이트를 전부 격리 복원했다. tar SHA-256은 `ecb16f2b1142c2497504cf5b57b914d4749002933e0f44d3809763be590374e0`다. 영구 보존은 Git 브랜치·커밋이며 임시 tar를 독립 영구 백업으로 표현하지 않는다.

이 변경만 복구할 때는 `backup/receipt-completion-before-20261117-dd6e4f6`에서 `quote/index.html`과 `quote/quote-form.mjs`를 함께 가져온다. 기존 서버 저장·접수증·고객 자료·회원·쿠폰·관리자·알림·게시 workflow를 초기화하지 않는다. 276개 검사·main·Pages 통과, PC/390px 격리 응답에서 실패→같은 번호 Enter 재시도→완료 제목→상담 링크 초점 및 PC의 경고 없는 이탈을 확인했다. 운영에서는 새 모듈·접수 가능 화면을 읽기 확인했고 접수는 추가하지 않았다. 상세 근거는 `quote-completion-verification-20261117.json`이다.

## 관리자 갱신 복구 개선 시점의 정상 소스

PR #59를 포함한 정상 소스는 `backup/verified-admin-refresh-20261117-695fbaa` / `695fbaae30cbb1592ae079972d9b16056be9bccc`에 추가 보존했다. 191개 파일·5,792,212바이트를 임시 tar에서 전부 격리 복원했다. tar SHA-256은 `76ad07ec3294121b93985e814345c2a8b8a02dd2f398f413a22ad6f68aa29c22`다. 영구 보존은 Git 브랜치·커밋이며 임시 tar를 별도 영구 보관으로 표현하지 않는다.

이 변경만 복구할 때는 `backup/admin-refresh-before-20261117-c3fc185`에서 `admin/quotes.html`과 `admin/quotes.mjs`를 함께 가져온다. 고객 견적·회원·쿠폰·메일·Firebase 규칙·기존 자동화는 이 PR에서 변경하지 않았다. CI 272개·main·Pages 통과, 격리 Chrome에서 동시 수정 시 입력 보존·취소·최신 내용 재열기·정상 저장을 확인했고 운영에서는 관리자 서버 연결을 읽기 확인했다. 동시 수정 시험은 실제 고객 문서에 수행하지 않았다. 근거는 `quote-admin-refresh-verification-20261117.json`이다.

## 한글 입력 개선 시점의 정상 소스

PR #58 입력 이벤트 개선을 포함한 정상 소스는 `backup/verified-ime-20261117-a3c98a8` / `a3c98a83c55e5aef268d40db428c48f7036efc57`에 추가 보존했다. 새 임시 tar에서 189개 파일·5,743,778바이트를 격리 복원해 검증했다. tar SHA-256은 `90cbe7b04c9e934ffce8a46d36568997a6ba8b09404bee96af7db33738eac281`이며 임시 파일을 독립 영구 백업으로 표현하지 않는다. 이전 스냅샷과 14일 artifact 보관도 유지한다.

이 변경만 복구할 때는 변경 전 `backup/ime-input-before-20261117-c7e2c73`에서 `quote/index.html`과 `quote/quote-form.mjs`를 함께 가져온다. 기존 가격·회원·쿠폰·권한·메일 및 게시 workflow는 이 PR에서 바뀌지 않았다. CI 269개·main·Pages 성공과 운영 PC/390px 입력·일반 Enter·이전/다음 값 보존을 확인했다. 물리 IME와 실제 Safari는 미검증이며 상세 기록은 `quote-ime-validation-20261117.json`에 있다.

## 복구할 때

1. 우선 현재 main에서 새 복구 브랜치를 만든다. 문제가 된 변경만 revert하거나 해당 장애 파일을 위 스냅샷에서 가져온다.
2. PR #56 견적 화면을 복구할 경우 `quote/index.html`, `quote/quote-core.js`, `quote/quote-form.mjs`를 같은 버전으로 가져온다. core와 form을 서로 다른 버전으로 섞지 않는다.
3. 고객 접수·회원·쿠폰·접수번호를 삭제하거나 과거로 덮어쓰지 않는다. `.github/workflows/okclean-threads.yml`, `.github/workflows/sync-blog-cases.yml`, 게시 대기·게시 이력·자동 수집 사례 등 이후 자동화 변경도 전체 과거 소스로 덮어쓰지 않는다.
4. 기존 견적·회원·쿠폰·권한 검사와 화면을 확인한 뒤 PR로 배포하고 실제 운영 URL을 확인한다. 소스 복구 때문에 Firebase 규칙·요금제·관리자 권한을 새로 바꿀 필요는 없다.
5. 이메일 소스가 문제라면 별도의 비공개 Apps Script에서 `Code.gs`만 해당 정상 소스로 복구한다. 기존 ScriptProperties·발송 대기·처리 위치·트리거를 초기화하지 않는다.

## 백업 범위와 남은 확인

지속 보존 위치는 GitHub 백업 브랜치와 커밋이다. 이번에 만든 4,790,873바이트 bundle은 임시 복구 검증용이며 별도의 영구 보관이나 독립 저장소 백업으로 보고하지 않는다. bundle SHA-256은 `4027d66b964ba744f90c37c2673a0d656bdcb06dd01684c8c76a31a3f1f6faec`다.

이 소스 백업에는 Firebase 고객 데이터·Auth 계정, 비공개 Apps Script 상태·인증 정보·트리거가 포함되지 않는다. 기존 고객 백업은 별도 암호화 파일과 분리된 복구키를 사용한다. 11월 16일 고객 백업은 당시 알려진 회원·견적 스키마 17문서의 내보내기이며 현재 전체 데이터베이스나 Auth 백업을 뜻하지 않는다. 운영 데이터 복원은 수행하지 않았다.

점검 당시 저장소 workflow는 Threads 게시, 블로그 사례 동기화, 견적 검사 3개였고 정기 소스 백업 job은 없었다. 별도의 `source-backup.yml`을 추가해 공개 Git 소스만 매일 08:00 KST(UTC 23:00)에 백업하도록 구성했다. 기존 자동화 파일은 변경하지 않았다. 첫 main push 백업은 실제 성공했고 산출물을 내려받아 별도로 복원했다. 다음 요청 시각은 2026년 11월 18일 08:00 KST이며 첫 미래 예약 회차는 아직 검증하지 않았다. 스케줄 설정이나 즉시 실행으로 예약 실행 성공을 주장하지 않는다.

실물 휴대전화 시험, 동일 현장의 검증된 완료 후 사진, 공개 동의된 고객 후기 원문, 실제 신규 고객 알림의 첫 수신은 별도 확인 항목이다. 새 고객 접수나 계약을 시험 결과로 만들어 집계하지 않는다.

## 첫 실제 정기 백업 job 산출물 검증

- PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/57 — 병합 커밋 `8b5246d137cc97fb27e50ecae94097dc98c07669`.
- PR 신규 검사 6개 통과: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44027968924.
- 첫 main push 실행에서 신규 검사·압축·격리 복원·artifact 업로드가 모두 성공: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44028168716.
- Pages 배포 성공: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/44028168309.
- 지속 복구 스냅샷: `backup/verified-source-20261117-8b5246d`. 이전 182파일 버전의 스냅샷도 그대로 보존한다.
- Artifact ID `14304226758`, 이름 `okclean-source-44028168716-8b5246d137cc97fb27e50ecae94097dc98c07669`, ZIP **4,655,144바이트**. 생성은 2026-11-17 15:01:38 KST, 만료는 2026-12-01 15:01:38 KST로 14일 보관 설정을 실제 확인했다.
- GitHub 산출물을 실제로 다시 내려받아 ZIP SHA-256 `57b494927d3a77b78bb95f46757bee84cdc1a1608dd86b84c5418d459d5d5042`가 GitHub 제공 digest와 일치함을 확인했다. ZIP은 `source.tar.gz`, `manifest.json` 두 파일만 포함한다.
- 내부 tar는 **4,607,485바이트**, SHA-256 `374ad31c063643e0a348a58fc00601b6eb9bcae1f12719ff775197826a975cd8`. 별도 빈 폴더에서 **188개 파일, 5,733,112바이트**를 복원한 뒤 각각 Git blob 원본까지 대조해 모두 일치했다. 작업 서버의 사본만 검사한 것이 아니라 업로드된 산출물의 다운로드를 검증했다.
- 이 artifact는 위 병합 커밋의 공개 소스다. 이후 추가하는 검증 문서 갱신까지 포함한다고 주장하지 않는다. 운영 복구나 고객 데이터 변경은 하지 않았다.

## 정기 소스 백업 사용법

- 주기: 매일 08:00 KST 요청. GitHub 스케줄은 지연되거나 장기 비활성 저장소에서 중지될 수 있으므로 정확한 정시 실행을 보장하지 않는다. GitHub Actions 화면의 `Public source backup`에서 수동 실행도 가능하다.
- 보관: 각 성공 회차의 `source.tar.gz`와 `manifest.json`을 GitHub Actions artifact로 14일간 보관한다. 별도의 지속 스냅샷 브랜치도 유지한다. artifact는 독립된 외부 저장소 백업이나 무기한 보관으로 표현하지 않는다.
- 범위: 커밋된 공개 Git 파일만 포함한다. `.git` 인증 설정·작업 폴더의 미추적 파일·환경 변수·고객 DB·Auth·비공개 메일 상태·실제 인증키를 읽지 않는다. 추적된 `.env`, 개인 키·고객 백업 파일, 심볼릭 링크가 있으면 백업을 중단한다. 비밀키를 조용히 포함하거나 불완전 백업을 성공으로 표시하지 않는다.
- 권한: 새 job은 `contents: read`만 사용하고 저장소·고객 데이터를 쓰지 않는다. checkout에 인증 정보를 남기지 않으며 공식 GitHub action 두 개를 검증한 커밋 SHA로 고정했다.
- 검증: 매 백업에서 파일별 해시·크기·실행 모드를 계산하고 별도 임시 폴더에 전부 복원해 비교한 뒤에만 artifact를 업로드한다. 손상된 archive·경로 탈출·링크·기존 복구 폴더 덮어쓰기·비공개 파일 차단 등 신규 검사 6개를 별도로 실행한다. 기존 기능 검사 266개는 변경 없는 기능 소스에 대한 앞선 통과 기록을 유지한다.

산출물 ZIP을 내려받아 두 파일을 꺼낸 뒤 현재 저장소의 검사 도구로 새 빈 폴더에 복구 검증할 수 있다.

```bash
python3 scripts/source_backup.py --verify /absolute/path/source.tar.gz --manifest /absolute/path/manifest.json --restore /absolute/path/new-empty-directory
```

이 명령은 새 복구 폴더에만 파일을 쓴다. 운영 배포·Firebase 데이터 복구·메일 상태 초기화를 수행하지 않는다.

공식 동작 근거:

- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows
- https://github.com/actions/upload-artifact
