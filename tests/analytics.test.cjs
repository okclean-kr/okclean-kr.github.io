const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const api = require('../analytics.js');
const source = fs.readFileSync(require.resolve('../analytics.js'), 'utf8');

function tracker({search='?src=blog',path='/',settings={},debug=true}={}) {
  const values=new Map(debug?[['okclean_analytics_debug_v1','true']]:[]),listeners={},timers=new Map();
  let timerId=0;
  const window={
    OKCLEAN_ANALYTICS:settings,
    location:{pathname:path,search,origin:'https://okclean-kr.github.io'},
    sessionStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)},
    document:{referrer:'',getElementById:id=>id==='qSvc'?{value:'aircon'}:null,addEventListener:(name,fn)=>{listeners[name]=fn;}},
    setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)
  };
  vm.runInNewContext(source,{window,URL,URLSearchParams,module:{exports:{}},console});
  const element=({id='',href='',parents=[],attrs={}}={})=>({id,getAttribute:name=>name==='href'?href:attrs[name]||null,closest:selector=>{
    if(selector==='a, button')return true;
    return selector.split(',').map(s=>s.trim()).some(s=>parents.includes(s))?{}:null;
  }});
  return {api:window.OKCleanAnalytics,values,click(options){const el=element(options);listeners.click({target:{closest:()=>el}});},change(){listeners.change({target:{closest:()=>({})}});},flush(){for(const fn of timers.values())fn();timers.clear();}};
}

test('전송 객체에는 허용된 열거값만 남고 개인 필드는 버린다',()=>{
  const result=api.buildEvent('kakao_open',{
    service:'aircon',placement:'hero',target:'direct',name:'개인 이름',phone:'010-1234-5678',
    address:'개인 상세 주소',area:'춘천',date:'2026-11-30',text:'견적 본문',uid:'회원 식별자',
    coupon:'OK-PRIVATE',url:'https://example.com/?phone=01012345678',source:'arbitrary',test:true
  },{source:'blog',page:'home',test:false});
  assert.deepEqual(result,{schema:1,event:'kakao_open',source:'blog',page:'home',service:'aircon',placement:'hero',target:'direct',test:false});
  assert.equal(Object.isFrozen(result),true);
});

test('허용 필드에 넣은 개인 문자열과 알 수 없는 이벤트도 전송되지 않는다',()=>{
  const result=api.buildEvent('phone_open',{service:'010-1234-5678',placement:'개인주소',target:'예약본문'},{source:'실명이름',page:'/customer/private',test:false});
  assert.equal(result.service,'unknown');assert.equal(result.placement,'other');assert.equal(result.target,'none');assert.equal(result.source,'other');assert.equal(result.page,'other');
  assert.equal(api.buildEvent('예약자 01012345678',{},{}),null);
  assert.equal(api.buildEvent('diagnostic',{},{}),null);
});

test('유입 파라미터와 리퍼러의 원문을 보존하지 않는다',()=>{
  assert.equal(api.resolveSource('?src=blog&phone=01012345678&name=secret','','https://okclean-kr.github.io','direct'),'blog');
  assert.equal(api.resolveSource('?utm_source=youtube&email=private%40example.com','','https://okclean-kr.github.io','direct'),'youtube');
  assert.equal(api.resolveSource('?src=private-person','','https://okclean-kr.github.io','direct'),'other');
  assert.equal(api.resolveSource('','https://blog.naver.com/user/private?phone=01012345678','https://okclean-kr.github.io','direct'),'blog');
  assert.equal(api.resolveSource('','https://youtube.com.evil.example/private','https://okclean-kr.github.io','direct'),'other');
  assert.equal(api.resolveSource('','https://okclean-kr.github.io/area/private?phone=x','https://okclean-kr.github.io','threads'),'threads');
});

test('페이지와 서비스 분류에도 전체 경로가 남지 않는다',()=>{
  assert.equal(api.resolvePage('/services/aircon.html'),'service');
  assert.equal(api.resolvePage('/admin/analytics.html'),'other');
  assert.equal(api.resolvePage('/customer/private-name'),'other');
  assert.equal(api.serviceFromPath('/services/aircon.html'),'aircon');
  assert.equal(api.serviceFromPath('/services/private-name.html'),'unknown');
});

test('검증되지 않은 설정은 운영 전송을 활성화하지 않는다',async()=>{
  for(const settings of [{},{enabled:true,verified:false},{enabled:false,verified:true},{enabled:'true',verified:'true'}]){
    const t=tracker({settings,debug:false});
    assert.equal(t.api.status().enabled,false);
    assert.equal((await t.api.track('page_view',{})).status,'disabled');
    assert.equal(t.values.size,0);
  }
  const ready=tracker({path:'/admin/analytics.html',settings:{enabled:true,verified:true},debug:false});
  assert.equal(ready.api.status().enabled,true);
});

test('로컬 점검 기록은 운영 전송 성공으로 표시하지 않는다',async()=>{
  const t=tracker({search:'?src=threads&phone=01012345678&analytics_test=1',debug:false});
  const result=await t.api.track('signup_complete',{name:'private',phone:'01012345678'});
  assert.equal(result.status,'local_only');
  const rows=t.api.debugEvents();
  assert.equal(rows[0].event,'page_view');
  assert.equal(rows.every(row=>row.delivery==='local_only'&&row.test===true),true);
  assert.equal(JSON.stringify(rows).includes('01012345678'),false);
  assert.equal(JSON.stringify(rows).includes('private'),false);
});

test('채용·협업과 가입 정보 보내기는 청소 상담 클릭에서 제외한다',()=>{
  const t=tracker(),initial=t.api.debugEvents().length;
  t.click({href:'https://open.kakao.com/o/example',parents:['.recruit']});
  t.click({id:'jKakao'});
  t.click({href:'https://open.kakao.com/o/example',parents:['#sheet']});
  assert.equal(t.api.debugEvents().length,initial);
  t.click({href:'https://open.kakao.com/o/example',parents:['.hero'],attrs:{'data-contact-kind':'direct'}});
  const event=t.api.debugEvents().at(-1);
  assert.equal(event.event,'kakao_open');assert.equal(event.target,'direct');
});

test('견적 안내 진입과 카톡 링크 열기는 별도 사건으로 남긴다',()=>{
  const t=tracker();
  t.click({id:'qKakao',parents:['#quote']});
  t.click({href:'https://open.kakao.com/o/example',parents:['#sheet']});
  const rows=t.api.debugEvents().slice(-2);
  assert.equal(rows[0].event,'contact_prepare');assert.equal(rows[1].event,'kakao_open');
  assert.equal(rows[0].target,'quote');assert.equal(rows[1].target,'quote');
  assert.equal(rows.some(row=>/lead|reservation|received/.test(row.event)),false);
});

test('초기 기본 가격은 견적 조작으로 세지 않고 연속 입력은 묶는다',()=>{
  const t=tracker();
  assert.equal(t.api.debugEvents().some(row=>row.event==='quote_result'),false);
  t.change();t.change();t.change();t.flush();
  const rows=t.api.debugEvents();
  assert.equal(rows.filter(row=>row.event==='quote_start').length,1);
  assert.equal(rows.filter(row=>row.event==='quote_result').length,1);
});

test('실제 사례 링크와 추천제품 이동만 별도 사건으로 기록한다',()=>{
  const t=tracker(),initial=t.api.debugEvents().length;
  t.click({href:'#cases',attrs:{'data-placement':'hero'}});
  t.click({href:'https://blog.naver.com/boss6008'});
  t.click({href:'https://unrelated.example/shop/'});
  assert.equal(t.api.debugEvents().length,initial);
  t.click({href:'https://blog.naver.com/boss6008/224002535713?phone=private',attrs:{'data-placement':'hero'}});
  t.click({href:'https://blog.naver.com/cleankoreacoop/224367465550',attrs:{'data-placement':'featured'}});
  t.click({href:'shop/?src=home&private=hidden'});
  const events=t.api.debugEvents().slice(-3);
  assert.equal(events[0].event,'case_open');assert.equal(events[0].placement,'hero');
  assert.equal(events[1].event,'case_open');assert.equal(events[1].placement,'service');
  assert.equal(events[2].event,'shop_open');assert.equal(events[2].target,'none');
  assert.equal(JSON.stringify(events).includes('224002535713'),false);
  assert.equal(JSON.stringify(events).includes('private'),false);
});

test('페이지에서 사용하는 위치 속성을 서버의 허용된 위치로 변환한다',()=>{
  const t=tracker();
  const placements={hero:'hero','quote-guide':'quote','quote-sheet':'quote',featured:'service',cases:'service',dock:'sticky',premium:'service'};
  for(const [label,expected] of Object.entries(placements)){
    t.click({href:'https://open.kakao.com/o/example',attrs:{'data-placement':label}});
    assert.equal(t.api.debugEvents().at(-1).placement,expected,label);
  }
  for(const label of ['service-top','service-bottom','area-top','area-bottom','dock']){
    t.click({href:'https://open.kakao.com/o/example',attrs:{'data-cta-location':label}});
    assert.equal(t.api.debugEvents().at(-1).placement,label==='dock'?'sticky':'service',label);
  }
});

test('날짜별 집계는 KST 자정을 기준으로 운영 이벤트만 계산한다',()=>{
  const rows=api.aggregateByDay([
    {event:'page_view',test:false,at:'2026-11-11T14:59:59.999Z',source:'youtube'},
    {event:'page_view',test:false,at:'2026-11-11T15:00:00.000Z',source:'blog'},
    {event:'case_open',test:false,at:'2026-11-12T01:00:00.000Z',source:'youtube'},
    {event:'shop_open',test:false,at:'2026-11-12T02:00:00.000Z',source:'blog'},
    {event:'kakao_open',test:false,at:'2026-11-12T05:00:00.000Z',source:'threads'},
    {event:'page_view',test:true,at:'2026-11-12T05:00:00.000Z',source:'youtube'},
    {event:'phone_open',at:'2026-11-12T05:00:00.000Z',source:'youtube'},
    {event:'diagnostic',test:false,at:'2026-11-12T05:00:00.000Z'},
    {event:'page_view',test:false,at:'invalid'}
  ]);
  assert.deepEqual(rows.map(row=>row.day),['2026-11-12','2026-11-11']);
  assert.equal(rows[0].counts.page_view,1);
  assert.equal(rows[0].counts.case_open,1);
  assert.equal(rows[0].counts.shop_open,1);
  assert.equal(rows[0].counts.kakao_open,1);
  assert.equal(rows[0].counts.phone_open,0);
  assert.equal(rows[1].counts.page_view,1);
  assert.equal(api.aggregateByDay([{event:'page_view',test:true,at:'2026-11-12T05:00:00.000Z'}]).length,0);
});
