# 상세 견적 접수 구현·운영 기록 (2026-11-16)

## 현재 적용 범위

웹 화면과 접수·관리 코드, 격리 검증, 복구 경로를 준비했다. `quote/config.js`의 `enabled:false, verified:false`를 유지한다. 실제 Firebase 서버 규칙·관리자 인증·사진 저장 재조회가 확인되기 전에는 고객의 온라인 저장 버튼을 활성화하지 않는다. 카카오톡·전화 상담과 기존 계산기·회원가입·쿠폰은 계속 이용한다.

**운영 Firebase 검증 차단 근거:** CLI `firestore:databases:list --project okclean-admin`은 `Failed to authenticate, have you run firebase login?`를 반환했다. Firebase 콘솔은 기존 Google 계정의 본인 인증/재로그인 화면을 표시했다. 현재 데이터베이스 edition·요금제·실제 최신 규칙과 고객 데이터의 백업 상태를 직접 확인하지 못했다. 에뮬레이터는 Standard edition의 데모 프로젝트만 사용했다.

## 기존 소스 점검

| 항목 | 소스에서 확인한 상태 / 재사용 |
| --- | --- |
| 홈페이지 | 루트 정적 HTML·CSS·JS, 서비스 12개·지역 3개·사례/분류 JSON |
| 계산 기준 | `index.html#cfg`의 서비스 가격·옵션·최소금액. 296개 조합에서 이전 계산과 공유 함수가 동일. 로딩 실패 시 기존 계산 함수로 폴백 |
| 상담 연결 | 전화 033-911-4457, 문자 010-9373-2782, 기존 Kakao 오픈채팅 주소 유지 |
| 인증·가입 | `member-sync.js`, 익명 인증과 `member_requests/{uid}` + `member_receipts/{uid}` 원자적 가입. 1만원·무료 서비스 설정 유지 |
| 기존 관리자 | `https://okclean-admin-app.web.app/admin/`, GitHub의 `/admin/`은 안내 허브와 별도 관리 도구. 기존 호스팅 앱은 수정하지 않음 |
| 사진 | 공개 작업 사례 사진만 존재. 신규 고객 첨부는 비공개 Firestore 사진 문서에 저장하도록 구현 |
| 통계 | 기존 `site_events` 열거형·수집 거부 선택 유지. 신규 단계/접수/계산/전화 이벤트 추가 후보. 계약 이벤트는 관리자 트랜잭션 이력으로 저장 |
| 배포 | GitHub Pages `main` 루트. 기존 블로그/Threads 워크플로는 변경하지 않음. 별도 읽기 전용 검사 워크플로만 추가 |
| 백업 | 이전 회원 안정화 브랜치 존재. 이번 변경 전 전체 git 기록 백업 브랜치 생성 및 bundle 무결성 확인 |
| 속도 | 사진/접수 Firebase SDK는 신청 때 지연 로딩. 견적·관리 경로는 서비스워커 캐시 제외. 홈페이지 가격 데이터는 그대로 유지 |

## 새 데이터와 권한

- `quote_requests/{20자 무작위 ID}`: 호칭·전화·지역·서비스별 답변·희망일·상담 시간·동의 버전·유입 분류·관리 상태. 고객에게 원본 읽기/수정/삭제 권한 없음.
- `quote_requests/{id}/photos/{0..4}`: 메타데이터를 제거한 JPEG data URI. 관리자만 읽으며 공개 다운로드 URL이 없다.
- `quote_receipts/{uid}_{id}`: 개인 연락처가 없는 접수 확인. 본인 단건 확인과 관리자만 가능, 고객 목록 조회 불가.
- `quote_limits/{uid}`: 같은 익명 인증의 연속 신규 접수를 5분 간격으로 제한한다. 새 익명 계정을 생성하는 악의적 공격까지 방지하지는 못하므로 사용량을 확인해야 한다.
- `quote_requests/{id}/history/{id}`: 관리자 변경·실제 견적 전달 기록·계약 완료 이벤트. 상태는 신규→상담→견적발송→계약 순서를 검증하고 취소/보류를 별도로 지원한다. 수정 버전 충돌을 차단한다.

접수·사진·영수증·제한 문서는 한 배치로 저장하고 서버 영수증 재조회를 통과한 뒤 완료를 표시한다. 저장 결과가 불확실하면 입력/사진/원래 접수번호를 유지하며 같은 신청으로 재확인한다. 관리자 알림 실패는 고객 접수 배치와 별개다.

사진 원본: JPEG·PNG·WebP, 한 장 10MiB 이내, 최대 5장. 실제 헤더·디코딩 확인 후 최대 1280px의 JPEG로 다시 그려 메타데이터를 제거하며 data URI 160,000자 이하로 제한한다. 화면에는 주소·비밀번호·사람·문서를 피하도록 안내한다. 파일 이름과 상세 주소는 저장하지 않는다.

## 알림·보관의 실제 범위

기존 소스에서 관리자용 외부 발송 경로를 확인하지 못했다. 관리자가 로그인한 화면을 열어 둔 동안 실시간 새 접수를 표시하며, 사용자가 허용하면 해당 브라우저에 알림을 표시한다. 문자·메일·백그라운드 푸시는 새로 연결하지 않는다. `pending / seen / failed` 및 시도 횟수와 오류 분류를 기록하고 미확인 알림을 재확인할 수 있다.

새 견적의 180일 보관 기준과 삭제 요청 연락처를 안내한다. 관리자가 만료 자료를 확인하고 정리하는 방식이며 관리자 미접속·통신 오류 시 지연될 수 있다. 부모 문서뿐 아니라 사진·이력·접수증, 해당하는 오래된 제한 기록까지 정리한다. 기존 회원·쿠폰·상품·통계 자료는 대상이 아니다. 이번 작업에서 실제 고객 자료를 삭제하지 않았다.

## 작업 사진·지역·후기

기존 확인된 대표 작업 3건과 지역(춘천/화천) 필터·해당 서비스 견적 링크를 재사용한다. 기존 작업 사례·블로그 자동 갱신·추천제품은 보존한다. 같은 현장의 전후 사진 쌍과 동의가 확인된 고객 후기 원문이 소스에 없으므로 새 전후 비교·별점·후기를 만들어 넣지 않았다. 기존 작업 기록을 고객 후기로 부르지 않는다.

지역 선택은 기존 홈페이지의 강원 18개 시군·수도권 안내를 사용한다. 선택만으로 출장이 확정되지 않으며 일정·거리·작업 규모에 따라 가능 여부·추가비를 상담에서 먼저 확인하도록 표시한다. 미확인 구체적 출장 단가는 만들지 않는다.

## 무료 범위·비용 검토

- 새 결제·요금제 변경·Cloud Storage/Functions 배포는 수행하지 않는다. 운영 요금제 자체는 로그인 후 확인해야 한다.
- 한 접수는 기본 3문서 + 사진 수(최대 5), 즉 최대 8개 문서 쓰기다. 본인 영수증 확인 읽기와 보안 규칙의 의존 문서 읽기가 추가된다.
- 사진은 접수당 최대 약 800KB의 data URI 텍스트다. 인덱스·문서 메타데이터·기존 저장량은 별도다. 사진이 많은 경우 1GiB에 이르기 전에 보관기간을 줄이거나 별도 저장 대안을 검토해야 한다.
- Firebase 공식 Standard 무료 할당은 1GiB, 일 50,000회 읽기·20,000회 쓰기다. 기존 회원/통계와 공유된다. 관리자 목록은 최신 500건부터 가져오며 더보기 전 합계가 전체가 아님을 표시한다. 규칙 읽기와 실시간 재접속 비용도 확인한다.
- Cloud Storage for Firebase는 2026-02-03부터 Blaze 요금제가 필요하므로 요금제 업그레이드를 자동 적용하지 않는 대안으로 비공개 소용량 Firestore 사진 문서를 사용했다.
- 공식 근거(2026-11-16 확인): https://firebase.google.com/docs/firestore/quotas , https://firebase.google.com/docs/firestore/pricing , https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024

## 검증과 한계

- `npm test`: 기존 통계 검사와 견적 계산/DOM 저장 흐름 검사. 이 중 기존 보관기간 에뮬레이터 전용 1개는 별도 환경이 없어 일반 실행에서 skip으로 구분한다.
- 기존 계산기 가격 296개 조합 보존. 온라인 저장 미활성화 차단, 실제 저장 응답 전 완료 금지, 연속 제출 1회, 실패 입력 보존/같은 ID 재시도, 필수 동의/연락처, 악성 SVG·위장 파일·초과 용량 거부 검사.
- `npm run test:quotes:rules`: 합성 자료로 12개 서비스 × 사진 5장, 접수·재시도·관리·계약 이력, 고객 간 접근 차단, UID/provider, 상태 순서, 전달 시각, 필드 변경/초과 크기, 만료 정리를 검사. 실제 고객 자료·운영 Firebase를 사용하지 않는다.
- `python -m unittest discover -s tests -p 'test_case_sync.py'`: 기존 작업 사례 보존/갱신 검사 23개.
- 실제 서버 저장·사진 열람·기존 Google 관리자 로그인·쿠폰 발급 및 모바일/PC 실기 검증은 격리 테스트와 구분해 보고한다.

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for private quote requests and photos by restricting reads and management to the existing Google administrator, validating bounded inputs, and permitting customers to read only their own receipt. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## 서버 활성화 순서

1. Firebase 콘솔 재인증 후 실제 대상 `(default)`의 edition·요금제·현재 규칙을 확인한다. 현재 규칙이 보관본과 다르면 덮어쓰지 말고 변경 차이를 반영한다. 최신 규칙/설정 백업은 공개 저장소에 비밀정보 없이 남긴다.
2. 후보 `ops/firestore.rules.quotes-20261116.txt`를 검토하고 격리 검사를 재실행한다. 기존 회원·접수증·통계·상품 규칙은 보존한다.
3. 인증된 CLI에서 `firebase deploy --project okclean-admin --only firestore:rules --config firebase.quote.json`으로 규칙만 적용한다. 기존 호스팅·Auth·Storage는 배포하지 않는다.
4. 기존 Google 관리자로 합성 시험 접수(`test:true`)·실제 JPEG 사진 저장/재조회·상태 변경·계약 이력·알림 실패 복구를 확인한다. 일반 고객 인증의 타 고객 데이터 접근 차단도 서버에서 확인한다. 시험 기록은 실제 접수 집계와 분리한다.
5. 위 검증 증거를 기록한 후에만 `quote/config.js`의 `enabled`와 `verified`를 함께 true로 바꾸고 배포한다. 화면 안내·주요 CTA도 실제 활성화에 맞게 변경한다. 실제 고객용 상태에서 견적·가입·쿠폰 회귀를 확인한다.
6. 기존 Firebase 호스팅 관리자 페이지는 접근 가능한 원본을 백업한 뒤 GitHub 관리자 허브의 `/admin/quotes.html` 링크를 추가할 수 있다. 이번 저장소의 `/admin/` 허브에는 이미 진입 경로를 추가했다.

## 복구

- 변경 전 전체 소스: `backup/quote-before-20261116-70495bb`, 기준 SHA `70495bb770959b45bd4f6f42e956ccb9fc0a2f7e`.
- 새 접수 긴급 정지: `quote/config.js`의 두 플래그를 false로 설정한다. 기존 카카오톡·전화는 유지한다.
- 홈페이지 문제: 이번 PR의 변경만 `git revert`로 되돌려 정상 Pages 배포를 확인한다. 이후 자동 추가된 블로그 자료를 과거 브랜치로 강제 덮어쓰지 않는다.
- Firebase 문제: 적용 직전 백업한 규칙으로만 복원한다. 고객 견적 문서·사진을 지우거나 회원/쿠폰을 초기화하지 않는다. 기존 규칙으로 되돌리면 새 견적 접근은 차단되지만 데이터는 남는다.
- 이 git 백업은 공개 소스의 복구용이며 실제 Firebase 고객 데이터 백업을 의미하지 않는다.
