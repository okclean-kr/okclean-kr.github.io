import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {ACCOUNT,read,atomicWrite,slotAt,sha256,apiClient,verifyAccount,recentPosts,validateItem,publishOne,reconcile} from './threads/core.mjs';

const ledgerPath='ops/threads-posted.json';
const statePath='ops/threads-runtime.json';
const mode=process.argv[2]||'audit';
if(!['audit','publish'].includes(mode))throw new Error('INVALID_MODE');
const runtime={checked_at:new Date().toISOString(),mode,account:ACCOUNT,publishing_enabled:process.env.THREADS_ENABLED==='true',status:'not-started'};
const summary=()=>{
  atomicWrite(statePath,runtime);
  if(process.env.GITHUB_STEP_SUMMARY)fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,`\n### OKClean Threads\n\n${JSON.stringify(runtime,null,2)}\n`);
  console.log(JSON.stringify(runtime));
};
const persist=()=>{
  // The claim must reach GitHub BEFORE any remote mutation. No force push or reset.
  if(process.env.GITHUB_REPOSITORY!=='okclean-kr/okclean-kr.github.io'||process.env.GITHUB_REF!=='refs/heads/main')throw new Error('PERSISTENCE_NOT_PRODUCTION_MAIN');
  execFileSync('git',['add',ledgerPath]);
  if(execFileSync('git',['diff','--cached','--name-only'],{encoding:'utf8'}).trim()){
    execFileSync('git',['-c','user.name=github-actions[bot]','-c','user.email=41898282+github-actions[bot]@users.noreply.github.com','commit','-m','chore: persist OKClean Threads claim/state'],{stdio:'pipe'});
  }
  execFileSync('git',['push','origin','HEAD:main'],{stdio:'pipe'});
};
let lock=false,ledger=[],row;
try{
  const token=process.env.THREADS_ACCESS_TOKEN;
  if(!token){runtime.status='blocked-missing-okclean-token';summary();process.exit(mode==='publish'?1:0);}
  const api=apiClient(token);
  const profile=await verifyAccount(api,process.env.THREADS_EXPECTED_USER_ID);
  runtime.authenticated_username=profile.username;runtime.authenticated_id=profile.id;
  // Read all available history. An empty local ledger never establishes an empty account.
  const history=await recentPosts(api,profile.id);
  runtime.actual_post_count=history.length;
  runtime.history_checked=true;
  const assets=read('ops/threads-media-library.json').assets;
  ledger=read(ledgerPath);
  if(!Array.isArray(ledger)||!Array.isArray(assets))throw new Error('MALFORMED_LEDGER_OR_ASSETS');
  runtime.local_ledger_count=ledger.length;
  runtime.untracked_actual_posts=history.filter(p=>!ledger.some(x=>x.threads_id===p.id)).length;
  if(mode==='audit') {runtime.status='audit-verified-no-publication';summary();process.exit(0);}
  if(!runtime.publishing_enabled){runtime.status='disabled-no-publication';summary();process.exit(0);}
  const {day,slot}=slotAt(new Date());
  if(!slot){runtime.status='outside-approved-window';summary();process.exit(0);}
  fs.mkdirSync('.okclean-threads-lock');lock=true;
  const save=()=>atomicWrite(ledgerPath,ledger);
  for(const pending of ledger.filter(x=>x.status!=='published'))await reconcile(pending,api,profile,save);
  if(ledger.some(x=>x.status!=='published'))throw new Error('UNRESOLVED_ATTEMPT_BLOCKS_PUBLISHING');
  if(ledger.filter(x=>x.day===day).length>=2)throw new Error('DAILY_LIMIT');
  const queue=read('ops/threads-queue.json');
  if(!Array.isArray(queue))throw new Error('MALFORMED_QUEUE');
  const items=queue.filter(x=>x.day===day&&x.slot===slot);
  if(items.length!==1){runtime.status='no-unique-approved-content';fs.rmdirSync('.okclean-threads-lock');lock=false;summary();process.exit(0);}
  const item=items[0];
  const {asset,fingerprint}=validateItem(item,ledger,assets);
  if(history.some(p=>sha256(p.text||'')===fingerprint))throw new Error('ALREADY_ON_THREADS');
  if(asset && process.env.THREADS_MEDIA_ENABLED!=='true')throw new Error('MEDIA_ROLLOUT_NOT_ENABLED');
  row={id:item.id,day,slot,fingerprint,type:item.type,asset_id:asset?.id||null,asset_sha256:asset?.sha256||null,visual_hash:asset?.visual_hash||null,account_id:profile.id,at:new Date().toISOString(),status:'claimed'};
  ledger.push(row);save();persist();
  await publishOne({item,asset,row,api,profile,save:()=>{save();persist();}});
  runtime.status=row.status;
  runtime.threads_id=row.threads_id||null;
  runtime.media_status=asset?row.status:'text-only';
  runtime.permalink=row.permalink||null;
}catch(error){
  // Do not log raw provider responses, URLs, headers, tokens or shell stderr.
  const safe=/^[A-Z0-9_-]+$/.test(error.message)?error.message:'INTERNAL_OR_PERSISTENCE_FAILURE';
  runtime.status='blocked';runtime.error=safe;
  if(row){row.error=safe;atomicWrite(ledgerPath,ledger);try{persist();}catch{runtime.ledger_remote_save='failed';}}
  process.exitCode=1;
}finally{
  if(lock)fs.rmdirSync('.okclean-threads-lock');
  summary();
}
