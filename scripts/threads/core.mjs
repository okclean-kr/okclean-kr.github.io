import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

export const ACCOUNT = 'ky.lee0912';
export const CTA = '무료견적은 프로필링크 확인';
export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex');
export const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export function atomicWrite(p, data) {
  fs.mkdirSync(path.dirname(p), {recursive:true});
  const tmp = `${p}.${process.pid}.tmp`;
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try { fs.writeFileSync(fd, JSON.stringify(data,null,2)+'\n'); fs.fsyncSync(fd); }
  finally { fs.closeSync(fd); }
  fs.renameSync(tmp,p);
}
export function slotAt(date) {
  const d = new Date(date.getTime()+9*3600000);
  const h = d.getUTCHours();
  return {day:d.toISOString().slice(0,10),slot:h===8?'08':h===16?'16':null};
}
export function validateText(text) {
  if(typeof text!=='string' || [...text].length<30 || [...text].length>500) throw new Error('TEXT_LENGTH');
  const normalized = text.normalize('NFKC').replace(/[\u200b-\u200f\u2060\ufeff]/g,'');
  if(/https?\s*:|www\s*\.|(?:[\p{L}\p{N}-]+\.)+[a-z]{2,63}\b|(?:\d{1,3}\.){3}\d{1,3}|[＃#]|(?:닷|dot)\s*(?:컴|com|kr)|\[\s*\.\s*\]/iu.test(normalized)) throw new Error('BODY_LINK_OR_HASHTAG');
  if(text.split(CTA).length!==2 || !text.trimEnd().endsWith(CTA)) throw new Error('CTA_EXACTLY_ONCE');
}
export function validateItem(item, ledger, assets) {
  if(!/^okc-[a-z0-9-]+$/.test(item.id)) throw new Error('INVALID_POST_ID');
  if(!['08','16'].includes(item.slot)) throw new Error('MANUAL_SLOT_BLOCKED');
  validateText(item.text);
  if(item.approved!==true || !item.approved_by || !item.approved_at || item.approved_fingerprint!==sha256(JSON.stringify([item.text,item.type,item.asset_id||null]))) throw new Error('APPROVAL_REQUIRED_OR_CHANGED');
  if(!['text','image','video'].includes(item.type)) throw new Error('MEDIA_TYPE');
  const fingerprint=sha256(item.text);
  if(ledger.some(x=>x.id===item.id || x.fingerprint===fingerprint || (x.day===item.day&&x.slot===item.slot))) throw new Error('DUPLICATE_POST_OR_SLOT');
  const asset = item.type==='text'?null:assets.find(x=>x.id===item.asset_id);
  if(item.type!=='text') {
    if(!asset || asset.type!==item.type || asset.rights?.status!=='approved' || !asset.rights?.evidence || asset.privacy?.status!=='passed' || !asset.privacy?.reviewed_by || !asset.consent?.threads_reuse || !asset.consent?.evidence || asset.synthetic!==false || !asset.sha256 || !asset.public_url || !asset.variant_sha256 || !asset.visual_hash) throw new Error('ASSET_REVIEW_REQUIRED');
    if(ledger.some(x=>x.asset_sha256===asset.sha256 || (x.visual_hash && hamming(x.visual_hash,asset.visual_hash)<=5))) throw new Error('DUPLICATE_MEDIA');
  }
  return {asset,fingerprint};
}
export function hamming(a,b) {
  if(!/^[a-f0-9]{16}$/.test(a)||!/^[a-f0-9]{16}$/.test(b)) throw new Error('INVALID_VISUAL_HASH');
  return (BigInt('0x'+a)^BigInt('0x'+b)).toString(2).replace(/0/g,'').length;
}
export class ApiError extends Error {
  constructor(status,code) { super(`THREADS_API_HTTP_${status}_CODE_${code||'unknown'}`); this.status=status; this.code=code; }
}
export function apiClient(token, fetchFn=fetch, sleep=ms=>new Promise(r=>setTimeout(r,ms))) {
  return async (p,params={},method='GET')=>{
    if(!/^\/[a-zA-Z0-9_/]+$/.test(p)) throw new Error('INVALID_API_PATH');
    for(let n=0;n<3;n++) {
      const u=new URL('https://graph.threads.com/v1.0'+p);
      if(method==='GET') for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
      let res,body;
      try {
        res=await fetchFn(u,{method,signal:AbortSignal.timeout(30000),headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':'application/x-www-form-urlencoded'}:{})},...(method==='POST'?{body:new URLSearchParams(params)}:{})});
        body=await res.json();
      } catch {
        if(method==='GET' && n<2){await sleep(1000*2**n);continue;}
        throw new Error(method==='POST'?'MUTATION_RESULT_UNKNOWN':'API_READ_NETWORK');
      }
      if(res.ok&&!body.error)return body;
      if(method==='GET'&&(res.status===429||res.status>=500)&&n<2){await sleep(1000*2**n);continue;}
      throw new ApiError(res.status,body.error?.code);
    }
  };
}
export async function verifyAccount(api, expectedId) {
  if(!/^\d+$/.test(expectedId||'')) throw new Error('EXPECTED_ACCOUNT_ID_REQUIRED');
  const p=await api('/me',{fields:'id,username'});
  if(p.id!==expectedId || p.username!==ACCOUNT) throw new Error('ACCOUNT_MISMATCH');
  return p;
}
// Only owned, durable hosting is supported until another host is explicitly reviewed.
export async function verifyMedia(asset, fetchFn=fetch) {
  const u=new URL(asset.public_url);
  if(u.protocol!=='https:' || u.hostname!=='okclean-kr.github.io' || u.port || u.username || u.password || u.search || u.hash || !u.pathname.startsWith('/threads-media/')) throw new Error('MEDIA_HOST_NOT_APPROVED');
  const res=await fetchFn(u,{redirect:'error',signal:AbortSignal.timeout(60000)});
  if(!res.ok || !res.body)throw new Error('MEDIA_UNAVAILABLE');
  const max=asset.type==='image'?8*1024**2:1024**3;
  if(Number(res.headers.get('content-length')||0)>max)throw new Error('MEDIA_TOO_LARGE');
  const expected=asset.type==='image'?'image/jpeg':'video/mp4';
  if(res.headers.get('content-type')?.split(';')[0]!==expected)throw new Error('MEDIA_MIME');
  const chunks=[];let size=0;
  for await(const chunk of res.body){size+=chunk.length;if(size>max){await res.body.cancel?.().catch(()=>{});throw new Error('MEDIA_TOO_LARGE');}chunks.push(chunk);}
  const bytes=Buffer.concat(chunks);
  if(sha256(bytes)!==asset.variant_sha256)throw new Error('MEDIA_HASH_CHANGED');
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'okclean-media-'));
  try{
    const p=path.join(temp,asset.type==='image'?'media.jpg':'media.mp4');fs.writeFileSync(p,bytes);
    const probe=JSON.parse(execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',p],{maxBuffer:1024**2,timeout:30000}));
    const v=probe.streams.find(x=>x.codec_type==='video');
    if(!v||v.width> (asset.type==='image'?1440:1920)||v.width< (asset.type==='image'?320:2)||v.width/v.height>10||v.width/v.height<(asset.type==='image'?0.1:0.01))throw new Error('MEDIA_DIMENSIONS');
    if(asset.type==='image'&&v.codec_name!=='mjpeg')throw new Error('IMAGE_ENCODING');
    if(asset.type==='video'){
      const [a,b]=v.avg_frame_rate.split('/').map(Number);const fps=a/b;
      const audio=probe.streams.filter(x=>x.codec_type==='audio');
      if(v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||v.field_order!=='progressive'||fps<23||fps>60||Number(probe.format.duration)<=0||Number(probe.format.duration)>300||Number(probe.format.bit_rate)>100000000||audio.some(x=>x.codec_name!=='aac'||Number(x.sample_rate)>48000||x.channels>2)||bytes.indexOf('moov')<0||bytes.indexOf('moov')>bytes.indexOf('mdat'))throw new Error('VIDEO_ENCODING');
    }
    return {bytes:size,checked_at:new Date().toISOString()};
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
export async function recentPosts(api,id) {
  let after;const posts=[];
  for(let page=0;page<20;page++){
    const p=await api('/'+id+'/threads',{fields:'id,text,media_type,permalink,timestamp',limit:'100',...(after?{after}:{})});
    if(!Array.isArray(p.data))throw new Error('HISTORY_RESPONSE_INVALID');
    posts.push(...p.data);after=p.paging?.cursors?.after;
    if(!p.paging?.next)return posts;
    if(!after)throw new Error('HISTORY_PAGINATION_INVALID');
  }
  throw new Error('HISTORY_INCOMPLETE');
}
export async function reconcile(row,api,profile,save) {
  if(!row.container_id){row.status='blocked-unknown';save();return;}
  const c=await api('/'+row.container_id,{fields:'id,status,error_message'});
  row.container_status=c.status;
  if(c.status==='PUBLISHED'){
    const posts=await recentPosts(api,profile.id);
    const matches=posts.filter(p=>sha256(p.text||'')===row.fingerprint && new Date(p.timestamp)>=new Date(row.at)-60000);
    if(matches.length===1){row.threads_id=matches[0].id;row.permalink=matches[0].permalink;row.status='published';row.reconciled_at=new Date().toISOString();}
    else row.status='published-id-unresolved';
  } else if(c.status==='ERROR'||c.status==='EXPIRED')row.status='blocked-container-failed';
  // FINISHED after an ambiguous publish is NOT proof that a second publish is safe.
  save();
}
export async function publishOne({item,asset,row,api,profile,save,sleep=ms=>new Promise(r=>setTimeout(r,ms)),checkMedia=verifyMedia}) {
  if(asset)await checkMedia(asset);
  await verifyAccount(api,profile.id);
  row.status='creating-container';save(); // remote claim must already have been persisted by caller
  const args={media_type:item.type.toUpperCase(),text:item.text,...(asset?{[item.type==='image'?'image_url':'video_url']:asset.public_url}:{})};
  const c=await api('/'+profile.id+'/threads',args,'POST');
  if(!/^\d+$/.test(c.id||''))throw new Error('CONTAINER_RESULT_UNKNOWN');
  row.container_id=c.id;row.status='container-created';save();
  await sleep(30000);
  let ready=false;
  for(let n=0;n<5;n++){
    const state=await api('/'+c.id,{fields:'id,status,error_message'});
    row.container_status=state.status;save();
    if(state.status==='FINISHED'){ready=true;break;}
    if(state.status==='PUBLISHED'){await reconcile(row,api,profile,save);return;}
    if(['ERROR','EXPIRED'].includes(state.status))throw new Error('CONTAINER_FAILED_'+state.status);
    if(n<4)await sleep(60000);
  }
  if(!ready)throw new Error('CONTAINER_NOT_READY');
  if(asset)await checkMedia(asset);
  await verifyAccount(api,profile.id);
  row.status='publishing-unconfirmed';save();
  const p=await api('/'+profile.id+'/threads_publish',{creation_id:c.id},'POST');
  if(!/^\d+$/.test(p.id||''))throw new Error('PUBLISH_RESULT_UNKNOWN');
  row.threads_id=p.id;row.status='published-unverified';save();
  const actual=await api('/'+p.id,{fields:'id,text,permalink,username,media_type,timestamp'});
  if(actual.id!==p.id||actual.username!==ACCOUNT||actual.text!==item.text||actual.media_type!==(item.type==='text'?'TEXT_POST':item.type.toUpperCase()))throw new Error('PUBLISHED_POST_VERIFICATION_FAILED');
  row.status='published';row.permalink=actual.permalink;row.published_at=actual.timestamp;save();
}
