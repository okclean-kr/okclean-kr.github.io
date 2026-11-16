# 오케이청소 견적 접수 운영 검증 결과 — 2026-11-17

현재 홈페이지와 상세 견적 접수는 운영 중이다. 외부 이메일 알림의 Google 승인·운영 조회·시험 메일 실제 도착·단일 5분 트리거 생성을 확인했다. 실제 예약 회차는 추가 검증 중이며, 트리거 생성만으로 예약 실행 성공을 보고하지 않는다.

| 항목 | 완료 여부 | 실제 검증 결과 |
|---|---|---|
| 기존 홈페이지 백업 | 완료 | 변경 전 126개 소스 파일을 ZIP과 Git 백업 브랜치로 보존. 고객 자료는 별도로 11월 16일 23:21 KST에 암호화 내보내기하고 복호화·체크섬을 검증했다. |
| 간편 견적 계산 | 완료 | 기존 계산기를 유지하고 296개 가격 조합을 비교. 확인된 기존 기준을 사용하며 확정 견적으로 표시하지 않는다. |
| 상세 견적 신청 | 완료 | 운영 서버 시험 접수 2건에서 저장·접수증 재조회·같은 번호 재시도·저장 실패 후 입력 보존을 확인. 실제 고객 집계와 분리. |
| 서비스별 맞춤 질문 | 완료 | 기존 홈페이지에서 확인한 12개 서비스에 맞게 질문 표시. 임의 서비스나 가격을 추가하지 않았다. |
| 현장 사진 첨부 | 완료 | 최대 5장 형식·헤더·디코딩·용량 검사와 JPEG 압축 후 비공개 저장. 운영 시험에서 5장 저장·관리자 열람·다른 고객 접근 거부 확인. |
| 관리자 접수 관리 | 완료 | 기존 Google 관리자 로그인·신규 목록·필터·상태·메모·견적 전달 이력·시험 계약·재접속 검증. 실제 계약이 발생한 것으로 집계하지 않는다. |
| 상담 알림 | 부분 완료 | 관리자 화면을 열어 둔 동안의 알림·실패 기록·재확인 기능 검증. 별도 이메일은 Google 승인·시험 메일 도착·단일 5분 트리거 생성 완료. 실제 예약 회차는 검증 중. |
| 작업 사진·후기 | 부분 완료 | 기존 실제 작업 3건·지역 필터·서비스별 견적 연결 유지. 확인된 같은 현장 전후 사진 쌍과 동의된 후기 원문이 없어 새 비교·후기·별점은 생성하지 않았다. |
| 서비스 지역 안내 | 완료 | 기존 지역 안내와 모바일 선택 사용. 지역 선택만으로 출장 가능 여부를 확정하지 않고 일정·거리·작업 규모 및 추가비를 상담에서 확인하도록 안내. |
| 상담 전환 통계 | 완료 | 견적 시작·단계·계산·저장 성공·카카오톡·전화·관리자 계약 처리 연결 및 날짜·서비스·유입 출처별 집계. 시험 접수 분리. 페이지 조회·클릭·신청·계약 의미를 구분. |
| 보안·모바일 테스트 | 완료 / 범위 명시 | 250개 자동 검사 통과, 제외 0. 고객 간 접근 차단과 관리자 권한 검사. PC 및 실제 브라우저 390px 모바일 화면 검증. 물리 휴대전화 시험과 신규 운영 회원가입·쿠폰 발급은 수행하지 않았다. |
| 실제 운영 배포 | 완료 | PR #41~#51 반영. 최신 소스 PR #51 병합 SHA `131f28586df074a32d7959c606f6ac7dddeb915d`. 운영 URL의 11개 파일이 HTTP 200이며 소스와 바이트 일치. |

## 주소와 근거

- 홈페이지: https://okclean-kr.github.io/
- 상세 견적: https://okclean-kr.github.io/quote/
- 견적 관리: https://okclean-kr.github.io/admin/quotes.html
- 고객 자료 백업 도구: https://okclean-kr.github.io/admin/backup.html
- 최신 PR: https://github.com/okclean-kr/okclean-kr.github.io/pull/51
- 최신 PR 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43906386405
- 운영 브랜치 검사: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43911265160
- 소스 배포: https://github.com/okclean-kr/okclean-kr.github.io/actions/runs/43911264196

검사 250개는 Node·DOM 158개, 견적 규칙 45개, 회원 규칙 12개, 백업 규칙 6개, 메일 REST 격리 검사 6개, 작업 사례 Python 23개의 합이다. 메일 REST 검사는 loopback Emulator에서만 실행했으며 Google OAuth/IAM 또는 실제 메일 수신 검사를 대신하지 않는다. 검사 수는 고객·계약 건수가 아니다.

세부 증거는 `ops/quote-verification-20261116.json`, `ops/intake-reconnect-verification-20261116.json`, `ops/customer-backup-verification-20261116.json`, `ops/private-email-alert-verification-20261117.json`에 보관한다.

## 변경 파일

이번 PR #51은 `notifications/apps-script/Code.gs`, `notifications/apps-script/appsscript.json`, `notifications/apps-script/README.md`, `tests/mail-notifications.test.cjs`, `tests/mail-notifications-rest.test.mjs`, `package.json`, `.github/workflows/quote-checks.yml`, `ops/private-email-alert-verification-20261117.json`을 변경했다. 본 결과 문서는 후속 검증 기록이다.

견적 본체 변경은 `quote/`, `admin/quotes.html`, `admin/quotes.mjs`와 기존 홈페이지·통계 연결에 반영돼 있다. 이번 메일 작업에서 홈페이지 실행 코드·Firebase 규칙·요금제·고객 자료·블로그·Threads 자동화는 변경하지 않았다.

## 백업과 복구

- 변경 전 홈페이지 Git 백업: `backup/quote-before-20261116-70495bb` / `70495bb770959b45bd4f6f42e956ccb9fc0a2f7e`.
- 변경 전 소스 ZIP: `OKClean_before_quote_20261116_70495bb.zip`. 공개 소스만 포함하며 비공개 파일로 저장·전달했다.
- 메일 소스 반영 직전: `backup/mail-source-release-before-20261117-ad1fd16` / `ad1fd168992b51a506f310dec51a566706bf92a2`.
- 고객 자료 암호화 파일: `OKClean_customers_20261116232103_KST.okcbackup`. 복구키는 별도 비공개 파일로 보관한다. 공개 저장소에는 둘 다 올리지 않는다.
- 고객 백업은 알려진 회원·견적 스키마 17문서의 해당 시점 내보내기다. 변경 전 데이터베이스 스냅샷이나 Firebase 전체 DB·Auth 백업이 아니며, 운영 복원은 수행하지 않았다.
- 소스 문제는 해당 변경 커밋만 `git revert`로 복구하고 Pages 성공을 확인한다. 뒤에 추가된 자동화 자료를 과거 브랜치로 강제 덮어쓰지 않는다.
- 새 접수를 긴급 중지할 때는 `quote/config.js`의 enabled·verified를 false로 바꾸되 기존 접수 데이터는 보존한다. Firebase 규칙은 적용 직전 백업과 현재 차이를 확인한 후 별도로 복구한다.
- 코드 기본값은 비활성이고 현재 비공개 프로젝트는 명시적으로 활성화했다. 중지할 때 `pauseNotifications`를 실행하며 대기·커서를 보존한다. 복구 절차는 `notifications/apps-script/README.md`에 있다.

## 남은 확인

1. 사용자가 Google 권한 요청을 직접 승인했으며 운영 읽기 전용 사전검사를 통과했다. 시험 메일은 2026-11-17 02:01 KST에 실제 받은편지함에서 확인했다.
2. 2026-11-17 02:03 KST에 이메일을 활성화하고 시간 기반 트리거 한 개를 확인했다. 실제 예약 회차 검증이 남아 있으며, 실제 고객 신규 접수의 메일은 아직 발생하지 않았다.
3. 실제 현장 전후 사진과 동의된 후기 원문이 확보돼야 해당 콘텐츠를 추가할 수 있다.

현재 유료 결제·Firebase 요금제 변경·고객 삭제·기존 자동화 변경은 수행하지 않았다.
