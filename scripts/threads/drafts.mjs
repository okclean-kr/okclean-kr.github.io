// Paid AI generation is opt-in; no new provider/account or billing setup is created.
import {read,atomicWrite,CTA,validateText,sha256} from './core.mjs';
const [day,slot]=process.argv.slice(2);
if(!/^\d{4}-\d{2}-\d{2}$/.test(day||'')||!['08','16'].includes(slot))throw new Error('Use YYYY-MM-DD 08|16');
const queue=read('ops/threads-queue.json');
const id=`okc-${day.replaceAll('-','')}-${slot}`;
if(queue.some(x=>x.id===id)){console.log('Existing draft preserved.');process.exit(0);}
if(process.env.OKC_AI_ENABLED!=='true'||!process.env.OKC_OPENAI_API_KEY||!process.env.OKC_OPENAI_MODEL){console.log('AI_DRAFT_BLOCKED_NO_APPROVED_PROVIDER_CONFIGURATION');process.exit(0);}
const assets=read('ops/threads-media-library.json').assets;
const ledger=read('ops/threads-posted.json');
const approved=assets.filter(x=>x.rights.status==='approved'&&x.privacy.status==='passed'&&x.consent.threads_reuse&&x.synthetic===false&&x.public_url&&!ledger.some(p=>p.asset_sha256===x.sha256));
const asset=approved[0];
// Deterministic 10-item cycle yields 7 tips, 2 documented cases, 1 consultation post.
const n=queue.length%10;const category=n<7?'tip':n<9?'case':'consultation';
if(category==='case'&&!asset){console.log('CASE_DRAFT_BLOCKED_NO_VERIFIED_ASSET');process.exit(0);}
const facts=asset?{service:asset.service,verified_observation:asset.verified_observation||null}:null;
const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+process.env.OKC_OPENAI_API_KEY,'Content-Type':'application/json'},signal:AbortSignal.timeout(60000),body:JSON.stringify({model:process.env.OKC_OPENAI_MODEL,max_output_tokens:700,store:false,input:[{role:'system',content:`오케이청소 Threads 한국어 원고 한 편만 작성. 30~450자, 청소 정보 중심의 자연스러운 말투. URL/도메인/해시태그 금지. 확인된 관찰 외의 현장·결과·후기·가격·할인 주장 금지. 고객 개인정보 금지. 마지막 문구는 정확히 한 번: ${CTA}. 원고 이외 설명 금지.`},{role:'user',content:JSON.stringify({category,facts,topic:'청소 전 확인사항과 일상 관리'})]})});
if(!res.ok)throw new Error('AI_PROVIDER_REQUEST_FAILED');
const data=await res.json();
const text=data.output?.flatMap(x=>x.content||[]).filter(x=>x.type==='output_text').map(x=>x.text).join('').trim();
validateText(text);
if([...queue,...ledger].some(x=>x.text===text||x.fingerprint===sha256(text)))throw new Error('DUPLICATE_DRAFT');
queue.push({id,day,slot,type:asset?.type||'text',asset_id:asset?.id||null,category,text,approved:false,generated_at:new Date().toISOString(),model:process.env.OKC_OPENAI_MODEL});
atomicWrite('ops/threads-queue.json',queue);
console.log('Created unapproved draft '+id);
