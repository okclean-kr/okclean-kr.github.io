import {initializeTestEnvironment} from '@firebase/rules-unit-testing';
import * as f from 'firebase/firestore';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const host=process.env.FIRESTORE_EMULATOR_HOST||'';
assert.match(host,/^(127\.0\.0\.1|localhost):[0-9]+$/);
const projectId='demo-okclean-mail-query';
assert.ok(projectId.startsWith('demo-'));
const root='projects/'+projectId+'/databases/(default)/documents';
const env=await initializeTestEnvironment({projectId,firestore:{rules:readFileSync('ops/firestore.rules.current.txt','utf8')}});
const sandbox=vm.createContext({Date,JSON,Number,Object,Array,Error,RegExp});
vm.runInContext(readFileSync('notifications/apps-script/Code.gs','utf8'),sandbox);
const api=sandbox.OKCleanMail;
const baseline='2026-11-17T00:00:00.000Z';
const stamp=new f.Timestamp(Date.parse(baseline)/1000+1,123456000);
const id=n=>n.toString(36).padStart(20,'0');
let passed=0;
async function check(name,fn){await fn();passed++;console.log('PASS',name);}
async function seed(records){
 await env.clearFirestore();
 await env.withSecurityRulesDisabled(async context=>{
  const batch=f.writeBatch(context.firestore());
  records.forEach(r=>batch.set(f.doc(context.firestore(),r.collection||'quote_requests',r.id),{schema:1,test:r.test??false,createdAt:r.at||stamp,name:'격리 REST 시험',phone:'010-0000-0000',answers:{scope:'not projected'}}));
  await batch.commit();
 });
}
async function rest(state,authenticated=true,suppliedQuery=null){
 // Only the test project reference is mapped. Collection, projection, filter,
 // ordering, timestamp and cursor-before semantics are the shipped query.
 const body=JSON.parse(JSON.stringify(suppliedQuery||api.query(state)));
 if(body.structuredQuery.startAt){const v=body.structuredQuery.startAt.values[1];assert.ok(v.referenceValue.startsWith(api.ROOT+'/'));v.referenceValue=root+v.referenceValue.slice(api.ROOT.length);}
 const response=await fetch('http://'+host+'/v1/'+root+':runQuery',{method:'POST',headers:{'Content-Type':'application/json',...(authenticated?{Authorization:'Bearer owner'}:{})},body:JSON.stringify(body)});
 const rows=await response.json();
 if(response.status!==200)return{status:response.status,rows};
 const mapped=rows.map(row=>{if(!row.document)return row;assert.ok(row.document.name.startsWith(root+'/'));return{...row,document:{...row.document,name:api.ROOT+row.document.name.slice(root.length)}};});
 return{status:response.status,rows:mapped,parsed:api.parseRows(mapped)};
}
try{
 await seed([{id:id(0)},{id:id(1),test:true},{id:id(2)}]);
 await check('실제 REST projection이 개인정보 필드를 제외하고 시험 표식 타입 보존',async()=>{
  const r=await rest(api.initial(baseline));assert.equal(r.status,200);assert.equal(r.parsed.length,3);assert.equal(r.parsed.filter(x=>!x.test).length,2);
  for(const row of r.rows.filter(x=>x.document))assert.deepEqual(Object.keys(row.document.fields).sort(),['createdAt','schema','test']);
 });
 await check('같은 시각 103문서를 100+3건으로 중복·누락 없이 조회',async()=>{
  await seed(Array.from({length:103},(_,n)=>({id:id(n),test:n===50})));
  const s=api.initial(baseline),first=await rest(s);assert.equal(first.parsed.length,100);s.cursor=first.parsed.at(-1).cursor;
  const second=await rest(s);assert.equal(second.parsed.length,3);const names=[...first.parsed,...second.parsed].map(x=>x.cursor.name);assert.equal(new Set(names).size,103);assert.equal(names.at(-1),api.ROOT+'/quote_requests/'+id(102));
  s.cursor=second.parsed.at(-1).cursor;assert.equal((await rest(s)).parsed.length,0);
 });
 await check('조회 전후 합성 고객 문서의 경로·필드·수량 동일',async()=>{
  await env.withSecurityRulesDisabled(async context=>{
   const read=async()=>JSON.stringify((await f.getDocs(f.collection(context.firestore(),'quote_requests'))).docs.map(d=>[d.id,d.data()]));
   const before=await read();await rest(api.initial(baseline));assert.equal(await read(),before);
  });
 });
 await check('활성화 기준 이전 자료와 회원 컬렉션은 메일 조회에서 제외',async()=>{
  await seed([{id:id(0),at:new f.Timestamp(Date.parse(baseline)/1000-1,0)},{id:id(1)},{id:id(2),collection:'member_requests'}]);
  const r=await rest(api.initial(baseline));assert.equal(r.parsed.length,1);assert.equal(r.parsed[0].cursor.name,api.ROOT+'/quote_requests/'+id(1));
 });
 await check('서버가 반환한 소수 초 문자열을 유지해 다음 시각 문서 조회',async()=>{
  await seed([{id:id(0),at:stamp},{id:id(1),at:new f.Timestamp(stamp.seconds,123457000)}]);const s=api.initial(baseline),r=await rest(s);assert.equal(r.parsed.length,2);
  s.cursor=r.parsed[0].cursor;const next=await rest(s);assert.equal(next.parsed.length,1);assert.equal(next.parsed[0].cursor.name,api.ROOT+'/quote_requests/'+id(1));assert.equal(next.parsed[0].cursor.at,r.parsed[1].cursor.at);
 });
 await check('인증 없는 실제 REST 목록 조회는 기존 보안 규칙으로 차단',async()=>{const r=await rest(api.initial(baseline),false);assert.equal(r.status,403);assert.equal(r.rows.error.status,'PERMISSION_DENIED');});
 await check('저장 접수 시험은 실제 REST로 과거 시험 자료만 읽고 운영 상태·문서를 보존',async()=>{
  await seed([{id:id(0)},{id:id(1),test:true,at:new f.Timestamp(Date.parse(baseline)/1000-3600,0)}]);
  const beforeDocs=await env.withSecurityRulesDisabled(async context=>JSON.stringify((await f.getDocs(f.collection(context.firestore(),'quote_requests'))).docs.map(d=>[d.id,d.data()])));
  let query;assert.throws(()=>api.storedQuoteTest({read:()=>null,now:()=>baseline,fetch:q=>{query=q;return[];}}),/stored-test-quote-required/);
  const r=await rest(api.initial(baseline),true,query);assert.equal(r.status,200);assert.equal(r.parsed.length,1);assert.equal(r.parsed[0].test,true);assert.equal(r.parsed[0].cursor.name,api.ROOT+'/quote_requests/'+id(1));
  const production=JSON.stringify(api.initial(baseline)),sent=[];
  const result=api.storedQuoteTest({read:()=>production,write:()=>assert.fail('production state write forbidden'),now:()=>baseline,id:()=> '1234567890abcdef',quota:()=>1,fetch:q=>{assert.deepEqual(JSON.parse(JSON.stringify(q)),JSON.parse(JSON.stringify(query)));return r.rows;},send:m=>sent.push(m)});
  assert.equal(result.productionStateUnchanged,true);assert.equal(result.excludedFromCustomerNotification,true);assert.equal(sent.length,1);assert.match(sent[0].subject,/^\[시험\]/);assert.doesNotMatch(sent[0].body,/010-|격리 REST 시험|not projected/);
  const afterDocs=await env.withSecurityRulesDisabled(async context=>JSON.stringify((await f.getDocs(f.collection(context.firestore(),'quote_requests'))).docs.map(d=>[d.id,d.data()])));assert.equal(afterDocs,beforeDocs);
 });
 console.log('MAIL_REST_TESTS_PASSED='+passed);
}finally{await env.cleanup();}
