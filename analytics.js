/* 방문·상담 단계 측정. 운영 수집은 enabled와 verified가 모두 true일 때만 켭니다. */
(function (root, factory) {
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) {
    root.OKCleanAnalytics = api;
    api.init();
  }
})(typeof window !== 'undefined' ? window : globalThis, function (env) {
  'use strict';

  const EVENTS = Object.freeze(['page_view', 'case_open', 'shop_open', 'quote_start', 'quote_result', 'contact_prepare', 'kakao_open', 'phone_open', 'sms_open', 'signup_complete', 'diagnostic']);
  const SOURCES = Object.freeze(['youtube', 'shorts', 'instagram', 'reels', 'threads', 'blog', 'naver', 'google', 'profile', 'share', 'direct', 'other']);
  const CHANNEL_SOURCES = Object.freeze(['youtube', 'instagram', 'threads', 'blog']);
  const PAGES = Object.freeze(['home', 'service', 'area', 'shop', 'other']);
  const SERVICES = Object.freeze(['move-in', 'regular', 'special-home', 'office', 'clinic', 'post-build', 'window', 'aircon', 'washer', 'mattress', 'carpet', 'disinfect', 'unknown']);
  const PLACEMENTS = Object.freeze(['hero', 'sticky', 'quote', 'header', 'footer', 'service', 'other', 'test']);
  const TARGETS = Object.freeze(['quote', 'direct', 'none', 'test']);
  const FIREBASE = Object.freeze({
    apiKey: 'AIzaSyA1jn9CDPiEg_Sg_aOlEeZjPy8P7ZoFOZw',
    authDomain: 'okclean-admin.firebaseapp.com',
    projectId: 'okclean-admin',
    appId: '1:665748095050:web:49d73ca0f28ec5f67ee6b3'
  });
  const DEBUG_KEY = 'okclean_analytics_debug_v1';
  const LOG_KEY = 'okclean_analytics_debug_events_v1';
  const SOURCE_KEY = 'okclean_analytics_source_v1';
  const CHOICE_KEY = 'okclean_analytics_choice_v1';
  const MAX_DEBUG = 80;
  let initialized = false;
  let backendPromise;
  let source = 'direct';
  let page = 'other';
  let quoteStarted = false;
  let quoteTimer;
  let lastDelivery = 'not_attempted';
  let lastError = '';
  let sessionStorageAvailable = true;
  let pendingContact = 'direct';
  let choiceStorageAvailable = true;
  let memoryOptOut = false;
  let choiceRevision = 0;

  function allowed(value, values, fallback) {
    return typeof value === 'string' && values.includes(value) ? value : fallback;
  }

  function settings() {
    const supplied = env.OKCLEAN_ANALYTICS || {};
    return { enabled: supplied.enabled === true, verified: supplied.verified === true };
  }

  function storageRead(key, fallback) {
    try {
      const value = env.sessionStorage && env.sessionStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (_) { sessionStorageAvailable = false; return fallback; }
  }

  function storageWrite(key, value) {
    try { if (env.sessionStorage) env.sessionStorage.setItem(key, JSON.stringify(value)); }
    catch (_) { sessionStorageAvailable = false; }
  }

  function debugEnabled() { return storageRead(DEBUG_KEY, false) === true; }
  function liveEnabled() { const s = settings(); return s.enabled && s.verified; }

  function optedOut() {
    try {
      if (!env.localStorage) throw new Error('storage-unavailable');
      const choice = env.localStorage.getItem(CHOICE_KEY);
      choiceStorageAvailable = true;
      return memoryOptOut || (choice !== null && choice !== 'on');
    } catch (_) { choiceStorageAvailable = false; return true; }
  }

  function clearLocalMeasurement() {
    env.clearTimeout(quoteTimer);
    quoteStarted = false;
    for (const key of [SOURCE_KEY, DEBUG_KEY, LOG_KEY]) {
      try { if (env.sessionStorage) env.sessionStorage.removeItem(key); }
      catch (_) { sessionStorageAvailable = false; }
    }
  }

  function setCollectionAllowed(allow) {
    const requested = allow === true ? 'on' : 'off';
    choiceRevision += 1;
    memoryOptOut = requested === 'off';
    let saved = false;
    try {
      if (!env.localStorage) throw new Error('storage-unavailable');
      env.localStorage.setItem(CHOICE_KEY, requested);
      saved = env.localStorage.getItem(CHOICE_KEY) === requested;
      if (!saved) throw new Error('storage-unavailable');
      choiceStorageAvailable = true;
    } catch (_) { memoryOptOut = true; choiceStorageAvailable = false; }
    if (!saved || requested === 'off') clearLocalMeasurement();
    if (env.dispatchEvent && env.CustomEvent) env.dispatchEvent(new env.CustomEvent('okclean:analytics-choice'));
    return { ...status(), preferenceSaved: saved };
  }

  // 준비 작업 중 선택이 바뀐 경우에도 SDK가 뒤늦게 쓰기를 시작하지 못하게 합니다.
  async function guardCollectionWrite(prepare, write, revision = choiceRevision) {
    const check = () => {
      if (optedOut() || revision !== choiceRevision) throw { code: 'collection-disabled' };
    };
    check();
    const resource = await prepare();
    check();
    return write(resource);
  }

  function normalizeSource(value) {
    if (typeof value !== 'string') return 'other';
    const normalized = value.toLowerCase();
    const aliases = { yt: 'youtube', youtube_shorts: 'shorts', ig: 'instagram', ig_reels: 'reels', naver_blog: 'blog', naverblog: 'blog' };
    return allowed(aliases[normalized] || normalized, SOURCES, 'other');
  }

  function resolveSource(search, referrer, origin, previous) {
    try {
      const params = new URLSearchParams(typeof search === 'string' ? search : '');
      let ref;
      try { if (referrer) ref = new URL(referrer); } catch (_) { /* 유효한 출처 태그는 별도로 확인합니다. */ }
      // 내부 이동의 src는 새 유입이 아닙니다. 유효 기간이 남은 출처만 이어받습니다.
      if (ref && ref.origin === origin) return allowed(previous, SOURCES, 'direct');
      const src = params.get('src');
      const explicit = src && src.toLowerCase() !== 'home' ? src : params.get('utm_source');
      if (explicit && explicit.toLowerCase() !== 'home') return normalizeSource(explicit);
      if (referrer) {
        if (!ref) return 'other';
        const host = ref.hostname.toLowerCase();
        if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) return 'youtube';
        if (host === 'instagram.com' || host.endsWith('.instagram.com')) return 'instagram';
        if (host === 'threads.net' || host.endsWith('.threads.net') || host === 'threads.com' || host.endsWith('.threads.com')) return 'threads';
        if (host === 'blog.naver.com' || host === 'm.blog.naver.com') return 'blog';
        if (host === 'naver.com' || host.endsWith('.naver.com')) return 'naver';
        if (/^(www\.)?google\.(com|co\.kr)$/.test(host)) return 'google';
        return 'other';
      }
    } catch (_) { return 'other'; }
    return allowed(previous, SOURCES, 'direct');
  }

  function channelUrl(channel) {
    return CHANNEL_SOURCES.includes(channel) ? `https://okclean-kr.github.io/?src=${channel}` : null;
  }

  function resolvePage(pathname) {
    if (pathname === '/' || pathname === '/index.html') return 'home';
    if (/^\/services\/[a-z-]+\.html$/.test(pathname || '')) return 'service';
    if (/^\/area\/[^/]+\.html$/.test(pathname || '')) return 'area';
    if (pathname === '/shop/' || pathname === '/shop/index.html') return 'shop';
    return 'other';
  }

  function serviceFromPath(pathname) {
    const match = /^\/services\/([a-z-]+)\.html$/.exec(pathname || '');
    return allowed(match && match[1], SERVICES, 'unknown');
  }

  // 임의 매개변수가 들어와도 허용된 열거값만 새 객체에 옮깁니다.
  function buildEvent(name, details, context) {
    if (!EVENTS.includes(name)) return null;
    const d = details && typeof details === 'object' ? details : {};
    const c = context && typeof context === 'object' ? context : {};
    if (name === 'diagnostic' && c.test !== true) return null;
    return Object.freeze({
      schema: 1,
      event: name,
      source: allowed(c.source, SOURCES, 'other'),
      page: allowed(c.page, PAGES, 'other'),
      service: allowed(d.service, SERVICES, 'unknown'),
      placement: allowed(d.placement, PLACEMENTS, 'other'),
      target: allowed(d.target, TARGETS, 'none'),
      test: c.test === true
    });
  }

  function safeError(error) {
    const code = String(error && error.code || 'unknown').replace(/^(firestore|auth)\//, '');
    return /^[a-z-]{1,45}$/.test(code) ? code : 'unknown';
  }

  function localLog(payload, delivery, error) {
    if (optedOut() || !debugEnabled()) return;
    const rows = storageRead(LOG_KEY, []);
    const safeRows = Array.isArray(rows) ? rows.slice(-(MAX_DEBUG - 1)) : [];
    safeRows.push({ ...payload, recordedAt: new Date().toISOString(), delivery, error: error || '' });
    storageWrite(LOG_KEY, safeRows);
    if (env.dispatchEvent && env.CustomEvent) env.dispatchEvent(new env.CustomEvent('okclean:analytics-debug'));
  }

  async function backend() {
    if (!backendPromise) backendPromise = Promise.all([
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
      import('https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js')
    ]).then(([apps, firestore]) => {
      const existing = apps.getApps().find(app => app.name === '[DEFAULT]');
      const app = existing || apps.initializeApp(FIREBASE);
      if (app.options.projectId !== FIREBASE.projectId) throw { code: 'project-mismatch' };
      return { app, db: firestore.getFirestore(app), firestore };
    }).catch(error => { backendPromise = null; throw error; });
    return backendPromise;
  }

  async function persist(payload, revision = choiceRevision) {
    return guardCollectionWrite(async () => {
      const resource = await backend();
      if (payload.test) {
        // 기존 관리자 로그인 상태만 복원하며 새 로그인/익명 계정을 만들지 않습니다.
        const authModule = await import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js');
        const auth = authModule.getAuth(resource.app);
        await new Promise((resolve, reject) => {
          let unsubscribe = () => {};
          unsubscribe = authModule.onAuthStateChanged(auth, () => { unsubscribe(); resolve(); }, reject);
        });
        const user = auth.currentUser;
        if (!user || user.uid !== 'H1MfdqGkFRZzU8qkqwXTsiKv3CO2' || !user.providerData.some(item => item.providerId === 'google.com')) throw { code: 'admin-required' };
      }
      return resource;
    }, async ({ db, firestore }) => {
      const ref = await firestore.addDoc(firestore.collection(db, 'site_events'), { ...payload, at: firestore.serverTimestamp() });
      return ref.id;
    }, revision);
  }

  function withDeadline(promise) {
    let timer;
    return Promise.race([promise, new Promise((_, reject) => {
      timer = env.setTimeout(() => reject({ code: 'deadline-exceeded' }), 15000);
    })]).finally(() => env.clearTimeout(timer));
  }

  async function track(name, details) {
    if (optedOut()) return { status: 'opted_out' };
    const revision = choiceRevision;
    const test = debugEnabled() || !!(env.location && new URLSearchParams(env.location.search).get('analytics_test') === '1');
    const payload = buildEvent(name, details, { source, page, test });
    if (!payload) return { status: 'rejected' };
    if (!liveEnabled()) {
      localLog(payload, 'local_only', '');
      return { status: debugEnabled() ? 'local_only' : 'disabled' };
    }
    if (lastError === 'permission-denied') return { status: 'blocked', error: lastError };
    try {
      const id = await withDeadline(persist(payload, revision));
      lastDelivery = 'acknowledged'; lastError = '';
      localLog(payload, lastDelivery, '');
      return { status: lastDelivery, id };
    } catch (error) {
      lastDelivery = safeError(error) === 'collection-disabled' ? 'opted_out' : 'failed'; lastError = safeError(error);
      localLog(payload, lastDelivery, lastError);
      return { status: lastDelivery, error: lastError };
    }
  }

  function selectedService() {
    const select = env.document && env.document.getElementById('qSvc');
    return allowed(select && select.value, SERVICES, serviceFromPath(env.location && env.location.pathname));
  }

  function placementFor(element) {
    const explicit = element.getAttribute && element.getAttribute('data-analytics-placement');
    if (PLACEMENTS.includes(explicit)) return explicit;
    const location = element.getAttribute && (element.getAttribute('data-placement') || element.getAttribute('data-cta-location'));
    const locations = {
      hero: 'hero', 'quote-guide': 'quote', 'quote-sheet': 'quote', featured: 'service',
      cases: 'service', dock: 'sticky', premium: 'service', 'service-top': 'service',
      'service-bottom': 'service', 'area-top': 'service', 'area-bottom': 'service'
    };
    if (Object.prototype.hasOwnProperty.call(locations, location)) return locations[location];
    if (element.closest('#quote')) return 'quote';
    if (element.closest('.sticky, .dock, .bottom-bar, .floatbar')) return 'sticky';
    if (element.closest('.hero')) return 'hero';
    if (element.closest('header, .top')) return 'header';
    if (element.closest('footer')) return 'footer';
    return page === 'service' ? 'service' : 'other';
  }

  function quoteInteraction() {
    const details = { service: selectedService(), placement: 'quote', target: 'quote' };
    if (!quoteStarted) { quoteStarted = true; void track('quote_start', details); }
    env.clearTimeout(quoteTimer);
    quoteTimer = env.setTimeout(() => { void track('quote_result', { service: selectedService(), placement: 'quote', target: 'quote' }); }, 800);
  }

  function onClick(event) {
    const element = event.target && event.target.closest && event.target.closest('a, button');
    if (!element) return;
    if (element.closest('.recruit, [data-analytics-ignore]')) return;
    if (element.id === 'jKakao') { pendingContact = 'excluded'; return; }
    const inSheet = !!element.closest('#sheet');
    const declaredKind = element.getAttribute('data-contact-kind');
    if (!inSheet && ['quote', 'direct'].includes(declaredKind)) pendingContact = declaredKind;
    if (inSheet && pendingContact === 'excluded') return;
    const target = allowed(declaredKind, TARGETS, inSheet ? pendingContact : 'direct');
    const details = { service: selectedService(), placement: placementFor(element), target };
    const explicit = element.getAttribute('data-analytics-event');
    // shop_open은 다음 문서의 도착 시점에만 기록하여 클릭과 도착을 중복 집계하지 않습니다.
    if (explicit) { if (explicit !== 'shop_open') void track(explicit, details); return; }
    if (element.id === 'qKakao') { pendingContact = 'quote'; void track('contact_prepare', { ...details, target: 'quote' }); return; }
    if (element.id === 'qSms') { void track('sms_open', { ...details, target: 'quote' }); return; }
    if (element.closest('#qTier, #qVar') || element.id === 'qMinus' || element.id === 'qPlus') quoteInteraction();
    const href = element.getAttribute('href') || '';
    if (/^tel:/i.test(href)) { void track('phone_open', details); return; }
    if (/^sms:/i.test(href)) { void track('sms_open', details); return; }
    try {
      const target = new URL(href, env.location.origin);
      const caseLocation = element.getAttribute('data-placement');
      const caseLink = ['hero', 'featured', 'cases'].includes(caseLocation) || element.closest('#cases, #featured-work, .case, .featured-card');
      if (caseLink && ['blog.naver.com', 'm.blog.naver.com'].includes(target.hostname) && /^\/[^/]+\/\d+\/?$/.test(target.pathname)) {
        void track('case_open', { ...details, target: 'none' }); return;
      }
      if (target.hostname === 'open.kakao.com' || target.hostname === 'pf.kakao.com') void track('kakao_open', details);
    } catch (_) { /* 측정 오류로 상담 동작을 막지 않습니다. */ }
  }

  function isInternalShopArrival() {
    if (page !== 'shop') return false;
    try {
      // 새로고침은 이전 referrer를 유지할 수 있으므로 navigation 종류도 확인합니다.
      if (!env.performance || typeof env.performance.getEntriesByType !== 'function') return false;
      const navigation = env.performance.getEntriesByType('navigation');
      if (!navigation || !navigation[0] || navigation[0].type !== 'navigate') return false;
      const referrer = new URL(env.document.referrer);
      return referrer.origin === env.location.origin && !/^\/shop(?:\/|$)/.test(referrer.pathname);
    } catch (_) { return false; }
  }

  function init() {
    if (initialized || !env.document || !env.location) return;
    initialized = true;
    if (env.addEventListener) env.addEventListener('storage', event => {
      if (event.key !== CHOICE_KEY && event.key !== null) return;
      choiceRevision += 1; memoryOptOut = false;
      if (optedOut()) clearLocalMeasurement();
      if (env.dispatchEvent && env.CustomEvent) env.dispatchEvent(new env.CustomEvent('okclean:analytics-choice'));
    });
    if (optedOut()) { clearLocalMeasurement(); return; }
    if (new URLSearchParams(env.location.search).get('analytics_test') === '1') storageWrite(DEBUG_KEY, true);
    page = resolvePage(env.location.pathname);
    // 관리자·회원 관리·기타 페이지의 행동은 자동 수집하지 않습니다.
    if (page === 'other') return;
    const previous = storageRead(SOURCE_KEY, null);
    const oldSource = previous && Number(previous.expiresAt) > Date.now() ? previous.source : 'direct';
    source = resolveSource(env.location.search, env.document.referrer, env.location.origin, oldSource);
    if (liveEnabled() || debugEnabled()) storageWrite(SOURCE_KEY, { source, expiresAt: Date.now() + 30 * 60 * 1000 });
    env.document.addEventListener('click', onClick);
    env.document.addEventListener('change', event => {
      if (event.target && event.target.closest && event.target.closest('#quote')) quoteInteraction();
    });
    env.document.addEventListener('input', event => {
      if (event.target && event.target.id === 'qQty') quoteInteraction();
    });
    void track('page_view', { service: serviceFromPath(env.location.pathname), placement: 'other' });
    if (isInternalShopArrival()) void track('shop_open', { service: 'unknown', placement: 'other', target: 'none' });
  }

  function status() {
    const off = optedOut();
    return Object.freeze({
      enabled: liveEnabled(), configured: settings().enabled, verified: settings().verified,
      debug: debugEnabled(), lastDelivery, lastError, sessionStorageAvailable,
      collection: 'site_events', source, page, optedOut: off, choiceStorageAvailable,
      collectionAllowed: !off, effectiveCollectionEnabled: liveEnabled() && !off
    });
  }

  function setDebug(enabled) { if (!optedOut()) storageWrite(DEBUG_KEY, enabled === true); return status(); }
  function debugEvents() { const rows = storageRead(LOG_KEY, []); return Array.isArray(rows) ? rows : []; }

  function aggregateByDay(rows) {
    const groups = new Map();
    for (const row of Array.isArray(rows) ? rows : []) {
      if (!row || row.test !== false || row.event === 'diagnostic' || !EVENTS.includes(row.event)) continue;
      const time = Date.parse(row.at);
      if (!Number.isFinite(time)) continue;
      const day = new Date(time + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
      if (!groups.has(day)) groups.set(day, { day, counts: Object.fromEntries(EVENTS.filter(event => event !== 'diagnostic').map(event => [event, 0])) });
      groups.get(day).counts[row.event] += 1;
    }
    return [...groups.values()].sort((a, b) => b.day.localeCompare(a.day));
  }

  function testPayload(testSource) {
    if (testSource !== 'profile' && !CHANNEL_SOURCES.includes(testSource)) return null;
    return buildEvent('diagnostic', { service: 'unknown', placement: 'test', target: 'test' }, { source: testSource, page: 'home', test: true });
  }

  function testReceipt(payload, data) {
    if (!payload || !data || !Object.keys(payload).every(key => data[key] === payload[key])) return null;
    try {
      const date = data.at && typeof data.at.toDate === 'function' ? data.at.toDate() : null;
      return date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
    } catch (_) { return null; }
  }

  // 출처별 시험도 항상 diagnostic/test=true이며 운영 설정·세션 출처를 바꾸지 않습니다.
  async function sendTest(testSource = 'profile') {
    if (optedOut()) return { status: 'opted_out', error: 'collection-disabled' };
    const revision = choiceRevision;
    const payload = testPayload(testSource);
    if (!payload) return { status: 'rejected', error: 'invalid-test-source' };
    try {
      const id = await withDeadline(persist(payload, revision));
      const { db, firestore } = await backend();
      const snapshot = await withDeadline(firestore.getDocFromServer(firestore.doc(db, 'site_events', id)));
      const at = snapshot.exists() ? testReceipt(payload, snapshot.data()) : null;
      if (!at) return { status: 'unverified', id };
      return { status: 'verified_test', id, source: payload.source, at };
    } catch (error) { return { status: 'failed', error: safeError(error) }; }
  }

  async function readEvents(days) {
    const range = [7, 30].includes(Number(days)) ? Number(days) : 7;
    const start = new Date(Date.now() - range * 24 * 60 * 60 * 1000);
    const { db, firestore } = await backend();
    const snapshot = await withDeadline(firestore.getDocsFromServer(firestore.query(firestore.collection(db, 'site_events'), firestore.where('at', '>=', start), firestore.orderBy('at', 'desc'), firestore.limit(2000))));
    const rows = snapshot.docs.map(doc => {
      const d = doc.data();
      if (d.schema !== 1 || (d.test !== true && d.test !== false)) return null;
      const payload = buildEvent(d.event, d, d);
      const at = d.at && typeof d.at.toDate === 'function' ? d.at.toDate().toISOString() : null;
      return payload && at ? { ...payload, at } : null;
    }).filter(Boolean);
    return { rows, capped: snapshot.size === 2000, days: range, checkedAt: new Date().toISOString() };
  }

  const api = { init, track, status, setCollectionAllowed, setDebug, debugEvents, sendTest, readEvents, aggregateByDay, backend, buildEvent, resolveSource, resolvePage, normalizeSource, channelUrl, serviceFromPath, safeError, constants: Object.freeze({ EVENTS, SOURCES, CHANNEL_SOURCES, PAGES, SERVICES, PLACEMENTS, TARGETS, FIREBASE }) };
  if (typeof module === 'object' && module.exports) {
    api._guardCollectionWrite = guardCollectionWrite;
    api._testPayload = testPayload;
    api._testReceipt = testReceipt;
  }
  return Object.freeze(api);
});
