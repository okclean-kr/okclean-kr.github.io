# 2026-11-10 회원관리 안정 상태

검증 완료:
- 회원가입
- 쿠폰 발급
- Firestore 저장
- 관리자 목록 조회
- 상태 수정/저장
- 새로고침 후 유지
- 중복가입 방지
- 관리자 전용 개인정보 삭제
- member_requests + member_receipts batch delete
- 관리자 UID/Google provider 확인
- 정기 GitHub 백업

복구 기준 브랜치:
- backup/member-delete-verified-20261110

현재 main:
96f8a43cfedd103480de29ed2fd11baadcdca344

삭제 도구:
https://okclean-kr.github.io/admin/delete.html

기존 관리자:
https://okclean-admin-app.web.app/admin/
