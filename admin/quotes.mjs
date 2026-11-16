import{getBackend,saveAdminChange,purgeExpiredQuote,submitQuote,newRequestId}from'../quote/quote-store.mjs';
import{compressPhoto}from'../quote/photos.mjs';
const $=id=>document.getElementById(id),core=window.OKCleanQuote;
let b,catalog,unsub,rows=new Map(),lastVisible=null,initial=true,capped=false,testRequestId=null;
let notificationMessage='',notificationSession=0,listSession=0,olderRequest=null;
const notificationInFlight=new Set(),notificationUnsaved=new Set();
const format=at=>at?.toDate?at.toDate().toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'서버 시각 확인 중';
const date=at=>at?.toDate?new Date(+at.toDate()+9*3600000).toISOString().slice(0,10):'';
const serviceName=id=>catalog.services.find(s=>s.id===id)?.name||id;
const admin=user=>user?.uid===core.ADMIN_UID&&user.providerData?.some(p=>p.providerId==='google.com');
function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
function showError(error){$('authStatus').textContent='처리하지 못했습니다: '+(error?.code||error?.message||'연결 확인 필요');}
function filtered(){return [...rows.values()].filter(r=>r.test===$('showTest').checked&&(!$('from').value||date(r.createdAt)>=$('from').value)&&(!$('to').value||date(r.createdAt)<=$('to').value)&&(!$('filterService').value||r.service===$('filterService').value)&&(!$('filterStatus').value||r.status===$('filterStatus').value)&&(!$('filterSource').value||r.source===$('filterSource').value)).sort((a,b)=>(b.createdAt?.toMillis()||0)-(a.createdAt?.toMillis()||0));}
function render(){
 const list=filtered(),test=$('showTest').checked;
 $('summary').textContent=(test?'시험 접수':'실제 고객 접수')+' '+list.length+'건 · 계약 완료 '+list.filter(x=>x.status==='contracted').length+'건 · 신규 '+list.filter(x=>x.status==='new').length+'건';
 $('stats').replaceChildren();const groups=new Map();for(const r of list){const key=[date(r.createdAt),r.service,r.source].join('|');const group=groups.get(key)||{day:date(r.createdAt),service:r.service,source:r.source,count:0,contracts:0};group.count++;if(r.status==='contracted')group.contracts++;groups.set(key,group);}
 for(const g of groups.values()){const tr=node('tr');for(const v of[g.day,serviceName(g.service),g.source,g.count,g.contracts])tr.append(node('td',String(v)));$('stats').append(tr);}
 const keep=new Map([...$('requests').querySelectorAll('article')].map(el=>[el.dataset.id,el]));const fragment=document.createDocumentFragment();for(const row of list){const old=keep.get(row.id);if(old&&(old.dataset.version===String(row.version)||old.querySelector('details[open]'))){fragment.append(old);}else fragment.append(renderRequest(row));}$('requests').replaceChildren(fragment);
 if(!list.length)$('requests').append(node('p','이 조건의 접수 자료가 없습니다.','notice'));
 $('capNotice').textContent=capped?'최신 500건부터 불러왔습니다. 이전 자료를 추가하기 전 합계는 전체 합계가 아닙니다.':'불러온 접수 범위에서 집계합니다. 2026년 11월 16일 이전 신규 접수 이력은 소급 생성하지 않습니다.';
 renderNotificationStatus();
}
function renderRequest(row){
 const article=node('article');article.dataset.id=row.id;article.dataset.version=String(row.version);const head=node('h2',serviceName(row.service)+' · '+core.STATES[row.status]);head.style.fontSize='19px';
 article.append(head,node('p',core.receipt(row.id)+' · '+format(row.createdAt)+(row.test?' · 시험 접수':''),'muted'));
 const details=node('details'),summary=node('summary',row.name+' · '+row.region+' — 신청 내용·사진·관리');details.append(summary);
 details.addEventListener('toggle',()=>{if(!details.open||details.dataset.loaded)return;details.dataset.loaded='1';void fillDetails(details,row).catch(e=>{details.append(node('p','상세 자료를 불러오지 못했습니다. 다시 열어 재시도해 주세요.','error'));delete details.dataset.loaded;});});article.append(details);return article;
}
async function fillDetails(details,row){
 const box=node('div');details.append(box);if(row.notification!=='seen'){const acknowledge=node('button','이 접수 확인 완료');acknowledge.onclick=async()=>{try{await saveAdminChange(b,row.id,row,{notification:'seen',notificationAttempts:Math.min(row.notificationAttempts+1,100),notificationError:''});details.open=false;render();}catch(e){box.append(node('p',e.message||e.code,'error'));}};box.append(acknowledge);}const dl=node('dl');const values=[['연락처',row.phone],['상담 시간',row.contactTime],['희망 날짜',row.desiredAt?format(row.desiredAt):'상담 후 협의'],['사진',row.photoCount+'장'],['동의 안내',row.consentVersion],['유입',row.source],...Object.entries(row.answers).map(([k,v])=>[core.LABELS[k]||k,v])];for(const[k,v]of values)dl.append(node('dt',k),node('dd',String(v)));box.append(dl);
 const photoButton=node('button','첨부 사진 불러오기');photoButton.hidden=!row.photoCount;
 photoButton.onclick=async()=>{photoButton.disabled=true;try{const snap=await b.f.getDocs(b.f.collection(b.db,'quote_requests',row.id,'photos'));if(!admin(b.auth.currentUser)||!details.isConnected)return;const photos=node('div',undefined,'photos');for(const doc of snap.docs){const data=doc.data().data;if(typeof data==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data)&&data.length<=160000){const img=new Image();img.alt='비공개 현장 사진';img.loading='lazy';img.src=data;photos.append(img);}}box.append(photos);photoButton.remove();}catch(e){photoButton.disabled=false;box.append(node('p','사진을 불러오지 못했습니다. 다시 시도해 주세요.','error'));}};box.append(photoButton);
 const fields=node('div',undefined,'grid'),status=node('select'),memo=node('textarea'),amount=node('input'),delivery=node('input');
 for(const[key,label]of Object.entries(core.STATES)){const option=new Option(label,key);option.disabled=!core.transition(row.status,key);status.append(option);}status.value=row.status;memo.maxLength=1000;memo.value=row.memo;amount.type='number';amount.min='0';amount.max='100000000';amount.step='1';amount.value=row.amount??'';delivery.type='checkbox';
 for(const[label,input]of[['상담 진행 상태',status],['견적 금액 (원, 미입력 가능)',amount],['관리자 메모 (고객에게 자동 전송하지 않음)',memo],['고객에게 견적을 실제 전달했음',delivery]]){const wrap=node('label',label);wrap.append(input);fields.append(wrap);}box.append(fields);
 const save=node('button','변경 저장','primary'),message=node('p',undefined,'muted');save.onclick=async()=>{save.disabled=true;try{
  if(!core.transition(row.status,status.value))throw new Error('상담 단계에 맞게 상태를 선택해 주세요.');
  const value=amount.value===''?null:Number(amount.value);if(value!==null&&(!Number.isInteger(value)||value<0||value>100000000))throw new Error('견적 금액을 확인해 주세요.');
  if(status.value==='sent'&&(!delivery.checked&&!row.deliveredAt||value===null))throw new Error('견적 금액과 실제 전달 여부를 확인해 주세요.');
  if(status.value==='contracted'&&!confirm(row.test?'시험 접수의 계약 완료 상태를 확인합니까? 실제 계약 집계에서 제외됩니다.':'실제 고객 계약이 성사됐음을 확인했습니까?'))return;
  const patch={status:status.value,memo:memo.value.trim(),amount:value};if(delivery.checked)patch.deliveredAt=b.f.serverTimestamp();
  await saveAdminChange(b,row.id,row,patch);details.open=false;render();message.textContent='서버에 저장했습니다. 견적이나 메시지를 자동 발송하지 않습니다.';
 }catch(e){message.textContent=e.message||e.code;}finally{save.disabled=false;}};box.append(save,message);
 const history=node('button','견적·상태 변경 이력 보기');history.onclick=async()=>{history.disabled=true;try{const snap=await b.f.getDocs(b.f.query(b.f.collection(b.db,'quote_requests',row.id,'history'),b.f.orderBy('at','desc'),b.f.limit(100)));if(!admin(b.auth.currentUser)||!details.isConnected)return;const list=node('ul');for(const doc of snap.docs){const h=doc.data();list.append(node('li',format(h.at)+' · '+core.STATES[h.status]+' · '+(h.amount??'미입력')+'원 · '+h.note));}if(snap.empty)list.append(node('li','변경 이력이 없습니다.'));box.append(list);history.remove();}catch(e){history.disabled=false;box.append(node('p','이력 조회 실패. 재시도할 수 있습니다.','error'));}};box.append(history);
}
function renderNotificationStatus(){
 if(!admin(b?.auth.currentUser)){$('notificationStatus').textContent='';return;}
 const unread=[...rows.values()].filter(r=>r.test===false&&r.notification!=='seen');
 for(const id of notificationUnsaved)if(!unread.some(r=>r.id===id))notificationUnsaved.delete(id);
 const failed=unread.filter(r=>r.notification==='failed').length;
 $('notificationStatus').textContent='불러온 실제 접수 중 미확인 '+unread.length+'건 · 알림 실패 '+failed+'건'
  +(notificationUnsaved.size?' · 알림 결과 기록 미저장 '+notificationUnsaved.size+'건':'')
  +(notificationMessage?' · '+notificationMessage:'');
}
function notificationStatus(message){notificationMessage=message;renderNotificationStatus();}
async function notify(candidate){
 const row=rows.get(candidate.id);
 if(!admin(b?.auth.currentUser)||!row||row.test||row.notification==='seen'||notificationInFlight.has(row.id))return;
 const session=notificationSession;
 if(!('Notification'in window)||Notification.permission!=='granted'){
  notificationStatus('브라우저 알림이 허용되지 않았습니다. 미확인 접수는 목록에서 확인할 수 있습니다.');return;
 }
 notificationInFlight.add(row.id);
 let failed=false;
 try{new Notification('오케이청소 새 견적 접수',{body:serviceName(row.service)+' · '+row.region,tag:row.id});}catch(e){failed=true;}
 try{
  // A retried alert remains unread until the administrator acknowledges it.
  // Use the latest snapshot version, without overwriting another screen's edits.
  const latest=rows.get(row.id);
  if(!admin(b?.auth.currentUser)||session!==notificationSession||!latest||latest.notification==='seen')return;
  if(failed||latest.notification==='failed'||notificationUnsaved.has(row.id)){
   await saveAdminChange(b,row.id,latest,{notification:failed?'failed':'pending',notificationAttempts:Math.min(latest.notificationAttempts+1,100),notificationError:failed?'browser-notification-failed':''});
  }
  if(!admin(b?.auth.currentUser)||session!==notificationSession)return;
  notificationUnsaved.delete(row.id);
  notificationStatus(failed?'알림 표시 실패를 기록했습니다. 접수는 보존돼 있으며 다시 확인할 수 있습니다.':'알림을 표시했습니다. 접수 확인 완료 전까지 미확인으로 유지됩니다.');
 }catch(e){
  if(admin(b?.auth.currentUser)&&session===notificationSession){notificationUnsaved.add(row.id);notificationStatus('알림 결과 기록을 서버에 저장하지 못했습니다. 접수는 보존돼 있습니다. 연결 확인 후 다시 확인 버튼을 눌러 주세요.');}
 }finally{if(session===notificationSession)notificationInFlight.delete(row.id);}
}
$('retryNotifications').onclick=async()=>{
 if(!admin(b?.auth.currentUser)||$('retryNotifications').disabled)return;
 const session=notificationSession;$('retryNotifications').disabled=true;
 try{for(const row of [...rows.values()]){if(session!==notificationSession||!admin(b?.auth.currentUser))break;await notify(row);}}
 finally{if(session===notificationSession)$('retryNotifications').disabled=false;}
};
$('permission').onclick=async()=>{
 if(!admin(b?.auth.currentUser))return;
 const session=notificationSession;
 if(!('Notification'in window)){notificationStatus('이 브라우저는 알림을 지원하지 않습니다. 접수 목록을 이용해 주세요.');return;}
 try{const permission=await Notification.requestPermission();if(session===notificationSession&&admin(b?.auth.currentUser))notificationStatus(permission==='granted'?'관리자 화면이 열린 동안 새 견적을 알립니다.':'브라우저 알림이 허용되지 않았습니다. 접수 목록 확인은 계속 가능합니다.');}
 catch(e){if(session===notificationSession&&admin(b?.auth.currentUser))notificationStatus('브라우저 알림 허용 요청을 완료하지 못했습니다. 미확인 접수는 목록에서 확인해 주세요.');}
};

function connectionStatus(message,retry=false){$('connectionStatus').textContent=message;$('retryConnection').hidden=!retry;$('retryConnection').disabled=!retry;}
function currentList(session,epoch){return admin(b?.auth.currentUser)&&session===notificationSession&&epoch===listSession;}
function clear(){listSession++;olderRequest=null;unsub?.();unsub=null;rows.clear();lastVisible=null;capped=false;initial=true;notificationSession++;notificationMessage='';notificationInFlight.clear();notificationUnsaved.clear();$('retryNotifications').disabled=false;$('notificationStatus').textContent='';connectionStatus('');$('older').disabled=false;$('panel').hidden=true;$('requests').replaceChildren();$('stats').replaceChildren();$('expired').replaceChildren();}
async function start(){
 if(!admin(b?.auth.currentUser))return;
 const epoch=++listSession;olderRequest=null;unsub?.();unsub=null;initial=true;
 connectionStatus('서버 접수 목록을 연결하고 있습니다.');$('older').disabled=true;
 const{f,db}=b,session=notificationSession;
 const q=f.query(f.collection(db,'quote_requests'),f.orderBy('createdAt','desc'),f.limit(500));
 unsub=f.onSnapshot(q,{includeMetadataChanges:true},snap=>{
  if(!currentList(session,epoch))return;
  if(snap.metadata.fromCache){connectionStatus('서버 응답을 기다리고 있습니다. 표시된 자료는 마지막 조회 기준이며 새 접수 여부를 아직 확인하지 못했습니다.',true);return;}
  if(initial){
   // The cache event may already contain identical documents. Read the full
   // first server snapshot even when its docChanges() contains no additions.
   rows.clear();capped=false;for(const doc of snap.docs)rows.set(doc.id,{id:doc.id,...doc.data()});
   lastVisible=snap.docs.at(-1)||null;
  }else for(const change of snap.docChanges()){
   if(change.type==='removed')rows.delete(change.doc.id);
   else{const row={id:change.doc.id,...change.doc.data()};rows.set(row.id,row);if(change.type==='added')void notify(row);}
  }
  capped=capped||snap.size===500;initial=false;render();$('older').disabled=!!olderRequest;connectionStatus('서버 접수 목록이 연결돼 있습니다.');$('authStatus').textContent='관리자 권한으로 서버 접수 목록을 확인했습니다.';
 },error=>{if(!currentList(session,epoch))return;connectionStatus('실시간 연결을 확인하지 못했습니다. 마지막으로 불러온 자료는 유지됩니다. 새 접수 확인을 위해 다시 연결해 주세요.',true);showError(error);});
}
$('retryConnection').onclick=()=>{if(admin(b?.auth.currentUser)&&!$('retryConnection').disabled)void start().catch(showError);};
$('older').onclick=async()=>{if(!admin(b?.auth.currentUser)||olderRequest||$('older').disabled||!lastVisible)return;const session=notificationSession,epoch=listSession,cursor=lastVisible,request={};olderRequest=request;$('older').disabled=true;try{const{f,db}=b,snap=await f.getDocsFromServer(f.query(f.collection(db,'quote_requests'),f.orderBy('createdAt','desc'),f.startAfter(cursor),f.limit(500)));if(!currentList(session,epoch))return;snap.docs.forEach(d=>rows.set(d.id,{id:d.id,...d.data()}));lastVisible=snap.docs.at(-1)||null;capped=snap.size===500;render();}catch(e){if(currentList(session,epoch))showError(e);}finally{if(currentList(session,epoch)&&olderRequest===request){olderRequest=null;$('older').disabled=false;}}};
$('testSubmit').onclick=async()=>{
 if(!admin(b?.auth.currentUser))return;
 const files=[...$('testPhotos').files];if(!testRequestId&&(!files.length||files.length>5)){$('testResult').textContent='시험 사진을 1~5장 선택해 주세요.';return;}
 $('testSubmit').disabled=true;$('testResult').textContent='시험 접수와 사진을 저장하고 서버 접수증을 확인합니다…';
 try{
  const photos=[];for(const file of files)photos.push(await compressPhoto(file));
  testRequestId||=newRequestId();
  const input={service:'aircon',answers:{type:'벽걸이',count:'1',condition:'보통'},date:'',region:'춘천',name:'운영 연결 시험',phone:'010-0000-0000',contactTime:'언제나 가능',consent:true,source:'direct'};
  const result=await submitQuote(catalog,testRequestId,input,photos,{backend:b,test:true});
  if(!admin(b.auth.currentUser))return;
  const check=await b.f.getDocFromServer(b.f.doc(b.db,'quote_requests',testRequestId));
  const imageCheck=await b.f.getDocs(b.f.collection(b.db,'quote_requests',testRequestId,'photos'));
  if(!check.exists()||check.data().test!==true||imageCheck.size!==check.data().photoCount)throw new Error('서버 접수·사진을 다시 확인해 주세요.');
  $('testResult').textContent=(result.existing?'동일 접수 재조회 확인 · ':'시험 접수·서버 재조회 확인 · ')+core.receipt(testRequestId)+' · 사진 '+imageCheck.size+'장 · 실제 고객 집계 제외';
  $('testPhotos').disabled=true;$('testAccess').disabled=false;
 }catch(e){$('testResult').textContent='시험을 완료하지 못했습니다: '+(e.code||e.message||'연결 확인 필요');}
 finally{$('testSubmit').disabled=false;}
};
$('testAccess').onclick=async()=>{
 if(!admin(b?.auth.currentUser)||!testRequestId)return;
 $('testAccess').disabled=true;
 let readerApp,readerAuth;
 try{
  const apps=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');
  readerApp=apps.initializeApp(catalog.firebase,'quote-permission-check-'+Date.now());
  readerAuth=b.h.getAuth(readerApp);await b.h.signInAnonymously(readerAuth);
  const db=b.f.getFirestore(readerApp),paths=[
   ()=>b.f.getDocFromServer(b.f.doc(db,'quote_requests',testRequestId)),
   ()=>b.f.getDocs(b.f.collection(db,'quote_requests')),
   ()=>b.f.getDocs(b.f.collection(db,'quote_requests',testRequestId,'photos')),
   ()=>b.f.getDocFromServer(b.f.doc(db,'quote_receipts',b.auth.currentUser.uid+'_'+testRequestId))
  ];
  let denied=0;for(const read of paths){try{await read();}catch(e){if(e.code==='permission-denied')denied++;else throw e;}}
  if(denied!==paths.length)throw new Error('접근 차단 결과를 확인해야 합니다. 온라인 접수를 활성화하지 마세요.');
  $('testResult').textContent='운영 서버 권한 검증: 다른 고객의 신청 원본·목록·사진·접수증 접근 4개 모두 차단 · 기존 관리자 로그인 유지';
 }catch(e){$('testResult').textContent='권한 검증 미완료: '+(e.code||e.message);}
 finally{if(readerAuth)await b.h.signOut(readerAuth).catch(()=>{});if(readerApp){const apps=await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js');await apps.deleteApp(readerApp);}if(admin(b.auth.currentUser))$('testAccess').disabled=false;}
};
$('retention').onclick=()=>{const expired=[...rows.values()].filter(r=>core.retentionDue(r));$('retentionStatus').textContent='불러온 자료 중 180일 지난 새 견적 '+expired.length+'건';$('expired').replaceChildren();for(const row of expired){const button=node('button',core.receipt(row.id)+' 만료 자료 정리');button.onclick=async()=>{if(!confirm('이 새 견적과 사진·이력을 영구 삭제합니까? 계약 자료의 별도 보관 필요 여부를 먼저 확인하세요.'))return;try{await purgeExpiredQuote(b,row);rows.delete(row.id);button.remove();render();}catch(e){showError(e);}};$('expired').append(button);}};
for(const id of['from','to','filterService','filterStatus','filterSource','showTest'])$(id).onchange=render;
try{catalog=await fetch('../quote/catalog.json').then(r=>r.json());catalog.services.forEach(s=>$('filterService').append(new Option(s.name,s.id)));Object.entries(core.STATES).forEach(([k,v])=>$('filterStatus').append(new Option(v,k)));core.SOURCES.forEach(s=>$('filterSource').append(new Option(s,s)));b=await getBackend(catalog.firebase);const provider=new b.h.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});$('login').onclick=()=>b.h.signInWithPopup(b.auth,provider).catch(showError);$('logout').onclick=()=>b.h.signOut(b.auth);
 b.h.onAuthStateChanged(b.auth,user=>{clear();const allowed=admin(user);$('logout').hidden=!user;$('panel').hidden=!allowed;$('authStatus').textContent=allowed?'서버 목록을 확인하고 있습니다.':user?'허가된 Google 관리자 계정으로 로그인해 주세요.':'로그인이 필요합니다.';if(allowed)void start();});
}catch(error){showError(error);}
