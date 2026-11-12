# 방문·상담 통계 보관기간과 정리

`site_events`에만 90일 보관 기준을 적용한다. 기존 Google 관리자가 `admin/analytics.html`을 열고 인증이 확인되면, 90일이 지난 통계 원본을 한 번에 최대 600건 정리한다. 운영 이벤트와 시험 이벤트에 같은 기준을 적용한다.

## 적용 상태

- **서버 규칙 게시 확인:** 2026-11-12 15:26 KST, Firebase Console의 새 현재 버전을 확인했다. 게시 직전 규칙이 기존 수집 규칙 보관본과 같고, 게시한 전체 내용이 아래 후보 해시와 같음을 확인했다.
- **현재 규칙:** `ops/firestore.rules.current.txt`와 `ops/firestore.rules.retention-20261112.txt`는 동일하다.
- **관리자 페이지 배포:** [PR #39](https://github.com/okclean-kr/okclean-kr.github.io/pull/39) 병합 후 [Pages 실행 43169230456](https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43169230456)의 성공과 운영 화면을 확인했다.
- **운영 자동 확인:** 2026-11-12 15:36 KST, 기존 Google 관리자의 페이지 접속 후 서버 조회가 완료됐다. 해당 조회 기준보다 오래된 기록이 없어 삭제하지 않았다는 결과를 확인했다.
- **읽기 전용 재확인:** 2026-11-12 15:38 KST, `보관기간 확인`은 기준 시각 2026-08-14 15:38 KST보다 오래된 기록이 없다고 표시했다. 이 버튼은 삭제하지 않는다.
- 위 두 조회에서 만료 대상과 실제 삭제는 모두 0건이었다. 운영 삭제 배치는 보내지 않았다. 삭제 권한 테스트는 격리된 데모 프로젝트의 합성 자료로만 실행했다.

운영 결과는 해당 시각의 서버 조회 범위에 한정된다. 에뮬레이터 결과나 서버 규칙 게시만으로 운영 배포·조회 성공을 대신하지 않았다.

## 대상과 실행 시점

| 항목 | 기준 |
| --- | --- |
| 대상 컬렉션 | `site_events` 최상위 문서만 |
| 보관 기준 | 서버 저장 시각 `at`부터 90일 |
| 삭제 조건 | `at < request.time - duration.value(90, 'd')`인 timestamp |
| 권한 | 기존 관리자 UID + 실제 인증 토큰의 `google.com` 로그인 |
| 시작 | 관리자 통계 페이지를 열고 관리자 인증이 확인된 뒤, 페이지당 한 번 |
| 한 배치 | 최대 200건, 원자적 배치 삭제 |
| 한 번의 실행 | 최대 3배치, 총 600건 |
| 잔여 확인 | 배치 이후 서버 재조회. 600건 처리 후에도 남아 있으면 상한 도달로 표시 |
| 수동 버튼 | `보관기간 확인`은 읽기 전용 조회이며 삭제하지 않음 |
| 제외 | `product_clicks`, `products`, `member_requests`, `member_receipts`, 상담정보 및 모든 하위 컬렉션 |

이 방식은 관리자 페이지 접속에 따라 실행된다. 관리자 미접속, 통신 오류, 처리 상한이 있으면 자료가 90일보다 오래 남을 수 있다. 예약 작업이나 Firestore TTL을 설정하지 않았고, 정확히 90일이 되는 순간 삭제를 보장하지 않는다. `product_clicks`의 자동 삭제 기간은 설정하지 않았다. 회원·상담정보의 기존 보관 정책과 관리 기능은 이 정리 코드의 대상이 아니다.

Cloud Functions·Cloud Scheduler·유료 TTL 기능은 추가하지 않았다. 기존 Firestore의 읽기·삭제 사용량은 발생하므로 이용량과 요금제에 따른 한도는 그대로 적용된다. 빈 조회에도 최소 읽기 사용량이 발생할 수 있다. 한 실행의 코드상 상한은 최대 4회 조회(각 limit 200)와 3개 삭제 배치다. SDK의 네트워크 재시도까지 청구 상한으로 보장하는 수치는 아니다. [Firestore 요금 기준](https://firebase.google.com/docs/firestore/pricing)

## 코드와 호출

`analytics-maintenance.js`는 `OKCleanAnalytics.backend()`에서 기존 Firebase 앱·Firestore SDK를 재사용한다. 별도 관리자 SDK나 서비스 계정, 새 인증 계정을 만들지 않는다. 기존 웹 SDK 버전은 10.14.1이다. 스크립트를 불러오는 것만으로는 조회나 삭제를 하지 않는다.

```html
<script src="../analytics-config.js"></script>
<script src="../analytics.js"></script>
<script src="../analytics-maintenance.js"></script>
```

```js
// 같은 Firebase 앱의 기존 Auth 인스턴스를 전달한다.
await window.OKCleanAnalyticsMaintenance.inspect({ auth, onProgress });
await window.OKCleanAnalyticsMaintenance.run({ auth, onProgress });
// 로그아웃을 시작할 때 아직 서버에 보내지 않은 다음 작업을 중지한다.
window.OKCleanAnalyticsMaintenance.cancel();
```

`admin/analytics.html`은 첫 관리자 인증 확인 뒤 `run`을 한 번 호출한다. 같은 페이지에서 인증 콜백이 반복되거나 로그아웃 후 다시 로그인해도 자동 삭제를 중복 실행하지 않는다. 수동 버튼은 `inspect`만 호출한다. 로그아웃 때 아직 전송하지 않은 배치와 다음 조회를 중지하고, 이전 로그인에서 늦게 도착한 화면 갱신을 무시한다.

관리자 확인은 UID, 연결된 Google 제공자, `getIdTokenResult()`의 실제 `firebase.sign_in_provider`를 함께 검사한다. 서버 규칙도 같은 UID·실제 로그인 제공자를 검사한다. 각 조회·배치 직전과 비동기 인증 확인 뒤 현재 사용자를 다시 확인한다. [Firebase 요청 인증·서버 시각](https://firebase.google.com/docs/reference/rules/rules.firestore.Request), [사용자 토큰 API](https://firebase.google.com/docs/reference/js/auth.user)

## 시간·데이터·오류 처리

클라이언트는 현재 시각에서 90일을 뺀 고정 기준으로 `where('at', '<', cutoff)`, `orderBy('at', 'asc')`, `limit(200)`를 사용한다. `getDocsFromServer`만 사용하며, 캐시나 보류 중 쓰기가 포함된 결과는 삭제 근거로 사용하지 않는다. 조회한 문서의 경로·Firestore 인스턴스·실제 Timestamp·엄격한 경계를 다시 검사한다.

최종 삭제 허용 조건은 서버의 `request.time`으로 판단한다. 클라이언트 시계가 앞서 있어도 서버 기준 90일을 넘지 않은 문서는 삭제할 수 없다. 클라이언트 시계가 늦으면 더 오래 보관될 수 있다. 시각 수정은 관리자에게도 항상 거부한다. `at`가 없거나 timestamp가 아닌 문서는 삭제하지 않는다. 정확히 90일인 자료도 삭제하지 않는다.

배치는 서버 응답으로 성공이 확인된 뒤에만 누적한다. 다음 조회나 다음 배치가 실패하면 이미 확인된 건수와 미확인 잔여 상태를 나눠 표시한다. 배치 자체는 전부 성공하거나 전부 거부된다. [원자적 배치 쓰기](https://firebase.google.com/docs/firestore/manage-data/transactions)

각 비동기 단계는 15초 뒤 응답 대기를 화면에 반환할 수 있다. 이미 SDK에 전달한 쓰기는 이 시간 제한이나 로그아웃으로 취소됐다고 볼 수 없다. 배치 응답이 미확정이면 `unknown`과 미확정 건수를 표시하고, 원래 요청이 해결될 때까지 같은 페이지에서 새 작업을 막는다. 자동 재시도는 하지 않는다. 늦은 성공 응답은 확인된 처리 건수로 갱신하되, 후속 조회가 없으므로 전체 완료로 표시하지 않는다. [서버 조회·지연 쓰기 API](https://firebase.google.com/docs/reference/js/firestore)

| 상태 | 해석 |
| --- | --- |
| `inspected` | 읽기 전용 서버 조회 성공. `matched`는 최대 200건이며 전체 개수와 다를 수 있음 |
| `complete` | 확인된 배치 이후 같은 기준의 서버 조회가 비어 있음. 최초 조회가 비어 있으면 삭제 0건 |
| `capped` | 600건 상한까지 확인했고, 서버 조회에서 잔여 대상 확인 |
| `partial` | 앞선 처리 일부는 확인됐지만 잔여 확인을 끝내지 못함 |
| `unknown` | 발송한 배치의 서버 응답 미확정. `uncertain`은 그 배치의 건수 |
| `blocked` | 권한·앱·시각·데이터 조건 미충족으로 중지 |
| `failed` | 조회 또는 처리 실패. 잔여 건수는 미확인 |
| `busy` | 같은 페이지의 이전 작업이 아직 끝나지 않음 |

반환 필드는 `status`, `mode`, `collection`, `retentionDays`, `cutoff`, `checkedAt`, `matched`, `scanned`, `deleted`, `batches`, `remaining`, `capped`, `uncertain`, `error`다. 진행 콜백은 `checking`과 `deleting`도 전달한다. `remaining: null`은 미확인 상태다. `deleted`는 서버 응답으로 확인한 배치 건수이며, 동시 실행된 다른 관리자 탭과의 중복 삭제 시도를 전역에서 고유하게 계산한 수치는 아니다.

## 규칙 보존과 검증

- 변경 전 전체 규칙 SHA-256: `bb32ebf0395169c6e6a8d649c1a9f1466f8f9c7249ca3c8d8298ffa06d0e97f4`
- 현재 전체 규칙 SHA-256: `7d99f3b744dc3a96cadf9a1faa1d732bd6cbfd6be227c89ba2dd70ca0f9049db`
- `site_events` 블록을 제외한 기존 규칙 SHA-256: `a9d8df5e23b412abf946c26f3cb8952c8baa9867cf5fda202b213f49cc456818` — 변경 전후 바이트 동일
- 개인정보처리방침 1~6항 SHA-256: `5f1a69020801c873d35dad48ecae34ce8a54c9fdd8d2288b8bacdb2058210ef7` — 변경 전후 동일

새 규칙은 `site_events`의 `update`를 계속 거부하며, 만료된 자료의 `delete`만 기존 Google 관리자에게 허용한다. 기존 생성 스키마와 관리자 조회 조건, 다른 컬렉션 권한은 바꾸지 않았다.

검증 결과는 `ops/firestore-retention-validation-20261112.json`에 기록했다.

- 정리 모듈·관리자 화면 검증 23건 통과: 읽기 전용 조회, 관리자·제공자·앱 확인, 로그아웃·취소, 90일의 엄격한 경계, 200건 배치·600건 상한, 부분 실패·미확정 응답, 잘못된 경로·캐시 차단, 페이지당 자동 실행 1회, 읽기 전용 버튼, 로그아웃 뒤 늦은 응답 표시 차단.
- 격리된 Firestore Emulator 삭제 조건 22건 통과: 기존 Google 관리자, 다른 UID·다른 제공자, 오래된/최근/미래 기록, timestamp 누락·오류, 수정 거부, 혼합 배치 원자성, 실제 조회 조건, 제품 클릭·다른 컬렉션·하위 컬렉션 보호.
- 서버 경계의 동일 시각을 안정적으로 비교하기 위해 에뮬레이터에만 임시 검사 경로를 추가했다. **실제 배포한 `expiredSiteEventAt` 함수**에 `request.time - 90일`과 ±1초를 전달해 =90일 거부, 더 오래된 값 허용, 더 최근 값 거부를 확인했다. 이 임시 검사 경로는 운영 규칙 파일에 포함하지 않았다.
- 기존 생성·조회·회원·접수증·상품 규칙 63건을 새 규칙으로 다시 통과했다.
- 기존 측정 테스트 24건도 통과했다. 운영 데이터는 이 검증에 사용하지 않았다.

일반 검증 명령:

```sh
node --test tests/analytics-maintenance.test.cjs tests/analytics.test.cjs
```

실제 에뮬레이터 검증은 `OKCLEAN_RETENTION_EMULATOR=1`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:<port>`를 설정하고 `@firebase/rules-unit-testing`과 `firebase/firestore`가 설치된 환경에서 같은 테스트를 실행한다. 코드의 프로젝트는 `demo-okclean-retention-audit`로 고정되어 있고 loopback 주소만 허용한다. `audit/retention-validation/run.sh`는 이번 작업의 로컬 검증 실행본이다.
