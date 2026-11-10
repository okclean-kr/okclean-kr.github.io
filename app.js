// 메인 화면 동작: 견적 계산기, 시공 사례, 계절 달력
const C = JSON.parse(document.getElementById("cfg").textContent);
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const store = {
  get(k, d){ try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
function toast(msg){
  let t = document.querySelector(".toast");
  if(!t){ t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
  t.textContent = msg; t.classList.add("on");
  clearTimeout(toast.tm); toast.tm = setTimeout(() => t.classList.remove("on"), 2600);
}
async function copy(text){
  try { await navigator.clipboard.writeText(text); return true; }
  catch(e){
    const ta = document.createElement("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    let ok = false; try { ok = document.execCommand("copy"); } catch(_) {}
    ta.remove(); return ok;
  }
}
const won = x => { x = Math.round(x / 1000) * 1000; return x >= 10000 ? (+(x / 10000).toFixed(1)) + "만" : x.toLocaleString("ko-KR"); };
const BLOGS = [].concat(C.blog || []).filter(Boolean);
const phoneDigits = (C.phone || "").replace(/[^0-9+]/g, "");
const M = C.member || null;
let MEMBER = null; // 운영 저장 확인 전에는 기존 로컬 쿠폰을 가입 완료로 처리하지 않습니다.
// 친구 초대 링크(?ref=OK-XXXXXX)로 들어온 경우 추천인 코드를 기억
const refQ = (new URLSearchParams(location.search).get("ref") || "").toUpperCase();
if(/^OK-[A-Z0-9]{6}$/.test(refQ) && (!MEMBER || MEMBER.code !== refQ)) store.set("ref", refQ);
const REF = store.get("ref", "");

// ── 견적 계산기 ──
const SV = C.services;
const Q = store.get("quote", {}) || {};
const urlSvc = new URLSearchParams(location.search).get("svc");
let cur = { svc: urlSvc && SV.some(s => s.id === urlSvc) ? urlSvc : (Q.svc && SV.some(s => s.id === Q.svc) ? Q.svc : SV[0].id), v: 0, t: null, qty: null, opts: [] };
if(cur.svc === Q.svc){ cur.v = Q.v || 0; cur.t = Q.t ?? null; cur.qty = Q.qty || null; cur.opts = Q.opts || []; }
const svc = () => SV.find(s => s.id === cur.svc);

$("qSvc").innerHTML = C.categories.map(cat => `<optgroup label="${esc(cat.name)}">${SV.filter(s => s.cat === cat.id).map(s => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join("")}</optgroup>`).join("");
if(Q.area) $("qArea").value = Q.area;
if(Q.date) $("qDate").value = Q.date;
const today = new Date(); $("qDate").min = new Date(today.getTime() + 9*3600e3).toISOString().slice(0, 10);

// 가격 방식: tiers(집 크기별 정액, 입주청소) / variants(종류 × 수량) / quote(현장 견적)
// 금액에 hi 가 없으면 '~부터' 금액, quote:true 는 현장 견적 항목
const priceText = (lo, hi) => hi == null ? `${won(lo)}원~` : lo === hi ? `${won(lo)}원` : `${won(lo)}~${won(hi)}원`;
const optText = (o, s) => o.quote ? "현장 견적" : "+" + (o.hi == null ? won(o.lo) + "~" : `${won(o.lo)}~${won(o.hi)}`) + (o.perUnit ? "/" + s.unit : "");
const isQuote = s => s.quote || (!(s.tiers || []).length && !(s.variants || []).length);
function drawForm(){
  const s = svc();
  $("qSvc").value = s.id;
  const quote = isQuote(s), tiered = !!(s.tiers || []).length;
  const vars = tiered ? s.kinds || [] : s.variants || [];
  if(cur.v >= vars.length) cur.v = 0;
  if(tiered && (cur.t == null || cur.t >= s.tiers.length)) cur.t = s.tierDefault ?? 0;
  $("qVarF").hidden = quote || vars.length < 2;
  $("qVar").innerHTML = vars.map((v, i) => `<button type="button" data-v="${i}" aria-pressed="${i === cur.v}">${esc(v.name)}</button>`).join("");
  $("qTierF").hidden = !tiered;
  if(tiered) $("qTier").innerHTML = s.tiers.map((t, i) => `<button type="button" data-t="${i}" aria-pressed="${i === cur.t}"><b>${esc(t.name)}</b><span>${esc(t.size || "")}${t.crew ? ` · ${t.crew}명` : ""}</span><em>${t.quote ? "현장 견적" : won(t.price) + "원" + (vars[cur.v] && vars[cur.v].open ? "~" : "")}</em></button>`).join("");
  const v = vars[cur.v];
  $("qQtyF").hidden = quote || tiered || !!(v && v.quote);
  $("qOptF").hidden = quote || !(s.options || []).length;
  if(!quote && !tiered){
    if(!cur.qty) cur.qty = s.qtyDefault || 1;
    $("qQty").value = cur.qty;
    $("qQtyL").textContent = s.qtyLabel || "수량";
    $("qUnit").textContent = s.unit;
  }
  if(!quote) $("qOpt").innerHTML = (s.options || []).map((o, i) => `<label><input type="checkbox" data-o="${i}"${cur.opts.includes(i) ? " checked" : ""}><span>${esc(o.name)}</span><small>${optText(o, s)}</small></label>`).join("");
  calc();
}
function estimate(){
  const s = svc();
  if(isQuote(s)) return null;
  const tiered = !!(s.tiers || []).length;
  const opts = cur.opts.map(i => (s.options || [])[i]).filter(Boolean);
  let lo, hi, v, q = 1, t = null;
  if(tiered){
    v = (s.kinds || [])[cur.v] || {}; t = s.tiers[cur.t] || s.tiers[0];
    if(t.quote) return null;
    lo = t.price; hi = v.open ? null : t.price;
  } else {
    v = s.variants[cur.v] || s.variants[0];
    if(v.quote) return null;
    q = Math.max(1, +cur.qty || 1);
    lo = v.lo * q; hi = v.hi == null ? null : v.hi * q;
  }
  opts.filter(o => !o.quote).forEach(o => {
    const m = o.perUnit ? q : 1;
    lo += o.lo * m; hi = (hi == null || o.hi == null) ? null : hi + o.hi * m;
  });
  if(s.min){ lo = Math.max(lo, s.min); if(hi != null) hi = Math.max(hi, s.min); }
  return {lo, hi, v, q, t, onSite: opts.filter(o => o.quote).map(o => o.name)};
}
function summary(){
  const s = svc(), r = estimate();
  const lines = [`[${C.name} 견적 문의]`, `서비스: ${s.name}`];
  const os = cur.opts.map(i => (s.options || [])[i]).filter(Boolean).map(o => o.name);
  if(r){
    lines.push(r.t ? `내용: ${r.v.name || ""} / ${r.t.name} (${r.t.size}, ${r.t.crew}명)` : `내용: ${s.variants.length > 1 ? r.v.name + " / " : ""}${r.q}${s.unit}`);
    if(os.length) lines.push(`추가: ${os.join(", ")}`);
    lines.push(`예상 금액: ${priceText(r.lo, r.hi)} (사이트 계산${r.onSite.length ? ", " + r.onSite.join("·") + " 별도" : ""})`);
  } else {
    const t = (s.tiers || [])[cur.t], v = ((s.tiers || []).length ? s.kinds : s.variants || [])[cur.v];
    if(!isQuote(s)) lines.push(`내용: ${[v && v.name, t && t.name].filter(Boolean).join(" / ")}`);
    if(os.length) lines.push(`추가: ${os.join(", ")}`);
    lines.push("현장 사진을 보내드릴게요. 견적 부탁드려요.");
  }
  if($("qArea").value) lines.push(`지역: ${$("qArea").value}`);
  if($("qDate").value) lines.push(`희망 날짜: ${$("qDate").value}`);
  if(MEMBER && M) lines.push(`회원 쿠폰: ${MEMBER.code} (${won(M.coupon)}원 할인 + 무료 서비스: ${MEMBER.free})`);
  else if(REF) lines.push(`추천인 코드: ${REF}`);
  lines.push("상세 주소·현장 사진은 대화로 보내드릴게요.");
  return lines.join("\n");
}
// 고른 날짜가 주말이면 할증 가능성 안내 (평일이 더 저렴하고 일정 잡기도 쉬움)
function weekendNote(){
  const v = $("qDate").value; if(!v) return "";
  const d = new Date(v + "T00:00:00").getDay();
  return (d === 0 || d === 6) ? " 주말은 할증이 붙을 수 있어요. 평일이면 더 저렴해요." : "";
}
function calc(){
  const s = svc(), r = estimate();
  if(r){
    const p = priceText(r.lo, r.hi);
    $("qK").textContent = r.t ? `예상 금액 · 작업 인원 ${r.t.crew}명` : "예상 금액";
    $("qV").innerHTML = `${esc(p.replace(/원(~?)$/, ""))}<small>원${r.hi == null ? "~" : ""}</small>`;
    const base = r.v && r.v.note ? r.v.note : s.priceNote || "오염 정도와 구조에 따라 현장에서 달라질 수 있어요.";
    $("qN").textContent = base + (r.onSite.length ? ` ${r.onSite.join("·")}은 별도 현장 견적이에요.` : "") + (s.min && r.lo === s.min ? ` 최소 금액 ${won(s.min)}원${s.minNote ? "(" + s.minNote + ")" : ""}이 적용됐어요.` : "") + weekendNote();
  } else {
    $("qK").textContent = "현장 견적";
    $("qV").innerHTML = `사진 보고<small> 안내</small>`;
    $("qN").textContent = "작업량 차이가 커서 현장 사진을 보고 금액을 알려드려요." + weekendNote();
  }
  $("qKakao").textContent = r ? "이 견적으로 카톡 문의" : "카톡으로 사진 보내고 견적 받기";
  if(M){
    const box = $("qMem"); box.hidden = false;
    if(MEMBER) box.innerHTML = r ? `🎟 회원 쿠폰 적용 시 <b>${priceText(Math.max(0, r.lo - M.coupon), r.hi == null ? null : Math.max(0, r.hi - M.coupon))}</b> + ${esc(MEMBER.free)} 무료` : `🎟 회원 쿠폰 ${won(M.coupon)}원 할인 + ${esc(MEMBER.free)} 무료가 적용돼요`;
    else box.innerHTML = `<button type="button" class="mem-join" data-join>🎟 회원 혜택 문의 · <b>${won(M.coupon)}원 할인 쿠폰</b> + 무료 서비스 →</button>`;
  }
  store.set("quote", {svc: cur.svc, v: cur.v, t: cur.t, qty: cur.qty, opts: cur.opts, area: $("qArea").value, date: $("qDate").value});
}
$("qSvc").addEventListener("change", e => { cur = {svc: e.target.value, v: 0, t: null, qty: null, opts: []}; drawForm(); });
$("qTier").addEventListener("click", e => { const b = e.target.closest("[data-t]"); if(!b) return; cur.t = +b.dataset.t; drawForm(); });
$("qVar").addEventListener("click", e => { const b = e.target.closest("[data-v]"); if(!b) return; cur.v = +b.dataset.v; drawForm(); });
$("qQty").addEventListener("input", e => { cur.qty = Math.min(999, Math.max(1, parseInt(e.target.value, 10) || 1)); calc(); });
$("qMinus").onclick = () => { cur.qty = Math.max(1, (+cur.qty || 1) - 1); $("qQty").value = cur.qty; calc(); };
$("qPlus").onclick = () => { cur.qty = Math.min(999, (+cur.qty || 0) + 1); $("qQty").value = cur.qty; calc(); };
$("qOpt").addEventListener("change", e => { const i = +e.target.dataset.o; cur.opts = e.target.checked ? [...new Set([...cur.opts, i])] : cur.opts.filter(x => x !== i); calc(); });
$("qArea").addEventListener("change", calc);
$("qDate").addEventListener("change", calc);
window.goSms = u => { location.href = u; };
// 문자로 견적 보내기: 견적 내용이 미리 적힌 문자 창을 엶 (아이폰은 &body=, 안드로이드는 ?body=)
if($("qSms")) $("qSms").onclick = async () => {
  const num = (C.sms || "").replace(/[^0-9]/g, ""), body = encodeURIComponent(summary());
  const IOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const MOBILE = IOS || /Android/i.test(navigator.userAgent);
  if(!MOBILE){   // PC에서는 문자 앱이 없어서 번호와 내용을 안내
    await copy(summary());
    toast(`문의 내용을 복사했어요. 휴대폰에서 ${C.sms} 로 문자 보내주세요.`);
    return;
  }
  window.goSms(`sms:${num}${IOS ? "&" : "?"}body=${body}`);
};
$("qCopy").onclick = async () => { if(await copy(summary())) toast("문의 내용을 복사했어요. 원하는 곳에 붙여넣어 주세요."); };
$("qKakao").onclick = async () => {
  if(C.kakao) return kakaoSend("카톡으로 견적 문의", summary());
  await copy(summary());
  toast("문의 내용을 복사했어요. 전화로 연결할게요."); setTimeout(() => location.href = "tel:" + phoneDigits, 600);
};
drawForm();

// ── 서비스 분류 칩 ──
document.querySelectorAll("#services .cats .chip").forEach(b => b.addEventListener("click", () => {
  document.querySelectorAll("#services .cats .chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  document.querySelectorAll("#svcList li").forEach(li => li.hidden = !!b.dataset.cat && li.dataset.cat !== b.dataset.cat);
}));

// ── 시공 사례 (블로그 후기 자동 연동: update.py 가 cases.json 으로 정리) ──
let CASES = [], caseF = "", caseN = 8;
// 네이버 블로그 사진: 외부 사이트에서도 잘 열리는 서버(mblogthumb-phinf)의 큰 사진을 먼저 쓰고, 안 되면 원래 썸네일로
function naverImgs(src){
  if(!/pstatic\.net/.test(src)) return [src, src];
  const base = src.replace(/\?.*$/, "");
  return [base.replace("://blogthumb.pstatic.net", "://mblogthumb-phinf.pstatic.net").replace("://postfiles.pstatic.net", "://mblogthumb-phinf.pstatic.net") + "?type=w800", base + "?type=s3"];
}
document.addEventListener("error", e => {
  const im = e.target;
  if(!(im instanceof HTMLImageElement) || !im.classList.contains("ph")) return;
  if(!im.dataset.f && im.dataset.alt){ im.dataset.f = "1"; im.src = im.dataset.alt; }
  else { const d = document.createElement("div"); d.className = "ph"; im.replaceWith(d); }
}, true);
function drawCases(){
  const list = CASES.filter(x => !caseF || x.svc === caseF);
  const used = [...new Set(CASES.map(x => x.svc).filter(Boolean))];
  $("caseChips").innerHTML = used.length > 1 ? `<button class="chip" data-f="" aria-pressed="${!caseF}">전체</button>` + used.map(id => { const s = SV.find(x => x.id === id); return s ? `<button class="chip" data-f="${esc(id)}" aria-pressed="${caseF === id}">${esc(s.name)}</button>` : ""; }).join("") : "";
  $("caseList").innerHTML = list.slice(0, caseN).map(x => {
    const s = SV.find(v => v.id === x.svc);
    return `<a class="case" href="${esc(x.link)}" target="_blank" rel="noopener">${x.img ? (() => { const [big, alt] = naverImgs(x.img); return `<img class="ph" src="${esc(big)}" data-alt="${esc(alt)}" alt="" loading="lazy" referrerpolicy="no-referrer">`; })() : `<div class="ph"></div>`}
      <div class="tx"><div class="tg">${esc([x.region, s && s.name].filter(Boolean).join(" "))}</div><div class="tt">${esc(x.title)}</div></div></a>`;
  }).join("") + (list.length > caseN ? `<button class="btn line small" id="caseMore" type="button" style="grid-column:1/-1">시공 사례 더 보기 (${list.length - caseN}건)</button>` : "");
}
$("caseList").addEventListener("click", e => { if(e.target.id === "caseMore"){ caseN += 8; drawCases(); } });
$("caseChips").addEventListener("click", e => { const b = e.target.closest("[data-f]"); if(!b) return; caseF = b.dataset.f; caseN = 8; drawCases(); });
fetch("cases.json?t=" + Date.now(), {cache: "no-store"}).then(r => r.ok ? r.json() : {cases: []}).catch(() => ({cases: []})).then(d => {
  const ex = (C.excludeWords || []).map(w => w.replace(/\s/g, ""));
  const all = (d.cases || []).filter(x => x.link && x.title && !ex.some(w => x.title.replace(/\s/g, "").includes(w))).sort((p, q) => (q.date || "").localeCompare(p.date || ""));
  CASES = all.filter(x => (x.kind || "case") === "case");
  const tips = all.filter(x => x.kind === "tip").slice(0, 6);
  if(tips.length){
    $("tipList").innerHTML = tips.map(x => `<li><a href="${esc(x.link)}" target="_blank" rel="noopener"><span>${esc(x.title)}</span><small>${esc((x.date || "").slice(0, 10).replace(/-/g, "."))}</small></a></li>`).join("");
    $("tips").hidden = false;
  }
  if(CASES.length) drawCases();
  else if(C.sample || !BLOGS.length) $("caseList").outerHTML = `<div class="hint">${BLOGS.length ? "블로그 후기를 불러오는 중이에요. 1시간 안에 자동으로 채워져요." : "config.json 의 blog 에 네이버 블로그 아이디를 넣으면, 블로그에 올린 시공 후기가 여기에 자동으로 모여요."}</div>`;
  else $("cases").hidden = true;
});

// ── 계절 달력 ──
const nowM = new Date(Date.now() + 9*3600e3).getUTCMonth() + 1;
$("months").innerHTML = C.seasons.map(x => `<div class="mo${x.m === nowM ? " now" : ""}"><b>${x.m}월</b>${x.ids.map(id => { const s = SV.find(v => v.id === id); return s ? `<span>${esc(s.name)}</span>` : ""; }).join("")}</div>`).join("");
const nowEl = document.querySelector(".mo.now");
if(nowEl) $("months").scrollLeft = Math.max(0, nowEl.offsetLeft - 20);


// 회원 자동 접수는 운영 규칙과 저장 확인을 검증한 뒤 별도로 복구합니다.
// 여기서는 개인정보를 수집하거나 가입 완료/쿠폰 발급을 표시하지 않습니다.
function openJoin(){
  const title = document.getElementById('sheetT');
  const body = document.getElementById('sheetB');
  if(!title || !body) return;
  title.textContent = '회원 혜택 문의';
  body.replaceChildren();
  const explanation = document.createElement('p');
  explanation.className = 'lead-s';
  explanation.textContent = '1만원 할인 쿠폰과 무료 서비스 1가지의 신청 방법을 카카오톡 상담에서 안내해 드려요. 기존 회원도 상담할 때 쿠폰번호를 알려 주세요.';
  const status = document.createElement('p');
  status.className = 'hint';
  status.textContent = '이 화면에서는 회원가입 접수나 쿠폰 발급이 이루어지지 않습니다.';
  const contact = document.createElement('a');
  contact.className = 'btn glove';
  contact.href = C.kakao;
  contact.target = '_blank';
  contact.rel = 'noopener';
  contact.textContent = '카카오톡으로 회원 혜택 문의';
  body.append(explanation, status, contact);
  window.openModal('sheet');
}
document.addEventListener('click', event => {
  if(event.target.closest('[data-join], [data-invite]')){
    event.preventDefault();
    openJoin();
  }
});
calc();
