# 방문·상담 측정 연결 상태

2026-11-12 준비. 운영 수집 기본값은 꺼짐이다. 현재 저장된 Firestore 규칙에는 `site_events` 허용 규칙이 없으며, 이 변경은 원격 규칙을 배포하지 않는다. `analytics-config.js`의 두 값을 켜기 전까지 일반 방문 이벤트는 외부로 전송되지 않는다.

## 파일과 연결

- `analytics-config.js`: 공통 수집 설정. `enabled: false`, `verified: false`.
- `analytics.js`: 허용된 이벤트/유입 출처/페이지 종류/서비스 종류/버튼 위치/상담 종류만 만드는 수집 모듈. 실제 운영 전송은 두 설정이 모두 true일 때만 가능하다.
- `admin/analytics.html`: 기존 Google 관리자 UID로 조회하며, 실패·권한 미확인은 숫자 0으로 대신하지 않는다. 실제 문의·예약 수는 표시하지 않는다.
- `ops/firestore-site-events.proposed.txt`: 검토용 미적용 규칙 조각. 기존 회원·상품·관리자 규칙을 바꾸거나 대체하지 않는다.

홈페이지의 `app.js` 이후에 아래 스크립트를 차례대로 넣는다. 하위 서비스 페이지는 상대 경로를 `../`로 조정한다. 공통 `site.js`에서 로드한다면 중복 삽입하지 않는다.

```html
<script src="analytics-config.js"></script>
<script src="analytics.js"></script>
```

신규 회원 저장이 서버에서 확인된 성공 분기에서만 아래 호출을 추가한다. 기존 접수증 재사용, 단순 가입 버튼 클릭, 실패 분기에서는 호출하지 않는다.

```js
window.OKCleanAnalytics?.track('signup_complete', { placement: 'other', target: 'none' });
```

일반 버튼은 DOM 위임으로 측정한다. 새 직접 상담 버튼이 팝업을 열면 `data-contact-kind="direct"`를 붙인다. 견적 팝업의 원래 `qKakao`는 자동으로 `quote`로 분류한다. 명시적 위치는 `data-analytics-placement="hero"`처럼 허용된 값으로 줄 수 있다. 채용·협업 영역 `.recruit`, `data-analytics-ignore` 아래 요소, 가입정보 전송 `jKakao`는 청소상담 집계에서 제외한다.

기존 `data-placement`/`data-cta-location`도 지원한다. `hero`는 `hero`, `quote-guide`/`quote-sheet`는 `quote`, `dock`은 `sticky`, `featured`/`cases`/`premium`/`service-top`/`service-bottom`/`area-top`/`area-bottom`은 `service`로 묶는다. 속성의 원문이나 알 수 없는 값은 서버에 전송하지 않는다.

## 이벤트 뜻

| 이벤트 | 기록 시점 | 해석 범위 |
| --- | --- | --- |
| page_view | 공개 홈페이지·서비스·지역·추천제품 페이지 로드 | 페이지 조회 횟수. 순방문자가 아님 |
| case_open | 첫 화면·대표 사례·시공 사례의 실제 블로그 작업 기록 링크 선택 | 작업 기록 열기 클릭. 글을 읽었는지는 확인하지 않음 |
| shop_open | 추천제품 외 페이지에서 추천제품 페이지 링크 선택 | 추천제품 이동 클릭. 상품 구매가 아님 |
| quote_start | 해당 페이지에서 첫 계산기 조작 | 견적 조작 시작 횟수 |
| quote_result | 사용자 조작 후 800ms 동안 추가 조작 없음 | 계산기 조작 결과. 초기 기본 가격은 제외 |
| contact_prepare | 계산기의 카톡 문의 버튼 선택 | 복사·안내 단계 진입 |
| kakao_open | 실제 카카오 오픈채팅/채널 링크 선택 | 카톡 열기 버튼 클릭. 메시지 전송 아님 |
| phone_open | 전화 링크 선택 | 전화 버튼 클릭. 실제 통화 아님 |
| sms_open | 문자 버튼 선택 | 문자 버튼 클릭. 실제 문자 전송 아님 |
| signup_complete | 신규 가입 서버 저장 확인 | 신규 회원 저장 완료. 예약 아님 |
| diagnostic | 관리자가 수동 시험 버튼 선택 | 시험 기록. 운영 집계 제외 |

## 개인정보와 수집 범위

전송 필드는 `schema`, `event`, `source`, `page`, `service`, `placement`, `target`, `test`, 서버 시각 `at`뿐이다. 모든 텍스트 값은 코드와 규칙에 있는 열거값이다. 이름·전화번호·주소·지역 선택·희망 날짜·금액·견적 본문·회원 UID·쿠폰번호·전체 URL·쿼리·리퍼러 주소·사용자/광고 식별자를 전송하지 않는다. URL 쿼리 중 `src`/`utm_source`는 허용된 출처 명칭으로만 변환하며, 알 수 없는 값은 `other`로 버린다. 리퍼러는 호스트를 출처로 분류한 뒤 원문을 저장하지 않는다.

30분 동안 같은 탭의 출처를 이어가기 위해 출처 열거값과 만료 시각만 sessionStorage에 저장한다. 서버 수집과 점검 모드가 모두 꺼져 있으면 이 저장도 하지 않는다. 별도의 사용자/세션 식별자를 만들지 않으므로 순방문자·중복 제거 고객 수는 계산할 수 없다.

`?analytics_test=1`은 이 탭의 점검 모드를 켜며, 전송 시에는 `test: true`만 붙인다. 점검 모드는 관리자 화면에서 끌 수 있다. 운영 설정이 꺼져 있으면 점검 기록은 현재 탭에만 최대 80건 남고 외부 전송은 없다. 시험 저장은 규칙상 기존 관리자에게만 허용한다.

## 실제 연결 완료 조건

1. 현재 운영 규칙을 읽고 제안된 `site_events` 범위만 검토한다. 고객 문서 공개 읽기, 관리자 UID 변경, 기존 컬렉션 재사용은 하지 않는다.
2. 허용된 운영 배포 경로로 규칙을 적용한다. 이 작업에는 해당 프로젝트의 기존 권한이 필요하다. 새 비밀키를 코드에 넣지 않는다.
3. 관리자 화면에서 시험 이벤트 1건을 저장하고, 같은 문서를 재조회하여 `verified_test`를 확인한다. SDK 초기화·HTTP 요청 시작만으로 성공 처리하지 않는다.
4. 실제 개인정보 고지와 보존·삭제 방식을 운영자가 확인한 뒤 `enabled`/`verified`를 켠다. 현재 초안에는 TTL/자동 삭제 작업이 없으며 자동 보존기간 처리가 완료됐다고 주장하지 않는다.
5. 운영 `page_view`와 실제 상담 링크 클릭이 각각 저장되고, 관리자 집계에서 시험 데이터가 빠지는지 확인한다. 외부 카톡 전송·전화 통화는 자동 시험하지 않는다.

관리자 집계는 최근 7일 또는 30일의 최신 최대 2,000개 문서를 읽는다. 상한에 도달하면 기간 전체 합계가 아닐 수 있음을 표시한다. 기존 데이터가 없거나 연결되지 않은 상태를 과거 방문수 0으로 소급 해석하지 않는다. 공개 클라이언트의 이벤트 수집은 반복 클릭·봇·차단 도구·통신 실패 영향을 받으므로 실제 고객 수나 상담 완료 수로 사용하지 않는다.

날짜별 표는 같은 조회 결과 중 `test === false`인 운영 이벤트만 KST(UTC+9) 날짜로 묶는다. 오늘과 조회 시작일은 일부 시간만 포함할 수 있다. 날짜별 수치는 출처별 누적 수치를 재사용하지 않고 각 이벤트의 서버 저장 시각에서 계산한다.

## 기술 근거

- [Firestore 규칙 조건과 기본 거부](https://firebase.google.com/docs/firestore/security/rules-conditions)
- [GA4 수동 페이지뷰와 향상된 측정의 별도 설정](https://developers.google.com/analytics/devguides/collection/ga4/views?hl=ko)

기존 Firebase의 measurementId 문자열은 GA 수신 확인을 대신하지 않는다. 이번 모듈은 GA 태그를 추가하거나 활성화하지 않는다.
