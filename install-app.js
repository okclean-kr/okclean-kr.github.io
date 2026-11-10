// 오케이청소 고객용·관리자용 공통 앱 설치 UX
(function(){
  'use strict';
  const script=document.currentScript;
  if(!script||window.OKCleanInstall) return;

  const role=script.dataset.appRole||script.dataset.app||'customer';
  const appName=script.dataset.appName||(role==='admin'?'오케이청소 관리자':'오케이청소');
  const installLabel=role==='admin'?'관리자 앱 설치':'오케이청소 앱 설치';
  const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const displayMode=matchMedia('(display-mode: standalone)');
  const isStandalone=()=>displayMode.matches||navigator.standalone===true;

  let pending=null;
  let installed=isStandalone();
  let panel=null;
  let lastTrigger=null;

  const buttons=()=>Array.from(document.querySelectorAll('[data-install]'));

  function setLabel(text){
    buttons().forEach(btn=>{
      const target=btn.querySelector('[data-install-label],span')||btn;
      target.textContent=text;
    });
  }

  function setVisible(show){
    buttons().forEach(btn=>{btn.hidden=!show;btn.disabled=false;});
  }

  function update(){
    if(installed||isStandalone()){
      installed=true;
      setVisible(false);
      return;
    }
    setVisible(true);
    setLabel(isIOS?'아이폰에 앱 설치':installLabel);
  }

  function closePanel(){
    if(panel){panel.remove();panel=null;}
    if(lastTrigger&&lastTrigger.isConnected) lastTrigger.focus({preventScroll:true});
  }

  function showPanel(title,description,body=''){
    closePanel();
    panel=document.createElement('section');
    panel.className='ok-install-panel';
    panel.id='okInstallPanel';
    panel.tabIndex=-1;
    panel.innerHTML=
      '<div class="ok-install-top">'+
        '<div class="ok-install-brand"><span class="ok-install-badge">'+(role==='admin'?'관리자용':'고객용')+'</span><strong></strong></div>'+
        '<button type="button" class="ok-install-close" aria-label="닫기">×</button>'+
      '</div>'+
      '<h2 id="ok-install-title"></h2>'+
      '<p id="ok-install-description"></p>'+
      '<div class="ok-install-content"></div>'+
      '<p class="ok-install-page-hint"></p>';
    panel.querySelector('strong').textContent=appName;
    panel.querySelector('#ok-install-title').textContent=title;
    panel.querySelector('#ok-install-description').textContent=description;
    panel.querySelector('.ok-install-content').innerHTML=body;
    panel.querySelector('.ok-install-page-hint').textContent='설치 없이도 이 페이지를 계속 사용할 수 있어요.';
    panel.querySelector('.ok-install-close').onclick=closePanel;
    const anchor=lastTrigger?.closest('header')||lastTrigger?.parentElement||document.querySelector('main')||document.body;
    anchor.after ? anchor.after(panel) : document.body.prepend(panel);
    panel.focus({preventScroll:true});
  }

  function iosHelp(){
    showPanel(
      '아이폰 앱 설치 방법',
      'Safari에서 아래 3단계만 진행하세요.',
      '<ol class="ok-install-steps"><li><b>공유</b> 버튼을 누르세요.</li><li><b>홈 화면에 추가</b>를 선택하세요.</li><li>오른쪽 위 <b>추가</b>를 누르세요.</li></ol>'
    );
  }

  function fallbackHelp(){
    showPanel(
      '앱 설치 안내',
      '이 브라우저에서는 자동 설치창을 열 수 없습니다.',
      '<ol class="ok-install-steps"><li>브라우저 메뉴를 여세요.</li><li><b>앱 설치</b> 또는 <b>홈 화면에 추가</b>를 선택하세요.</li></ol>'
    );
  }

  async function install(trigger){
    lastTrigger=trigger||buttons()[0]||null;
    if(installed||isStandalone()){
      installed=true;
      update();
      return;
    }
    if(pending){
      const event=pending;
      pending=null;
      try{
        await event.prompt();
        const choice=await event.userChoice;
        if(choice?.outcome==='accepted'){
          showPanel('설치를 시작했어요','브라우저의 설치가 완료되면 홈 화면 또는 앱 목록에서 실행할 수 있습니다.');
        }else{
          showPanel('설치를 취소했어요','원할 때 앱 설치 버튼을 다시 누를 수 있습니다.');
        }
      }catch(_){
        fallbackHelp();
      }
      return;
    }
    if(isIOS){iosHelp();return;}
    fallbackHelp();
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    pending=event;
    update();
  });

  window.addEventListener('appinstalled',()=>{
    pending=null;
    installed=true;
    closePanel();
    update();
  });

  const modeChanged=()=>{if(isStandalone()){installed=true;closePanel();}update();};
  if(displayMode.addEventListener) displayMode.addEventListener('change',modeChanged);

  document.addEventListener('click',event=>{
    const btn=event.target.closest('[data-install]');
    if(!btn) return;
    event.preventDefault();
    install(btn);
  });

  if('serviceWorker' in navigator){
    const swUrl=new URL(script.dataset.sw||'sw.js',script.src);
    window.addEventListener('load',()=>{
      navigator.serviceWorker.register(swUrl.href,{updateViaCache:'none'}).catch(()=>{});
    },{once:true});
  }

  update();
  window.OKCleanInstall=Object.freeze({install,getState:()=>({role,appName,installed:isStandalone()||installed,hasPrompt:!!pending,isIOS})});
})();