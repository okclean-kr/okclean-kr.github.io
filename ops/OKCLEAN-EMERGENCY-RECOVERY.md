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
   - 운영 파일을 삭제하지 말고 정상 백업 기준점을 먼저 확보한다.

2. **GitHub Pages 재배포**
   - Pages 배포가 성공했는지 Actions에서 확인한다.
   - 핵심 경로 `/`, `/shop/`, `/app/`, `/admin/`, `/admin/products.html`을 확인한다.

3. **Firebase 프로젝트 연결 확인**
   - 프로젝트: `okclean-admin`
   - Authentication / Firestore / Hosting 연결 상태를 확인한다.
   - 결제 플랜을 임의로 변경하지 않는다.

4. **Firestore Rules 적용**
   - 복구 파일: `ops/firestore.rules.current.txt`
   - Firebase Console의 Firestore Rules에 전체 복사 후 게시한다.
   - `member_requests`, `member_receipts`, `products`, `product_clicks` 규칙이 모두 포함됐는지 확인한다.

5. **회원 데이터 확인**
   - 관리자 로그인 후 회원 목록이 표시되는지 확인한다.
   - 회원 개인정보를 공개 저장소로 내보내지 않는다.

6. **상품 데이터 확인/복원**
   - 공개 복구 참고본: `backup/products-snapshot-20261110.json`
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

## 주요 Firestore 컬렉션
- `member_requests`: 회원/상담/쿠폰/무료서비스 상태
- `member_receipts`: 회원별 쿠폰 발급 영수증
- `products`: 상품명, 설명, 이미지 URL, 쿠팡 링크, 정렬, 노출상태
- `product_clicks`: 상품별/유입경로별 클릭 기록

## 운영 복구 판정
아래가 모두 정상일 때 복구 완료로 본다.
- GitHub Pages 성공
- 회원가입 성공
- 관리자 회원 조회/수정 성공
- /shop/ Firestore 상품 표시
- 이미지 표시
- 쿠팡 링크 이동
- 클릭통계 기록
