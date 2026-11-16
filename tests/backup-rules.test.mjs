import{initializeTestEnvironment,assertFails}from'@firebase/rules-unit-testing';
import*as f from'firebase/firestore';
import{readFileSync}from'node:fs';import assert from'node:assert/strict';
import{collectCustomerBackup,assertBackupAdmin}from'../admin/customer-backup-store.mjs';
import{sealBackup,openBackup,decodeValue,digest}from'../admin/customer-backup-core.mjs';
assert.match(process.env.FIRESTORE_EMULATOR_HOST||'',/^(127\.0\.0\.1|localhost):[0-9]+$/);
const projectId='demo-okclean-quotes',ADMIN='H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
const env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('ops/firestore.rules.current.txt','utf8')}});
const admin=env.authenticatedContext(ADMIN,{firebase:{sign_in_provider:'google.com'}}).firestore();
function backend(uid=ADMIN,provider='google.com',sdk=f){return{app:{options:{projectId}},db:admin,f:sdk,auth:{currentUser:{uid,providerData:[{providerId:provider}],getIdTokenResult:async()=>({claims:{firebase:{sign_in_provider:provider}}})}}};}
const password='synthetic-backup-emulator-2026',q1='A'.repeat(20),q2='B'.repeat(20),at=new f.Timestamp(1794787200,123456789);let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
async function seed(){await env.clearFirestore();await env.withSecurityRulesDisabled(async context=>{
 const db=context.firestore(),batch=f.writeBatch(db);
 for(const id of['member-a','member-b']){batch.set(f.doc(db,'member_requests',id),{name:'격리 백업 시험',phone:'010-0000-0000',ownerUid:id,code:'OK-ABC234',joined:at,status:'상담중',couponStatus:'사용',freeStatus:'제공완료',points:100});batch.set(f.doc(db,'member_receipts',id),{ownerUid:id,requestId:id,code:'OK-ABC234',joined:at});}
 for(const[id,owner,photoCount,test]of[[q1,'owner-a',2,true],[q2,'owner-b',0,false]]){batch.set(f.doc(db,'quote_requests',id),{ownerUid:owner,name:'격리 견적 시험',phone:'010-0000-0000',photoCount,test,version:2,createdAt:at,updatedAt:at,status:'consulting',memo:'격리 이력',amount:100000});batch.set(f.doc(db,'quote_receipts',owner+'_'+id),{ownerUid:owner,requestId:id,createdAt:at,service:'aircon',test});batch.set(f.doc(db,'quote_limits',owner),{ownerUid:owner,requestId:id,at});for(let i=0;i<photoCount;i++)batch.set(f.doc(db,'quote_requests',id,'photos',String(i)),{ownerUid:owner,data:'data:image/jpeg;base64,/9j/AAAA',createdAt:at});}
 batch.set(f.doc(db,'quote_requests',q1,'history','history-a'),{at,status:'consulting',amount:100000,note:'격리 이력',actor:ADMIN,kind:'management',event:'quote_updated',version:2});await batch.commit();
 });}
try{
 await seed();let payload;
 await check('기존 Google 관리자 권한으로 페이지를 나눠 회원·견적·사진·이력 수집',async()=>{payload=await collectCustomerBackup(backend(),{pageSize:1});assert.equal(payload.records.length,13);assert.deepEqual(payload.counts,{members:2,memberReceipts:2,quotes:2,photos:2,history:1,quoteReceipts:2,quoteLimits:2,testQuotes:1});assert.equal(payload.warnings.length,0);});
 await check('암호화 파일 복호화 후 별도 합성 DB 재구성과 원문·나노초 일치',async()=>{
  const capturedNanos=decodeValue(payload.records.find(r=>r.path==='member_requests/member-a').data,f).joined.nanoseconds;
  const encrypted=await sealBackup(payload,password),decoded=await openBackup(encrypted,password,{expectedProject:projectId});await env.clearFirestore();
  await env.withSecurityRulesDisabled(async context=>{const db=context.firestore(),batch=f.writeBatch(db);for(const record of decoded.records)batch.set(f.doc(db,record.path),decodeValue(record.data,f));await batch.commit();});
  const restored=await collectCustomerBackup(backend());assert.equal(await digest(JSON.stringify(restored.records)),await digest(JSON.stringify(payload.records)));assert.equal((await f.getDoc(f.doc(admin,'member_requests','member-a'))).data().joined.nanoseconds,capturedNanos);
 });
 await check('잘못된 UID·실제 로그인 제공자는 서버 조회 전 차단',async()=>{for(const[uid,provider]of[['other','google.com'],[ADMIN,'anonymous'],[ADMIN,'password']])await assert.rejects(assertBackupAdmin(backend(uid,provider)));const b=backend();b.auth.currentUser.getIdTokenResult=async()=>({claims:{firebase:{sign_in_provider:'password'}}});await assert.rejects(collectCustomerBackup(b));});
 await check('일반 고객의 회원·견적·사진·이력·접수증·제한 정보 읽기 거부',async()=>{const customer=env.authenticatedContext('other',{firebase:{sign_in_provider:'anonymous'}}).firestore();for(const path of['member_requests/member-a','member_receipts/member-a','quote_requests/'+q1,'quote_requests/'+q1+'/photos/0','quote_requests/'+q1+'/history/history-a','quote_receipts/owner-a_'+q1,'quote_limits/owner-a'])await assertFails(f.getDoc(f.doc(customer,path)));});
 await check('내보내기 중 부모 자료 변경을 탐지하고 파일 준비 중단',async()=>{const paths=new WeakMap();let reads=0;const sdk={...f,query:(ref,...args)=>{const query=f.query(ref,...args);paths.set(query,ref.path);return query;},getDocsFromServer:async query=>{if(paths.get(query)==='member_requests'&&++reads===2)await env.withSecurityRulesDisabled(context=>f.updateDoc(f.doc(context.firestore(),'member_requests','member-a'),{points:101}));return f.getDocsFromServer(query);}};await assert.rejects(collectCustomerBackup(backend(ADMIN,'google.com',sdk)),/자료가 변경/);});
 await check('취소·사진 수 불일치는 불완전 백업으로 완료하지 않음',async()=>{await assert.rejects(collectCustomerBackup(backend(),{isActive:()=>false}),/취소/);await env.withSecurityRulesDisabled(context=>f.deleteDoc(f.doc(context.firestore(),'quote_requests',q1,'photos','0')));await assert.rejects(collectCustomerBackup(backend()),/사진 수/);});
 console.log('BACKUP_RULE_TESTS_PASSED='+passed);
}finally{await env.cleanup();}
