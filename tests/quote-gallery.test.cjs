const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {createHash}=require('node:crypto');
const {JSDOM}=require('jsdom');
const html=fs.readFileSync('index.html','utf8');
const provenance=JSON.parse(fs.readFileSync('ops/work-process-provenance-20261117.json','utf8'));
const catalog=JSON.parse(fs.readFileSync('quote/catalog.json','utf8'));

test('작업 과정 사진은 스크립트 없이 열고 실제 제공 서비스로 견적 연결',()=>{
  const dom=new JSDOM(html,{url:'https://okclean-kr.github.io/'});
  const section=dom.window.document.querySelector('#work-process');
  const details=section.querySelector('details');
  assert.ok(details.querySelector(':scope > summary').textContent.includes('실제 작업 사진 2장 보기'));
  assert.equal(details.open,false);
  const link=new URL(section.querySelector('a').href);
  assert.equal(link.pathname,'/quote/');
  assert.equal(link.searchParams.get('svc'),'washer');
  assert.ok(catalog.services.find(s=>s.id===link.searchParams.get('svc')));
  assert.match(section.textContent,/세척 중인 장면/);
  assert.doesNotMatch(section.textContent,/청소 후|세척 완료|작업 완료|별점|고객 후기|★/);
  assert.equal(section.querySelectorAll('script,iframe,video').length,0);
  dom.window.close();
});

test('육안 검토한 실제 영상 프레임만 게시하며 지연 로딩·크기 예약·용량 제한',()=>{
  const dom=new JSDOM(html);
  const images=[...dom.window.document.querySelectorAll('#work-process img')];
  assert.equal(images.length,2);
  assert.equal(provenance.assets.length,images.length);
  let bytes=0;
  images.forEach((image,i)=>{
    const asset=provenance.assets[i];
    assert.equal(image.getAttribute('src'),asset.path);
    assert.equal(image.getAttribute('loading'),'lazy');
    assert.equal(image.getAttribute('decoding'),'async');
    assert.equal(image.width,asset.width);
    assert.equal(image.height,asset.height);
    assert.ok(image.alt.length>15);
    const data=fs.readFileSync(asset.path);
    assert.equal(data.subarray(0,4).toString(),'RIFF');
    assert.equal(data.subarray(8,12).toString(),'WEBP');
    assert.equal(createHash('sha256').update(data).digest('hex'),asset.sha256);
    assert.equal(data.length,asset.bytes);
    bytes+=data.length;
  });
  assert.ok(bytes<100000,'두 사진의 합계가 100KB를 넘지 않아야 합니다');
  dom.window.close();
});

test('기존 지역 필터는 원래 작업 사례만 거르고 세탁기 사진·견적 링크를 유지',()=>{
  const dom=new JSDOM(html,{url:'https://okclean-kr.github.io/',runScripts:'outside-only'});
  dom.window.eval(fs.readFileSync('quote/links.js','utf8'));
  const doc=dom.window.document;
  const cards=[...doc.querySelectorAll('#featured-work .featured-card')];
  assert.equal(cards.length,3);
  assert.ok(cards.every(card=>card.href.startsWith('https://blog.naver.com/')));
  const region=[...doc.querySelectorAll('#featured-work button')].find(button=>button.textContent==='춘천');
  assert.ok(region);
  region.click();
  const wrappers=[...doc.querySelectorAll('#featured-work [data-work-region]')];
  assert.equal(wrappers.filter(w=>!w.hidden).length,1);
  assert.equal(wrappers.find(w=>!w.hidden).dataset.workRegion,'춘천');
  assert.equal(doc.querySelector('#work-process').closest('[hidden]'),null);
  assert.ok(doc.querySelector('#work-process a[href="quote/?svc=washer"]'));
  dom.window.close();
});
