const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{JSDOM}=require('jsdom');
const catalog=JSON.parse(fs.readFileSync('quote/catalog.json','utf8'));
async function setup(enabled=true,store={newRequestId:()=> 'Q'.repeat(20),submitQuote:async()=>({})},url='https://test.invalid/quote/?svc=aircon',photoCompressor=async()=>({data:'data:image/jpeg;base64,/9j/AAAA'})){
 const dom=new JSDOM(fs.readFileSync('quote/index.html','utf8'),{url,runScripts:'outside-only'}),w=dom.window;
 w.HTMLElement.prototype.scrollIntoView=function(){};w.HTMLInputElement.prototype.reportValidity=function(){return this.checkValidity();};w.fetch=async()=>({ok:true,json:async()=>catalog});w.OKCLEAN_QUOTES={enabled,verified:enabled};w.OKCleanAnalytics={track:()=>{},status:()=>({source:'threads'})};w.__store=store;w.__compressPhoto=photoCompressor;
 w.eval(fs.readFileSync('quote/quote-core.js','utf8'));const source=fs.readFileSync('quote/quote-form.mjs','utf8').replace(/import\{compressPhoto\}from'\.\/photos\.mjs(?:\?[^']*)?';/,"const compressPhoto=window.__compressPhoto;").replaceAll("await import('./quote-store.mjs')","window.__store");await w.eval('(async()=>{'+source+'})()');
 return{dom,w,$:id=>w.document.getElementById(id)};
}
function fillForm(ui){const{$,w}=ui;$('next').click();for(const[key,value]of Object.entries({type:'벽걸이',count:'1',condition:'보통'}))w.document.querySelector('[name="'+key+'"]').value=value;$('questions').dispatchEvent(new w.Event('change',{bubbles:true}));$('next').click();$('region').value='춘천';$('name').value='시험';$('phone').value='010-0000-0000';$('consent').checked=true;}
const tick=()=>new Promise(r=>setTimeout(r,0));
test('4단계 화면·서비스별 질문·면적 질문 숨김',async()=>{const ui=await setup();ui.$('next').click();assert.equal(ui.w.document.querySelector('[name=rooms]'),null);assert.ok(ui.w.document.querySelector('[name=count]'));assert.equal(ui.$('submit').hidden,true);ui.dom.window.close();});
test('라이브 미검증 접수 차단·기존 상담 버튼 유지',async()=>{let calls=0;const ui=await setup(false,{submitQuote:()=>{calls++;}});fillForm(ui);assert.equal(ui.$('submit').disabled,true);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,0);assert.match(ui.$('availability').textContent,/점검 중/);assert.equal(ui.w.document.querySelector('a[href="tel:0339114457"]').textContent,'전화 상담');ui.dom.window.close();});
test('서버 저장 확인 전 완료 금지·연속 클릭 1회만 저장',async()=>{let finish,calls=0;const ui=await setup(true,{newRequestId:()=> 'Q'.repeat(20),submitQuote:()=>{calls++;return new Promise(resolve=>finish=resolve);}});fillForm(ui);const form=ui.$('quoteForm');form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.equal(ui.$('complete').hidden,true);finish({id:'Q'.repeat(20)});await tick();assert.equal(ui.$('complete').hidden,false);assert.match(ui.$('receipt').textContent,/^OKQ-/);assert.equal(ui.$('name').value,'');ui.dom.window.close();});
test('저장 실패 입력 보존·동일 접수번호 재시도·완료 오표시 차단',async()=>{let calls=0,ids=[],sent=[];const ui=await setup(true,{newRequestId:()=> 'Q'.repeat(20),submitQuote:async(c,id,input)=>{ids.push(id);sent.push(input);if(++calls===1)throw{code:'unavailable'};}});fillForm(ui);const form=ui.$('quoteForm');form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(ui.$('complete').hidden,true);assert.equal(ui.$('name').value,'시험');assert.equal(ui.$('phone').value,'010-0000-0000');assert.equal(ui.$('submit').disabled,false);assert.match(ui.$('formError').textContent,/확인하지 못/);form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(ui.$('complete').hidden,false);assert.deepEqual(ids,['Q'.repeat(20),'Q'.repeat(20)]);assert.equal(sent[0],sent[1]);ui.dom.window.close();});
test('동의·잘못된 연락처는 서버 저장 전 차단',async()=>{let calls=0;const ui=await setup(true,{submitQuote:()=>{calls++;}});fillForm(ui);ui.$('consent').checked=false;ui.$('phone').value='123';ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,0);assert.match(ui.$('formError').textContent,/개인정보 동의/);ui.dom.window.close();});
test('SVG·위장 파일·초과 용량은 이미지 디코딩 전 거부',async()=>{const{imageType,compressPhoto}=await import('../quote/photos.mjs');assert.equal(imageType(new TextEncoder().encode('<svg onload=alert(1)>')),'');assert.equal(imageType(new Uint8Array([255,216,255,0])),'image/jpeg');await assert.rejects(compressPhoto({type:'image/jpeg',size:11*1024*1024}),/10MB/);await assert.rejects(compressPhoto({type:'image/jpeg',size:100,slice:()=>({arrayBuffer:async()=>new TextEncoder().encode('<svg>bad</svg>').buffer})}),/실제 파일 형식/);});

test('모바일 미리보기는 운영 개통 후에도 접수 저장 차단',async()=>{let calls=0;const ui=await setup(true,{submitQuote:()=>{calls++;}},'https://test.invalid/quote/?svc=aircon&quote_preview=1');fillForm(ui);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(ui.$('submit').disabled,true);assert.equal(calls,0);assert.match(ui.$('availability').textContent,/미리보기 화면/);ui.dom.window.close();});

test('시험 접수 매개변수만으로 관리자 권한을 얻을 수 없음',async()=>{let calls=0;const ui=await setup(true,{getBackend:async()=>({auth:{currentUser:null}}),submitQuote:()=>{calls++;}},'https://test.invalid/quote/?svc=aircon&quote_test=1');fillForm(ui);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,0);assert.equal(ui.$('submit').disabled,true);assert.match(ui.$('availability').textContent,/Google 관리자 로그인/);ui.dom.window.close();});
test('관리자 시험 접수는 서버 test 표식으로 전달',async()=>{let options,events=[];const ui=await setup(false,{getBackend:async()=>({auth:{currentUser:{uid:'H1MfdqGkFRZzU8qkqwXTsiKv3CO2',providerData:[{providerId:'google.com'}]}}}),newRequestId:()=> 'T'.repeat(20),submitQuote:async(c,id,input,photos,o)=>{options=o;}},'https://test.invalid/quote/?svc=aircon&quote_test=1');ui.w.OKCleanAnalytics.track=name=>events.push(name);fillForm(ui);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(options.test,true);assert.equal(ui.$('complete').hidden,false);assert.match(ui.$('complete').textContent,/시험 견적 접수/);assert.deepEqual(events,[]);ui.dom.window.close();});

test('서비스가 미리 선택된 유입도 작성 시작은 한 번 집계',async()=>{const ui=await setup();const events=[];ui.w.OKCleanAnalytics.track=name=>events.push(name);ui.$('next').click();ui.$('previous').click();ui.$('next').click();assert.equal(events.filter(x=>x==='quote_start').length,1);ui.dom.window.close();});

test('휴대폰 키보드 제출은 현재 단계를 진행하고 마지막 단계에서만 서버 저장',async()=>{
 let calls=0;const ui=await setup(true,{newRequestId:()=> 'Q'.repeat(20),submitQuote:async()=>{calls++;}}),submit=()=>ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));
 submit();assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.$('formError').textContent,'');assert.equal(calls,0);
 for(const[k,v]of Object.entries({type:'벽걸이',count:'1',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 submit();assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false);assert.equal(ui.$('formError').textContent,'');assert.equal(calls,0);
 ui.$('region').value='춘천';ui.$('name').value='시험';ui.$('phone').value='010-0000-0000';ui.$('consent').checked=true;submit();await tick();assert.equal(calls,1);assert.equal(ui.$('complete').hidden,false);ui.dom.window.close();
});
test('단계별 필수 항목 오류는 첫 입력으로 초점 이동·서버 저장 차단',async()=>{
 let calls=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}});ui.$('next').click();for(const[k,v]of Object.entries({type:'벽걸이',count:'0',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.w.document.activeElement.id,'answer-count');assert.equal(calls,0);assert.equal(ui.w.document.activeElement.inputMode,'numeric');ui.dom.window.close();
});
test('다음·이전 단계 제목으로 초점 이동·작성한 서비스 답변 유지',async()=>{
 const ui=await setup();fillForm(ui);assert.equal(ui.w.document.activeElement.tagName,'LEGEND');assert.equal(ui.w.document.activeElement.closest('fieldset').dataset.step,'3');ui.$('previous').click();assert.equal(ui.w.document.activeElement.id,'questionTitle');assert.equal(ui.w.document.querySelector('[name=count]').value,'1');ui.dom.window.close();
});
test('잘못된 휴대폰 번호 오류는 해당 입력으로 초점 이동',async()=>{
 const ui=await setup();fillForm(ui);ui.$('phone').value='123';ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));assert.equal(ui.w.document.activeElement.id,'phone');assert.match(ui.$('formError').textContent,/휴대폰 번호/);ui.dom.window.close();
});
test('키보드로 미리보기 단계를 진행해도 운영 저장과 통계는 실행하지 않음',async()=>{
 let calls=0,events=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}},'https://test.invalid/quote/?svc=aircon&quote_preview=1');ui.w.OKCleanAnalytics.track=()=>events++;
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);ui.dom.window.close();assert.equal(calls,0);assert.equal(events,0);
});

test('접수 버튼이 비활성인 미리보기에서도 작업 수량 Enter는 검증 후 다음 단계로 이동',async()=>{
 let calls=0,events=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}},'https://test.invalid/quote/?svc=aircon&quote_preview=1');ui.w.OKCleanAnalytics.track=()=>events++;
 ui.$('next').click();assert.equal(ui.$('submit').disabled,true);
 for(const[k,v]of Object.entries({type:'벽걸이',count:'0',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 const input=ui.w.document.querySelector('[name=count]'),enter=()=>{const event=new ui.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});input.dispatchEvent(event);return event;};
 assert.equal(enter().defaultPrevented,true);assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.w.document.activeElement,input);
 input.value='2';assert.equal(enter().defaultPrevented,true);assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false);assert.equal(ui.w.document.activeElement.closest('fieldset').dataset.step,'3');assert.equal(ui.$('submit').disabled,true);assert.equal(calls,0);assert.equal(events,0);ui.dom.window.close();
});

test('한글 조합·선택 상자의 Enter와 연락처 단계 키보드 동작은 가로채지 않음',async()=>{
 const ui=await setup();ui.$('next').click();const input=ui.w.document.querySelector('[name=count]');
 const composed=new ui.w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true});input.dispatchEvent(composed);assert.equal(composed.defaultPrevented,false);assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);
 const selection=new ui.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});ui.w.document.querySelector('[name=type]').dispatchEvent(selection);assert.equal(selection.defaultPrevented,false);assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);
 for(const[k,v]of Object.entries({type:'벽걸이',count:'2',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;ui.$('next').click();
 const contact=new ui.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true});ui.$('phone').dispatchEvent(contact);assert.equal(contact.defaultPrevented,false);assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false);ui.dom.window.close();
});

test('접수 가능 기간을 벗어난 날짜는 작업 단계에서 바로 수정하도록 안내',async()=>{
 let calls=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}});ui.$('next').click();
 for(const[k,v]of Object.entries({type:'벽걸이',count:'2',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 const future=new Date(Date.now()+400*86400000).toISOString().slice(0,10);ui.$('date').value=future;ui.$('next').click();
 assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.w.document.activeElement.id,'date');assert.match(ui.$('formError').textContent,/희망 날짜/);assert.equal(ui.$('date').value,future);assert.equal(calls,0);ui.dom.window.close();
});

test('작업 내용 형식 오류는 연락처 단계 전에 해당 질문에 초점·답변 유지',async()=>{
 let calls=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}},'https://test.invalid/quote/?svc=office');ui.$('next').click();
 for(const[k,v]of Object.entries({industry:'카페 <시험>',size:'20',unit:'평',scope:'바닥·유리',frequency:'일회성',time:'영업 전 08시',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 ui.$('next').click();assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.w.document.activeElement.id,'answer-industry');assert.match(ui.$('formError').textContent,/업종/);assert.equal(ui.w.document.querySelector('[name=scope]').value,'바닥·유리');assert.equal(calls,0);ui.dom.window.close();
});

test('마지막 확인에서 작업 날짜 오류가 발견돼도 이전 단계로 안내·연락처 유지',async()=>{
 let calls=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}});fillForm(ui);ui.$('date').value='2020-01-01';
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();
 assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.w.document.activeElement.id,'date');assert.match(ui.$('formError').textContent,/희망 날짜/);assert.equal(ui.$('name').value,'시험');assert.equal(ui.$('phone').value,'010-0000-0000');assert.equal(ui.w.document.querySelector('[name=count]').value,'1');assert.equal(calls,0);ui.dom.window.close();
});

test('기존 12개 서비스의 정상 작업 답변은 연락처 단계로 진행',async()=>{
 for(const service of catalog.services){
  const ui=await setup(true,{},'https://test.invalid/quote/?svc='+service.id);ui.$('next').click();
  const defaults={purpose:'입주청소',size:['mattress','carpet','window'].includes(service.id)?'200 × 150cm':'25',unit:'평',tier:service.tiers?.[0]?.name,rooms:'3',baths:'2',space:'아파트',condition:'보통',frequency:'일회성',type:service.variants?.[0]?.name||'러그',count:'1',material:'면',stain:'없음',industry:'카페',scope:'바닥·유리',time:'영업 전 08시',height:'1층 실내'};
  for(const el of ui.$('questions').querySelectorAll('input,select'))el.value=defaults[el.name];
  ui.$('next').click();assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false,service.id);assert.equal(ui.$('formError').textContent,'',service.id);ui.dom.window.close();
 }
});

test('사진 6장은 거부·기존 5장은 유지하고 작업 오류 이동·삭제 후에도 입력 보존',async()=>{
 let calls=0;const ui=await setup(true,{submitQuote:async()=>{calls++;}});fillForm(ui);
 const choose=async count=>{Object.defineProperty(ui.$('photos'),'files',{value:Array.from({length:count},()=>({})),configurable:true});await ui.$('photos').onchange();};
 await choose(6);assert.match(ui.$('formError').textContent,/최대 5장/);assert.equal(ui.$('photoPreview').querySelectorAll('img').length,0);
 await choose(5);assert.equal(ui.$('photoPreview').querySelectorAll('img').length,5);await choose(1);assert.match(ui.$('formError').textContent,/최대 5장/);assert.equal(ui.$('photoPreview').querySelectorAll('img').length,5);
 ui.$('date').value='2020-01-01';ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(ui.$('photoPreview').querySelectorAll('img').length,5);
 ui.$('date').value='';ui.$('next').click();ui.$('photoPreview').querySelectorAll('button')[2].click();assert.equal(ui.$('photoPreview').querySelectorAll('img').length,4);assert.equal(ui.$('name').value,'시험');assert.equal(ui.$('phone').value,'010-0000-0000');assert.equal(calls,0);ui.dom.window.close();
});


test('한글 조합 확정 중 발생한 submit은 작업 단계를 넘기지 않음',async()=>{
 const ui=await setup(true,{},'https://test.invalid/quote/?svc=office');ui.$('next').click();
 for(const[k,v]of Object.entries({industry:'카페',size:'20',unit:'평',scope:'바닥·유리',frequency:'일회성',time:'영업 전 08시',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 const input=ui.w.document.querySelector('[name=industry]');input.dispatchEvent(new ui.w.CompositionEvent('compositionstart',{bubbles:true}));
 input.dispatchEvent(new ui.w.KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true,cancelable:true}));
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));
 assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(input.value,'카페');
 input.dispatchEvent(new ui.w.CompositionEvent('compositionend',{bubbles:true}));await tick();
 input.dispatchEvent(new ui.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
 assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false);ui.dom.window.close();
});

test('compositionend 직후 isComposing false·229 Enter도 확정만 하고 다음 Enter로 진행',async()=>{
 const ui=await setup();ui.$('next').click();for(const[k,v]of Object.entries({type:'벽걸이',count:'2',condition:'보통'}))ui.w.document.querySelector('[name="'+k+'"]').value=v;
 const input=ui.w.document.querySelector('[name=count]');input.dispatchEvent(new ui.w.CompositionEvent('compositionstart',{bubbles:true}));input.dispatchEvent(new ui.w.CompositionEvent('compositionend',{bubbles:true}));
 const event=new ui.w.KeyboardEvent('keydown',{key:'Enter',keyCode:229,isComposing:false,bubbles:true,cancelable:true});input.dispatchEvent(event);
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));
 assert.equal(event.defaultPrevented,false);assert.equal(ui.w.document.querySelector('[data-step="2"]').hidden,false);assert.equal(input.value,'2');
 await tick();input.dispatchEvent(new ui.w.KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert.equal(ui.w.document.querySelector('[data-step="3"]').hidden,false);ui.dom.window.close();
});

test('연락처 한글 조합 확정 submit은 저장하지 않고 확정 후 명시적 접수는 한 번 저장',async()=>{
 let calls=0,sent;const ui=await setup(true,{newRequestId:()=> 'I'.repeat(20),submitQuote:async(c,id,input)=>{calls++;sent=input;}});fillForm(ui);
 ui.$('name').value='시험 호칭';ui.$('name').dispatchEvent(new ui.w.CompositionEvent('compositionstart',{bubbles:true}));
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();
 assert.equal(calls,0);assert.equal(ui.$('complete').hidden,true);assert.equal(ui.$('name').value,'시험 호칭');assert.equal(ui.$('phone').value,'010-0000-0000');
 ui.$('name').dispatchEvent(new ui.w.CompositionEvent('compositionend',{bubbles:true}));await tick();
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.equal(sent.name,'시험 호칭');assert.equal(ui.$('complete').hidden,false);ui.dom.window.close();
});


test('저장 중 이탈 경고는 유지하고 서버 접수 확인 뒤에는 이탈을 막지 않음',async()=>{
 let finish;const ui=await setup(true,{newRequestId:()=> 'L'.repeat(20),submitQuote:()=>new Promise(resolve=>finish=resolve)});fillForm(ui);
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();
 const pending=new ui.w.Event('beforeunload',{cancelable:true});ui.w.dispatchEvent(pending);assert.equal(pending.defaultPrevented,true);assert.equal(ui.$('complete').hidden,true);
 finish({id:'L'.repeat(20)});await tick();const completed=new ui.w.Event('beforeunload',{cancelable:true});ui.w.dispatchEvent(completed);
 assert.equal(ui.$('complete').hidden,false);assert.equal(completed.defaultPrevented,false);ui.dom.window.close();
});

test('서버 접수 확인 후 완료 제목으로 초점 이동하고 상담 링크·접수번호 표시',async()=>{
 const ui=await setup();fillForm(ui);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();
 assert.equal(ui.w.document.activeElement.textContent,'견적 접수가 완료됐습니다.');assert.equal(ui.w.document.activeElement.tabIndex,-1);assert.equal(ui.w.document.activeElement.closest('section'),ui.$('complete'));
 assert.equal(ui.$('quoteForm').hidden,true);assert.match(ui.$('receipt').textContent,/^OKQ-/);assert.equal(ui.$('completeKakao').getAttribute('href'),'https://open.kakao.com/o/s3TIhwSi');assert.ok(ui.$('complete').querySelector('a[href="tel:0339114457"]'));ui.dom.window.close();
});

test('완료 후 추가 submit은 저장·완료 통계를 반복하지 않고 입력 삭제 상태 유지',async()=>{
 let calls=0;const ui=await setup(true,{newRequestId:()=> 'D'.repeat(20),submitQuote:async()=>{calls++;}}),events=[];ui.w.OKCleanAnalytics.track=name=>events.push(name);fillForm(ui);
 const form=ui.$('quoteForm');form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();const receipt=ui.$('receipt').textContent;
 form.dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.equal(events.filter(x=>x==='quote_submit_success').length,1);assert.equal(ui.$('receipt').textContent,receipt);assert.equal(ui.$('name').value,'');assert.equal(ui.$('phone').value,'');assert.equal(ui.$('complete').hidden,false);ui.dom.window.close();
});


test('저장 실패 뒤 재시도 버튼으로 초점 이동하고 같은 번호 재시도까지 입력 유지',async()=>{
 let calls=0;const ids=[];const ui=await setup(true,{newRequestId:()=> 'F'.repeat(20),submitQuote:async(c,id)=>{ids.push(id);if(++calls===1)throw{code:'unavailable'};}});fillForm(ui);
 ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(ui.$('complete').hidden,true);assert.equal(ui.w.document.activeElement,ui.$('submit'));assert.equal(ui.$('submit').disabled,false);assert.equal(ui.$('name').value,'시험');assert.equal(ui.$('phone').value,'010-0000-0000');
 ui.$('submit').click();await tick();assert.equal(ui.$('complete').hidden,false);assert.deepEqual(ids,['F'.repeat(20),'F'.repeat(20)]);assert.equal(ui.w.document.activeElement.textContent,'견적 접수가 완료됐습니다.');ui.dom.window.close();
});


test('사진 묶음 처리 실패는 기존 사진·연락처 유지하고 새 묶음 전체만 재시도',async()=>{
 let savedPhotos;const ui=await setup(true,{newRequestId:()=> 'P'.repeat(20),submitQuote:async(c,id,input,photos)=>{savedPhotos=Array.from(photos,p=>p.data);}},'https://test.invalid/quote/?svc=aircon',async f=>{if(f.bad)throw new Error('사진을 변환하지 못했습니다.');return{data:f.data};});fillForm(ui);
 const choose=async files=>{Object.defineProperty(ui.$('photos'),'files',{value:files,configurable:true});await ui.$('photos').onchange();};
 await choose([{data:'data:image/jpeg;base64,/9j/AAAA'}]);await choose([{data:'data:image/jpeg;base64,/9j/BBBB'},{bad:true}]);
 assert.equal(ui.$('photoPreview').querySelectorAll('img').length,1);assert.match(ui.$('formError').textContent,/변환/);assert.equal(ui.$('name').value,'시험');assert.equal(ui.$('phone').value,'010-0000-0000');assert.equal(ui.$('submit').disabled,false);
 await choose([{data:'data:image/jpeg;base64,/9j/CCCC'}]);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.deepEqual(savedPhotos,['data:image/jpeg;base64,/9j/AAAA','data:image/jpeg;base64,/9j/CCCC']);assert.equal(ui.$('complete').hidden,false);ui.dom.window.close();
});

test('사진 압축 대기 중에는 제출 차단·완료 후 모든 사진을 함께 한 번 저장',async()=>{
 let release,calls=0,count;const ui=await setup(true,{newRequestId:()=> 'W'.repeat(20),submitQuote:async(c,id,input,photos)=>{calls++;count=photos.length;}},'https://test.invalid/quote/?svc=aircon',()=>new Promise(resolve=>release=resolve));fillForm(ui);
 Object.defineProperty(ui.$('photos'),'files',{value:[{}],configurable:true});const pending=ui.$('photos').onchange();assert.equal(ui.$('submit').disabled,true);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,0);assert.equal(ui.$('complete').hidden,true);
 release({data:'data:image/jpeg;base64,/9j/AAAA'});await pending;assert.equal(ui.$('submit').disabled,false);ui.$('quoteForm').dispatchEvent(new ui.w.Event('submit',{cancelable:true}));await tick();assert.equal(calls,1);assert.equal(count,1);ui.dom.window.close();
});

function estimateClock(ui){
 let serial=0;const pending=new Map();ui.w.setTimeout=(callback,delay)=>{assert.equal(delay,800);const id=++serial;pending.set(id,callback);return id;};ui.w.clearTimeout=id=>pending.delete(id);
 return{count:()=>pending.size,flush:()=>{const callbacks=[...pending.values()];pending.clear();for(const callback of callbacks)callback();}};
}
function estimateAircon(ui,count){ui.w.document.querySelector('[name=type]').value='벽걸이';ui.w.document.querySelector('[name=count]').value=String(count);ui.$('questions').dispatchEvent(new ui.w.Event('input',{bubbles:true}));}
test('계산 대기 중 서비스가 바뀌어도 계산 이벤트는 실제 계산한 서비스로 기록',async()=>{
 const ui=await setup(),clock=estimateClock(ui),events=[];ui.w.OKCleanAnalytics.track=(name,details)=>events.push({name,service:details.service});ui.$('next').click();estimateAircon(ui,2);assert.match(ui.$('estimate').textContent,/참고 예상 비용/);assert.equal(clock.count(),1);
 ui.$('previous').click();const nextService=ui.w.document.querySelector('[name=service][value="special-home"]');nextService.checked=true;nextService.dispatchEvent(new ui.w.Event('change',{bubbles:true}));ui.$('next').click();assert.match(ui.$('estimate').textContent,/현장 사진/);clock.flush();
 const calculated=events.filter(e=>e.name==='quote_calculate');assert.equal(calculated.length,1);assert.equal(calculated[0].service,'aircon');ui.dom.window.close();
});
test('연속 수량 변경은 최종 예상 비용의 계산 이벤트 한 번으로 묶음',async()=>{
 const ui=await setup(),clock=estimateClock(ui),events=[];ui.w.OKCleanAnalytics.track=(name,details)=>events.push({name,service:details.service});ui.$('next').click();for(const count of[1,2,4])estimateAircon(ui,count);assert.equal(clock.count(),1);clock.flush();assert.deepEqual(events.filter(e=>e.name==='quote_calculate'),[{name:'quote_calculate',service:'aircon'}]);ui.dom.window.close();
});
test('미리보기·관리자 시험의 지연 계산 이벤트는 실제 통계로 전송하지 않음',async()=>{
 for(const mode of['quote_preview','quote_test']){
  const store={getBackend:async()=>({auth:{currentUser:{uid:'H1MfdqGkFRZzU8qkqwXTsiKv3CO2',providerData:[{providerId:'google.com'}]}}})};const ui=await setup(true,store,'https://test.invalid/quote/?svc=aircon&'+mode+'=1'),clock=estimateClock(ui),events=[];ui.w.OKCleanAnalytics.track=(name,details)=>events.push({name,service:details.service});ui.$('next').click();estimateAircon(ui,2);assert.equal(clock.count(),1);clock.flush();assert.deepEqual(events,[]);ui.dom.window.close();
 }
});
