// 오케이청소 고객용·관리자용 공통 앱 설치 UX
(function(){
  'use strict';
  const script=document.currentScript;
  if(!script||window.OKCleanInstallUnified) return;

  const role=script.dataset.appRole||'customer';
  const name=script.dataset.appName||(role==='admin'?'오케이청소 관리자':'오케이청소');
  const iosTitle=role==='admin'?'관리자 앱 설치':'아이폰에 앱 설치';
  const installLabel=role==='admin'?'관리자 앱 설치':'오케이청소 앱 설치';
  const installedLabel='앱이 설치되어 있습니다';
  const root=script.dataset.root||'';
  const ua=navigator.userAgent||'';
  const isIOS=/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isStandalone=()=>matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;

  let deferred=null;
  let installed=isStandalone();
  const buttons=()=>Array.from(document.querySelectorAll('[data-install]'));
  const labels=()=>Array.from(document.querySelectorAll('[data-install-label]'));

  function setText(text){
    labels().forEach(el=>el.textContent=text);
    buttons().forEach(btn=>{
      if(!btn.querySelector('[data-install-label]')){
        const span=btn.querySelector('span');
        if(span) span.textContent=text;
      }
    });
  }

  function setVisible(show){
    buttons().forEach(btn=>{btn.hidden=!show;btn.disabled=false;});
  }

  function statusText(text){
    document.querySelectorAll('[data-install-status]').forEach(el=>{el.textContent=text;el.hidden=!text;});
  }

  function closePanel(){
    const old=document.getElementById('okInstallUnifiedPanel');
    if(old) old.remove();
  }

  function panel(title,body){
    closePanel();
    const box=document.createElement('section');
    box.id='okInstallUnifiedPanel';
    box.className='install-help-card';
    box.setAttribute('role','status');
    box.innerHTML='<div class="install-help-head"><b></b><button type="button" aria-label="닫기">×</button></div><div class="install-help-body"></div>';
    box.querySelector('b').textContent=title;
    box.querySelector('.install-help-body').innerHTML=body;
    box.querySelector('button').onclick=closePanel;
    const anchor=document.querySelector('[data-install-primary]')||buttons()[0];
    (anchor?.parentElement||document.body).appendChild(box);
  }

  function iosHelp(){
    panel(iosTitle,'<ol class="install-help-steps"><li>Safari의 <b>공유</b> 버튼을 누르세요.</li><li><b>홈 화면에 추가</b>를 선택하세요.</li><li>오른쪽 위 <b>추가</b>를 누르세요.</li></ol>');
  }

  function fallbackHelp(){
    panel('앱 설치 안내','<p>이 브라우저에서는 자동 설치창을 열 수 없습니다.</p><ol class="install-help-steps"><li>브라우저 메뉴를 여세요.</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</li></ol>');
  }

  async function install(){
    if(installed||isStandalone()){
      installed=true;setVisible(false);setText(installedLabel);statusText(installedLabel);return;
    }
    if(deferred){
      const ev=deferred;
      deferred=null;
      try{
        await ev.prompt();
        const choice=await ev.userChoice;
        if(choice?.outcome==='accepted'){
          statusText('설치를 시작했습니다.');
        }else{
          statusText('설치를 취소했습니다.');
        }
      }catch(_){
        fallbackHelp();
      }
      return;
    }
    if(isIOS){iosHelp();return;}
    fallbackHelp();
  }

  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault();
    deferred=e;
    if(!installed&&!isStandalone()){
      setVisible(true);
      setText(installLabel);
      statusText('');
    }
  });

  window.addEventListener('appinstalled',()=>{
    deferred=null;
    installed=true;
    setVisible(false);
    statusText(installedLabel);
    closePanel();
  });

  buttons().forEach(btn=>btn.addEventListener('click',e=>{e.preventDefault();install();}));

  if(installed){
    setVisible(false);
    statusText(installedLabel);
  }else{
    setVisible(true);
    setText(isIOS?iosTitle:installLabel);
  }

  if('serviceWorker' in navigator&&script.dataset.sw){
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register(root+script.dataset.sw,{updateViaCache:'none'}).catch(()=>{});
    },{once:true});
  }

  window.OKCleanInstallUnified=Object.freeze({install,getState:()=>({role,name,installed:isStandalone()||installed,hasPrompt:!!deferred,isIOS})});
})();