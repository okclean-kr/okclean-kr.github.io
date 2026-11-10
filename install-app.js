// 오케이청소 고객용·관리자용 공통 앱 설치 UX
(function(){
  'use strict';
  const script=document.currentScript;
  if(!script||window.OKCleanInstall) return;

  const role=script.dataset.appRole||script.dataset.app||'customer';
  const appName=script.dataset.appName||(role==='admin'?'오케이청소 관리자':'오케이청소');
  const installLabel=role==='admin'?'관리자 앱 설치':'오케이청소 앱 설치';
  const UA=navigator.userAgent||'';
  const isIOS=/iPhone|iPad|iPod/.test(UA)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
  const isAndroid=/Android/i.test(UA);
  const isSamsung=/SamsungBrowser/i.test(UA);
  const isInApp=/KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|; wv\)/i.test(UA);
  const displayMode=matchMedia('(display-mode: standalone)');
  const isStandalone=()=>displayMode.matches||navigator.standalone===true;

  let pending=null;
  let installed=isStandalone();
  let panel=null;
  let lastTrigger=null;

  const buttons=()=>Array.from(document.querySelectorAll('[data-install]'));
  const rootUrl=new URL(script.dataset.root||'./',location.href);
  const targetUrl=new URL(rootUrl.href);
  targetUrl.searchParams.set('install','1');
  const fallbackUrl=new URL(targetUrl.href);
  fallbackUrl.searchParams.set('install_fallback','1');
  const chromeIntent='intent://'+targetUrl.host+targetUrl.pathname+targetUrl.search+
    '#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(fallbackUrl.href)+';end';

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
    if(isIOS) setLabel('아이폰에 앱 설치');
    else if(typeof navigator.install==='function'||pending) setLabel(installLabel);
    else if(isAndroid) setLabel('Chrome에서 앱 설치');
    else setLabel(installLabel);
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
    panel.querySelector('.ok-install-page-hint').textContent='설치하지 않아도 홈페이지는 그대로 사용할 수 있어요.';
    panel.querySelector('.ok-install-close').onclick=closePanel;
    const anchor=lastTrigger?.closest('header')||lastTrigger?.parentElement||document.querySelector('main')||document.body;
    anchor.after?anchor.after(panel):document.body.prepend(panel);
    panel.focus({preventScroll:true});
  }

  function iosHelp(){
    showPanel(
      '아이폰 홈 화면에 추가',
      'Safari에서 아래 순서로 설치해 주세요.',
      '<ol class="ok-install-steps"><li><b>공유</b> 버튼을 누르세요.</li><li><b>홈 화면에 추가</b>를 선택하세요.</li><li>오른쪽 위 <b>추가</b>를 누르세요.</li></ol>'
    );
  }
  function chromeHelp(){
    showPanel(
      'Chrome에서 설치를 계속해 주세요',
      '현재 화면에서는 브라우저 설치창을 직접 열 수 없습니다.',
      '<p class="ok-install-hint">아래 버튼을 누르면 Chrome에서 오케이청소를 엽니다.</p>'+
      '<a class="ok-install-browser-link" href="'+chromeIntent+'">Chrome에서 앱 설치 계속</a>'
    );
  }
  function unsupportedHelp(){
    showPanel(
      '앱 설치를 지원하지 않는 브라우저입니다',
      'Chrome에서 열면 설치 가능 여부를 바로 확인할 수 있습니다.',
      '<a class="ok-install-browser-link" href="'+chromeIntent+'">Chrome에서 열기</a>'
    );
  }

  async function install(trigger){
    lastTrigger=trigger||buttons()[0]||null;
    if(installed||isStandalone()){installed=true;update();return;}

    // 최신 Chromium의 표준 설치 API가 있으면 가장 먼저 사용.
    if(typeof navigator.install==='function'){
      try{
        await navigator.install();
        showPanel('설치를 시작했어요','브라우저 설치창의 안내에 따라 완료해 주세요.');
        return;
      }catch(e){
        if(e&&e.name==='AbortError') return;
      }
    }

    // 기존 Chromium beforeinstallprompt 지원 브라우저.
    if(pending){
      const event=pending;
      pending=null;
      try{
        await event.prompt();
        const choice=await event.userChoice;
        if(choice?.outcome==='accepted'){
          showPanel('설치를 시작했어요','설치가 끝나면 홈 화면 또는 앱 목록에서 오케이청소를 실행할 수 있습니다.');
        }else{
          showPanel('설치를 취소했어요','원할 때 앱 설치 버튼을 다시 누를 수 있습니다.');
        }
      }catch(_){
        isAndroid?chromeHelp():unsupportedHelp();
      }
      update();
      return;
    }

    if(isIOS){iosHelp();return;}

    // Android 커스텀탭·삼성인터넷·앱 내 브라우저에서 메뉴를 찾게 하지 않고 Chrome으로 직접 전달.
    if(isAndroid){
      location.href=chromeIntent;
      setTimeout(()=>{ if(document.visibilityState==='visible') chromeHelp(); },900);
      return;
    }

    unsupportedHelp();
  }

  window.addEventListener('beforeinstallprompt',event=>{
    event.preventDefault();
    pending=event;
    update();
    // Chrome으로 전달된 뒤 설치 준비가 되면 안내문 없이 버튼이 실제 설치 버튼으로 바뀝니다.
    if(new URLSearchParams(location.search).get('install')==='1') setLabel(installLabel);
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
  window.OKCleanInstall=Object.freeze({
    install,
    getState:()=>({
      role,appName,installed:isStandalone()||installed,
      hasPrompt:!!pending,isIOS,isAndroid,isSamsung,isInApp,
      hasNavigatorInstall:typeof navigator.install==='function'
    })
  });
})();