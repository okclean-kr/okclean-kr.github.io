// Private standalone Apps Script. No public web endpoint, customer writes or API keys.
var OKCleanMail = (function () {
  'use strict';
  var PROJECT = 'okclean-admin';
  var ROOT = 'projects/' + PROJECT + '/databases/(default)/documents';
  var ADMIN_URL = 'https://okclean-kr.github.io/admin/quotes.html';
  var STATE_KEY = 'OKCLEAN_QUOTE_MAIL_V1';
  var PAGE_SIZE = 100;
  function fail(code) { var e = new Error('OKCLEAN_MAIL_' + code); e.safeCode = code; throw e; }
  function timestamp(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,9})?Z$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 19) !== value.slice(0, 19)) fail('invalid-timestamp');
    return value;
  }
  function cursor(value) {
    if (!value || typeof value.name !== 'string' || !new RegExp('^' + ROOT.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/quote_requests/[A-Za-z0-9]{20}$').test(value.name)) fail('invalid-cursor');
    timestamp(value.at); return {name: value.name, at: value.at};
  }
  function initial(now) { return {version: 1, enabled: false, baseline: timestamp(now), cursor: null, outbox: null, lastSuccessAt: null, lastError: null, lastSent: null}; }
  function validateState(s) {
    if (!s || s.version !== 1 || typeof s.enabled !== 'boolean') fail('invalid-state');
    timestamp(s.baseline); if (s.cursor) cursor(s.cursor);
    if (s.outbox) {
      var o = s.outbox;
      if (!/^[a-f0-9-]{16,64}$/.test(o.id) || !Number.isInteger(o.count) || o.count < 1 || o.count > PAGE_SIZE || ['pending', 'sending', 'unknown'].indexOf(o.status) < 0) fail('invalid-outbox');
      cursor(o.nextCursor); timestamp(o.createdAt);
    }
    return s;
  }
  function load(env) { var raw = env.read(); if (!raw) return null; try { return validateState(JSON.parse(raw)); } catch (e) { fail('invalid-state'); } }
  function save(env, s) { validateState(s); var raw = JSON.stringify(s); if (raw.length > 7000) fail('state-too-large'); env.write(raw); }
  function query(s) {
    validateState(s);
    var q = {select: {fields: [{fieldPath: 'schema'}, {fieldPath: 'test'}, {fieldPath: 'createdAt'}]}, from: [{collectionId: 'quote_requests'}], where: {fieldFilter: {field: {fieldPath: 'createdAt'}, op: 'GREATER_THAN_OR_EQUAL', value: {timestampValue: s.baseline}}}, orderBy: [{field: {fieldPath: 'createdAt'}, direction: 'ASCENDING'}, {field: {fieldPath: '__name__'}, direction: 'ASCENDING'}], limit: PAGE_SIZE};
    if (s.cursor) q.startAt = {values: [{timestampValue: s.cursor.at}, {referenceValue: s.cursor.name}], before: false};
    return {structuredQuery: q};
  }
  function parseRows(response) {
    if (!Array.isArray(response) || response.length > PAGE_SIZE + 1) fail('invalid-response');
    var rows = [], names = Object.create(null);
    response.forEach(function (item) {
      if (!item || typeof item !== 'object' || item.error) fail('invalid-response');
      if (!item.document) { if (!item.readTime || Object.keys(item).some(function (k) { return ['readTime', 'transaction', 'skippedResults', 'done'].indexOf(k) < 0; })) fail('invalid-response'); return; }
      var d = item.document, f = d.fields, c = cursor({name: d.name, at: f && f.createdAt && f.createdAt.timestampValue});
      if (!f || Object.keys(f).some(function (k) { return ['schema', 'test', 'createdAt'].indexOf(k) < 0; }) || !f.schema || !f.test || f.schema.integerValue !== '1' || typeof f.test.booleanValue !== 'boolean' || names[d.name]) fail('invalid-projection');
      names[d.name] = true; rows.push({cursor: c, test: f.test.booleanValue});
    });
    if (rows.length > PAGE_SIZE) fail('invalid-response');
    return rows;
  }
  function message(batch) {
    return {subject: '[오케이청소] 새 견적 접수 ' + batch.count + '건', body: '새로운 실제 고객 견적 ' + batch.count + '건이 접수됐습니다.\n\n신청 내용은 Google 관리자 로그인 후 확인해 주세요.\n' + ADMIN_URL + '\n\n알림 번호: ' + batch.id + '\n이 메일에는 고객 이름·전화번호·주소·사진을 포함하지 않습니다.\n견적 신청은 계약 확정이 아닙니다.'};
  }
  function run(env, retryUnknown) {
    var s = load(env);
    if (!s || !s.enabled) return {status: 'disabled'};
    try {
      if (s.outbox && s.outbox.status === 'sending') { s.outbox.status = 'unknown'; s.lastError = 'delivery-unconfirmed'; save(env, s); }
      if (s.outbox && s.outbox.status === 'unknown') {
        if (!retryUnknown) return {status: 'delivery-unconfirmed', count: s.outbox.count};
        s.outbox.status = 'pending'; save(env, s);
      }
      if (!s.outbox) {
        var rows = parseRows(env.fetch(query(s)));
        if (!rows.length) { s.lastSuccessAt = env.now(); s.lastError = null; save(env, s); return {status: 'no-new-quotes'}; }
        var next = rows[rows.length - 1].cursor, count = rows.filter(function (r) { return !r.test; }).length;
        if (!count) { s.cursor = next; s.lastSuccessAt = env.now(); s.lastError = null; save(env, s); return {status: 'test-quotes-excluded'}; }
        s.outbox = {id: env.id(), count: count, nextCursor: next, createdAt: env.now(), status: 'pending'};
        save(env, s); // Persist before attempting mail. Cursor stays at the last completed batch.
      }
      if (env.quota() < 1) { s.lastError = 'mail-quota'; save(env, s); return {status: 'queued-quota', count: s.outbox.count}; }
      s.outbox.status = 'sending'; save(env, s);
      try { env.send(message(s.outbox)); } catch (ignored) { fail('delivery-unconfirmed'); }
      s.cursor = s.outbox.nextCursor; s.lastSent = {id: s.outbox.id, count: s.outbox.count, at: env.now()}; s.outbox = null; s.lastSuccessAt = env.now(); s.lastError = null;
      save(env, s);
      return {status: 'mail-api-accepted', count: s.lastSent.count};
    } catch (e) {
      // Never store raw API bodies, OAuth tokens, mail addresses or exception text.
      var code = e && e.safeCode || 'execution-failed';
      var persisted;
      try { persisted = load(env); } catch (ignored) {}
      if (persisted) {
        if (persisted.outbox && persisted.outbox.status === 'sending') { persisted.outbox.status = 'unknown'; code = 'delivery-unconfirmed'; }
        persisted.lastError = code; try { save(env, persisted); } catch (ignored) {}
      }
      fail(code);
    }
  }
  function status(env) {
    var s = load(env); if (!s) return {configured: false, enabled: false};
    return {configured: true, enabled: s.enabled, baseline: s.baseline, outboxStatus: s.outbox && s.outbox.status || null, queuedCount: s.outbox && s.outbox.count || 0, lastSuccessAt: s.lastSuccessAt, lastError: s.lastError, lastSent: s.lastSent};
  }
  return {PROJECT: PROJECT, ROOT: ROOT, STATE_KEY: STATE_KEY, ADMIN_URL: ADMIN_URL, PAGE_SIZE: PAGE_SIZE, initial: initial, load: load, save: save, query: query, parseRows: parseRows, message: message, run: run, status: status};
}());

function okcleanMailEnvironment_() {
  var properties = PropertiesService.getScriptProperties();
  function owner() {
    var email = Session.getEffectiveUser().getEmail();
    if (typeof email !== 'string' || !/^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/.test(email)) throw new Error('OKCLEAN_MAIL_owner-email-unavailable');
    return email; // Recipient is always the script's own execution account; never a customer field.
  }
  return {
    read: function () { return properties.getProperty(OKCleanMail.STATE_KEY); },
    write: function (value) { properties.setProperty(OKCleanMail.STATE_KEY, value); },
    now: function () { return new Date().toISOString(); },
    id: function () { return Utilities.getUuid(); },
    quota: function () { return MailApp.getRemainingDailyQuota(); },
    send: function (m) { MailApp.sendEmail({to: owner(), subject: m.subject, body: m.body, name: '오케이청소 접수 알림'}); },
    fetch: function (q) {
      var response;
      try {
        response = UrlFetchApp.fetch('https://firestore.googleapis.com/v1/' + OKCleanMail.ROOT + ':runQuery', {method: 'post', contentType: 'application/json', headers: {Authorization: 'Bearer ' + ScriptApp.getOAuthToken()}, payload: JSON.stringify(q), muteHttpExceptions: true, followRedirects: false});
      } catch (ignored) { var e = new Error('OKCLEAN_MAIL_firestore-network'); e.safeCode = 'firestore-network'; throw e; }
      var code = response.getResponseCode();
      if (code !== 200) { var e = new Error('OKCLEAN_MAIL_firestore-http-' + code); e.safeCode = code === 401 || code === 403 ? 'firestore-permission' : code === 429 ? 'firestore-quota' : 'firestore-response'; throw e; }
      var text = response.getContentText();
      if (text.length > 200000) throw new Error('OKCLEAN_MAIL_response-too-large');
      try { return JSON.parse(text); } catch (ignored) { var e = new Error('OKCLEAN_MAIL_firestore-json'); e.safeCode = 'firestore-json'; throw e; }
    },
    owner: owner
  };
}

function checkNotificationSetup() {
  var env = okcleanMailEnvironment_(); env.owner();
  var state = OKCleanMail.load(env) || OKCleanMail.initial(env.now());
  OKCleanMail.parseRows(env.fetch(OKCleanMail.query(state)));
  var result = {status: 'read-only-preflight-passed', mailQuotaAvailable: env.quota() > 0, enabled: state.enabled};
  console.log(JSON.stringify(result)); return result;
}

function activateNotifications() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) throw new Error('OKCLEAN_MAIL_execution-busy');
  try {
    var env = okcleanMailEnvironment_(); env.owner();
    var state = OKCleanMail.load(env) || OKCleanMail.initial(env.now());
    OKCleanMail.parseRows(env.fetch(OKCleanMail.query(state)));
    var triggers = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'pollQuoteNotifications'; });
    if (triggers.length > 1) throw new Error('OKCLEAN_MAIL_duplicate-triggers-review-required');
    if (!triggers.length) ScriptApp.newTrigger('pollQuoteNotifications').timeBased().everyMinutes(5).create();
    state.enabled = true; OKCleanMail.save(env, state);
    console.log('오케이청소 새 접수 메일 알림을 활성화했습니다. 5분 간격이며 실제 실행 시각은 지연될 수 있습니다.');
  } finally { lock.releaseLock(); }
}

function pauseNotifications() {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) throw new Error('OKCLEAN_MAIL_execution-busy');
  try { var env = okcleanMailEnvironment_(), state = OKCleanMail.load(env); if (state) { state.enabled = false; OKCleanMail.save(env, state); } console.log('접수 메일을 일시 중지했습니다. 고객 자료와 발송 대기 기록은 보존됩니다.'); }
  finally { lock.releaseLock(); }
}

function okcleanPoll_(retryUnknown) {
  var lock = LockService.getScriptLock(); if (!lock.tryLock(1000)) return {status: 'busy'};
  try { var result = OKCleanMail.run(okcleanMailEnvironment_(), retryUnknown); console.log(JSON.stringify(result)); return result; }
  finally { lock.releaseLock(); }
}
function pollQuoteNotifications() { return okcleanPoll_(false); }
// Manual recovery only: the previous mail may already have arrived. The stable batch ID helps identify a repeated email.
function retryUnconfirmedNotification() { return okcleanPoll_(true); }
function showNotificationStatus() { var result = OKCleanMail.status(okcleanMailEnvironment_()); console.log(JSON.stringify(result)); return result; }
function sendSetupTestEmail() {
  var env = okcleanMailEnvironment_(); if (env.quota() < 1) throw new Error('OKCLEAN_MAIL_mail-quota');
  env.send({subject: '[시험] 오케이청소 접수 알림 연결 확인', body: '이 메일은 관리자 알림 연결 시험입니다.\n고객 견적을 생성하거나 계약 건수에 포함하지 않습니다.\n' + OKCleanMail.ADMIN_URL});
  console.log('시험 메일 발송 API가 요청을 수락했습니다. 받은편지함에서 실제 도착을 별도로 확인해 주세요.');
}
