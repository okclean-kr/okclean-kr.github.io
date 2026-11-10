// 공개 회원가입용 최소 권한 클라이언트: 회원 목록을 읽을 권한은 없습니다.
import {initializeApp, getApps, getApp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js';
import {getAuth, signInAnonymously, signOut} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js';
import {getFirestore, doc, writeBatch, serverTimestamp} from 'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js';
export async function submitMember(config, m){
  const app=getApps().length?getApp():initializeApp(config);
  const auth=getAuth(app); if(!auth.currentUser) await signInAnonymously(auth);
  const db=getFirestore(app);
  // Firestore 규칙은 member_requests/{uid} 형태만 허용합니다.
  // 같은 익명 UID에서 재시도하면 같은 접수 문서를 갱신해 중복 생성을 막습니다.
  const payload=()=>({
    name:String(m.name||'').slice(0,30),phone:String(m.phone||'').slice(0,20),
    area:String(m.area||'').slice(0,40),free:String(m.free||'').slice(0,80),
    ad:!!m.ad,code:String(m.code||'').slice(0,20),ref:String(m.ref||'').slice(0,20),
    joined:serverTimestamp(),status:'신규',couponStatus:'미사용',freeStatus:'미제공',
    memo:'',points:0,grade:'새싹',ownerUid:auth.currentUser.uid
  });
  const commitSignup=async()=>{
    const id=auth.currentUser.uid;
    const batch=writeBatch(db);
    const member=payload();
    batch.set(doc(db,'member_requests',id),member);
    batch.set(doc(db,'member_receipts',id),{
      ownerUid:id,
      requestId:id,
      code:member.code,
      joined:serverTimestamp()
    });
    await batch.commit();
    return id;
  };
  let id;
  try {
    id=await commitSignup();
  } catch (e) {
    // create-only 규칙상 이전 실패 시도에서 문서가 남아 있거나 세션이 꼬인 경우
    // 새 익명 UID로 한 번만 재시도합니다.
    if(e?.code!=='permission-denied') throw e;
    await signOut(auth);
    await signInAnonymously(auth);
    id=await commitSignup();
  }
  return {id,uid:auth.currentUser.uid};
}
