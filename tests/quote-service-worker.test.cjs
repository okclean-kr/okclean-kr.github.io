const assert = require('node:assert/strict');
const fs = require('node:fs');
const test = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('sw.js', 'utf8');
const scope = 'https://okclean.test/';

function worker(caches, fetch) {
  const listeners = new Map();
  let claimed = false;
  const self = {
    registration: { scope },
    addEventListener: (name, callback) => listeners.set(name, callback),
    clients: { claim: async () => { claimed = true; } }
  };
  vm.runInNewContext(source, { self, caches, fetch, URL, Response });
  return {
    get claimed() { return claimed; },
    activate() {
      let pending;
      listeners.get('activate')({ waitUntil: promise => { pending = promise; } });
      return pending;
    },
    fetch(path) {
      let response;
      const background = [];
      const request = { url: new URL(path, scope).href, method: 'GET', mode: 'navigate' };
      listeners.get('fetch')({
        request,
        respondWith: promise => { response = promise; },
        waitUntil: promise => background.push(promise)
      });
      return { response, background };
    }
  };
}

test('고객 앱은 인터넷 응답이 성공하면 캐시를 열지 못해도 화면을 표시', async () => {
  const network = { ok: true, type: 'basic', clone: () => ({}) };
  const runtime = worker({ open: async () => { throw new Error('storage unavailable'); } }, async () => network);
  const { response, background } = runtime.fetch('/app/');
  assert.equal(await response, network);
  await Promise.all(background);
});

test('캐시 저장이 끝나기 전에도 최신 인터넷 응답을 반환', async () => {
  const copied = {};
  const network = { ok: true, type: 'basic', clone: () => copied };
  let finishWrite;
  const pendingWrite = new Promise(resolve => { finishWrite = resolve; });
  let cached;
  const runtime = worker({ open: async () => ({
    put: async (request, body) => { cached = [request.url, body]; await pendingWrite; }
  }) }, async () => network);
  const { response, background } = runtime.fetch('/');
  let result;
  const resolved = response.then(value => { result = value; });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(result, network);
    assert.deepEqual(cached, [scope, copied]);
  } finally {
    finishWrite();
    await Promise.all([resolved, ...background]);
  }
});

test('인터넷과 캐시 조회가 모두 실패하면 오프라인 안내와 홈 링크를 표시', async () => {
  const runtime = worker({ open: async () => ({
    match: async () => { throw new Error('storage unavailable'); }
  }) }, async () => { throw new Error('offline'); });
  const { response, background } = runtime.fetch('/app/');
  const page = await response;
  assert.equal(page.status, 503);
  const html = await page.text();
  assert.match(html, /인터넷 연결을 확인해 주세요/);
  assert.match(html, /https:\/\/okclean\.test\/index\.html/);
  await Promise.all(background);
});

test('오프라인에서는 기존 저장 화면을 사용하고 고객 접수와 관리자는 캐시에서 제외', async () => {
  const cached = { offline: true };
  const runtime = worker({ open: async () => ({ match: async () => cached }) },
    async () => { throw new Error('offline'); });
  const offline = runtime.fetch('/');
  assert.equal(await offline.response, cached);
  await Promise.all(offline.background);
  for (const path of ['/quote/', '/quote/index.html', '/admin/quotes.html', '/__/auth/handler', '/member-sync.js']) {
    assert.equal(runtime.fetch(path).response, undefined, path);
  }
});

test('캐시 목록을 읽지 못해도 새 고객 앱 제어권을 인계', async () => {
  const runtime = worker({ keys: async () => { throw new Error('storage unavailable'); } }, async () => {});
  await runtime.activate();
  assert.equal(runtime.claimed, true);
});
