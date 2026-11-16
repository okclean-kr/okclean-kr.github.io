import{encodeValue,backupCounts,digest,MAX_BACKUP_BYTES,MAX_RECORDS}from'./customer-backup-core.mjs';
const ADMIN='H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
export async function assertBackupAdmin(b){
 const user=b.auth.currentUser;
 if(user?.uid!==ADMIN||!user.providerData?.some(p=>p.providerId==='google.com'))throw new Error('기존 Google 관리자 로그인이 필요합니다.');
 const result=await user.getIdTokenResult();
 if(b.auth.currentUser!==user||result.claims?.firebase?.sign_in_provider!=='google.com')throw new Error('실제 Google 관리자 인증을 확인해 주세요.');
}
// Reads only. No set/update/delete/batch/admin SDK calls exist in this module.
export async function collectCustomerBackup(b,{isActive=()=>true,onProgress=()=>{},pageSize=100}={}){
 if(!Number.isInteger(pageSize)||pageSize<1||pageSize>200)throw new Error('백업 조회 단위를 확인해 주세요.');
 const startedAt=new Date().toISOString(),deadline=Date.now()+120000,{f,db}=b,records=[],seen=new Set(),warnings=[],encoder=new TextEncoder();let bytes=0;
 async function guard(){if(!isActive()||Date.now()>deadline)throw new Error('백업이 취소되었거나 대기 시간이 지났습니다.');await assertBackupAdmin(b);if(!isActive())throw new Error('백업이 취소되었습니다.');}
 const report=()=>onProgress({documents:records.length,bytes});
 function append(path,data){if(seen.has(path))return;const record={path,data:encodeValue(data)};bytes+=encoder.encode(JSON.stringify(record)).length;if(records.length>=MAX_RECORDS||bytes>MAX_BACKUP_BYTES-65536)throw new Error('백업 상한(5,000문서·20MB)을 넘어 중단했습니다.');seen.add(path);records.push(record);report();}
 async function list(path){
  const result=[];let cursor;
  do{await guard();const args=[f.orderBy(f.documentId()),f.limit(pageSize)];if(cursor)args.push(f.startAfter(cursor));const snap=await f.getDocsFromServer(f.query(f.collection(db,path),...args));await guard();if(snap.metadata.fromCache||snap.metadata.hasPendingWrites)throw new Error('서버에 저장된 자료만 백업할 수 있습니다.');
   result.push(...snap.docs);if(result.length>MAX_RECORDS)throw new Error('조회 문서 수 상한을 넘어 중단했습니다.');cursor=snap.size===pageSize?snap.docs.at(-1):null;
  }while(cursor);return result;
 }
 async function one(path){await guard();const snap=await f.getDocFromServer(f.doc(db,path));await guard();if(snap.metadata.fromCache||snap.metadata.hasPendingWrites)throw new Error('서버 자료 확인이 필요합니다.');if(snap.exists())append(path,snap.data());else warnings.push('참조 접수증 또는 제한 문서가 없음');}
 const parents={};for(const name of['member_requests','quote_requests']){parents[name]=await list(name);for(const doc of parents[name])append(name+'/'+doc.id,doc.data());}
 for(const member of parents.member_requests)await one('member_receipts/'+member.id);
 const owners=new Set();
 for(const quote of parents.quote_requests){
  const data=quote.data();if(typeof data.ownerUid!=='string'||data.ownerUid.includes('/'))throw new Error('견적 소유자 확인이 필요합니다.');owners.add(data.ownerUid);
  await one('quote_receipts/'+data.ownerUid+'_'+quote.id);
  for(const name of['photos','history']){const children=await list('quote_requests/'+quote.id+'/'+name);if(name==='photos'&&children.length!==data.photoCount)throw new Error('현장 사진 수가 일치하지 않아 백업을 중단했습니다.');for(const child of children)append('quote_requests/'+quote.id+'/'+name+'/'+child.id,child.data());}
 }
 for(const owner of owners)await one('quote_limits/'+owner);
 // A second server read detects application edits/new parent records during export.
 for(const name of['member_requests','quote_requests']){
  const fingerprint=docs=>JSON.stringify(docs.map(doc=>({id:doc.id,data:encodeValue(doc.data())})));
  if(await digest(fingerprint(parents[name]))!==await digest(fingerprint(await list(name))))throw new Error('백업 중 접수 자료가 변경됐습니다. 잠시 후 다시 백업해 주세요.');
 }
 await guard();records.sort((a,b)=>a.path.localeCompare(b.path));
 return{schema:1,scope:'members-and-quotes',projectId:b.app.options.projectId,startedAt,finishedAt:new Date().toISOString(),records,counts:backupCounts(records),warnings,
  limitations:['회원·견적과 해당 접수증·사진·이력·참조된 제한 문서 범위','통계·추천제품·인증 계정·미참조 고아 문서·미등록 컬렉션은 제외','전체 DB의 동일 시점 스냅샷은 아님. 부모 문서 변경을 재확인한 읽기 전용 내보내기']};
}
