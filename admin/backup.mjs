import{getBackend}from'../quote/quote-store.mjs';
import{assertBackupAdmin,collectCustomerBackup}from'./customer-backup-store.mjs';
import{sealBackup,openBackup,digest,MAX_FILE_BYTES}from'./customer-backup-core.mjs';
const $=id=>document.getElementById(id);
let backend,session=0,busy=false,downloadURL;
function revoke(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;$('download').hidden=true;$('download').removeAttribute('href');}
function wipe(){for(const id of['password','passwordConfirm','verifyPassword'])$(id).value='';}
function reset(){session++;busy=false;revoke();wipe();$('backupFile').value='';$('backupSummary').textContent='';$('progress').textContent='암호를 입력하면 시작할 수 있습니다.';$('verifyStatus').textContent='파일과 암호를 입력해 주세요.';controls(false);}
function controls(disabled){for(const id of['prepare','verify','password','passwordConfirm','verifyPassword','backupFile'])$(id).disabled=disabled;}
function summary(payload){const c=payload.counts;const time=payload.finishedAt?new Date(payload.finishedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}):'';return(time?'조회 완료 '+time+' · ':'')+'회원 '+c.members+'건 · 견적 '+c.quotes+'건 (시험 '+c.testQuotes+'건 포함) · 사진 '+c.photos+'장 · 이력 '+c.history+'건 · 총 '+payload.records.length+'문서'+(payload.warnings.length?' · 없는 참조 문서 '+payload.warnings.length+'건':'');}
async function authorized(activeSession){if(activeSession!==session)throw new Error('로그인 상태가 변경되었습니다.');await assertBackupAdmin(backend);if(activeSession!==session)throw new Error('로그인 상태가 변경되었습니다.');}
$('backupForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 const activeSession=session,password=$('password').value;
 if(password.length<12||password.length>256||password!==$('passwordConfirm').value){$('progress').textContent='12~256자의 같은 백업 암호를 두 번 입력해 주세요.';return;}
 busy=true;controls(true);revoke();$('backupSummary').textContent='';
 try{
  await authorized(activeSession);if(!globalThis.crypto?.subtle)throw new Error('암호화를 지원하는 최신 HTTPS 브라우저에서 다시 열어 주세요.');$('progress').textContent='서버 자료를 읽고 있습니다…';
  const payload=await collectCustomerBackup(backend,{isActive:()=>activeSession===session,onProgress:p=>{if(activeSession===session)$('progress').textContent='서버 자료 '+p.documents+'문서 확인 중…';}});
  await authorized(activeSession);$('progress').textContent='브라우저에서 암호화하고 복호화 무결성을 확인합니다…';
  const encrypted=await sealBackup(payload,password),verified=await openBackup(encrypted,password,{expectedProject:backend.app.options.projectId});
  await authorized(activeSession);if(JSON.stringify(payload)!==JSON.stringify(verified))throw new Error('백업 재확인 결과가 일치하지 않습니다.');
  const checksum=await digest(encrypted);await authorized(activeSession);
  downloadURL=URL.createObjectURL(new Blob([encrypted],{type:'application/json'}));$('download').href=downloadURL;
  const stamp=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',dateStyle:'short',timeStyle:'medium'}).format(new Date()).replace(/[- :]/g,'');
  $('download').download='OKClean_customers_'+stamp+'_KST.okcbackup';$('download').hidden=false;
  $('progress').textContent='서버 조회·암호화·복호화 검증 완료. 아래 링크로 파일을 내려받아 보관하세요.';
  $('backupSummary').textContent=summary(verified)+' · 파일 SHA-256 '+checksum;
 }catch(error){if(activeSession===session){revoke();$('progress').textContent='백업 파일을 준비하지 못했습니다: '+(error.code||error.message||'연결 확인 필요');}}
 finally{if(activeSession===session){wipe();busy=false;controls(false);}}
};
$('verifyForm').onsubmit=async event=>{
 event.preventDefault();if(busy)return;
 const activeSession=session,file=$('backupFile').files[0],password=$('verifyPassword').value;
 if(!file||file.size>MAX_FILE_BYTES){$('verifyStatus').textContent='30MB 이하의 암호화 백업 파일을 선택해 주세요.';return;}
 busy=true;controls(true);$('verifyStatus').textContent='파일 복호화·무결성을 확인하고 있습니다…';
 try{await authorized(activeSession);const payload=await openBackup(await file.text(),password,{expectedProject:backend.app.options.projectId});await authorized(activeSession);$('verifyStatus').textContent='백업 파일 복호화·무결성 확인 완료 · '+summary(payload)+' · 운영 자료 쓰기·복원은 수행하지 않았습니다.';}
 catch(error){if(activeSession===session)$('verifyStatus').textContent='파일 확인 실패: '+(error.code||error.message||'파일 확인 필요');}
 finally{if(activeSession===session){wipe();busy=false;controls(false);}}
};
try{
 const catalog=await fetch('../quote/catalog.json').then(r=>r.json());backend=await getBackend(catalog.firebase);
 const provider=new backend.h.GoogleAuthProvider();provider.setCustomParameters({prompt:'select_account'});
 $('login').onclick=()=>backend.h.signInWithPopup(backend.auth,provider).catch(()=>{$('authStatus').textContent='Google 관리자 로그인을 완료하지 못했습니다.';});
 $('logout').onclick=()=>{reset();$('panel').hidden=true;return backend.h.signOut(backend.auth);};
 backend.h.onAuthStateChanged(backend.auth,async user=>{reset();const activeSession=session;$('logout').hidden=!user;$('panel').hidden=true;try{await authorized(activeSession);if(activeSession===session){$('panel').hidden=false;$('authStatus').textContent='기존 Google 관리자 인증을 확인했습니다. 백업은 직접 시작할 때만 서버 자료를 읽습니다.';}}catch(error){if(activeSession===session)$('authStatus').textContent=user?'허가된 Google 관리자 계정으로 로그인해 주세요.':'Google 관리자 로그인이 필요합니다.';}});
}catch(error){$('authStatus').textContent='백업 연결을 준비하지 못했습니다. 다시 접속해 주세요.';}
