# 현재 정상 소스의 백업·복구 검증

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
