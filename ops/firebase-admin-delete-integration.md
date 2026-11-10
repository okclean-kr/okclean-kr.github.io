# Firebase 관리자 화면 삭제 기능 통합안

대상:
- https://okclean-admin-app.web.app/admin/

현재 상태:
- 회원 조회 정상
- 상담/쿠폰/무료서비스/등급/포인트/메모 저장 정상
- 개인정보 삭제는 별도 도구에서 정상 검증 완료
- 삭제 도구: https://okclean-kr.github.io/admin/delete.html

## 가장 안전한 1차 통합

기존 Firebase 관리자 앱의 `admin/index.html` 상단 도구 영역에 아래 링크 버튼을 추가한다.

```html
<a
  href="https://okclean-kr.github.io/admin/delete.html"
  target="_blank"
  rel="noopener"
  class="delete-tool-link"
>
  개인정보 삭제
</a>
```

CSS 예시:

```css
.delete-tool-link{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:8px 12px;
  border-radius:8px;
  background:#b42318;
  color:#fff;
  text-decoration:none;
  font-weight:700;
}
```

## 이 방식을 먼저 권장하는 이유

- 이미 실사용 검증된 삭제 도구를 그대로 사용
- 기존 admin.js 수정 없음
- 기존 저장/조회 기능에 회귀 위험 없음
- Firebase Hosting 배포 실패 시 index.html만 되돌리면 됨
- 삭제 도구는 정확한 관리자 UID와 Google provider를 별도로 확인함

## 2차 통합

향후 안정성 검증 후에만 기존 admin.js 안에 batch delete 코드를 직접 넣는다.
이 경우 다음을 반드시 유지한다.

- 정확한 관리자 UID 확인
- Google provider 확인
- 회원 이름 또는 쿠폰번호 재입력
- member_requests/{uid}와 member_receipts/{uid} writeBatch.delete()
- 삭제 후 두 문서 미존재 재확인
- 일반 사용자 delete 차단

## 배포 전 체크

1. 기존 Firebase Hosting 관리자 파일 백업
2. index.html만 수정
3. 로그인/회원목록/상태저장 회귀 테스트
4. 개인정보 삭제 링크 클릭 확인
5. 삭제 도구에서 관리자 권한 확인
6. 실제 고객 데이터는 삭제 테스트에 사용하지 않음

## 무료 범위

Firebase Spark 플랜 유지.
Cloud Functions/Blaze 불필요.
