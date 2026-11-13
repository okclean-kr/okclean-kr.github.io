import fs from 'node:fs';
import crypto from 'node:crypto';

const queuePath = 'ops/threads-queue.json';
const ledgerPath = 'ops/threads-posted.json';
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const writeLedger = (data) => fs.writeFileSync(ledgerPath, JSON.stringify(data, null, 2) + '\n');
const enabled = process.env.THREADS_ENABLED === 'true';
if (!enabled) { console.log('Publishing disabled: set OKC_THREADS_ENABLED=true only after OAuth verification.'); process.exit(0); }
const token = process.env.THREADS_ACCESS_TOKEN;
if (!token) throw new Error('Missing OKC_THREADS_ACCESS_TOKEN (GitHub Actions secret).');
const expected = process.env.THREADS_EXPECTED_USERNAME || 'ky.lee0912';
const now = new Date();
const kst = new Date(now.getTime() + 9 * 3600000);
const day = kst.toISOString().slice(0, 10);
const hour = kst.getUTCHours();
const slot = hour >= 20 ? '20' : hour >= 13 ? '13' : hour >= 8 ? '08' : null;
if (!slot) { console.log('Outside the approved KST publishing windows.'); process.exit(0); }

const api = 'https://graph.threads.net/v1.0';
async function request(path, params, method = 'GET') {
  const url = new URL(api + path);
  if (method === 'GET') for (const [k,v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { method, headers: {Authorization: 'Bearer ' + token, ...(method === 'POST' ? {'Content-Type':'application/x-www-form-urlencoded'} : {})}, ...(method === 'POST' ? {body: new URLSearchParams(params)} : {}) });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) throw new Error('Threads API ' + res.status + ': ' + JSON.stringify(body.error || body).slice(0, 500));
  return body;
}
const profile = await request('/me', {fields: 'id,username'});
if ((profile.username || '').toLowerCase().replace(/^@/, '') !== expected.toLowerCase()) throw new Error('Authenticated Threads username does not match expected account.');
const queue = read(queuePath);
const ledger = read(ledgerPath);
if (!Array.isArray(queue) || !Array.isArray(ledger)) throw new Error('Malformed queue or ledger.');
const today = ledger.filter(x => x.day === day);
if (today.length >= 3) { console.log('Daily ceiling reached.'); process.exit(0); }
const items = queue.filter(x => x.day === day && x.slot === slot);
if (items.length !== 1) { console.log('No unique approved post for '+ day +' '+slot+'.'); process.exit(0); }
const item = items[0];
if (ledger.some(x => x.id === item.id)) { console.log('Already attempted; never auto-retry without reconciliation.'); process.exit(0); }
if (!/^okc-[a-z0-9-]+$/.test(item.id)) throw new Error('Invalid post id.');
if (typeof item.text !== 'string' || item.text.length < 30 || item.text.length > 500) throw new Error('Text must be 30..500 chars.');
if (/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|kr|net|org|io)\b/i.test(item.text)) throw new Error('URLs/domains forbidden in post body.');
if (!item.text.trimEnd().endsWith('무료견적은 프로필링크 확인')) throw new Error('CTA missing.');
if (item.approved !== true) throw new Error('Post not approved.');
if (slot === '20' && (item.type !== 'field' || !item.image_url?.startsWith('https://'))) throw new Error('Field slot requires verified public HTTPS image URL.');
if (item.type !== 'text' && item.type !== 'field') throw new Error('Unsupported post type.');
const fingerprint = crypto.createHash('sha256').update(item.text).digest('hex');
if (ledger.some(x => x.fingerprint === fingerprint)) throw new Error('Duplicate content previously attempted.');
ledger.push({id:item.id, day, slot, fingerprint, status:'attempted-unconfirmed', at:now.toISOString()});
writeLedger(ledger);
// Persist attempt BEFORE sending. If the process crashes after the API call, do not auto-post again.
// GitHub Actions always() step commits the ledger even on API failure. Manual reconciliation required.
const args = item.type === 'field'
  ? {media_type:'IMAGE',image_url:item.image_url,text:item.text}
  : {media_type:'TEXT',text:item.text};
const container = await request('/me/threads', args, 'POST');
if (!container.id) throw new Error('API did not return a container id.');
const published = await request('/me/threads_publish', {creation_id:container.id}, 'POST');
const row = ledger.find(x => x.id === item.id);
row.status = 'published';
row.threads_id = published.id || null;
row.published_at = new Date().toISOString();
writeLedger(ledger);
console.log('Published post '+item.id+' to verified @'+expected);
