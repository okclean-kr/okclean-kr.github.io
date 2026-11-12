// 수집 권한과 시험 저장·재조회를 확인한 배포에서만 두 값을 true로 바꿉니다.
// 측정 ID 문자열 또는 SDK 로딩 성공만으로 verified를 켜지 않습니다.
window.OKCLEAN_ANALYTICS = Object.freeze({
  enabled: false,
  verified: false
});
