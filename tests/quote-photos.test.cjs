const{test}=require('node:test'),assert=require('node:assert/strict');
const JPEG='data:image/jpeg;base64,/9j/AAAA';
const BIG='data:image/jpeg;base64,/9j/'+'A'.repeat(159976);
const file={type:'image/jpeg',size:100,slice:()=>({arrayBuffer:async()=>new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1,0,0,1,0]).buffer})};
async function browser(options,run){
 const saved=new Map(['document','createImageBitmap'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const calls={canvases:[],closed:0,decoded:0},bitmap={width:options.width??4000,height:options.height??3000,close(){calls.closed++;}};
 globalThis.createImageBitmap=options.unsupported?undefined:async()=>{calls.decoded++;if(options.decodeError)throw new Error('raw decoder error');return bitmap;};
 globalThis.document={createElement(tag){assert.equal(tag,'canvas');const canvas={width:0,height:0,getContext(kind){assert.equal(kind,'2d');return options.noContext?null:{fillRect(){},drawImage(){if(options.drawError)throw new Error('raw draw error');}};},toDataURL(type,quality){assert.equal(type,'image/jpeg');if(options.exportError)throw new Error('raw export error');return options.output?options.output(calls.canvases.length,this,quality):JPEG;}};calls.canvases.push(canvas);return canvas;}};
 try{await run(calls);}finally{for(const[k,descriptor]of saved)if(descriptor)Object.defineProperty(globalThis,k,descriptor);else delete globalThis[k];}
}
test('세로·가로·작은 사진은 비율을 유지하며 긴 변 1280 이하로 압축·확대하지 않음',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');
 for(const[width,height,expected]of[[320,12000,[34,1280]],[9000,4500,[1280,640]],[640,480,[640,480]],[8000,6000,[1280,960]]])await browser({width,height},async calls=>{
  assert.equal((await compressPhoto(file)).data,JPEG);assert.deepEqual(calls.canvases.map(c=>[c.width,c.height]),[expected]);assert.equal(calls.closed,1);
 });
});
test('빈 캔버스·PNG 대체·잘못된 JPEG/base64 출력을 첨부 성공으로 반환하지 않음',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');
 for(const output of['data:,','data:image/png;base64,iVBORw0KGgo=','data:image/jpeg;base64,AAAA','data:image/jpeg;base64,/9j/AA','data:image/jpeg;base64,/9j/A=AA'])await browser({output:()=>output},async calls=>{
  await assert.rejects(compressPhoto(file),/사진.*변환/);assert.equal(calls.closed,1);
 });
});
test('160000자 초과 결과는 축소 재시도하고 유효한 JPEG가 되면 반환',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');await browser({output:n=>n<3?BIG:JPEG},async calls=>{
  assert.equal((await compressPhoto(file)).data,JPEG);assert.deepEqual(calls.canvases.map(c=>[c.width,c.height]),[[1280,960],[1024,768],[819,614]]);assert.equal(calls.closed,1);
 });
});
test('압축 한도를 6회 안에 충족하지 못하면 실패하고 모든 캔버스 크기 제한',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');await browser({width:3000,height:4000,output:()=>BIG},async calls=>{
  await assert.rejects(compressPhoto(file),/작게/);assert.equal(calls.canvases.length,6);assert.ok(calls.canvases.every(c=>c.width>0&&c.height>0&&c.width<=1280&&c.height<=1280));assert.equal(calls.closed,1);
 });
});
test('이미지 디코딩 실패는 한국어로 안내하고 미지원 브라우저 대안 유지',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');await browser({decodeError:true},async calls=>{
  await assert.rejects(compressPhoto(file),/사진.*읽지/);assert.equal(calls.canvases.length,0);assert.equal(calls.closed,0);
 });await browser({},async calls=>{await assert.rejects(compressPhoto({...file,slice:()=>({arrayBuffer:async()=>{throw new Error('raw read error');}})}),/사진.*읽지/);assert.equal(calls.decoded,0);assert.equal(calls.canvases.length,0);});await browser({unsupported:true},async calls=>{await assert.rejects(compressPhoto(file),/브라우저/);assert.equal(calls.decoded,0);});
});
test('4800만 화소 초과·잘못된 비트맵 크기는 캔버스 생성 전 거부하고 자원 해제',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');
 for(const[width,height,message]of[[12000,4001,/4800만/],[0,10,/읽지/],[10,0,/읽지/]])await browser({width,height},async calls=>{
  await assert.rejects(compressPhoto(file),message);assert.equal(calls.canvases.length,0);assert.equal(calls.closed,1);
 });
});
test('캔버스 문맥·그리기·내보내기 실패도 한국어 안내와 자원 해제',async()=>{
 const{compressPhoto}=await import('../quote/photos.mjs');
 for(const options of[{noContext:true},{drawError:true},{exportError:true}])await browser(options,async calls=>{
  await assert.rejects(compressPhoto(file),/사진.*변환/);assert.equal(calls.closed,1);
 });
});
