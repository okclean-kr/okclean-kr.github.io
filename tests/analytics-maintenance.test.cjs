'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const maintenance = require('../analytics-maintenance.js');
const ADMIN = 'H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.parse('2026-11-12T12:00:00Z');

class Timestamp {
  constructor(seconds, nanoseconds = 0) { this.seconds = seconds; this.nanoseconds = nanoseconds; }
  static fromDate(value) { return Timestamp.fromMillis(value.getTime()); }
  static fromMillis(value) {
    const seconds = Math.floor(value / 1000);
    return new Timestamp(seconds, Math.round((value - seconds * 1000) * 1e6));
  }
}

function fixture(options = {}) {
  const app = { options: { projectId: 'okclean-admin' } };
  const db = { app };
  const user = {
    uid: ADMIN, providerData: [{ providerId: 'google.com' }],
    getIdTokenResult: async () => ({ claims: { firebase: { sign_in_provider: 'google.com' } } })
  };
  const auth = { app, currentUser: user };
  const rows = Array.from({ length: options.count || 0 }, (_, i) => ({
    ref: { path: 'site_events/' + String(i + 1).padStart(20, 'A'), firestore: db },
    value: { at: Timestamp.fromMillis(NOW - 91 * DAY - i) }
  }));
  let reads = 0, commits = 0, batches = 0;
  const requests = [], deletedPaths = [];
  const sdk = {
    Timestamp,
    collection: (firestore, name) => { assert.equal(firestore, db); assert.equal(name, 'site_events'); return { name }; },
    where: (field, op, cutoff) => ({ kind: 'where', field, op, cutoff }),
    orderBy: (field, direction) => ({ kind: 'orderBy', field, direction }),
    limit: value => ({ kind: 'limit', value }),
    query: (collection, ...constraints) => ({ collection, constraints }),
    getDocsFromServer: async query => {
      reads += 1; requests.push(query);
      if (options.onRead) await options.onRead({ reads, auth, user });
      if (options.readFailureAt === reads) throw { code: 'unavailable' };
      const where = query.constraints.find(c => c.kind === 'where');
      const limit = query.constraints.find(c => c.kind === 'limit').value;
      assert.equal(where.field, 'at'); assert.equal(where.op, '<'); assert.equal(limit, 200);
      const selected = options.rawRows || rows.filter(row => maintenance._beforeCutoff(row.value.at, where.cutoff, Timestamp));
      return { docs: selected.slice(0, limit).map(row => ({ ref: row.ref, data: () => row.value })),
        metadata: { fromCache: !!options.cached, hasPendingWrites: !!options.pendingWrites } };
    },
    writeBatch: firestore => {
      assert.equal(firestore, db); batches += 1;
      const refs = [];
      return {
        delete: ref => refs.push(ref),
        commit: async () => {
          commits += 1;
          if (options.commitFailureAt === commits) throw { code: 'permission-denied' };
          if (options.commitWait) await options.commitWait;
          for (const ref of refs) {
            deletedPaths.push(ref.path);
            const index = rows.findIndex(row => row.ref === ref);
            if (index >= 0) rows.splice(index, 1);
          }
        }
      };
    }
  };
  const api = maintenance._createForTest({
    env: { setTimeout, clearTimeout }, now: options.now || (() => NOW), deadlineMs: options.deadlineMs || 1000,
    backend: async () => ({ app, db, firestore: sdk }), loadAuth: async () => ({ getAuth: () => auth })
  });
  return { api, auth, user, rows, requests, deletedPaths, db, sdk,
    counts: () => ({ reads, commits, batches }) };
}

test('inspection reads server candidates without creating a deletion batch', async () => {
  const f = fixture({ count: 3 }); const result = await f.api.inspect({ auth: f.auth });
  assert.equal(result.status, 'inspected'); assert.equal(result.matched, 3); assert.equal(result.deleted, 0);
  assert.deepEqual(f.counts(), { reads: 1, commits: 0, batches: 0 });
});

test('empty server result completes without attempting a delete', async () => {
  const f = fixture(); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.status, 'complete'); assert.equal(result.remaining, false); assert.equal(result.deleted, 0);
  assert.equal(f.counts().commits, 0);
});

test('Google UID and actual token provider are required before querying', async () => {
  for (const change of [
    f => { f.auth.currentUser = null; },
    f => { f.user.uid = 'another-admin'; },
    f => { f.user.providerData = [{ providerId: 'password' }]; },
    f => { f.user.getIdTokenResult = async () => ({ claims: { firebase: { sign_in_provider: 'password' } } }); }
  ]) {
    const f = fixture({ count: 1 }); change(f);
    const result = await f.api.run({ auth: f.auth });
    assert.equal(result.status, 'blocked'); assert.equal(result.error, 'admin-required');
    assert.equal(f.counts().reads, 0); assert.equal(f.counts().commits, 0);
  }
});

test('a different Firebase Auth app cannot initiate maintenance', async () => {
  const f = fixture({ count: 1 }); f.auth.app = { options: { projectId: 'another-project' } };
  const result = await f.api.run({ auth: f.auth });
  assert.equal(result.error, 'project-mismatch'); assert.equal(f.counts().reads, 0);
});

test('logout during the server read prevents deletion', async () => {
  const f = fixture({ count: 1, onRead: ({ auth }) => { auth.currentUser = null; } });
  const result = await f.api.run({ auth: f.auth });
  assert.equal(result.error, 'auth-changed'); assert.equal(f.counts().commits, 0);
});

test('logout from a progress callback is rechecked before commit', async () => {
  const f = fixture({ count: 1 });
  const result = await f.api.run({ auth: f.auth, onProgress: value => { if (value.status === 'deleting') f.auth.currentUser = null; } });
  assert.equal(result.error, 'auth-changed'); assert.equal(f.counts().commits, 0);
});

test('explicit cancellation prevents a not-yet-issued batch commit', async () => {
  const f = fixture({ count: 1 });
  const result = await f.api.run({ auth: f.auth, onProgress: value => { if (value.status === 'deleting') f.api.cancel(); } });
  assert.equal(result.error, 'cancelled'); assert.equal(result.deleted, 0); assert.equal(f.counts().commits, 0);
});

test('cancellation after an acknowledged batch prevents further batches', async () => {
  const f = fixture({ count: 250 });
  const result = await f.api.run({ auth: f.auth, onProgress: value => { if (value.deleted === 200) f.api.cancel(); } });
  assert.equal(result.status, 'partial'); assert.equal(result.deleted, 200); assert.equal(result.error, 'cancelled');
  assert.equal(f.counts().commits, 1); assert.equal(f.rows.length, 50);
});

test('strict ninety-day boundary is compared at timestamp nanosecond precision', async () => {
  const cutoff = Timestamp.fromMillis(NOW - 90 * DAY);
  assert.equal(maintenance._beforeCutoff(cutoff, cutoff, Timestamp), false);
  assert.equal(maintenance._beforeCutoff(new Timestamp(cutoff.seconds - 1, 999999999), cutoff, Timestamp), true);
  assert.equal(maintenance._beforeCutoff(new Timestamp(cutoff.seconds, 1), cutoff, Timestamp), false);
  assert.equal(maintenance._beforeCutoff({ seconds: cutoff.seconds - 1, nanoseconds: 0 }, cutoff, Timestamp), false);
  const f = fixture({ count: 3 });
  f.rows[1].value.at = cutoff;
  f.rows[2].value.at = Timestamp.fromMillis(NOW - 89 * DAY);
  const result = await f.api.run({ auth: f.auth });
  assert.equal(result.deleted, 1); assert.equal(f.rows.length, 2);
});

test('bounded batches delete at most 600 and check the remaining server candidates', async () => {
  const f = fixture({ count: 650 }); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.status, 'capped'); assert.equal(result.deleted, 600); assert.equal(result.batches, 3);
  assert.equal(result.remaining, true); assert.equal(result.matched, 50);
  assert.deepEqual(f.counts(), { reads: 4, commits: 3, batches: 3 });
  assert.equal(f.rows.length, 50);
  assert(f.deletedPaths.every(value => value.startsWith('site_events/')));
});

test('exactly 600 eligible records finish only after the empty server follow-up', async () => {
  const f = fixture({ count: 600 }); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.status, 'complete'); assert.equal(result.deleted, 600); assert.equal(result.remaining, false);
  assert.equal(f.counts().reads, 4);
});

test('a rejected later batch reports only previously confirmed deletions', async () => {
  const f = fixture({ count: 250, commitFailureAt: 2 }); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.status, 'partial'); assert.equal(result.deleted, 200); assert.equal(result.batches, 1);
  assert.equal(result.remaining, null); assert.equal(result.error, 'permission-denied'); assert.equal(f.rows.length, 50);
});

test('a failed follow-up read cannot claim that all expired records are gone', async () => {
  const f = fixture({ count: 1, readFailureAt: 2 }); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.status, 'partial'); assert.equal(result.deleted, 1); assert.equal(result.remaining, null);
});

test('a first server read failure remains an error, not zero expired records', async () => {
  const f = fixture({ readFailureAt: 1 }); const result = await f.api.inspect({ auth: f.auth });
  assert.equal(result.status, 'failed'); assert.equal(result.checkedAt, null); assert.equal(result.remaining, null);
});

test('cached or pending-write snapshots never authorize deletion', async () => {
  for (const flag of ['cached', 'pendingWrites']) {
    const f = fixture({ count: 1, [flag]: true }); const result = await f.api.run({ auth: f.auth });
    assert.equal(result.error, 'server-result-required'); assert.equal(f.counts().commits, 0);
  }
});

test('malformed timestamps and paths outside site_events fail closed', async () => {
  for (const change of [
    row => { row.value.at = '2020-01-01'; },
    row => { row.ref.path = 'product_clicks/AAAAAAAAAAAAAAAAAAA1'; },
    row => { row.ref.path = 'site_events/AAAAAAAAAAAAAAAAAAA1/nested/AAAAAAAAAAAAAAAAAAA2'; },
    row => { row.ref.firestore = {}; }
  ]) {
    const options = { count: 1 }; const f = fixture(options); change(f.rows[0]); options.rawRows = f.rows;
    const result = await f.api.run({ auth: f.auth });
    assert.equal(result.error, 'invalid-record'); assert.equal(f.counts().commits, 0);
  }
});

test('a timed-out commit is unknown, cannot be retried, and reports late acknowledgement', async () => {
  let release;
  const wait = new Promise(resolve => { release = resolve; });
  const f = fixture({ count: 2, commitWait: wait, deadlineMs: 20 });
  const updates = [];
  const result = await f.api.run({ auth: f.auth, onProgress: value => updates.push(value) });
  assert.equal(result.status, 'unknown'); assert.equal(result.deleted, 0); assert.equal(result.uncertain, 2);
  assert.equal(f.api.status().busy, true);
  assert.equal((await f.api.run({ auth: f.auth })).status, 'busy'); assert.equal(f.counts().commits, 1);
  release(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.api.status().busy, false);
  const last = updates.at(-1); assert.equal(last.status, 'partial'); assert.equal(last.deleted, 2);
  assert.equal(last.uncertain, 0); assert.equal(last.remaining, null);
});

test('invalid clocks fail before server access and callbacks cannot force a retry', async () => {
  const f = fixture({ now: () => NaN }); const result = await f.api.run({ auth: f.auth });
  assert.equal(result.error, 'invalid-clock'); assert.equal(f.counts().reads, 0);
  const good = fixture({ count: 1 });
  assert.equal((await good.api.run({ auth: good.auth, onProgress: () => { throw new Error('UI only'); } })).status, 'complete');
});

test('retention rule changes are confined to the site_events block', () => {
  const baseline = fs.readFileSync(path.join(__dirname, '../ops/firestore.rules.analytics-20261112.txt'), 'utf8');
  const candidate = fs.readFileSync(path.join(__dirname, '../ops/firestore.rules.retention-20261112.txt'), 'utf8');
  const outside = value => value.replace(/    \/\/ 사이트 이용통계:[\s\S]*?(?=    \/\/ 나머지는 전부 차단)/, '');
  assert.equal(outside(candidate), outside(baseline));
  assert.match(candidate, /allow update: if false;\s+allow delete: if isAdmin\(\) && expiredSiteEventAt\(resource\.data\.at\);/);
  assert.match(candidate, /at is timestamp\s+&& at < request\.time - duration\.value\(90, 'd'\)/);
});

async function adminPageFixture(options = {}) {
  const nodes = new Map();
  const makeNode = () => ({
    textContent: '', disabled: false, hidden: false, value: '7', style: {}, children: [],
    classList: { add() {}, remove() {}, toggle() {} },
    append(...children) { this.children.push(...children); }, replaceChildren() { this.children = []; },
    setAttribute() {}, focus() {}, select() {}
  });
  const document = { getElementById: id => { if (!nodes.has(id)) nodes.set(id, makeNode()); return nodes.get(id); }, createElement: makeNode };
  const app = {}, auth = { app, currentUser: null };
  const user = { uid: ADMIN, providerData: [{ providerId: 'google.com' }] };
  let callback, runs = 0, inspections = 0, cancels = 0, runOptions;
  const complete = { status: 'complete', mode: 'cleanup', deleted: 0, matched: 0, remaining: false };
  const pageMaintenance = {
    status: () => ({ busy: false, lastResult: complete }),
    run: args => { runs += 1; runOptions = args; return options.pending || Promise.resolve(complete); },
    inspect: async () => { inspections += 1; return { status: 'inspected', matched: 0, deleted: 0, remaining: false }; },
    cancel: () => { cancels += 1; }
  };
  const api = {
    backend: async () => ({ app }), status: () => ({ enabled: true, debug: false, optedOut: false, sessionStorageAvailable: true }),
    debugEvents: () => [], constants: { CHANNEL_SOURCES: ['youtube', 'instagram', 'threads', 'blog'], SOURCES: [] },
    channelUrl: source => 'https://okclean-kr.github.io/?src=' + source, safeError: () => 'unknown'
  };
  const context = { document, navigator: {}, window: { OKCleanAnalytics: api, OKCleanAnalyticsMaintenance: pageMaintenance, addEventListener() {} },
    getAuth: () => auth, GoogleAuthProvider: class { setCustomParameters() {} }, signInWithPopup: async () => {},
    signOut: async () => { auth.currentUser = null; callback(null); },
    onAuthStateChanged: (_auth, handler) => { callback = handler; }, Intl, console };
  const html = fs.readFileSync(path.join(__dirname, '../admin/analytics.html'), 'utf8');
  const source = html.match(/<script type="module">([\s\S]*?)<\/script>/)[1].replace(/^import .*;$/gm, '');
  const methods = await vm.runInNewContext(`(async()=>{${source}\nreturn {renderMaintenance};})()`, context);
  return { nodes, methods, runOptions: () => runOptions, counts: () => ({ runs, inspections, cancels }),
    emit: value => { auth.currentUser = value; callback(value); }, user };
}

test('admin page automatically runs maintenance once, including across logout and relogin', async () => {
  const f = await adminPageFixture();
  f.emit(null); assert.equal(f.counts().runs, 0);
  f.emit(f.user); f.emit(f.user); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.counts().runs, 1);
  await f.nodes.get('logout').onclick(); f.emit(f.user); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.counts().runs, 1); assert(f.counts().cancels > 0);
});

test('admin retention button invokes inspection only', async () => {
  const f = await adminPageFixture(); f.emit(f.user); await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.nodes.get('inspectRetention').disabled, false);
  f.nodes.get('inspectRetention').onclick(); await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(f.counts(), { runs: 1, inspections: 1, cancels: 0 });
  assert.match(f.nodes.get('retentionStatus').textContent, /이 버튼으로 삭제한 기록은 없습니다/);
});

test('partial and unknown maintenance results never receive a completed label', async () => {
  const f = await adminPageFixture(); f.emit(f.user); await new Promise(resolve => setImmediate(resolve));
  f.methods.renderMaintenance({ status: 'partial', deleted: 200, remaining: null });
  assert.match(f.nodes.get('retentionStatus').textContent, /일부 처리 확인/);
  assert.doesNotMatch(f.nodes.get('retentionStatus').textContent, /정리 완료/);
  f.methods.renderMaintenance({ status: 'unknown', deleted: 200, uncertain: 50, remaining: null });
  assert.match(f.nodes.get('retentionStatus').textContent, /결과 미확정/);
  assert.match(f.nodes.get('retentionStatus').textContent, /50건/);
  assert.doesNotMatch(f.nodes.get('retentionStatus').textContent, /정리 완료/);
});

test('late maintenance responses do not overwrite the signed-out page', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const f = await adminPageFixture({ pending }); f.emit(f.user);
  await f.nodes.get('logout').onclick();
  f.runOptions().onProgress({ status: 'partial', deleted: 200, remaining: null });
  resolve({ status: 'complete', deleted: 200, remaining: false });
  await new Promise(done => setImmediate(done));
  assert.match(f.nodes.get('retentionStatus').textContent, /관리자 로그인 후/);
  assert.doesNotMatch(f.nodes.get('retentionStatus').textContent, /정리 완료/);
  assert.equal(f.nodes.get('inspectRetention').disabled, true);
});

// Optional real-emulator validation. The dedicated demo project and loopback host
// are mandatory; this path never addresses a production Firebase database.
test('Firestore Emulator retention authorization and strict server boundary', {
  skip: !process.env.OKCLEAN_RETENTION_EMULATOR,
  timeout: 120000
}, async t => {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  assert.match(host || '', /^127\.0\.0\.1:\d+$/);
  const [hostname, port] = host.split(':');
  const projectId = 'demo-okclean-retention-audit';
  const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
  const sdk = require('firebase/firestore');
  sdk.setLogLevel('silent');
  const rulesPath = path.join(__dirname, '../ops/firestore.rules.retention-20261112.txt');
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const env = await initializeTestEnvironment({ projectId, firestore: { host: hostname, port: Number(port), rules } });
  const publicDb = env.unauthenticatedContext().firestore();
  const adminDb = env.authenticatedContext(ADMIN, { firebase: { sign_in_provider: 'google.com' } }).firestore();
  const otherDb = env.authenticatedContext('retention-other', { firebase: { sign_in_provider: 'google.com' } }).firestore();
  const passwordDb = env.authenticatedContext(ADMIN, { firebase: { sign_in_provider: 'password' } }).firestore();
  const noProviderDb = env.authenticatedContext(ADMIN).firestore();
  const results = [];
  let index = 0;
  const check = async (name, fn) => t.test(name, async () => {
    try { await fn(); results.push({ name, passed: true }); }
    catch (error) { results.push({ name, passed: false, error: error.message }); throw error; }
  });
  const old = () => sdk.Timestamp.fromMillis(Date.now() - 91 * DAY);
  const synthetic = at => ({ schema: 1, event: 'page_view', source: 'direct', page: 'home', service: 'unknown', placement: 'hero', target: 'none', test: false, at });
  async function seed(value = synthetic(old()), collection = 'site_events') {
    const id = String(++index).padStart(20, 'R');
    await env.withSecurityRulesDisabled(context => sdk.setDoc(sdk.doc(context.firestore(), collection, id), value));
    return `${collection}/${id}`;
  }
  try {
    await check('Google admin can delete a genuinely older-than-90-days event', async () => {
      const p = await seed(); await assertSucceeds(sdk.deleteDoc(sdk.doc(adminDb, p)));
    });
    for (const [name, db] of [['public', publicDb], ['other Google UID', otherDb], ['same UID password', passwordDb], ['missing Google provider', noProviderDb]]) {
      await check(`${name} cannot delete an expired event`, async () => {
        const p = await seed(); await assertFails(sdk.deleteDoc(sdk.doc(db, p)));
      });
    }
    for (const [name, at] of [['fresh', () => sdk.Timestamp.now()], ['less than 90 days', () => sdk.Timestamp.fromMillis(Date.now() - 90 * DAY + 60000)], ['future', () => sdk.Timestamp.fromMillis(Date.now() + DAY)]]) {
      await check(`admin cannot delete ${name} event`, async () => { const p = await seed(synthetic(at())); await assertFails(sdk.deleteDoc(sdk.doc(adminDb, p))); });
    }
    for (const [name, at] of [['string', '2020-01-01'], ['number', 1], ['null', null], ['map', { seconds: 1, nanoseconds: 0 }]]) {
      await check(`non-timestamp ${name} is not deletable`, async () => { const p = await seed(synthetic(at)); await assertFails(sdk.deleteDoc(sdk.doc(adminDb, p))); });
    }
    await check('missing timestamp is not deletable', async () => { const value = synthetic(old()); delete value.at; const p = await seed(value); await assertFails(sdk.deleteDoc(sdk.doc(adminDb, p))); });
    await check('expired diagnostic records follow the same retention policy', async () => { const p = await seed({ ...synthetic(old()), event: 'diagnostic', test: true }); await assertSucceeds(sdk.deleteDoc(sdk.doc(adminDb, p))); });
    await check('admin cannot change at or another event field before deletion', async () => {
      const p = await seed(synthetic(sdk.Timestamp.now()));
      await assertFails(sdk.updateDoc(sdk.doc(adminDb, p), { at: old() }));
      await assertFails(sdk.updateDoc(sdk.doc(adminDb, p), { source: 'youtube' }));
    });
    await check('a mixed fresh/expired batch is wholly rejected', async () => {
      const a = await seed(), b = await seed(synthetic(sdk.Timestamp.now()));
      const batch = sdk.writeBatch(adminDb); batch.delete(sdk.doc(adminDb, a)); batch.delete(sdk.doc(adminDb, b));
      await assertFails(batch.commit());
      assert.equal((await sdk.getDocFromServer(sdk.doc(adminDb, a))).exists(), true);
    });
    await check('server query used by maintenance is authorized for admin only', async () => {
      const q = db => sdk.query(sdk.collection(db, 'site_events'), sdk.where('at', '<', sdk.Timestamp.fromMillis(Date.now() - 90 * DAY)), sdk.orderBy('at', 'asc'), sdk.limit(200));
      await assertSucceeds(sdk.getDocsFromServer(q(adminDb))); await assertFails(sdk.getDocsFromServer(q(publicDb)));
    });
    await check('product_clicks deletion stays denied even for admin and old data', async () => {
      const p = await seed({ product: 'emulator-only', src: 'direct', at: old() }, 'product_clicks');
      await assertFails(sdk.deleteDoc(sdk.doc(adminDb, p)));
    });
    await check('subcollections and unrelated collection do not inherit retention rights', async () => {
      const p = await seed(); const nested = `${p}/nested/retention-test`;
      await env.withSecurityRulesDisabled(context => sdk.setDoc(sdk.doc(context.firestore(), nested), synthetic(old())));
      await assertFails(sdk.deleteDoc(sdk.doc(adminDb, nested)));
      const other = await seed({ at: old() }, 'contact_requests'); await assertFails(sdk.deleteDoc(sdk.doc(adminDb, other)));
    });
    // The emulator-only match calls the SAME production predicate with request.time
    // on both sides. This avoids a flaky wall-clock race when testing equality.
    const boundaryBlock = `\n    match /retention_boundary/{caseId} {\n      allow delete: if isAdmin() && (\n        (caseId == 'equal' && expiredSiteEventAt(request.time - duration.value(90, 'd'))) ||\n        (caseId == 'older' && expiredSiteEventAt(request.time - duration.value(90, 'd') - duration.value(1, 's'))) ||\n        (caseId == 'newer' && expiredSiteEventAt(request.time - duration.value(90, 'd') + duration.value(1, 's')))\n      );\n    }\n`;
    const boundaryRules = rules.replace('    // 나머지는 전부 차단', boundaryBlock + '    // 나머지는 전부 차단');
    const boundaryEnv = await initializeTestEnvironment({ projectId, firestore: { host: hostname, port: Number(port), rules: boundaryRules } });
    try {
      const boundaryAdmin = boundaryEnv.authenticatedContext(ADMIN, { firebase: { sign_in_provider: 'google.com' } }).firestore();
      for (const [name, allowed] of [['equal', false], ['older', true], ['newer', false]]) {
        await check(`server-time predicate at 90 days ${name} has expected strict boundary`, async () => {
          await boundaryEnv.withSecurityRulesDisabled(context => sdk.setDoc(sdk.doc(context.firestore(), 'retention_boundary', name), { synthetic: true }));
          const operation = sdk.deleteDoc(sdk.doc(boundaryAdmin, 'retention_boundary', name));
          await (allowed ? assertSucceeds(operation) : assertFails(operation));
        });
      }
    } finally { await boundaryEnv.cleanup(); }
  } finally {
    await env.cleanup();
    const report = { projectId, productionAccess: false, emulatorHost: host,
      candidateSha256: crypto.createHash('sha256').update(rules).digest('hex'),
      passed: results.filter(r => r.passed).length, failed: results.filter(r => !r.passed).length,
      boundaryMethod: 'same production predicate, emulator-only rule match with exact request.time-relative arguments', results };
    fs.writeFileSync(path.join(__dirname, '../ops/firestore-retention-validation-20261112.json'), JSON.stringify(report, null, 2) + '\n');
  }
});
