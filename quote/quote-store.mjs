/* All quote/contact/photo records remain inside private Firestore collections. */
let backendPromise;
export async function getBackend(config){
 if(!backendPromise)backendPromise=Promise.all([
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'),
  import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
 ]).then(async([a,h,f])=>{const app=a.getApps().find(x=>x.name==='[DEFAULT]')||a.initializeApp(config);if(app.options.projectId!==config.projectId)throw new Error('Firebase 프로젝트 연결을 확인해 주세요.');const auth=h.getAuth(app);await auth.authStateReady();return{app,auth,db:f.getFirestore(app),f,h};}).catch(e=>{backendPromise=null;throw e;});
 return backendPromise;
}
export function newRequestId(){const bytes=crypto.getRandomValues(new Uint8Array(20));return Array.from(bytes,x=>'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[x%62]).join('');}
export function payload(input,uid,f,photoCount,test=false){return{
 schema:1,ownerUid:uid,service:input.service,answers:{...input.answers},name:input.name.trim(),phone:input.phone.trim(),region:input.region,contactTime:input.contactTime,
 consentVersion:'2026-11-16',createdAt:f.serverTimestamp(),updatedAt:f.serverTimestamp(),desiredAt:input.date?f.Timestamp.fromDate(new Date(input.date+'T12:00:00+09:00')):null,
 source:input.source,status:'new',memo:'',amount:null,deliveredAt:null,contractAt:null,photoCount,test,
 notification:'pending',notificationAttempts:0,notificationError:'',version:0
};}
export async function submitQuote(catalog,id,input,photos,options={}){
 const b=options.backend||await getBackend(catalog.firebase),{auth,db,f,h}=b;
 if(!auth.currentUser)await h.signInAnonymously(auth);
 const uid=auth.currentUser.uid,receipt=f.doc(db,'quote_receipts',uid+'_'+id);
 const old=await f.getDocFromServer(receipt);if(old.exists())return{id,existing:true};
 if(photos.length>5)throw new Error('사진은 최대 5장입니다.');
 const batch=f.writeBatch(db),ref=f.doc(db,'quote_requests',id),data=payload(input,uid,f,photos.length,!!options.test);
 batch.set(ref,data);
 photos.forEach((photo,i)=>batch.set(f.doc(ref,'photos',String(i)),{ownerUid:uid,data:photo.data,createdAt:f.serverTimestamp()}));
 batch.set(receipt,{ownerUid:uid,requestId:id,createdAt:f.serverTimestamp(),service:input.service,test:!!options.test});
 batch.set(f.doc(db,'quote_limits',uid),{ownerUid:uid,requestId:id,at:f.serverTimestamp()});
 // One commit: no completion or orphaned photos before all documents are accepted.
 await batch.commit();
 const saved=await f.getDocFromServer(receipt);
 if(!saved.exists()||saved.data().requestId!==id)throw new Error('접수 확인을 다시 시도해 주세요.');
 return{id,existing:false};
}
export async function saveAdminChange(b,id,previous,change){
 const{f,db}=b,ref=f.doc(db,'quote_requests',id);
 return f.runTransaction(db,async tx=>{
  const current=await tx.get(ref);if(!current.exists())throw new Error('접수 자료가 없습니다.');
  const before=current.data();if(before.version!==previous.version)throw new Error('다른 화면에서 변경됐습니다. 새로고침 후 다시 저장하세요.');
  const patch={...change,updatedAt:f.serverTimestamp(),version:before.version+1};
  if(change.status==='contracted'&&before.status!=='contracted')patch.contractAt=f.serverTimestamp();
  const event=f.doc(f.collection(ref,'history'));
  tx.update(ref,patch);
  tx.set(event,{at:f.serverTimestamp(),actor:b.auth.currentUser.uid,status:change.status??before.status,amount:Object.hasOwn(change,'amount')?change.amount:before.amount,note:change.memo??'',kind:change.notification?'notification':'management',event:change.status==='contracted'&&before.status!=='contracted'?'contract_completed':'quote_updated',version:before.version+1});
 });
}
export async function purgeExpiredQuote(b,row){
 if(!(row.createdAt?.toMillis?.()>0&&row.createdAt.toMillis()<Date.now()-180*86400000))throw new Error('180일 보관기간이 지나지 않았습니다.');
 const{f,db}=b,ref=f.doc(db,'quote_requests',row.id);
 // Subcollections are not deleted by Firestore when their parent is removed.
 for(const name of ['photos','history']){
  let docs;do{docs=await f.getDocs(f.query(f.collection(ref,name),f.limit(400)));if(docs.size){const batch=f.writeBatch(db);docs.docs.forEach(d=>batch.delete(d.ref));await batch.commit();}}while(docs.size===400);
 }
 const batch=f.writeBatch(db),limitRef=f.doc(db,'quote_limits',row.ownerUid);const last=await f.getDocFromServer(limitRef);if(last.exists()&&last.data().requestId===row.id)batch.delete(limitRef);batch.delete(f.doc(db,'quote_receipts',row.ownerUid+'_'+row.id));batch.delete(ref);await batch.commit();
}
