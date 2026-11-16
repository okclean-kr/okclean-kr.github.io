export function imageType(bytes){
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return'image/jpeg';
 if([137,80,78,71,13,10,26,10].every((x,i)=>bytes[i]===x))return'image/png';
 if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP')return'image/webp';
 return'';
}
export async function compressPhoto(file){
 if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10*1024*1024||file.size<12)throw new Error('사진은 JPEG·PNG·WebP 형식, 한 장 10MB 이하로 첨부해 주세요.');
 if(imageType(new Uint8Array(await file.slice(0,16).arrayBuffer()))!==file.type)throw new Error('사진의 실제 파일 형식을 확인해 주세요.');
 if(typeof createImageBitmap!=='function')throw new Error('이 브라우저에서는 사진을 처리하기 어렵습니다. 사진 없이 신청하거나 카카오톡으로 보내 주세요.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width*bitmap.height>48000000)throw new Error('사진 크기가 너무 큽니다. 4800만 화소 이하로 줄여 주세요.');
  let width=Math.min(1280,bitmap.width),data='';
  for(let attempt=0;attempt<6;attempt++){
   const canvas=document.createElement('canvas');canvas.width=Math.round(width);canvas.height=Math.max(1,Math.round(bitmap.height*width/bitmap.width));
   const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   data=canvas.toDataURL('image/jpeg',.76-attempt*.06);
   if(data.length<=160000)return{data};width*=.8;
  }
  throw new Error('사진을 더 작게 줄여 다시 첨부해 주세요.');
 }finally{bitmap.close();}
}
