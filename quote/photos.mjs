export function imageType(bytes){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))return'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return'image/webp';
 return'';
}
export async function compressPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size<12)throw new Error('사진은 JPEG·PNG·WebP 형식, 한 장 10MB 이하로 첨부해 주세요.');
 const readMessage='사진을 읽지 못했습니다. 사진을 다시 저장한 뒤 첨부하거나 사진 없이 신청해 주세요.';
 const convertMessage='사진을 변환하지 못했습니다. 크기를 줄여 다시 첨부하거나 사진 없이 신청해 주세요.';
 let header;try{header=new Uint8Array(await file.slice(0,16).arrayBuffer());}catch{throw new Error(readMessage);}
 if(imageType(header)!==file.type)throw new Error('사진의 실제 파일 형식을 확인해 주세요.');
 if(typeof createImageBitmap!=='function')throw new Error('이 브라우저에서는 사진을 처리하기 어렵습니다. 사진 없이 신청하거나 카카오톡으로 보내 주세요.');
 let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error(readMessage);}
 try{
  if(!Number.isInteger(bitmap.width)||!Number.isInteger(bitmap.height)||bitmap.width<=0||bitmap.height<=0)throw new Error(readMessage);
  if(bitmap.width*bitmap.height>48000000)throw new Error('사진 크기가 너무 큽니다. 4800만 화소 이하로 줄여 주세요.');
  let scale=Math.min(1,1280/bitmap.width,1280/bitmap.height);
  for(let attempt=0;attempt<6;attempt++){
   const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
   let data;try{
    const ctx=canvas.getContext('2d');if(!ctx)throw new Error();ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    data=canvas.toDataURL('image/jpeg',.76-attempt*.06);
   }catch{throw new Error(convertMessage);}
   const prefix='data:image/jpeg;base64,',encoded=typeof data==='string'&&data.startsWith(prefix)?data.slice(prefix.length):'';
   if(!/^\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(encoded)||encoded.length%4!==0)throw new Error(convertMessage);
   if(data.length<=160000)return{data};scale*=.8;
  }
  throw new Error('사진을 더 작게 줄여 다시 첨부해 주세요.');
 }finally{bitmap.close();}
}
