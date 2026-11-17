import test from 'node:test';
import assert from 'node:assert/strict';
import {ACCOUNT,CTA,sha256,slotAt,validateText,validateItem,hamming,apiClient,verifyAccount,publishOne,reconcile,recentPosts} from '../../scripts/threads/core.mjs';
const text='창틀을 청소할 때는 마른 먼지를 먼저 걷어내고 물기를 남기지 않도록 닦아 주세요.\n'+CTA;
function item(type='text'){const a={id:'okc-20261118-08',day:'2026-11-18',slot:'08',text,type,approved:true,approved_by:'owner',approved_at:'2026-11-17'};a.approved_fingerprint=sha256(JSON.stringify([a.text,a.type,a.asset_id||null]));return a;}
const profile={id:'123',username:ACCOUNT};
test('08/16 KST only; 20 and delayed next hour blocked',()=>{
  assert.equal(slotAt(new Date('2026-11-17T23:40:00Z')).slot,'08');
  assert.equal(slotAt(new Date('2026-11-18T07:55:00Z')).slot,'16');
  for(const h of [0,11,12])assert.equal(slotAt(new Date(`2026-11-18T${String(h).padStart(2,'0')}:00:00Z`)).slot,null);
});
for(const link of ['https://example.com','site.xyz','site.co.kr','www.foo.com','１２７.０.０.１','#청소','site[.]com','site.\u200bcom','닷컴'])test('reject body link/tag '+link,()=>assert.throws(()=>validateText(link+' '+text)));
test('CTA once, last, and approved immutable content',()=>{
  validateText(text);assert.throws(()=>validateText(CTA+text));assert.throws(()=>validateText(text+'뒤'));
  const a=item();validateItem(a,[],[]);a.text='수정된 원고 '+text;assert.throws(()=>validateItem(a,[],[]),/APPROVAL/);
});
test('duplicate ID, text and slot block publishing',()=>{
  for(const ledger of [[{id:item().id}],[{fingerprint:sha256(text)}],[{day:item().day,slot:'08'}]])assert.throws(()=>validateItem(item(),ledger,[]),/DUPLICATE/);
});
test('unreviewed media and manual slot blocked',()=>{
  assert.throws(()=>validateItem(item('image'),[],[]),/ASSET_REVIEW/);
  assert.throws(()=>validateItem({...item(),slot:'20'},[],[]),/MANUAL/);
});
test('both hard-coded username and configured numeric ID must match',async()=>{
  await verifyAccount(async()=>profile,'123');
  for(const p of [{id:'123',username:'hid_119'},{id:'999',username:ACCOUNT},{id:'123',username:'hid_1004'}])await assert.rejects(verifyAccount(async()=>p,'123'),/ACCOUNT/);
  await assert.rejects(verifyAccount(async()=>profile,''),/ID_REQUIRED/);
});
test('safe reads retry transient errors, POST is never blindly retried',async()=>{
  let n=0;const client=apiClient('secret',async()=>{n++;return {ok:n===3,status:n===3?200:503,json:async()=>n===3?{id:'1'}:{error:{code:2,message:'do-not-log-secret'}}};},async()=>{});
  assert.deepEqual(await client('/me'),{id:'1'});assert.equal(n,3);
  n=0;await assert.rejects(client('/me/threads',{},'POST'),/HTTP_503/);assert.equal(n,1);
});
test('ambiguous POST network result does not retry',async()=>{
  let n=0;await assert.rejects(apiClient('secret',async()=>{n++;throw new Error('secret');},async()=>{})('/me/threads',{},'POST'),/MUTATION_RESULT_UNKNOWN/);assert.equal(n,1);
});
for(const type of ['text','image','video'])test(type+' full mock create / poll / publish / verify',async()=>{
  const a=item(type),row={at:'2026-11-18T00:00:00Z'},calls=[],states=[];
  const api=async(p,args,method='GET')=>{calls.push({p,args,method});
    if(p==='/me')return profile;
    if(p==='/123/threads')return {id:'456'};
    if(p==='/456')return {status:'FINISHED'};
    if(p==='/123/threads_publish')return {id:'789'};
    if(p==='/789')return {id:'789',text:a.text,username:ACCOUNT,media_type:type.toUpperCase(),permalink:'https://www.threads.com/post/verified',timestamp:row.at};
    throw new Error('Unexpected request');};
  await publishOne({item:a,asset:type==='text'?null:{public_url:'https://okclean-kr.github.io/threads-media/a'},row,api,profile,save:()=>states.push(row.status),sleep:async()=>{},checkMedia:async()=>{}});
  assert.equal(row.status,'published');assert.equal(row.threads_id,'789');assert.equal(calls.filter(x=>x.method==='POST').length,2);
  assert.ok(states.indexOf('creating-container')<states.indexOf('container-created'));
  assert.equal(calls.find(x=>x.p==='/123/threads').args.media_type,type.toUpperCase());
});
test('processing media waits and does not publish early',async()=>{
  let post=0;const row={};
  await assert.rejects(publishOne({item:item('video'),asset:{},row,profile,save:()=>{},sleep:async()=>{},checkMedia:async()=>{},api:async(p,a,m)=>{
    if(p==='/me')return profile;if(m==='POST'){post++;return {id:'456'};}return {status:'IN_PROGRESS'};
  }}),/NOT_READY/);assert.equal(post,1);
});
test('failed durable state save prevents container creation',async()=>{
  let post=0;await assert.rejects(publishOne({item:item(),row:{},profile,save:()=>{throw new Error('PUSH_FAILED');},api:async(p,a,m)=>{if(m==='POST')post++;return profile;},sleep:async()=>{}}),/PUSH_FAILED/);assert.equal(post,0);
});
test('published response missing id stays ambiguous',async()=>{
  const row={};await assert.rejects(publishOne({item:item(),row,profile,save:()=>{},sleep:async()=>{},api:async(p)=>p==='/me'?profile:p==='/456'?{status:'FINISHED'}:p.endsWith('threads_publish')?{}:{id:'456'}}),/RESULT_UNKNOWN/);
  assert.equal(row.status,'publishing-unconfirmed');
});
test('reconcile published container matches actual post without issuing POST',async()=>{
  const row={container_id:'456',fingerprint:sha256(text),at:'2026-11-18T00:00:00Z'};
  await reconcile(row,async(p,args,method='GET')=>{assert.equal(method,'GET');return p==='/456'?{status:'PUBLISHED'}:{data:[{id:'789',text,timestamp:row.at,permalink:'verified'}]};},profile,()=>{});
  assert.equal(row.status,'published');assert.equal(row.threads_id,'789');
});
test('FINISHED after uncertain publish never causes repost',async()=>{
  const row={container_id:'456',status:'publishing-unconfirmed'};
  await reconcile(row,async()=>({status:'FINISHED'}),profile,()=>{});assert.equal(row.status,'publishing-unconfirmed');
});
test('history pagination keeps cursor and never follows external paging URL',async()=>{
  let n=0;const posts=await recentPosts(async(p,args)=>{n++;assert.equal(p,'/123/threads');if(n===1)return {data:[{id:'1'}],paging:{next:'https://evil.invalid',cursors:{after:'cursor'}}};assert.equal(args.after,'cursor');return {data:[{id:'2'}]};},'123');assert.equal(posts.length,2);
});
test('near-duplicate image hash comparison',()=>{assert.equal(hamming('0000000000000000','0000000000000001'),1);assert.equal(hamming('ffffffffffffffff','0000000000000000'),64);});
