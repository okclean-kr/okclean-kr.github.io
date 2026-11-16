# 오케이청소 비공개 접수 메일

이 코드는 별도의 **비공개 standalone Google Apps Script**에서 실행한다. 홈페이지·Firebase 고객 데이터·보안 규칙·Spark 요금제는 변경하지 않는다. 공개 웹 앱으로 배포하거나 다른 사용자에게 공유하지 않는다. 코드 저장만으로 알림이 활성화되지 않는다.

## 조회·발송 범위

- 고정 대상: `okclean-admin/(default)/quote_requests`.
- REST query의 projection은 `schema`, `test`, `createdAt` 세 필드다. 이름·전화·주소·답변·사진·관리자 메모는 가져오지 않는다. 문서 경로는 페이지 커서에만 비공개 보관한다.
- 활성화 시각 이후 접수를 생성 시각·문서 이름으로 이어서 조회한다. 한 회차 최대 100문서이며 `test:true` 접수는 메일 건수에서 제외한다. 과거 접수를 일괄 발송하지 않는다.
- 수신자는 해당 비공개 스크립트의 실행 Google 계정으로 고정한다. 고객 입력으로 수신자를 바꾸지 않는다. 본문에는 실제 새 접수 건수·알림 번호·관리자 링크만 넣는다.
- `activateNotifications`가 자기 프로젝트의 `pollQuoteNotifications` 트리거를 한 개만 만든다. 5분 주기를 요청하지만 정시 또는 무지연 실행을 보장하지 않는다. 다른 자동화의 트리거를 수정하지 않는다.

## 상태·실패·재시도

전송 대기를 ScriptProperties에 먼저 저장한다. 고객 접수 저장과 독립적이며 Firebase에 문서를 쓰거나 삭제하지 않는다. 한도가 없으면 커서를 진행하지 않고 대기를 유지해 다음 회차에 재시도한다. 발송 성공을 확인한 뒤에만 커서를 진행한다. 동일 시각의 접수는 나노초와 문서 이름을 함께 커서로 사용한다.

메일 API 수락은 받은편지함 도착을 뜻하지 않는다. API 호출 중 오류·실행 중단 또는 발송 후 상태 저장 실패는 실제 발송 여부가 불확실하므로 `unknown`으로 남긴다. 자동 중복 발송을 피하기 위해 이 경우에는 관리자가 받은편지함과 `showNotificationStatus`를 확인한 뒤 `retryUnconfirmedNotification`을 직접 실행한다. 재시도 메일은 같은 알림 번호를 사용한다. 메일 API에 멱등 키가 없으므로 불확실 발송을 수동 재시도하면 중복 메일이 도착할 수 있다. 접수 원본은 영향을 받지 않는다.

로그와 오류에는 승인된 상태 코드·건수만 기록한다. 원문 API 응답·OAuth 토큰·수신 이메일·고객 필드를 기록하지 않는다. 계정 권한 오류는 커서를 진행하지 않는다. 기존 앱의 관리자 화면에서 대기·실패 상태를 확인하는 기능은 이 별도 스크립트 상태와 구분한다.

## 최초 연결

1. 기존 오케이청소 Google 관리 계정 소유로 새 비공개 프로젝트를 만든다. `Code.gs`와 `appsscript.json`을 저장한다.
2. 사용자가 새 스크립트의 권한 요청을 검토·승인한다. `datastore` OAuth 범위는 IAM 권한에 따라 Firestore 읽기·쓰기를 허용할 수 있다. **이 코드의 Firestore 동작은 projection을 지정한 `documents:runQuery`뿐이지만, 권한 자체가 필드 단위 읽기 전용으로 축소되는 것은 아니다.** Google 승인을 대신하거나 IAM 권한을 추가하지 않는다.
3. `checkNotificationSetup`을 실행해 실제 프로젝트 조회 권한·응답 형식·남은 메일 한도를 확인한다. 실패하면 활성화하지 않는다.
4. `sendSetupTestEmail`을 한 번 실행하고 수신함에서 `[시험] 오케이청소 접수 알림 연결 확인`의 실제 도착을 확인한다. 고객 접수 문서를 만들지 않는다.
5. `activateNotifications`를 실행하고 트리거가 한 개이며 `showNotificationStatus`의 enabled가 true인지 확인한다. 이후 실제 예약 회차도 실행 이력으로 확인해야 자동 알림 완료로 판정한다.
6. `pauseNotifications`는 enabled만 false로 바꾸고 대기 기록을 보존한다. 재활성화해도 기준 시점·커서를 초기화하지 않는다.

요청 범위: `datastore`, `script.external_request`, `script.send_mail`, `script.scriptapp`, `userinfo.email`. 받은편지함을 읽는 Gmail 권한·Drive 전체 권한은 요청하지 않는다. 서비스 계정 키·발송 비밀키·수신자 주소를 공개 저장소에 넣지 않는다.

## 비용·한도와 운영 확인

Google 공식 문서의 일반 소비자 계정 MailApp 할당은 하루 수신자 100명이며, 다른 Apps Script 작업과 계정 한도를 공유하고 변경될 수 있다. 실제 남은 한도를 매 발송 전에 확인한다. 5분 주기는 하루 약 288회지만 실행 지연·서비스 제한으로 달라진다. Firestore 기존 무료 읽기 할당도 사용하며 빈 쿼리에도 최소 읽기 비용이 적용될 수 있다. 새로운 결제·유료 요금제·Firebase Functions는 사용하지 않는다. 일반 소비자 계정의 트리거 총 실행 시간 제한도 확인한다.

- https://developers.google.com/apps-script/guides/services/quotas
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/guides/triggers/installable
- https://firebase.google.com/docs/firestore/use-rest-api
- https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/runQuery

현재 실제 권한 승인·시험 메일 도착·트리거 실행 여부는 `ops/private-email-alert-verification-20261117.json`의 검증 상태를 따른다. 로컬 검사 통과를 운영 연결 성공으로 표현하지 않는다.
