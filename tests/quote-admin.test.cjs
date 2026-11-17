const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const catalog=JSON.parse(fs.readFileSync('quote/catalog.json','utf8'));
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function row(id,patch={}){return{id,name:'격리 알림 시험',phone:'010-0000-0000',service:'aircon',region:'춘천',status:'new',source:'direct',answers:{},memo:'',amount:null,photoCount:0,version:0,test:false,notification:'pending',notificationAttempts:0,notificationError:'',createdAt:{toDate:()=>new Date('2026-11-16T00:00:00Z'),toMillis:()=>Date.parse('2026-11-16T00:00:00Z')},...patch};}
async function setup(){
 const dom=new JSDOM(fs.readFileSync('admin/quotes.html','utf8'),{url:'https://test.invalid/admin/quotes.html',runScripts:'outside-only'}),w=dom.window;
 w.fetch=async()=>({json:async()=>catalog});w.eval(fs.readFileSync('quote/quote-core.js','utf8'));
 const state={records:new Map(),writes:[],notifications:[],notificationFails:false,permission:'granted',beforeSave:async()=>{},listeners:[],olderReads:0,beforeOlder:async()=>({docs:[],size:0})};
 w.Notification=class{static get permission(){return state.permission;}static requestPermission(){return state.requestPermission?state.requestPermission():Promise.resolve(state.permission);}constructor(title,options){state.notifications.push({title,options});if(state.notificationFails)throw new Error('Notification API unavailable');}};
 const b={auth:{currentUser:{uid:w.OKCleanQuote.ADMIN_UID,providerData:[{providerId:'google.com'}]}},db:{},f:{collection:()=>({}),query:()=>({}),orderBy:()=>({}),limit:()=>({}),startAfter:()=>({}),getDocsFromServer:async()=>{state.olderReads++;return state.beforeOlder();},onSnapshot:(q,options,callback,error)=>{assert.equal(options.includeMetadataChanges,true);state.listen=callback;state.listenError=error;state.listeners.push({callback,error});return()=>{state.listen=null;};}},h:{GoogleAuthProvider:class{setCustomParameters(){}},onAuthStateChanged:(auth,callback)=>{state.authChanged=callback;callback(auth.currentUser);},signInWithPopup:async()=>{},signOut:async()=>{b.auth.currentUser=null;state.authChanged(null);}}};
 state.emit=(changes)=>{for(const r of changes)state.records.set(r.id,r);const docs=[...state.records.values()].map(r=>({id:r.id,data:()=>r}));state.listen?.({metadata:{fromCache:false},docs,size:docs.length,docChanges:()=>changes.map(r=>({type:state.started?'modified':'added',doc:{id:r.id,data:()=>r}}))});state.started=true;};
 state.add=(r)=>{state.records.set(r.id,r);state.listen?.({metadata:{fromCache:false},docs:[...state.records.values()].map(x=>({id:x.id,data:()=>x})),size:state.records.size,docChanges:()=>[{type:'added',doc:{id:r.id,data:()=>r}}]});};
 state.logout=()=>b.h.signOut(b.auth);state.login=()=>{b.auth.currentUser={uid:w.OKCleanQuote.ADMIN_UID,providerData:[{providerId:'google.com'}]};state.authChanged(b.auth.currentUser);};
 w.__store={getBackend:async()=>b,saveAdminChange:async(backend,id,previous,patch)=>{state.writes.push({id,previous,patch});await state.beforeSave();const current=state.records.get(id);assert.equal(current.version,previous.version);state.emit([{...current,...patch,version:current.version+1}]);},purgeExpiredQuote:async()=>{},submitQuote:async()=>{},newRequestId:()=> 'T'.repeat(20)};
 const source=fs.readFileSync('admin/quotes.mjs','utf8').replace("import{getBackend,saveAdminChange,purgeExpiredQuote,submitQuote,newRequestId}from'../quote/quote-store.mjs';",'const{getBackend,saveAdminChange,purgeExpiredQuote,submitQuote,newRequestId}=window.__store;').replace("import{compressPhoto}from'../quote/photos.mjs';",'const compressPhoto=async()=>({});');
 await w.eval('(async()=>{'+source+'})()');
 return{dom,w,$:id=>w.document.getElementById(id),state};
}
test('다시 연 관리자 화면에서 실제 미확인·실패 건수 표시·시험 접수 제외',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20)),row('B'.repeat(20),{notification:'failed'}),row('C'.repeat(20),{notification:'seen'}),row('D'.repeat(20),{test:true})]);
 assert.match(ui.$('notificationStatus').textContent,/미확인 2건 · 알림 실패 1건/);assert.equal(ui.state.notifications.length,0);assert.equal(ui.state.writes.length,0);ui.dom.window.close();
});
test('신규 실제 접수만 브라우저 알림·시험 접수와 확인 완료는 제외',async()=>{
 const ui=await setup();ui.state.emit([]);ui.state.add(row('A'.repeat(20)));ui.state.add(row('B'.repeat(20),{test:true}));ui.state.add(row('C'.repeat(20),{notification:'seen'}));await tick();
 assert.equal(ui.state.notifications.length,1);assert.equal(ui.state.notifications[0].options.body,'에어컨 청소 · 춘천');assert.match(ui.$('notificationStatus').textContent,/미확인 1건/);assert.equal(ui.state.writes.length,0);ui.dom.window.close();
});
test('브라우저 알림 실패 기록·재시도 성공 후에도 확인 전에는 미확인 유지',async()=>{
 const ui=await setup(),id='A'.repeat(20);ui.state.emit([]);ui.state.notificationFails=true;ui.state.add(row(id));await tick();
 assert.equal(ui.state.records.get(id).notification,'failed');assert.equal(ui.state.records.get(id).notificationAttempts,1);assert.match(ui.$('notificationStatus').textContent,/실패를 기록/);
 ui.state.notificationFails=false;await ui.$('retryNotifications').onclick();
 assert.equal(ui.state.records.get(id).notification,'pending');assert.equal(ui.state.records.get(id).notificationError,'');assert.equal(ui.state.records.get(id).notificationAttempts,2);assert.match(ui.$('notificationStatus').textContent,/미확인 1건 · 알림 실패 0건/);ui.dom.window.close();
});
test('실패 기록 저장 오류를 숨기지 않고 접수 보존·연결 회복 후 재시도',async()=>{
 const ui=await setup(),id='A'.repeat(20);ui.state.emit([]);ui.state.notificationFails=true;ui.state.beforeSave=async()=>{throw new Error('offline');};ui.state.add(row(id));await tick();
 assert.equal(ui.state.records.get(id).notification,'pending');assert.match(ui.$('notificationStatus').textContent,/미저장 1건/);assert.match(ui.$('notificationStatus').textContent,/서버에 저장하지 못/);assert.equal(ui.$('requests').querySelectorAll('article').length,1);
 ui.state.notificationFails=false;ui.state.beforeSave=async()=>{};await ui.$('retryNotifications').onclick();assert.equal(ui.state.writes.length,2);assert.equal(ui.state.records.get(id).notification,'pending');assert.doesNotMatch(ui.$('notificationStatus').textContent,/미저장/);ui.dom.window.close();
});
test('재시도 연속 클릭·진행 중 같은 접수 알림 중복 방지',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20),{notification:'failed'})]);let finish;ui.state.beforeSave=()=>new Promise(resolve=>finish=resolve);
 const pending=ui.$('retryNotifications').onclick();await tick();await ui.$('retryNotifications').onclick();assert.equal(ui.state.notifications.length,1);assert.equal(ui.$('retryNotifications').disabled,true);finish();await pending;assert.equal(ui.$('retryNotifications').disabled,false);ui.dom.window.close();
});
test('알림 권한 거절·요청 예외는 접수 실패로 기록하지 않고 목록 유지',async()=>{
 const ui=await setup();ui.state.permission='denied';ui.state.emit([row('A'.repeat(20))]);await ui.$('retryNotifications').onclick();assert.equal(ui.state.notifications.length,0);assert.equal(ui.state.writes.length,0);assert.match(ui.$('notificationStatus').textContent,/미확인 1건/);
 ui.state.requestPermission=async()=>{throw new Error('not supported');};await ui.$('permission').onclick();assert.match(ui.$('notificationStatus').textContent,/허용 요청을 완료하지 못/);assert.equal(ui.state.writes.length,0);ui.dom.window.close();
});
test('로그아웃 뒤 비동기 알림 처리·다음 접수 재시도 중단과 화면 정리',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20),{notification:'failed'}),row('B'.repeat(20),{notification:'failed'})]);let finish;ui.state.beforeSave=()=>new Promise(resolve=>finish=resolve);
 const pending=ui.$('retryNotifications').onclick();await tick();await ui.state.logout();finish();await pending;assert.equal(ui.state.notifications.length,1);assert.equal(ui.$('notificationStatus').textContent,'');assert.equal(ui.$('requests').children.length,0);assert.equal(ui.$('panel').hidden,true);ui.dom.window.close();
});
test('권한 요청 진행 중 로그아웃하면 완료 메시지를 다시 표시하지 않음',async()=>{
 const ui=await setup();let finish;ui.state.requestPermission=()=>new Promise(resolve=>finish=resolve);const pending=ui.$('permission').onclick();await ui.state.logout();finish('granted');await pending;assert.equal(ui.$('notificationStatus').textContent,'');ui.dom.window.close();
});

test('캐시와 동일한 첫 서버 스냅샷에 변경분이 없어도 미확인 목록 표시',async()=>{
 const ui=await setup(),record=row('A'.repeat(20)),docs=[{id:record.id,data:()=>record}];
 ui.state.listen({metadata:{fromCache:true},docs,size:1,docChanges:()=>[{type:'added',doc:docs[0]}]});assert.equal(ui.$('requests').querySelectorAll('article').length,0);
 ui.state.listen({metadata:{fromCache:false},docs,size:1,docChanges:()=>[]});assert.equal(ui.$('requests').querySelectorAll('article').length,1);assert.match(ui.$('notificationStatus').textContent,/미확인 1건/);assert.equal(ui.state.notifications.length,0);ui.dom.window.close();
});

test('실시간 연결 오류 시 기존 목록 유지·수동 재연결 뒤 서버 목록으로 교체',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20))]);ui.state.listenError({code:'unavailable'});
 assert.match(ui.$('connectionStatus').textContent,/실시간 연결을 확인하지 못/);assert.equal(ui.$('retryConnection').hidden,false);assert.equal(ui.$('requests').querySelectorAll('article').length,1);
 ui.$('retryConnection').click();assert.equal(ui.state.listeners.length,2);assert.equal(ui.$('requests').querySelectorAll('article').length,1);
 ui.state.records.clear();ui.state.emit([row('B'.repeat(20))]);assert.equal(ui.$('requests').querySelector('article').dataset.id,'B'.repeat(20));assert.equal(ui.$('retryConnection').hidden,true);assert.match(ui.$('connectionStatus').textContent,/연결돼/);assert.equal(ui.state.writes.length,0);ui.dom.window.close();
});
test('서버 응답 전 캐시를 최신 접수로 표시하지 않고 재연결 상태 안내',async()=>{
 const ui=await setup();const r=row('A'.repeat(20)),docs=[{id:r.id,data:()=>r}];ui.state.listen({metadata:{fromCache:true},docs,size:1,docChanges:()=>[]});
 assert.match(ui.$('connectionStatus').textContent,/새 접수 여부를 아직 확인하지 못/);assert.equal(ui.$('requests').children.length,0);assert.equal(ui.$('older').disabled,true);assert.equal(ui.$('retryConnection').hidden,false);ui.dom.window.close();
});
test('재연결 이전 구독의 지연 응답과 오류는 현재 목록을 변경하지 않음',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20))]);const old=ui.state.listeners[0];old.error({code:'unavailable'});ui.$('retryConnection').click();ui.state.emit([]);
 const r=row('B'.repeat(20));old.callback({metadata:{fromCache:false},docs:[],size:0,docChanges:()=>[{type:'added',doc:{id:r.id,data:()=>r}}]});old.error({code:'permission-denied'});
 assert.equal(ui.$('requests').querySelectorAll('article').length,1);assert.equal(ui.$('requests').querySelector('article').dataset.id,'A'.repeat(20));assert.match(ui.$('connectionStatus').textContent,/연결돼/);assert.equal(ui.state.notifications.length,0);ui.dom.window.close();
});
test('이전 자료 조회 연속 클릭은 한 번만 요청·로그아웃 후 지연 응답 폐기',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20))]);let finish;ui.state.beforeOlder=()=>new Promise(resolve=>finish=resolve);
 const pending=ui.$('older').onclick();ui.state.emit([]);assert.equal(ui.$('older').disabled,true);await ui.$('older').onclick();assert.equal(ui.state.olderReads,1);await ui.state.logout();const r=row('B'.repeat(20));finish({docs:[{id:r.id,data:()=>r}],size:1});await pending;
 assert.equal(ui.$('requests').children.length,0);assert.equal(ui.$('stats').children.length,0);assert.equal(ui.$('panel').hidden,true);assert.equal(ui.$('connectionStatus').textContent,'');ui.dom.window.close();
});
test('이전 자료 조회 오류 후 버튼 복구·다시 로그인한 세션에 옛 응답 폐기',async()=>{
 const ui=await setup();ui.state.emit([row('A'.repeat(20))]);ui.state.beforeOlder=async()=>{throw{code:'unavailable'};};await ui.$('older').onclick();assert.equal(ui.$('older').disabled,false);assert.equal(ui.$('requests').querySelectorAll('article').length,1);
 let finish;ui.state.beforeOlder=()=>new Promise(resolve=>finish=resolve);const pending=ui.$('older').onclick();await ui.state.logout();ui.state.records.clear();ui.state.login();ui.state.emit([row('C'.repeat(20))]);const r=row('B'.repeat(20));finish({docs:[{id:r.id,data:()=>r}],size:1});await pending;
 assert.equal(ui.$('requests').querySelectorAll('article').length,1);assert.equal(ui.$('requests').querySelector('article').dataset.id,'C'.repeat(20));ui.dom.window.close();
});


test('열린 접수가 갱신되면 작성 중인 메모·금액 유지하고 최신 내용 재열기 제공',async()=>{
 const ui=await setup(),id='E'.repeat(20);ui.state.emit([row(id,{notification:'seen'})]);
 let details=ui.$('requests').querySelector('details');details.open=true;details.dispatchEvent(new ui.w.Event('toggle'));await tick();
 details.querySelector('textarea').value='작성 중 메모';details.querySelector('input[type=number]').value='220000';
 ui.state.emit([row(id,{notification:'seen',status:'consulting',memo:'서버 메모 1',amount:210000,version:1})]);
 assert.equal(details.querySelector('textarea').value,'작성 중 메모');assert.equal(details.querySelector('input[type=number]').value,'220000');
 const refresh=[...ui.$('requests').querySelectorAll('button')].find(x=>x.textContent==='최신 내용으로 다시 열기');assert.ok(refresh);
 ui.w.confirm=()=>false;refresh.click();assert.equal(ui.$('requests').querySelector('details'),details);assert.equal(details.querySelector('textarea').value,'작성 중 메모');assert.equal(ui.state.writes.length,0);
 ui.state.emit([row(id,{notification:'seen',status:'consulting',memo:'서버 메모 2',amount:230000,version:2})]);
 ui.w.confirm=()=>true;refresh.click();await tick();details=ui.$('requests').querySelector('details');assert.equal(details.open,true);assert.equal(details.querySelector('textarea').value,'서버 메모 2');assert.equal(details.querySelector('input[type=number]').value,'230000');assert.equal(details.querySelector('select').value,'consulting');
 details.querySelector('textarea').value='최신 확인 후 메모';await [...details.querySelectorAll('button')].find(x=>x.textContent==='변경 저장').onclick();
 assert.equal(ui.state.writes.length,1);assert.equal(ui.state.writes[0].previous.version,2);assert.equal(ui.state.records.get(id).memo,'최신 확인 후 메모');assert.equal(ui.state.records.get(id).amount,230000);ui.dom.window.close();
});

test('오래된 상세 화면은 저장 호출 전 차단하고 작성 내용과 서버 자료 보존',async()=>{
 const ui=await setup(),id='F'.repeat(20);ui.state.emit([row(id,{notification:'seen'})]);
 const details=ui.$('requests').querySelector('details');details.open=true;details.dispatchEvent(new ui.w.Event('toggle'));await tick();details.querySelector('textarea').value='보존할 메모';
 ui.state.emit([row(id,{notification:'seen',status:'consulting',memo:'새 서버 메모',version:1})]);
 await [...details.querySelectorAll('button')].find(x=>x.textContent==='변경 저장').onclick();
 assert.equal(ui.state.writes.length,0);assert.equal(ui.state.records.get(id).memo,'새 서버 메모');assert.equal(details.querySelector('textarea').value,'보존할 메모');assert.match(details.textContent,/최신 내용으로 다시 열/);ui.dom.window.close();
});

test('최신 내용 재열기 확인 중 로그아웃하면 이전 접수 자료를 다시 표시하지 않음',async()=>{
 const ui=await setup(),id='G'.repeat(20);ui.state.emit([row(id,{notification:'seen'})]);
 const details=ui.$('requests').querySelector('details');details.open=true;details.dispatchEvent(new ui.w.Event('toggle'));await tick();ui.state.emit([row(id,{notification:'seen',version:1})]);
 const refresh=[...ui.$('requests').querySelectorAll('button')].find(x=>x.textContent==='최신 내용으로 다시 열기');assert.ok(refresh);
 ui.w.confirm=()=>{void ui.state.logout();return true;};refresh.click();await tick();assert.equal(ui.$('requests').children.length,0);assert.equal(ui.$('panel').hidden,true);ui.dom.window.close();
});
