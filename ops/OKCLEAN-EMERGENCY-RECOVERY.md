# 오케이청소 긴급 복구 안내서

## 목적
계정 문제, 잘못된 배포, 파일 손상, Firestore 규칙 오류가 발생했을 때 현재 정상 운영 상태로 빠르게 복구하기 위한 절차다.

## 보안 원칙
- 이 공개 저장소에는 회원 이름·전화번호 등 개인정보 원문을 백업하지 않는다.
- 공개 저장소에는 사이트 소스, 복구 규칙, 컬렉션 구조, 공개 가능한 추천제품 데이터만 둔다.
- 회원 데이터 복원은 Firebase 프로젝트의 실제 데이터와 관리자 권한을 기준으로 진행한다.

## 긴급 복구 순서

1. **GitHub 저장소 확인**
   - 저장소: `okclean-kr/okclean-kr.github.io`
   - `main` 최신 정상 커밋과 `backup/*`, `restore/*` 브랜치를 확인한다.
   - 정기 소스 백업의 [첫 실제 복원 검증과 복구 절차](verified-release-recovery-20261117.md#2026-11-18-첫-예약-소스-백업-검증)를 확인한다. GitHub Actions의 ZIP 보관 기간은 14일이다.
   - 운영 파일을 삭제하지 말고 정상 백업 기준점을 먼저 확보한다.

2. **GitHub Pages 재배포**
   - Pages 배포가 성공했는지 Actions에서 확인한다.
   - 핵심 경로 `/`, `/shop/`, `/app/`, `/admin/`, `/admin/products.html`, `/quote/`, `/admin/quotes.html`을 확인한다.

3. **Firebase 프로젝트 연결 확인**
   - 프로젝트: `okclean-admin`
   - Authentication / Firestore / Hosting 연결 상태를 확인한다.
   - 결제 플랜을 임의로 변경하지 않는다.

4. **Firestore Rules 적용**
   - 복구 파일: `ops/firestore.rules.current.txt`
   - Firebase Console의 Firestore Rules에 전체 복사 후 게시한다.
   - `member_requests`, `member_receipts`, `products`, `product_clicks`, `site_events`, `quote_requests`, `quote_receipts`, `quote_limits` 및 견적 사진·이력 규칙이 모두 포함됐는지 확인한다. 현재 규칙을 먼저 백업·비교하고, 오래된 회원 전용 규칙으로 덮어쓰지 않는다.

5. **회원 데이터 확인**
   - 관리자 로그인 후 회원 목록이 표시되는지 확인한다.
   - 회원 개인정보를 공개 저장소로 내보내지 않는다.

6. **상품 데이터 확인/복원**
   - 2026년 11월 18일 기준 [공개 추천제품 21건 스냅샷](https://github.com/okclean-kr/okclean-kr.github.io/blob/fcf37add5f10d4e82daf549ca82e9a786eb8ef85/backup/products-snapshot-20261118.json)과 [상품 복구 메모](https://github.com/okclean-kr/okclean-kr.github.io/blob/fcf37add5f10d4e82daf549ca82e9a786eb8ef85/backup/RECOVERY-20261118.md)를 확인한다.
   - 11월 10일의 3건 스냅샷 `backup/products-snapshot-20261110.json`은 이전 버전 확인용이다.
   - 실제 Firestore `products`가 우선이며, 스냅샷은 누락 여부 확인 및 수동 복구 참고용이다.
   - 상품 ID는 클릭통계 연결에 사용되므로 가능한 한 유지한다.

7. **/shop/ 확인**
   - 상품명, 설명, 이미지, 쿠팡 파트너스 링크가 표시되는지 확인한다.
   - fallback 기본상품만 보이면 Firestore `products` 조회와 JS 오류를 먼저 확인한다.

8. **관리자 로그인 확인**
   - Firebase Hosting 관리자: `https://okclean-admin-app.web.app/admin/`
   - 허가된 Google 관리자 계정으로 로그인되는지 확인한다.

9. **회원관리 확인**
   - 상담상태, 쿠폰상태, 무료서비스 상태 변경 → 저장 → 새로고침 유지 확인.

10. **상품관리 확인**
   - `/admin/products.html`에서 상품 목록, 수정, 저장, 이미지 URL, 구매 링크를 확인한다.

11. **구매 링크 확인**
   - 메디록스-S, 계양, 오성 상품 버튼이 실제 쿠팡 파트너스 링크로 이동하는지 확인한다.

12. **클릭통계 확인**
   - `product_clicks` 기록과 관리자 통계가 증가하는지 확인한다.
   - 유입값 예: `shorts`, `blog`, `threads`, `reels`.

13. **최종 운영 테스트**
   - 고객 사이트 → 회원가입 → 관리자 회원 확인 → 쿠폰/무료서비스 확인 → /shop/ → 구매버튼 → 쿠팡 이동 → 클릭통계 순서로 검증한다.

14. **상세 견적·알림 확인**
   - `/quote/`의 서비스별 질문·계산 결과와 `/admin/quotes.html`의 기존 Google 관리자 조회를 확인한다.
   - 운영 저장 시험은 관리자 시험 모드(`test:true`)로만 수행해 실제 고객·계약 통계와 분리한다.
   - 알림 패널의 불러온 실제 접수 중 미확인·실패 건수를 확인한다. 브라우저 알림 재표시는 접수 확인 완료를 의미하지 않는다.
   - 알림 결과 기록 미저장은 연결 회복 후 다시 확인한다. 알림 오류 때문에 고객 접수·사진을 삭제하거나 재접수시키지 않는다.
   - 관리자 화면을 닫아도 별도 Apps Script가 시간 기반으로 새 접수를 확인해 관리자 메일을 보낸다. 시험 메일 수신과 예약 실행을 확인했으며, 실제 신규 고객 접수 메일의 첫 수신은 별도 확인이 필요하다. [메일 검증 기록](private-email-alert-verification-20261117.json)

## 2026-11-16 알림 보완 직전 소스 복원 검증

- 영구 기준점: `backup/quote-notify-before-20261116-a99f7fa`, SHA `a99f7fab3ab7bd93b139e7900b3d934703a73e32`.
- 이 기준점으로 git bundle을 생성하고 `git bundle verify`, 별도 임시 디렉터리 clone, `git fsck --no-reflogs`를 통과했다. 홈페이지·회원·견적·규칙·블로그/Threads 워크플로 등 주요 파일 10개가 기준 커밋과 동일했다.
- bundle은 복원 연습용 임시 사본이다. 지속 보관 기준은 위 GitHub 백업 브랜치이며, 실제 Firebase 고객 데이터 내보내기 또는 복원 검증을 의미하지 않는다.
- 알림 보완에 문제가 있으면 해당 변경만 `git revert`하여 정상 Pages 배포를 확인한다. 그 이후 쌓인 블로그·작업 사례·고객 자료를 과거 상태로 강제 덮어쓰지 않는다. 이번 알림 보완에는 Firebase 규칙 변경이 없으므로 소스 복구를 위해 규칙을 되돌릴 필요가 없다.

## 주요 Firestore 컬렉션
- `member_requests`: 회원/상담/쿠폰/무료서비스 상태
- `member_receipts`: 회원별 쿠폰 발급 영수증
- `products`: 상품명, 설명, 이미지 URL, 쿠팡 링크, 정렬, 노출상태
- `product_clicks`: 상품별/유입경로별 클릭 기록
- `site_events`: 방문·상담 버튼 등 구분된 이벤트
- `quote_requests`: 상세 견적·상담 상태·알림 상태 (`photos`, `history` 하위 컬렉션 포함)
- `quote_receipts`: 본인 확인용 접수번호
- `quote_limits`: 연속 접수 제한 기록

## 운영 복구 판정
아래가 모두 정상일 때 복구 완료로 본다.
- GitHub Pages 성공
- 회원가입 성공
- 관리자 회원 조회/수정 성공
- /shop/ Firestore 상품 표시
- 이미지 표시
- 쿠팡 링크 이동
- 클릭통계 기록

## 회원·견적 암호화 내보내기

`/admin/backup.html`에서 기존 Google 관리자가 회원·견적·사진·이력을 암호화 파일로 내보낼 수 있다. 백업 암호는 사용자가 직접 입력하고 파일과 별도로 보관한다. 내려받은 파일의 복호화·무결성 확인까지 마쳐야 보관 상태를 판단한다. 전체 Firebase DB/인증 계정/통계/제품 백업은 아니며 운영 복원을 자동 수행하지 않는다. 상세 범위·한계·복원 검증은 `ops/customer-backup-20261116.md`를 따른다. 실제 운영 파일 다운로드가 끝나기 전에는 고객 자료 백업 완료로 보고하지 않는다.
