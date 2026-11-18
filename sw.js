// 고객 홈페이지 전용 캐시. 관리자·인증 경로와 다른 앱의 캐시는 건드리지 않습니다.
const BASE = new URL('./', self.registration.scope);
const PREFIX = 'okclean-customer-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE = PREFIX + 'quotes-20261116-v1';
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('activate', event => event.waitUntil((async () => {
  try {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)));
  } catch (_) { /* 캐시를 정리할 수 없어도 온라인 화면을 계속 제공합니다. */ }
  await self.clients.claim();
})()));
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if(request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  const relative = url.pathname.slice(BASE.pathname.length);
  if(relative.startsWith('admin/') || relative.startsWith('quote/') || relative.startsWith('__/') || relative === 'config.json' || relative === 'member-sync.js') return;
  const eligible = request.mode === 'navigate' || /\.(?:html|css|js|json|webmanifest|png|jpe?g|svg|webp)$/.test(url.pathname);
  if(!eligible) return;
  const network = fetch(request);
  // 캐시 저장이 느리거나 실패해도 온라인 응답을 바로 반환합니다.
  event.waitUntil(network.then(async response => {
    if(!response.ok || response.type !== 'basic') return;
    const copy = response.clone();
    const cache = await caches.open(CACHE);
    await cache.put(request, copy);
  }).catch(() => {}));

  event.respondWith(network.catch(async () => {
    try {
      const cache = await caches.open(CACHE);
      const exact = await cache.match(request);
      if(exact) return exact;
      if(request.mode === 'navigate' && (relative === '' || relative === 'index.html')) {
        const home = await cache.match(new URL('index.html', BASE).href) || await cache.match(BASE.href);
        if(home) return home;
      }
    } catch (_) { /* 캐시에 접근할 수 없으면 아래 연결 안내를 사용합니다. */ }

    if(request.mode === 'navigate') {
      // 하위 경로 응답에는 상대 자원이 필요 없는 연결 안내를 표시합니다.
      const homeUrl = new URL('index.html', BASE).href.replace(/"/g, '%22');
      return new Response('<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>인터넷 연결 확인</title><main><h1>인터넷 연결을 확인해 주세요</h1><p>이 페이지의 저장된 화면이 없습니다.</p><a href="' + homeUrl + '">오케이청소 홈으로 이동</a></main></html>', {status: 503, headers: {'Content-Type':'text/html; charset=utf-8'}});
    }
    return Response.error();
  }));
});
