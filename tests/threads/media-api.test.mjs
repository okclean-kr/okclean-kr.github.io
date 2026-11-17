import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyMedia,sha256,validateItem,CTA} from '../../scripts/threads/core.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'okclean-test-'));
const image=path.join(temp,'test.jpg'),video=path.join(temp,'test.mp4');
execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=720x1280','-frames:v','1',image]);
execFileSync('ffmpeg',['-v','error','-f','lavfi','-i','color=c=blue:s=720x1280:r=30','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart','-use_editlist','0',video]);
for(const [type,file,mime] of [['image',image,'image/jpeg'],['video',video,'video/mp4']])test('real '+type+' bytes: MIME, hash and codec preflight',async()=>{
  const data=fs.readFileSync(file),asset={type,public_url:'https://okclean-kr.github.io/threads-media/test.'+(type==='image'?'jpg':'mp4'),variant_sha256:sha256(data)};
  const fetchFn=async()=>new Response(data,{headers:{'Content-Type':mime}});
  assert.equal((await verifyMedia(asset,fetchFn)).bytes,data.length);
  await assert.rejects(verifyMedia({...asset,variant_sha256:'changed'},fetchFn),/HASH_CHANGED/);
  await assert.rejects(verifyMedia(asset,async()=>new Response(data,{headers:{'Content-Type':'text/html'}})),/MIME/);
});
test('private/untrusted/signed/redirect URLs are blocked',async()=>{
  for(const url of ['http://okclean-kr.github.io/threads-media/a.jpg','https://127.0.0.1/a.jpg','https://okclean-kr.github.io/threads-media/a.jpg?token=secret','https://evil.invalid/a.jpg'])await assert.rejects(verifyMedia({public_url:url,type:'image'}),/HOST/);
});
test('reviewed but near-duplicate media cannot enter the second slot',()=>{
  const asset={id:'okc-asset-1',type:'image',rights:{status:'approved',evidence:'owner'},privacy:{status:'passed',reviewed_by:'owner'},consent:{threads_reuse:true,evidence:'owner'},synthetic:false,sha256:'source',public_url:'https://okclean-kr.github.io/threads-media/a.jpg',variant_sha256:'variant',visual_hash:'0000000000000001'};
  const a={id:'okc-20261118-16',day:'2026-11-18',slot:'16',type:'image',asset_id:asset.id,text:'창틀 청소는 마른 먼지를 먼저 걷어낸 뒤 물기를 닦아 주세요.\n'+CTA,approved:true,approved_by:'owner',approved_at:'today'};
  a.approved_fingerprint=sha256(JSON.stringify([a.text,a.type,a.asset_id]));
  assert.throws(()=>validateItem(a,[{visual_hash:'0000000000000000'}],[asset]),/DUPLICATE_MEDIA/);
});
test.after(()=>fs.rmSync(temp,{recursive:true,force:true}));
