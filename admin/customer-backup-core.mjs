// This module has no network, authentication, database writes, or browser storage.
export const MAX_BACKUP_BYTES=20*1024*1024,MAX_FILE_BYTES=30*1024*1024,MAX_RECORDS=5000;
const FORMAT='okclean-customer-backup',ITERATIONS=600000;
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const aad=encoder.encode(FORMAT+':1');
const fail=()=>{throw new Error('백업 파일의 형식·용량·무결성을 확인해 주세요.');};
export function encodeValue(value,depth=0){
 if(depth>30)fail();
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))fail();return value;}
 if(Array.isArray(value))return{type:'array',value:value.map(x=>encodeValue(x,depth+1))};
 if(value&&Number.isInteger(value.seconds)&&Number.isInteger(value.nanoseconds)&&typeof value.toDate==='function')return{type:'timestamp',seconds:value.seconds,nanoseconds:value.nanoseconds};
 if(value&&[Object.prototype,null].includes(Object.getPrototypeOf(value)))return{type:'map',value:Object.keys(value).sort().map(k=>[k,encodeValue(value[k],depth+1)])};
 throw new Error('지원하지 않는 데이터 형식이 있어 백업을 중단했습니다.');
}
export function decodeValue(value,sdk,depth=0){
 if(depth>30)fail();
 if(value===null||typeof value==='string'||typeof value==='boolean')return value;
 if(typeof value==='number'){if(!Number.isFinite(value)||(Number.isInteger(value)&&!Number.isSafeInteger(value)))fail();return value;}
 if(!value||typeof value!=='object'||Array.isArray(value))fail();
 if(value.type==='timestamp'){
  if(Object.keys(value).length!==3||!Number.isInteger(value.seconds)||value.seconds< -62135596800||value.seconds>253402300799||!Number.isInteger(value.nanoseconds)||value.nanoseconds<0||value.nanoseconds>999999999)fail();
  return new sdk.Timestamp(value.seconds,value.nanoseconds);
 }
 if(value.type==='array'&&Object.keys(value).length===2&&Array.isArray(value.value))return value.value.map(x=>decodeValue(x,sdk,depth+1));
 if(value.type==='map'&&Object.keys(value).length===2&&Array.isArray(value.value)){
  const result=Object.create(null),seen=new Set();
  for(const pair of value.value){if(!Array.isArray(pair)||pair.length!==2||typeof pair[0]!=='string'||seen.has(pair[0]))fail();seen.add(pair[0]);Object.defineProperty(result,pair[0],{value:decodeValue(pair[1],sdk,depth+1),enumerable:true});}
  return result;
 }
 fail();
}
export function validRecordPath(path){
 if(typeof path!=='string'||path.length>1800)return false;
 const parts=path.split('/');if(parts.some(x=>!x||x==='.'||x==='..'||/[\u0000-\u001f]/.test(x)))return false;
 return(parts.length===2&&['member_requests','member_receipts','quote_requests','quote_receipts','quote_limits'].includes(parts[0]))
  ||(parts.length===4&&parts[0]==='quote_requests'&&['photos','history'].includes(parts[2]));
}
export function backupCounts(records){
 const counts={members:0,memberReceipts:0,quotes:0,photos:0,history:0,quoteReceipts:0,quoteLimits:0,testQuotes:0};
 for(const r of records){const p=r.path.split('/');if(p[0]==='member_requests')counts.members++;else if(p[0]==='member_receipts')counts.memberReceipts++;else if(p[0]==='quote_receipts')counts.quoteReceipts++;else if(p[0]==='quote_limits')counts.quoteLimits++;else if(p.length===2){counts.quotes++;if(r.data?.value?.some(([k,v])=>k==='test'&&v===true))counts.testQuotes++;}else counts[p[2]]++;}
 return counts;
}
export function validatePayload(payload,expectedProject='okclean-admin'){
 if(!payload||payload.schema!==1||payload.scope!=='members-and-quotes'||payload.projectId!==expectedProject||!Array.isArray(payload.records)||payload.records.length>MAX_RECORDS||!Array.isArray(payload.limitations)||!Array.isArray(payload.warnings)||!Number.isFinite(Date.parse(payload.startedAt))||!Number.isFinite(Date.parse(payload.finishedAt)))fail();
 const seen=new Set();for(const record of payload.records){if(!validRecordPath(record.path)||seen.has(record.path)||record.data?.type!=='map')fail();seen.add(record.path);decodeValue(record.data,{Timestamp:class{constructor(seconds,nanoseconds){this.seconds=seconds;this.nanoseconds=nanoseconds;}}});}
 const counts=backupCounts(payload.records);if(JSON.stringify(counts)!==JSON.stringify(payload.counts))fail();return counts;
}
function passwordBytes(password){if(typeof password!=='string'||password.length<12||password.length>256)throw new Error('백업 암호를 12~256자로 입력해 주세요.');return encoder.encode(password);}
function base64(bytes){let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(text);}
function unbase64(value,max){if(typeof value!=='string'||value.length>max||value.length%4||!/^[A-Za-z0-9+/]*={0,2}$/.test(value))fail();return Uint8Array.from(atob(value),x=>x.charCodeAt(0));}
async function key(password,salt,api){const material=await api.subtle.importKey('raw',passwordBytes(password),'PBKDF2',false,['deriveKey']);return api.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
export async function digest(text,api=globalThis.crypto){return [...new Uint8Array(await api.subtle.digest('SHA-256',encoder.encode(text)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
export async function sealBackup(payload,password,api=globalThis.crypto){
 validatePayload(payload,payload.projectId);passwordBytes(password);
 const text=JSON.stringify(payload);if(encoder.encode(text).length>MAX_BACKUP_BYTES)throw new Error('백업 원문이 20MB를 넘어 중단했습니다.');
 const salt=api.getRandomValues(new Uint8Array(16)),iv=api.getRandomValues(new Uint8Array(12));
 const bytes=encoder.encode(JSON.stringify({payload,sha256:await digest(text,api)}));
 const ciphertext=await api.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await key(password,salt,api),bytes);
 return JSON.stringify({format:FORMAT,version:1,kdf:{name:'PBKDF2',hash:'SHA-256',iterations:ITERATIONS,salt:base64(salt)},cipher:{name:'AES-GCM',iv:base64(iv)},ciphertext:base64(new Uint8Array(ciphertext))});
}
export async function openBackup(text,password,options={}){
 const api=options.cryptoApi||globalThis.crypto;passwordBytes(password);if(typeof text!=='string'||text.length>MAX_FILE_BYTES)fail();
 let envelope;try{envelope=JSON.parse(text);}catch(e){fail();}
 if(envelope?.format!==FORMAT||envelope.version!==1||envelope.kdf?.name!=='PBKDF2'||envelope.kdf.hash!=='SHA-256'||envelope.kdf.iterations!==ITERATIONS||envelope.cipher?.name!=='AES-GCM')fail();
 const salt=unbase64(envelope.kdf.salt,24),iv=unbase64(envelope.cipher.iv,16),ciphertext=unbase64(envelope.ciphertext,MAX_FILE_BYTES);if(salt.length!==16||iv.length!==12||ciphertext.length>MAX_BACKUP_BYTES+4096)fail();
 let decoded;try{const bytes=await api.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await key(password,salt,api),ciphertext);decoded=JSON.parse(decoder.decode(bytes));}catch(e){throw new Error('암호가 다르거나 백업 파일이 손상됐습니다.');}
 if(!decoded?.payload||decoded.sha256!==await digest(JSON.stringify(decoded.payload),api))fail();
 validatePayload(decoded.payload,options.expectedProject||'okclean-admin');return decoded.payload;
}
