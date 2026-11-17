# 오케이청소 Threads 미디어 운영·복구

대상은 이 저장소와 `@ky.lee0912`뿐입니다. 기존 PR #60과 기존 워크플로를 확장했습니다.
08시·16시(KST)만 자동 게시 후보입니다. 20시는 수동이며 프로그램에서 차단합니다.

## 연결 상태와 활성화 조건

2026-11-17 13:49 KST 실행 로그(run 44019848923)는 `OKC_THREADS_ENABLED`, `OKC_THREADS_ACCESS_TOKEN`이 비어 있고 실제로 disabled 종료했습니다. Actions 성공을 게시 성공으로 해석하면 안 됩니다. 새로운 audit는 `blocked-missing-okclean-token`을 명시합니다. 현재 연결이나 실제 게시를 완료로 간주하지 않습니다.

저장소 Settings → Secrets and variables → Actions에서 오케이청소 전용 설정만 사용합니다.

| 종류 | 이름 | 의미 |
| --- | --- | --- |
| Secret | OKC_THREADS_ACCESS_TOKEN | 소유자가 부여한 Threads 전용 토큰. 다른 브랜드 토큰 금지 |
| Variable | OKC_THREADS_EXPECTED_USER_ID | 공식 `/me`로 확인한 오케이청소 숫자 사용자 ID |
| Variable | OKC_THREADS_ENABLED | 기존 게시 스위치. 검증 전 변경하지 않음 |
| Variable | OKC_THREADS_MEDIA_ENABLED | 미디어 운영 스위치. 미설정은 false |
| Secret | OKC_INSTAGRAM_ACCESS_TOKEN | Instagram Login용 전용 토큰. 현재 미확인 |
| Secret | OKC_OPENAI_API_KEY | 선택 사항. 승인된 기존 AI 공급자가 있을 때만 사용 |
| Variable | OKC_OPENAI_MODEL | 승인된 공급자의 모델 이름 |
| Variable | OKC_AI_ENABLED | 비용 승인을 받은 경우에만 true. 현재 미설정 |

소스 식별자는 `threads-sources.json`에 있습니다. 소유 블로그 boss6008·cleankoreacoop, Instagram ky.lee0912, YouTube UCjo7jtGpV6OMwc4Gm-kWl2A. Instagram 숫자 ID는 실제 API 대조가 필요합니다.

## 수집과 승인

- `python scripts/threads/collect.py`: 기존 공개 사진 원본 경로·SHA-256·dHash를 목록화. 기존 승인과 파일은 보존.
- `python scripts/threads/collect.py --network`: 소유 RSS에서 원본 사진을 비공개 `.okclean-private/`에 확보. 실제 원본 수집 성공은 미검증. GitHub run 44041080715에서 RSS는 두 블로그 각각 50개 글, 이미지 참조 43개·41개로 실제 수신 확인. 전체 과거 글이나 모든 본문 사진을 수집하는 도구는 아님(피드별 최근 5개 이미지 후보).
- Instagram은 지정한 숫자 ID/사용자명/전용 토큰이 모두 맞을 때만 공식 API를 사용. 현재 최대 50개 목록과 접근 가능한 이미지/영상 원본을 비공개 확보하며, pagination_remaining을 기록. 전체 과거 미디어/캐러셀 완전 수집은 미구현.
- YouTube의 임의 다운로드는 구현하지 않음. 소유 원본을 `register-owner.py`로 등록하고 원 게시 영상과의 대응 관계를 별도로 확인. 소유 채널 확인만으로 원본 대응 검증을 대신하지 않음.
- `python scripts/threads/register-owner.py .okclean-private/owner-originals/원본.mp4`: 원본 불변 검사와 영상 메타데이터·샘플 프레임 해시 등록. 원본 보관 위치의 비공개 대응표는 `.okclean-private/`에만 저장.
- 새 원본을 공개 Git 저장소에 넣지 않음. 비공개 원본의 영속 백업·자동 동기화는 별도 원본 보관소 연결이 필요. 기존 제공 원본은 기존 보관본을 유지.
- 홈페이지 공개 또는 과거 cases.json의 kind=case는 Threads 재사용 동의나 실제 현장 증거로 승격하지 않음. rights/consent/privacy/synthetic은 직접 근거로 검토해야 함.
- `prepare.py 원본 새경로 --type image|video`는 새 JPEG/MP4만 생성. 기존 출력 덮어쓰기 금지, EXIF 제거, MP4 H264/yuv420p/30fps/faststart, 음원 권리 미확인으로 영상 음성은 기본 제거. 원음 유지 기능은 별도 검토 대상.
- `threads-media/`에 공개할 변환본만 검토 후 등록하고 원본 SHA와 변환본 SHA, 공개 URL을 연결. 현재 공개 변환본 없음.
- `node scripts/threads/drafts.mjs YYYY-MM-DD 08|16`: AI가 설정된 경우에만 미승인 원고 생성. 10편 주기 7정보/2사례/1상담. 관찰 근거 외 현장 사실 금지. 기존 예약 작업에서 다음날 08·16시 초안을 공급하도록 연결했지만, 공급자 미설정으로 실제 AI 호출은 미검증.
- 검토한 큐 원고에 `node scripts/threads/approve.mjs okc-ID 검토자` 실행. 본문·타입·자산 ID가 바뀌면 승인 무효. 자동 생성은 스스로 승인하지 않음.
- 현재 사진·영상의 개인정보 자동 인식은 구현하지 않음. 검토자와 근거가 있는 수동 검사 통과만 허용.

## 게시 및 불명확한 결과

1. 기존 워크플로의 기본 수동 실행은 audit이며 절대 게시하지 않음. push/PR 검사는 게시하지 않음.
2. 매 실행 `/me` 숫자 ID와 사용자명 모두 일치해야 함. 본문 URL/도메인/해시태그/CTA 중복 차단.
3. 공식 계정의 전체 페이지 이력을 읽어 원장에 없는 과거 글도 텍스트 해시 중복 방지에 사용. 상한을 넘겨 이력이 불완전하면 게시 차단. 수동 과거 미디어의 바이너리 중복 대조는 아직 미구현.
4. 같은 날짜/슬롯/ID/텍스트 해시/사진 해시/근접 시각 해시를 차단. 하루 자동 시도 상한 2개, 기존 Actions 잠금 유지.
5. API 변경 호출 전 claim을 원격 Git에 저장. 원격 저장 실패 시 API 호출 차단. 컨테이너 ID도 게시 전에 저장. blog 동시 갱신 충돌 때 강제 push하지 않고 실패 처리.
6. JPEG/MP4 공개 URL에서 실제 바이트를 재확보해 MIME·용량·해시·ffprobe 형식 검사. 지정된 오케이청소 호스팅만 허용, 리다이렉트/서명 쿼리 거부.
7. 컨테이너 생성 → 처리 상태 조회 → 준비 확인 → 계정·URL 재검사 → 게시 → 공식 API의 ID/본문/계정/타입 대조. 각 상태를 저장.
8. 읽기 요청만 한시적 네트워크/429/5xx 오류를 최대 3회 재시도. 변경 요청의 모호한 결과는 맹목 재시도하지 않음.
9. 미해결 원장이 하나라도 있으면 신규 발행 차단. 다음 실행에서 컨테이너와 공식 게시물을 읽어 대조. PUBLISHED + 고유 일치 결과만 published로 복구. FINISHED만으로 재발행하지 않음. 사용자 검토가 필요한 불명확한 상태는 차단 유지.
10. 성공 확정 전에는 published로 기록하지 않음. 미디어 실패를 텍스트로 숨기지 않으며 자동 텍스트 대체는 현재 미구현. 실패 로그·Actions 오류 주석·상태 파일·실패 artifact를 제공하고 외부 메시지는 보내지 않음.

## 백업과 복구

수정 전 스냅샷: `backup/okclean-threads-before-media-20261117-c30a69d` (`c30a69d70b04b3659e7ebc2685adcd24a23c6ce8`). 기존 PR 변경과 원장·큐·워크플로를 포함하는 전체 Git 트리. 토큰은 Git에 없으며 백업하지 않음.

복구는 스냅샷에서 **코드만** 새 브랜치로 복원하여 검토·병합. 현재 운영 원장/큐/자산 승인 기록은 옛 빈 데이터로 덮어쓰지 않음. 예: `git restore --source c30a69d70b04b3659e7ebc2685adcd24a23c6ce8 -- .github/workflows/okclean-threads.yml scripts/okclean-threads-publish.mjs`. 이 구버전은 미디어를 게시하지 못하므로 미디어 운용 스위치를 유지·검토해야 함. 롤백 시점의 활성 큐는 별도로 보존하고 승인 큐와 실제 이력을 대조한 후 복구.

수정 전 핵심 파일을 격리 디렉터리로 archive→extract→바이트 비교하여 복구 가능함을 확인. 앞으로 실제 게시 후에는 이전 원장으로 되돌려 게시하지 않음. 기존 source-backup 워크플로는 수정하지 않음.

## 남은 운영 검증

전용 Threads 인증·숫자 ID, 실제 과거 게시물 대조, 사진/영상 권한·개인정보 검사, 승인 원고, 공개 변환본, 실제 사진 1건·영상 1건 성공, Instagram 권한/원본 접근, YouTube 원본 매핑, 비공개 원본 자동 보관, AI 공급자 실제 호출, 프로필 링크 클릭의 최종 이동·실제 견적 접수 확인. 공개 브라우저에서 기존 게시물 5개와 팔로워 18명, 홈페이지 링크 표시는 확인했고, 홈페이지 무료견적 버튼→신청 화면→세탁기 질문 전환은 확인. 로그인 요구로 프로필 클릭의 최종 이동은 미검증. 이러한 항목은 테스트 통과와 별개이며 완료로 처리하지 않음.

홈페이지/무료견적/개인정보 처리방침은 이번 PR에서 수정하지 않음. 계정 통계·계약 건수는 추정 생성하지 않음.

공식 규격·절차 근거:
- https://developers.facebook.com/documentation/threads/posts
- https://developers.facebook.com/documentation/threads/troubleshooting
- https://developers.facebook.com/docs/instagram-platform/reference/instagram-media/v21.0/
- https://developers.openai.com/api/reference/resources/responses/methods/create
