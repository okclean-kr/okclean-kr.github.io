# Firebase 관리자 필터 F5 유지 패치안

대상:
- https://okclean-admin-app.web.app/admin/

현재 문제:
- 상태 필터를 '상담중' 등으로 선택한 뒤 F5 새로고침하면 '전체 상태'로 초기화됨.
- 회원 데이터/저장에는 문제가 없고 UI 필터값만 초기화되는 현상.

## 최소 수정

현재 admin.js의 아래 부분:

```js
$('search').oninput=render;
$('statusFilter').onchange=render;
```

를 아래처럼 교체:

```js
const FILTER_KEY='okclean_admin_filters_v1';

function saveFilters(){
  try{
    localStorage.setItem(FILTER_KEY,JSON.stringify({
      search:$('search').value,
      status:$('statusFilter').value
    }));
  }catch(_){}
}

function restoreFilters(){
  try{
    const saved=JSON.parse(localStorage.getItem(FILTER_KEY)||'{}');
    if(typeof saved.search==='string') $('search').value=saved.search;
    if(typeof saved.status==='string') $('statusFilter').value=saved.status;
  }catch(_){}
}

restoreFilters();

$('search').oninput=()=>{
  saveFilters();
  render();
};

$('statusFilter').onchange=()=>{
  saveFilters();
  render();
};
```

## 기대 동작

- 상담 상태 필터 선택 유지
- 검색어 유지
- F5 후 동일 필터 복원
- 로그아웃/재로그인 후에도 같은 브라우저에서는 필터 유지
- 회원 데이터와 Firestore 문서는 변경하지 않음

## 선택 기능: 필터 초기화

원하면 '필터 초기화' 버튼에서 아래 실행:

```js
localStorage.removeItem(FILTER_KEY);
$('search').value='';
$('statusFilter').value='';
render();
```

## 안전성

- 브라우저 localStorage에 검색어/필터값만 저장
- 이름/전화번호/회원 전체 데이터는 저장하지 않음
- Firestore read/write 규칙 변경 없음
- 기존 상태 저장 기능 변경 없음

## 배포 전 회귀 테스트

1. '상담중' 필터 선택
2. F5
3. '상담중' 유지 확인
4. 검색어 입력
5. F5
6. 검색어 유지 확인
7. 회원 상태 수정 후 저장
8. F5 후 저장값 유지 확인
9. 로그아웃/로그인 정상 확인
