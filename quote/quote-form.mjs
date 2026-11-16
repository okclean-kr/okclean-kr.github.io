import{compressPhoto}from'./photos.mjs';
const $=id=>document.getElementById(id),core=window.OKCleanQuote;
let catalog,step=1,photos=[],busy=false,photoBusy=false,requestId,frozen=null;
const answersByService=new Map(),params=new URLSearchParams(location.search);
const preview=params.get('quote_preview')==='1',testMode=params.get('quote_test')==='1';
let adminTestAllowed=false;
const enabled=()=>!preview&&(testMode?adminTestAllowed:window.OKCLEAN_QUOTES?.enabled===true&&window.OKCLEAN_QUOTES?.verified===true);
const track=name=>{if(enabled()&&!testMode)void window.OKCleanAnalytics?.track(name,{service:service(),placement:'quote',target:'quote'});};
const service=()=>document.querySelector('[name=service]:checked')?.value||'';
const choices={purpose:['입주청소','이사청소'],unit:['평','㎡'],space:['아파트','빌라','오피스텔','단독주택','그 외'],condition:['보통','오염 심함','곰팡이·악취','확인 필요'],frequency:['일회성','정기'],stain:['없음','얼룩','냄새','얼룩·냄새 모두','확인 필요']};
function addSelect(parent,key,options,value){const label=document.createElement('label');label.textContent=core.LABELS[key];label.htmlFor='answer-'+key;const select=document.createElement('select');select.id='answer-'+key;select.name=key;select.required=true;select.append(new Option('선택해 주세요',''),...options.map(x=>new Option(x,x)));select.value=value||'';parent.append(label,select);}
function readAnswers(){return Object.fromEntries([...$('questions').querySelectorAll('input,select')].map(el=>[el.name,el.value.trim()]));}
function questions(){
 const s=catalog.services.find(s=>s.id===service()),a=answersByService.get(service())||{};
 $('questionTitle').textContent=s.name+' 작업 내용';$('questions').replaceChildren();
 for(const key of core.FIELDS[s.id]){const div=document.createElement('div');let options=choices[key];
  if(key==='tier')options=s.tiers.map(t=>t.name);
  if(key==='type'&&s.variants)options=s.variants.map(t=>t.name);
  if(options)addSelect(div,key,options,a[key]);
  else{const label=document.createElement('label');label.htmlFor='answer-'+key;label.textContent=core.LABELS[key];const input=document.createElement('input');input.id='answer-'+key;input.name=key;input.required=true;input.maxLength=200;input.value=a[key]||'';
   if(['rooms','baths','count'].includes(key)){input.type='number';input.min=key==='count'?'1':'0';input.max=key==='count'?'100':'30';input.step='1';}
   else if(key==='size'&&!['mattress','carpet','window'].includes(s.id)){input.type='number';input.min='.1';input.max='100000';input.step='.1';}
   else{input.type='text';input.placeholder=({material:'모르면 ‘확인 필요’',size:'예: 200 × 150cm',height:'예: 1층 실내',scope:'예: 바닥·유리·화장실',industry:'예: 카페·사무실',time:'예: 영업 전 08시'})[key]||'';}
   div.append(label,input);
  }$('questions').append(div);
 }updateEstimate();
}
function updateEstimate(){if(!catalog||!service())return;const a=readAnswers();answersByService.set(service(),a);const s=catalog.services.find(s=>s.id===service()),r=core.formEstimate(s,a);$('estimate').textContent=r?'참고 예상 비용: '+(Math.ceil(r.lo/1000)*1000).toLocaleString('ko-KR')+'원'+(r.hi===null?'부터':r.hi===r.lo?'':' ~ '+(Math.ceil(r.hi/1000)*1000).toLocaleString('ko-KR')+'원')+' (추가 작업·출장비 별도 확인)':'현장 사진과 작업 범위를 확인한 후 비용을 안내합니다.';}
function showStep(n){step=n;document.querySelectorAll('[data-step]').forEach(el=>el.hidden=+el.dataset.step!==n);document.querySelectorAll('[data-step-label]').forEach(el=>{el.removeAttribute('aria-current');if(+el.dataset.stepLabel===n)el.setAttribute('aria-current','step');});$('previous').hidden=n===1;$('next').hidden=n===3;$('submit').hidden=n!==3;$('formError').textContent='';if(n===2)questions();document.querySelector('[data-step="'+n+'"] legend')?.scrollIntoView({block:'start',behavior:'smooth'});}
function currentValid(){const fs=document.querySelector('[data-step="'+step+'"]');for(const el of fs.querySelectorAll('input,select'))if(!el.checkValidity()){el.reportValidity();return false;}return true;}
function read(){return{service:service(),answers:readAnswers(),date:$('date').value,region:$('region').value,name:$('name').value,phone:$('phone').value,contactTime:$('contactTime').value,consent:$('consent').checked,source:core.source(window.OKCleanAnalytics?.status().source||'direct')};}
function photoPreview(){const container=$('photoPreview');container.replaceChildren();photos.forEach((photo,i)=>{const figure=document.createElement('figure'),img=new Image(),remove=document.createElement('button');img.src=photo.data;img.alt='선택한 현장 사진 '+(i+1);remove.type='button';remove.textContent='사진 '+(i+1)+' 삭제';remove.disabled=busy;remove.onclick=()=>{photos.splice(i,1);photoPreview();};figure.append(img,remove);container.append(figure);});}
function lock(value){busy=value;for(const el of $('quoteForm').querySelectorAll('input,select,button'))el.disabled=value;photoPreview();$('submit').disabled=value||!enabled();}
function resultRow(label,value){const dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=value;$('result').append(dt,dd);}
$('next').onclick=()=>{if(step===1&&!service()){$('formError').textContent='청소 종류를 선택해 주세요.';return;}if(step===2&&!currentValid())return;track('quote_step_complete');showStep(step+1);};
$('previous').onclick=()=>{if(step===2)answersByService.set(service(),readAnswers());showStep(step-1);};
$('questions').addEventListener('input',updateEstimate);$('questions').addEventListener('change',updateEstimate);
$('region').onchange=()=>{$('regionNotice').textContent=$('region').value==='춘천'?'춘천을 중심으로 작업합니다. 현장 조건과 일정에 따라 최종 가능 여부를 안내합니다.':'강원 지역 및 수도권은 거리·일정·작업 규모에 따라 출장 여부와 추가 비용을 먼저 확인합니다. 지역 선택만으로 방문이 확정되지는 않습니다.';};
$('photos').onchange=async()=>{if(photoBusy||busy)return;photoBusy=true;$('next').disabled=true;$('submit').disabled=true;try{const files=[...$('photos').files];if(files.length+photos.length>5)throw new Error('사진은 최대 5장까지 첨부할 수 있습니다.');const added=[];for(const file of files)added.push(await compressPhoto(file));photos.push(...added);photoPreview();$('formError').textContent='';}catch(e){$('formError').textContent=e.message;}finally{$('photos').value='';photoBusy=false;$('next').disabled=false;$('submit').disabled=!enabled();}};
$('quoteForm').onsubmit=async e=>{
 e.preventDefault();if(busy||photoBusy||!enabled())return;
 const input=frozen||read(),errors=core.validate(input,catalog);if(errors.length){$('formError').textContent='다음 항목을 확인해 주세요: '+errors.join(', ');return;}
 if(!navigator.onLine){$('formError').textContent='인터넷 연결을 확인한 뒤 다시 접수해 주세요. 입력 내용은 이 화면에 유지됩니다.';return;}
 lock(true);$('formError').textContent='서버에 안전하게 저장하고 있습니다. 창을 닫지 말아 주세요.';frozen=input;
 try{
  const mod=await import('./quote-store.mjs');requestId||=mod.newRequestId();await mod.submitQuote(catalog,requestId,input,photos,{test:testMode});
  $('quoteForm').hidden=true;$('complete').hidden=false;if(testMode)$('complete').querySelector('h2').textContent='시험 견적 접수가 완료됐습니다.';$('receipt').textContent=core.receipt(requestId);$('result').replaceChildren();resultRow('서비스',catalog.services.find(s=>s.id===input.service).name);for(const[k,v]of Object.entries(input.answers))resultRow(core.LABELS[k],v);resultRow('지역',input.region);resultRow('희망 날짜',input.date||'상담 후 협의');resultRow('상담 시간',input.contactTime);resultRow('현장 사진',photos.length+'장');
  document.querySelectorAll('[data-step-label]').forEach(el=>{el.removeAttribute('aria-current');if(el.dataset.stepLabel==='4')el.setAttribute('aria-current','step');});track('quote_submit_success');photos=[];$('name').value='';$('phone').value='';$('photoPreview').replaceChildren();$('complete').scrollIntoView({block:'start'});
 }catch(error){
  $('formError').textContent='접수 완료를 확인하지 못했습니다. 입력과 사진은 이 화면에 유지됩니다. 같은 접수번호로 다시 확인·시도해 주세요.'+(error.code==='permission-denied'?' 서버 권한을 확인 중입니다. 카카오톡 또는 전화로 상담하실 수 있습니다.':'');
  lock(false);
  // Keep the submitted snapshot until the same request ID has been checked on the server.
  for(const el of $('quoteForm').querySelectorAll('input,select,#photoPreview button'))el.disabled=true;
  $('previous').disabled=true;$('submit').textContent='같은 신청으로 다시 확인·접수';
 }
};
try{const response=await fetch('catalog.json',{cache:'no-cache'});if(!response.ok)throw new Error('서비스 정보 연결 실패');catalog=await response.json();
 for(const s of catalog.services){const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='service';input.value=s.id;input.checked=s.id===params.get('svc');input.onchange=()=>track('quote_start');label.append(input,document.createTextNode(s.name));$('services').append(label);}
 $('region').append(new Option('선택해 주세요',''),...catalog.regions.map(x=>new Option(x,x)));if(catalog.regions.includes(params.get('region')))$('region').value=params.get('region');
 $('contactTime').append(...catalog.contactTimes.map(x=>new Option(x,x)));$('date').min=new Date(Date.now()+9*3600000).toISOString().slice(0,10);
 if(testMode){const mod=await import('./quote-store.mjs');const backend=await mod.getBackend(catalog.firebase);const user=backend.auth.currentUser;adminTestAllowed=user?.uid===core.ADMIN_UID&&user.providerData?.some(p=>p.providerId==='google.com');}
 $('availability').textContent=preview?'미리보기 화면입니다. 접수 저장과 통계 수집은 하지 않습니다. 실제 신청은 홈페이지의 상세 견적에서 진행해 주세요.':testMode?(adminTestAllowed?'관리자 시험 접수 모드입니다. 시험 표식으로 저장되며 실제 고객 집계에서 제외됩니다.':'관리자 시험 접수에는 기존 Google 관리자 로그인이 필요합니다.'):enabled()?'온라인 접수 가능 · 저장 성공을 확인한 뒤 접수번호를 안내합니다.':'온라인 접수 연결을 점검 중입니다. 작업 내용을 미리 정리하거나 아래 카카오톡·전화로 바로 상담해 주세요.';
 $('submit').disabled=!enabled();
}catch(error){$('formError').textContent='서비스 정보를 불러오지 못했습니다. 아래 상담 버튼을 이용해 주세요.';$('next').disabled=true;}
window.addEventListener('beforeunload',e=>{if(busy){e.preventDefault();e.returnValue='';}});
