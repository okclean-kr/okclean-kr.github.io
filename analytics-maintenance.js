(function (root, factory) {
  'use strict';
  const api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OKCleanAnalyticsMaintenance = api;
})(typeof window !== 'undefined' ? window : globalThis, function (root) {
  'use strict';

  const ADMIN_UID = 'H1MfdqGkFRZzU8qkqwXTsiKv3CO2';
  const PROJECT_ID = 'okclean-admin';
  const COLLECTION = 'site_events';
  const RETENTION_DAYS = 90;
  const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;
  const BATCH_SIZE = 200;
  const MAX_BATCHES = 3;
  const DEADLINE_MS = 15000;
  const ERROR_CODES = new Set([
    'admin-required', 'auth-changed', 'project-mismatch', 'invalid-clock',
    'invalid-record', 'server-result-required', 'backend-unavailable',
    'deadline-exceeded', 'permission-denied', 'unauthenticated', 'unavailable',
    'failed-precondition', 'resource-exhausted', 'aborted', 'cancelled',
    'invalid-argument', 'internal', 'unknown'
  ]);

  function errorCode(error) {
    const code = error && typeof error.code === 'string' ? error.code.replace(/^(firestore|auth)\//, '') : '';
    return ERROR_CODES.has(code) ? code : 'unknown';
  }

  function hasGoogleAdmin(user) {
    return !!(user && user.uid === ADMIN_UID && Array.isArray(user.providerData)
      && user.providerData.some(item => item.providerId === 'google.com')
      && typeof user.getIdTokenResult === 'function');
  }

  function beforeCutoff(at, cutoff, Timestamp) {
    if (!Timestamp || !(at instanceof Timestamp) || !(cutoff instanceof Timestamp)) return false;
    return at.seconds < cutoff.seconds
      || (at.seconds === cutoff.seconds && at.nanoseconds < cutoff.nanoseconds);
  }

  function createMaintenance(deps = {}) {
    const env = deps.env || root;
    const now = deps.now || (() => Date.now());
    const deadlineMs = deps.deadlineMs || DEADLINE_MS;
    const getBackend = deps.backend || (() => {
      const analytics = env.OKCleanAnalytics;
      if (!analytics || typeof analytics.backend !== 'function') throw { code: 'backend-unavailable' };
      return analytics.backend();
    });
    const loadAuth = deps.loadAuth || (() => import('https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js'));
    let active = null;
    let lastResult = null;

    function withDeadline(promise) {
      let timer;
      return Promise.race([
        Promise.resolve(promise),
        new Promise((_, reject) => { timer = env.setTimeout(() => reject({ code: 'deadline-exceeded' }), deadlineMs); })
      ]).finally(() => env.clearTimeout(timer));
    }

    function publish(state, status, progress) {
      const result = Object.freeze({ ...state, status });
      lastResult = result;
      if (typeof progress === 'function') {
        try { progress(result); } catch (_) { /* 화면 표시 오류가 정리 동작을 변경하지 않게 합니다. */ }
      }
      return result;
    }

    async function principal(auth, expected) {
      const user = auth && auth.currentUser;
      if (expected && user !== expected) throw { code: 'auth-changed' };
      if (!hasGoogleAdmin(user)) throw { code: 'admin-required' };
      const token = await withDeadline(user.getIdTokenResult());
      if (auth.currentUser !== user) throw { code: 'auth-changed' };
      if (!token || !token.claims || !token.claims.firebase
          || token.claims.firebase.sign_in_provider !== 'google.com') throw { code: 'admin-required' };
      return user;
    }

    async function resources(providedAuth) {
      const resource = await withDeadline(getBackend());
      if (!resource || !resource.app || resource.app.options.projectId !== PROJECT_ID
          || !resource.db || resource.db.app !== resource.app) throw { code: 'project-mismatch' };
      let auth = providedAuth;
      if (!auth) {
        const authModule = await withDeadline(loadAuth());
        auth = authModule.getAuth(resource.app);
        if (typeof auth.authStateReady === 'function') await withDeadline(auth.authStateReady());
      }
      if (!auth || auth.app !== resource.app) throw { code: 'project-mismatch' };
      const user = await principal(auth);
      return { ...resource, auth, user };
    }

    async function scan(resource, cutoff, state) {
      await principal(resource.auth, resource.user);
      const { db, firestore } = resource;
      const query = firestore.query(firestore.collection(db, COLLECTION),
        firestore.where('at', '<', cutoff), firestore.orderBy('at', 'asc'), firestore.limit(BATCH_SIZE));
      const snapshot = await withDeadline(firestore.getDocsFromServer(query));
      if (!snapshot || !Array.isArray(snapshot.docs) || snapshot.docs.length > BATCH_SIZE
          || !snapshot.metadata || snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
        throw { code: 'server-result-required' };
      }
      state.checkedAt = new Date(now()).toISOString();
      state.matched = snapshot.docs.length;
      state.scanned += snapshot.docs.length;
      for (const item of snapshot.docs) {
        const data = item.data();
        if (!item.ref || item.ref.firestore !== db || !/^site_events\/[A-Za-z0-9]{20}$/.test(item.ref.path)
            || !data || !beforeCutoff(data.at, cutoff, firestore.Timestamp)) throw { code: 'invalid-record' };
      }
      return snapshot.docs;
    }

    async function execute(mode, options = {}) {
      if (!options || typeof options !== 'object') options = {};
      if (active) return Object.freeze({ status: 'busy', mode, deleted: 0, remaining: null, uncertain: active.uncertain || 0 });
      const operation = { pending: null, settled: true, uncertain: 0, cancelled: false };
      active = operation;
      const notCancelled = () => { if (operation.cancelled) throw { code: 'cancelled' }; };
      const state = {
        mode, collection: COLLECTION, retentionDays: RETENTION_DAYS, cutoff: null,
        checkedAt: null, matched: 0, scanned: 0, deleted: 0, batches: 0,
        remaining: null, capped: false, uncertain: 0, error: null
      };
      const progress = options.onProgress;
      try {
        const clock = now();
        if (!Number.isFinite(clock) || clock < RETENTION_MS) throw { code: 'invalid-clock' };
        const cutoffDate = new Date(clock - RETENTION_MS);
        if (!Number.isFinite(cutoffDate.getTime())) throw { code: 'invalid-clock' };
        state.cutoff = cutoffDate.toISOString();
        const resource = await resources(options.auth);
        notCancelled();
        const cutoff = resource.firestore.Timestamp.fromDate(cutoffDate);
        publish(state, 'checking', progress);
        while (true) {
          notCancelled();
          const candidates = await scan(resource, cutoff, state);
          notCancelled();
          if (mode === 'inspect') {
            state.remaining = candidates.length > 0;
            state.capped = candidates.length === BATCH_SIZE;
            return publish(state, 'inspected', progress);
          }
          if (!candidates.length) {
            state.remaining = false;
            return publish(state, 'complete', progress);
          }
          state.remaining = true;
          if (state.batches === MAX_BATCHES) {
            state.capped = true;
            return publish(state, 'capped', progress);
          }
          // 조회 중 로그아웃하거나 다른 로그인으로 바뀌면 쓰기 전에 중단합니다.
          await principal(resource.auth, resource.user);
          notCancelled();
          const batch = resource.firestore.writeBatch(resource.db);
          for (const item of candidates) batch.delete(item.ref);
          publish(state, 'deleting', progress);
          // onProgress에서 화면 상태/로그인이 바뀐 경우도 마지막으로 확인합니다.
          await principal(resource.auth, resource.user);
          notCancelled();
          operation.settled = false;
          operation.uncertain = candidates.length;
          operation.pending = Promise.resolve().then(() => {
            notCancelled();
            if (resource.auth.currentUser !== resource.user) throw { code: 'auth-changed' };
            return batch.commit();
          }).then(() => {
            operation.settled = true;
            operation.uncertain = 0;
            state.deleted += candidates.length;
            state.batches += 1;
            state.uncertain = 0;
          }, error => {
            operation.settled = true;
            operation.uncertain = 0;
            state.uncertain = 0;
            throw error;
          });
          await withDeadline(operation.pending);
          operation.pending = null;
          // 완료된 배치만 누적합니다. 다음 서버 조회가 없으면 전체 완료로 보고하지 않습니다.
          publish(state, 'checking', progress);
        }
      } catch (error) {
        state.error = errorCode(error);
        state.remaining = null;
        if (operation.pending && !operation.settled) {
          state.uncertain = operation.uncertain;
          return publish(state, 'unknown', progress);
        }
        const blocked = ['admin-required', 'auth-changed', 'project-mismatch', 'invalid-clock', 'invalid-record', 'server-result-required'].includes(state.error);
        return publish(state, state.deleted ? 'partial' : (blocked ? 'blocked' : 'failed'), progress);
      } finally {
        if (operation.pending && !operation.settled) {
          // SDK에 전달한 쓰기는 시간 초과로 취소되지 않습니다. 결과가 정해질 때까지
          // 같은 페이지에서 새 정리를 막고, 뒤늦은 응답도 실제 확인 수만 표시합니다.
          operation.pending.then(() => {
            if (active === operation) active = null;
            state.error = null;
            state.remaining = null;
            publish(state, 'partial', progress);
          }, error => {
            if (active === operation) active = null;
            state.error = errorCode(error);
            state.remaining = null;
            publish(state, state.deleted ? 'partial' : 'failed', progress);
          }).finally(() => { if (active === operation) active = null; });
        } else if (active === operation) active = null;
      }
    }

    return Object.freeze({
      inspect: options => execute('inspect', options),
      run: options => execute('cleanup', options),
      cancel: () => { if (active) active.cancelled = true; },
      status: () => Object.freeze({ busy: !!active, uncertain: active ? active.uncertain : 0, lastResult }),
      constants: Object.freeze({ COLLECTION, RETENTION_DAYS, BATCH_SIZE, MAX_BATCHES })
    });
  }

  const api = createMaintenance();
  if (typeof module === 'object' && module.exports) {
    return Object.freeze({ ...api, _createForTest: createMaintenance, _beforeCutoff: beforeCutoff, _hasGoogleAdmin: hasGoogleAdmin });
  }
  return api;
});
