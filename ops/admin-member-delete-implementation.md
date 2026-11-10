# Firebase 관리자 회원 삭제 기능 구현안

대상 운영 화면: https://okclean-admin-app.web.app/admin/

## admin.js 변경

현재 Firestore import:

```js
import {getFirestore,collection,query,orderBy,limit,onSnapshot,doc,updateDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
```

아래처럼 변경:

```js
import {getFirestore,collection,query,orderBy,limit,onSnapshot,doc,updateDoc,writeBatch,getDoc} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
```

회원 상세 카드의 저장 버튼 아래에 관리자 전용 삭제 버튼을 추가:

```html
<button type="button" class="danger" data-delete="${esc(m.id)}"
  data-name="${esc(m.name)}" data-code="${esc(m.code)}">
  개인정보 삭제
</button>
```

기존 save click handler와 별도로 아래 handler 추가:

```js
$('members').addEventListener('click', async e => {
  const b=e.target.closest('[data-delete]');
  if(!b) return;

  const id=b.dataset.delete;
  const name=b.dataset.name || '';
  const code=b.dataset.code || '';

  const first=confirm(
    '이 회원의 개인정보와 쿠폰 확인정보를 함께 삭제합니다.\n' +
    '삭제 후 복구할 수 없습니다. 계속하시겠습니까?'
  );
  if(!first) return;

  const typed=prompt(
    '삭제 확인을 위해 회원 이름 또는 쿠폰번호를 입력하세요.'
  );
  if(typed!==name && typed!==code){
    msg('삭제가 취소되었습니다. 확인값이 일치하지 않습니다.');
    return;
  }

  b.disabled=true;
  try{
    const memberRef=doc(db,'member_requests',id);
    const receiptRef=doc(db,'member_receipts',id);

    const batch=writeBatch(db);
    batch.delete(memberRef);
    batch.delete(receiptRef);
    await batch.commit();

    const [memberAfter,receiptAfter]=await Promise.all([
      getDoc(memberRef),
      getDoc(receiptRef)
    ]);

    if(memberAfter.exists() || receiptAfter.exists()){
      throw new Error('DELETE_NOT_CONFIRMED');
    }

    msg('개인정보 삭제가 완료되었습니다.');
  }catch(err){
    msg('삭제 실패: '+(err.code||err.message||'unknown'));
  }finally{
    b.disabled=false;
  }
});
```

## Firestore 규칙 변경

기존:

```rules
match /member_requests/{id} {
  ...
  allow delete: if false;
}

match /member_receipts/{id} {
  ...
  allow update, delete: if false;
}
```

제안:

```rules
match /member_requests/{id} {
  ...
  allow delete: if isAdmin();
}

match /member_receipts/{id} {
  ...
  allow update: if false;
  allow delete: if isAdmin();
}
```

일반 사용자의 delete 권한은 열지 않는다.

## 검증 절차

1. 테스트 회원 1건을 별도로 만든다.
2. 관리자 Google 계정으로 로그인한다.
3. 잘못된 이름/쿠폰 입력 시 삭제가 거부되는지 확인한다.
4. 정확한 확인값 입력 후 삭제한다.
5. member_requests/{uid}가 사라졌는지 확인한다.
6. member_receipts/{uid}가 사라졌는지 확인한다.
7. 관리자 목록에서 해당 회원이 사라지는지 확인한다.
8. 기존 회원 수정/저장 기능이 그대로 동작하는지 확인한다.
9. 일반 익명 사용자에서 delete가 permission-denied인지 확인한다.

## 운영 원칙

- 실제 고객 데이터로 최초 테스트하지 않는다.
- 테스트 회원만 사용한다.
- 두 문서 삭제는 반드시 writeBatch로 처리한다.
- Firebase Spark 무료 플랜을 유지한다.
- Cloud Functions, Blaze 요금제, 유료 기능을 사용하지 않는다.
