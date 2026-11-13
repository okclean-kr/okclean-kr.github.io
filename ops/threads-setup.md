# 오케이청소 Threads 자동 게시

계정: @ky.lee0912 (이 계정 외 게시 금지)
워크플로: .github/workflows/okclean-threads.yml
게시 슬롯(한국시간): 08:00 정보글, 13:00 정보글, 20:00 실제 현장 사진 글.
하루 최대 3건. 공개 Github 저장소에 토큰/비밀번호 저장 금지.

## 연결 준비
1. https://developers.facebook.com/apps/ 에서 앱의 Threads 사용 사례(Access the Threads API)를 확인.
2. Threads 계정 소유자가 OAuth로 권한 threads_basic / threads_content_publish 부여.
3. 승인받은 액세스 토큰을 GitHub Actions Secret OKC_THREADS_ACCESS_TOKEN에 입력. **대화창에 토큰을 붙여 넣지 말 것**.
4. 검증 전에는 Repository variable OKC_THREADS_ENABLED를 설정하지 않거나 false로 유지.
5. 계정 조회로 username=ky.lee0912 확인하고, 원고 큐에 승인된 항목을 넣은 뒤 true로 전환.

## 안전장치
- 큐는 ops/threads-queue.json (배열). 예시:
  {"id":"okc-20261114-08","day":"2026-11-14","slot":"08","type":"text","text":"30자 이상 정보글 ...\n무료견적은 프로필링크 확인","approved":true}
- 오후 20시는 type=field 및 공개 HTTPS image_url 필수. 사용자 승인된 실제 현장 사진만.
- 검수되지 않은 날짜/원고는 자동 게시하지 않음.
- 게시 토큰의 사용자명 교차 검증, URL 차단, CTA, 하루 3건 상한, 콘텐츠 해시 중복 방지.
- 호출 전 attempted-unconfirmed 상태 저장. GitHub Actions의 always() 단계에서 원장 커밋을 시도. 성공 응답이면 published.
- attempted-unconfirmed 항목은 자동 재게시하지 않음. Threads에서 실제 게시 여부 대조 후 원장 수동 정리 필요.
- API 응답 실패, 원장 커밋 실패, 토큰 만료는 자동 재시도로 중복 게시하지 않음.
- 워크플로와 공개 코드만 설치하며 Meta 계정 실제 OAuth 연결 여부는 별도 확인 필요.
