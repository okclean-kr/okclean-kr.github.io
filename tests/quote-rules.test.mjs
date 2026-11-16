import{initializeTestEnvironment,assertFails,assertSucceeds}from'@firebase/rules-unit-testing';
import * as f from'firebase/firestore';
import{readFileSync}from'node:fs';import assert from'node:assert/strict';
import{submitQuote,saveAdminChange,purgeExpiredQuote}from'../quote/quote-store.mjs';
const projectId='demo-okclean-quotes',rules=readFileSync('ops/firestore.rules.quotes-20261116.txt','utf8');
const env=await initializeTestEnvironment({projectId,firestore:{rules}});
const catalog=JSON.parse(readFileSync('quote/catalog.json','utf8'));let count=0;
const auth=uid=>({uid,providerData:[{providerId:'google.com'}]});
const a=env.authenticatedContext('customer-a',{firebase:{sign_in_provider:'anonymous'}}).firestore();
const other=env.authenticatedContext('customer-b',{firebase:{sign_in_provider:'anonymous'}}).firestore();
const guest=env.unauthenticatedContext().firestore();const uid='H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
const admin=env.authenticatedContext(uid,{firebase:{sign_in_provider:'google.com'}}).firestore();
const wrongProvider=env.authenticatedContext(uid,{firebase:{sign_in_provider:'anonymous'}}).firestore();
const input={service:'aircon',answers:{type:'벽걸이',count:'1',condition:'보통'},name:'통합시험',phone:'010-0000-0000',region:'춘천',contactTime:'언제나 가능',date:'',source:'direct',consent:true};
const id=('Q'.repeat(19)+'1'),adminId=('A'.repeat(19)+'1'),photo={data:'data:image/jpeg;base64,/9j/AAAA'};
const backend=(db,user)=>({db,f,auth:{currentUser:auth(user)}});
async function ok(name,fn){await fn();count++;console.log('PASS',name);}
try{
 await env.clearFirestore();
 await ok('고객 신청+영수증+5장 사진 일괄 저장',()=>assertSucceeds(submitQuote(catalog,id,input,Array(5).fill(photo),{backend:backend(a,'customer-a')})));
 await ok('동일 접수번호 재시도 중복 저장 없음',async()=>{const r=await submitQuote(catalog,id,input,[],{backend:backend(a,'customer-a')});assert.equal(r.existing,true);});
 await ok('접수번호 확인은 본인만',async()=>{await assertSucceeds(f.getDoc(f.doc(a,'quote_receipts','customer-a_'+id)));await assertFails(f.getDoc(f.doc(other,'quote_receipts','customer-a_'+id)));await assertFails(f.getDocs(f.collection(a,'quote_receipts')));});
 await ok('익명·다른 고객 견적 조회·목록 차단',async()=>{for(const db of[guest,a,other,wrongProvider]){await assertFails(f.getDoc(f.doc(db,'quote_requests',id)));await assertFails(f.getDocs(f.collection(db,'quote_requests')));}});
 await ok('사진은 관리자만 열람',async()=>{for(const db of[guest,a,other,wrongProvider])await assertFails(f.getDocs(f.collection(db,'quote_requests',id,'photos')));assert.equal((await f.getDocs(f.collection(admin,'quote_requests',id,'photos'))).size,5);});
 await ok('5분 내 다른 접수 중복·도배 방지',()=>assertFails(submitQuote(catalog,('Q'.repeat(19)+'2'),input,[],{backend:backend(a,'customer-a')})));
 await ok('고객의 시험 접수 위장 차단',()=>assertFails(submitQuote(catalog,('Q'.repeat(19)+'3'),input,[],{backend:backend(other,'customer-b'),test:true})));
 await ok('실패한 배치에 고아 사진·접수 문서 없음',async()=>{assert.equal((await f.getDoc(f.doc(admin,'quote_requests',('Q'.repeat(19)+'3')))).exists(),false);});
 await ok('관리자 시험 접수 별도 표시',()=>assertSucceeds(submitQuote(catalog,adminId,input,[photo],{backend:backend(admin,uid),test:true})));
 let row=()=>f.getDoc(f.doc(admin,'quote_requests',id)).then(s=>s.data());
 await ok('고객 상태·소유권·가격 변경 차단',async()=>{for(const patch of[{status:'contracted'},{ownerUid:'customer-b'},{amount:-1},{admin:true}])await assertFails(f.updateDoc(f.doc(a,'quote_requests',id),patch));});
 await ok('신규에서 계약 바로 완료 차단',async()=>{const previous=await row();await assertFails(saveAdminChange(backend(admin,uid),id,previous,{status:'contracted'}));});
 await ok('관리자 상담 상태·메모 저장+이력',async()=>{await assertSucceeds(saveAdminChange(backend(admin,uid),id,await row(),{status:'consulting',memo:'시험 상담'}));assert.equal((await row()).memo,'시험 상담');});
 await ok('오래된 화면 변경 덮어쓰기 차단',async()=>{await assert.rejects(saveAdminChange(backend(admin,uid),id,{version:0},{memo:'stale'}));});
 await ok('전달 확인 없는 견적 발송 차단',async()=>{await assertFails(saveAdminChange(backend(admin,uid),id,await row(),{status:'sent',amount:100000}));});
 await ok('견적 금액·실제 전달 시각 저장',()=>row().then(r=>assertSucceeds(saveAdminChange(backend(admin,uid),id,r,{status:'sent',amount:100000,deliveredAt:f.serverTimestamp()}))));
 await ok('실제 계약 완료 및 단일 이력',async()=>{await saveAdminChange(backend(admin,uid),id,await row(),{status:'contracted'});const docs=await f.getDocs(f.collection(admin,'quote_requests',id,'history'));assert.equal(docs.docs.filter(d=>d.data().event==='contract_completed').length,1);});
 await ok('완료 후 상태 되돌림·불법 값·필드 삭제 차단',async()=>{const r=await row();for(const patch of[{status:'consulting'},{amount:-1},{memo:'a'.repeat(1001)},{name:'임의 변경'},{ownerUid:'customer-b'},{memo:f.deleteField()},{extra:'x'}])await assertFails(f.updateDoc(f.doc(admin,'quote_requests',id),{...patch,version:r.version+1,updatedAt:f.serverTimestamp()}));});
 await ok('고객 추가 사진·형식 위장·수정 차단',async()=>{for(const db of[a,other])await assertFails(f.setDoc(f.doc(db,'quote_requests',id,'photos','4'),{ownerUid:'customer-a',data:photo.data,createdAt:f.serverTimestamp()}));});
 await ok('보관기간 전 실제 자료 삭제 차단',async()=>{await assertFails(f.deleteDoc(f.doc(admin,'quote_requests',id)));await assertFails(f.deleteDoc(f.doc(admin,'quote_requests',id,'photos','0')));});
 await ok('기존 회원·쿠폰·상품·통계 권한 보존',async()=>{
  await assertFails(f.getDocs(f.collection(a,'member_requests')));await assertSucceeds(f.getDocs(f.collection(admin,'member_requests')));await assertSucceeds(f.getDocs(f.collection(guest,'products')));
  const event={schema:1,event:'page_view',source:'direct',page:'home',service:'unknown',placement:'other',target:'none',test:false,at:f.serverTimestamp()};await assertSucceeds(f.setDoc(f.doc(f.collection(guest,'site_events')),event));await assertFails(f.getDocs(f.collection(guest,'site_events')));
  for(const name of['quote_step_complete','quote_calculate','quote_submit_success','phone_click'])await assertSucceeds(f.setDoc(f.doc(f.collection(guest,'site_events')),{...event,event:name}));
 });
 await ok('관리자 아닌 UID의 회원 관리자 위장 차단',()=>assertFails(f.getDocs(f.collection(wrongProvider,'member_requests'))));
 // Separate owners exercise create-only attacks without the 5-minute limiter masking schema checks.
 for(const[name,mutate]of[
  ['이름 최대 길이',d=>d.name='x'.repeat(31)],['다른 고객 UID',d=>d.ownerUid='customer-a'],['필수 필드 누락',d=>delete d.contactTime],['불명 서비스',d=>d.service='fake'],['무관 질문',d=>d.answers.rooms='2'],['1MB 주입',d=>d.answers.condition='x'.repeat(200000)],['잘못된 시각',d=>d.createdAt=f.Timestamp.fromMillis(0)],['기본 계약 상태 위장',d=>d.status='contracted'],['알 수 없는 필드',d=>d.secret='x']]){
  await ok('악성 생성 차단: '+name,async()=>{const testUid='attack-'+count,db=env.authenticatedContext(testUid,{firebase:{sign_in_provider:'anonymous'}}).firestore();const{payload}=await import('../quote/quote-store.mjs');const data=payload(input,testUid,f,0,false);mutate(data);const attackId='A'.repeat(20);const batch=f.writeBatch(db);batch.set(f.doc(db,'quote_requests',attackId),data);batch.set(f.doc(db,'quote_receipts',testUid+'_'+attackId),{ownerUid:testUid,requestId:attackId,createdAt:f.serverTimestamp(),service:'aircon',test:false});batch.set(f.doc(db,'quote_limits',testUid),{ownerUid:testUid,requestId:attackId,at:f.serverTimestamp()});await assertFails(batch.commit());});
 }
 for(const[serviceIndex,service]of catalog.services.entries()){
  await ok('실제 서비스 저장: '+service.id,async()=>{const testUid='service-'+serviceIndex,db=env.authenticatedContext(testUid,{firebase:{sign_in_provider:'anonymous'}}).firestore();const core=(await import('node:module')).createRequire(import.meta.url)('../quote/quote-core.js');const answers=Object.fromEntries(core.FIELDS[service.id].map(k=>[k,({size:'25',unit:'평',tier:service.tiers?.[0].name,rooms:'2',baths:'1',count:'1',type:service.variants?.[0].name||'러그',purpose:'입주청소',condition:'보통',space:'아파트',material:'확인 필요',stain:'없음',frequency:'일회성',industry:'사무실',scope:'바닥',time:'오전',height:'1층'})[k]||'확인 필요']));await assertSucceeds(submitQuote(catalog,'S'.repeat(18)+String(serviceIndex).padStart(2,'0'),{...input,service:service.id,answers},Array(5).fill(photo),{backend:backend(db,testUid)}));});
 }
 await ok('180일 만료 새 견적·사진·이력·접수증·제한표시 정리',async()=>{
  const oldId='Z'.repeat(20),oldUid='expired-customer',at=f.Timestamp.fromMillis(Date.now()-181*86400000);await env.withSecurityRulesDisabled(async ctx=>{const db=ctx.firestore();const{payload}=await import('../quote/quote-store.mjs');const batch=f.writeBatch(db);batch.set(f.doc(db,'quote_requests',oldId),{...payload(input,oldUid,f,1),createdAt:at});batch.set(f.doc(db,'quote_requests',oldId,'photos','0'),{ownerUid:oldUid,data:photo.data,createdAt:at});batch.set(f.doc(db,'quote_receipts',oldUid+'_'+oldId),{requestId:oldId,ownerUid:oldUid});batch.set(f.doc(db,'quote_limits',oldUid),{requestId:oldId,ownerUid:oldUid,at});await batch.commit();});
  await assertSucceeds(purgeExpiredQuote(backend(admin,uid),{id:oldId,ownerUid:oldUid,createdAt:at}));assert.equal((await f.getDoc(f.doc(admin,'quote_requests',oldId))).exists(),false);assert.equal((await f.getDoc(f.doc(admin,'quote_limits',oldUid))).exists(),false);
 });
 console.log('QUOTE_RULE_TESTS_PASSED='+count);
}finally{await env.cleanup();}
