/* Shared, dependency-free quote validation. No personal data is persisted here. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.OKCleanQuote=api;})(typeof window==='undefined'?globalThis:window,function(){
'use strict';
const STATES=Object.freeze({new:'신규 접수',consulting:'상담 중',sent:'견적 발송',contracted:'계약 완료',cancelled:'취소',held:'보류'});
const SOURCES=['youtube','shorts','instagram','reels','threads','blog','naver','google','profile','share','direct','other'];
const ADMIN_UID='H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
const VERSION='2026-11-16';
const FIELDS={
 'move-in':['purpose','size','unit','tier','rooms','baths','space','condition'],
 regular:['size','unit','rooms','baths','space','frequency','condition'],
 aircon:['type','count','condition'],washer:['type','count','condition'],
 mattress:['type','count','size','material','condition','stain'],carpet:['type','size','material','condition','stain'],
 office:['industry','size','unit','scope','frequency','time','condition'],clinic:['industry','size','unit','scope','frequency','time','condition'],
 'post-build':['size','unit','scope','condition'],window:['size','scope','height','condition'],
 'special-home':['size','unit','scope','condition'],disinfect:['size','unit','scope','condition']
};
const LABELS={purpose:'청소 구분',size:'면적·크기',unit:'단위',tier:'집 크기 기준',rooms:'방 개수',baths:'화장실 개수',space:'공간 유형',condition:'오염 상태',type:'종류',count:'작업 수량',material:'재질',stain:'얼룩·냄새',industry:'업종',scope:'청소 범위',frequency:'이용 주기',time:'희망 작업 시간',height:'작업 높이'};
const REQUIRED={...FIELDS, 'move-in':['purpose','size','unit','tier','rooms','baths','space','condition'],regular:['size','unit','rooms','baths','space','frequency','condition'],mattress:['type','count','size','material','condition','stain'],carpet:['type','size','material','condition','stain']};
const clean=s=>String(s??'').trim();
const day=()=>new Date(Date.now()+9*3600000).toISOString().slice(0,10);
function validDate(value){if(!value)return true;const d=new Date(value+'T12:00:00+09:00');return /^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(+d)&&new Date(+d+9*3600000).toISOString().slice(0,10)===value&&value>=day()&&+d<Date.now()+366*86400000;}
function validateWork(data,catalog){
 const errors=[];const service=catalog.services.find(s=>s.id===data.service);
 if(!service||!FIELDS[data.service])errors.push('청소 종류');
 const fields=FIELDS[data.service]||[];
 const answers=data.answers||{};
 if(Object.keys(answers).some(k=>!fields.includes(k)))errors.push('선택 항목');
 for(const k of REQUIRED[data.service]||[])if(!clean(answers[k]))errors.push(LABELS[k]);
 for(const [k,v] of Object.entries(answers))if(typeof v!=='string'||v.length>200||/[<>\u0000-\u0008]/.test(v))errors.push(LABELS[k]||k);
 for(const k of ['count','rooms','baths'])if(answers[k]!==undefined&&(!/^\d{1,3}$/.test(answers[k])||+answers[k]>(k==='count'?100:30)||+answers[k]<(k==='count'?1:0)))errors.push(LABELS[k]);
 if(['move-in','regular','office','clinic','post-build','special-home','disinfect'].includes(data.service)&&(!Number.isFinite(+answers.size)||+answers.size<=0||+answers.size>100000))errors.push('면적');
 if(answers.unit&&!['평','㎡'].includes(answers.unit))errors.push('면적 단위');
 if(service&&answers.tier&&!service.tiers?.some(t=>t.name===answers.tier))errors.push('집 크기 기준');
 if(service&&['aircon','washer','mattress'].includes(data.service)&&!service.variants?.some(t=>t.name===answers.type))errors.push('기기 종류');
 if(!validDate(data.date))errors.push('희망 날짜');
 return [...new Set(errors)];
}
function validate(data,catalog){
 const errors=validateWork(data,catalog);
 if(!catalog.regions.includes(data.region))errors.push('지역');
 if(!clean(data.name)||clean(data.name).length>30)errors.push('성함 또는 호칭');
 if(!/^01[016789]-?\d{3,4}-?\d{4}$/.test(clean(data.phone)))errors.push('휴대폰 번호');
 if(!catalog.contactTimes.includes(data.contactTime))errors.push('상담 희망 시간');
 if(!data.consent)errors.push('개인정보 동의');
 return [...new Set(errors)];
}
function estimate(s,state){
 if(!s||s.quote||(!(s.tiers||[]).length&&!(s.variants||[]).length))return null;
 const tiered=!!s.tiers?.length,opts=(state.opts||[]).map(i=>(s.options||[])[i]).filter(Boolean);
 let lo,hi,v,q=1,t=null;
 if(tiered){v=(s.kinds||[])[state.v]||{};t=s.tiers[state.t]||s.tiers[0];if(t.quote)return null;lo=t.price;hi=v.open?null:t.price;}
 else{v=s.variants[state.v]||s.variants[0];if(v.quote)return null;q=Math.max(1,+state.qty||1);lo=v.lo*q;hi=v.hi==null?null:v.hi*q;}
 opts.filter(o=>!o.quote).forEach(o=>{const m=o.perUnit?q:1;lo+=o.lo*m;hi=hi==null||o.hi==null?null:hi+o.hi*m;});
 if(s.min){lo=Math.max(lo,s.min);if(hi!=null)hi=Math.max(hi,s.min);}
 return{lo,hi,v,q,t,onSite:opts.filter(o=>o.quote).map(o=>o.name)};
}
function formEstimate(s,a){
 let v=0,t=0,qty=1;
 if(s.tiers){t=s.tiers.findIndex(t=>t.name===a.tier);if(t<0)return null;v=a.purpose==='이사청소'?1:0;}
 else if(['aircon','washer','mattress'].includes(s.id)){v=s.variants.findIndex(v=>v.name===a.type);if(v<0)return null;qty=+a.count;}
 else if(['regular','office','clinic','post-build'].includes(s.id)){qty=+a.size/(a.unit==='㎡'?3.305785:1);if(!(qty>0))return null;v=a.frequency==='정기'?1:0;}
 else return null;
 return estimate(s,{v,t,qty,opts:[]});
}
function transition(from,to){return from===to||({new:['consulting','held','cancelled'],consulting:['sent','held','cancelled'],sent:['consulting','contracted','held','cancelled'],held:['consulting','cancelled'],contracted:[],cancelled:[]}[from]||[]).includes(to);}
function receipt(id){return 'OKQ-'+id;}
function source(value){return SOURCES.includes(value)?value:'other';}
function retentionDue(row,now=Date.now()){const at=row.createdAt?.toMillis?.()??0;return at>0&&at<now-180*86400000;}
return Object.freeze({STATES,SOURCES,ADMIN_UID,VERSION,FIELDS,LABELS,validateWork,validate,validDate,estimate,formEstimate,transition,receipt,source,retentionDue});
});
