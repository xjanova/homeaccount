// main.js — bootstrap, router, shell, event delegation, global actions.
// VIEW CONTRACT: each module in views/ exports render(ctx)->htmlString and optional afterRender(ctx, rootEl).
import { Store } from './state.js';
import * as db from './db.js';
import * as sel from './selectors.js';
import { applyTheme, toast, confirmDialog } from './ui.js';
import { initSync, afterLogin, runSync, canSync } from './sync.js';
import { setToken, api, ApiError } from './api.js';
import { icon } from './icons.js';
import * as F from './format.js';
import * as D from './data.js';

// views
import * as dashboard from './views/dashboard.js';
import * as transactions from './views/transactions.js';
import * as calendar from './views/calendar.js';
import * as budgets from './views/budgets.js';
import * as categories from './views/categories.js';
import * as accounts from './views/accounts.js';
import * as reports from './views/reports.js';
import * as settings from './views/settings.js';
import * as pricing from './views/pricing.js';
import * as billing from './views/billing.js';
import * as team from './views/team.js';
import * as landing from './views/landing.js';
import * as login from './views/login.js';

const VIEWS = { dashboard, transactions, calendar, budgets, categories, accounts, reports, settings, pricing, billing, team, landing, login };
const CHROMELESS = new Set(['landing','login']);

// views may export `actions` (object of {name(el,ev)}) — merged into the global ACT registry,
// invoked via data-act="name". Views NEVER import main.js (no cycle); they import leaf modules.
function mergeViewActions(){ for(const v of Object.values(VIEWS)){ if(v && v.actions) Object.assign(ACT, v.actions); } }

const NAV = [
  { id:'dashboard',    th:'แดชบอร์ด',     en:'Dashboard',    icon:'dashboard' },
  { id:'transactions', th:'รายการ',        en:'Transactions', icon:'list' },
  { id:'calendar',     th:'ปฏิทินรายการ', en:'Calendar',     icon:'calendar' },
  { id:'budgets',      th:'งบประมาณ',      en:'Budgets',      icon:'budget' },
  { id:'categories',   th:'หมวดหมู่',       en:'Categories',   icon:'tag' },
  { id:'accounts',     th:'บัญชี & กระเป๋า', en:'Accounts',   icon:'wallet' },
  { id:'reports',      th:'รายงาน',         en:'Reports',      icon:'report' },
  { id:'settings',     th:'ตั้งค่า',         en:'Settings',     icon:'settings' },
];
const NAV2 = [
  { id:'pricing', th:'แพ็กเกจ & ราคา', en:'Pricing', icon:'price' },
  { id:'billing', th:'การเรียกเก็บเงิน', en:'Billing', icon:'receipt' },
  { id:'team',    th:'ทีม & สมาชิก',   en:'Team',    icon:'team' },
];
const BOTTOM = [
  { id:'dashboard', th:'หน้าหลัก', icon:'dashboard' },
  { id:'transactions', th:'รายการ', icon:'list' },
  { id:'__add', th:'เพิ่ม', icon:'plus', fab:true },
  { id:'budgets', th:'งบ', icon:'budget' },
  { id:'accounts', th:'บัญชี', icon:'wallet' },
];

// ---- shared ctx passed to every view ----
const ctx = {
  get state(){ return Store.state; }, S:Store, sel, D, icon, ...F,
  scopeName: D.scopeName, CATS: D.CATS, PLANS: D.PLANS,
  toast, confirm: confirmDialog,
  go(view){ navigate(view); },
  act(name, ds={}){ const h = ACT[name]; if(h) h({ dataset:ds }); },
};

let _mode = null; // 'app' | 'chromeless'

function appRoot(){ return document.querySelector('.app-root'); }

function render(){
  const s = Store.state;
  s.isMobile = s.vw <= 860;
  const root = appRoot();
  root.classList.toggle('is-mobile', s.isMobile);
  applyTheme(s);

  const chromeless = CHROMELESS.has(s.view);
  const mode = chromeless ? 'chromeless' : 'app';
  const shell = document.getElementById('mn-shell');

  if(mode !== _mode){ buildSkeleton(mode); _mode = mode; }

  if(chromeless){
    const v = VIEWS[s.view];
    const page = document.getElementById('mn-page');
    page.innerHTML = v.render(ctx);
    v.afterRender?.(ctx, page);
  } else {
    // sidebar + main + bottom (topbar persists to keep search focus)
    document.getElementById('mn-side').innerHTML = sidebarHTML(s);
    document.getElementById('mn-bottom').innerHTML = bottomHTML(s);
    const main = document.getElementById('mn-main');
    const v = VIEWS[s.view] || VIEWS.dashboard;
    main.innerHTML = `<div class="view-anim">${v.render(ctx)}</div>`;
    v.afterRender?.(ctx, main);
    // drawer state
    document.getElementById('mn-side').classList.toggle('open', s.drawerOpen && s.isMobile);
    document.getElementById('mn-scrim').classList.toggle('show', s.drawerOpen && s.isMobile);
  }
  renderModal(s);
}

function buildSkeleton(mode){
  const shell = document.getElementById('mn-shell');
  if(mode === 'chromeless'){ shell.innerHTML = `<div id="mn-page"></div>`; return; }
  shell.innerHTML = `
    ${topbarHTML()}
    <div id="mn-scrim" class="drawer-scrim" data-act="closeDrawer"></div>
    <div class="shell">
      <aside id="mn-side" class="sidebar"></aside>
      <main id="mn-main" class="main"></main>
    </div>
    <nav id="mn-bottom" class="bottomnav"></nav>`;
}

function topbarHTML(){
  return `<header class="topbar">
    <button class="btn icon" data-act="toggleDrawer" title="เมนู">${icon('menu',18)}</button>
    <div class="brand">
      <div class="logo">฿</div>
      <div class="name">บัญชีนวล<small>MONEYNUAL · รายรับรายจ่าย</small></div>
    </div>
    <div class="searchbox field" style="box-shadow:var(--inset-sm)">
      ${icon('search',16)}<input id="mn-search" placeholder="ค้นหารายการ · หมวดหมู่ · บันทึก…" data-input="search" autocomplete="off">
    </div>
    <div class="spacer"></div>
    <button class="btn icon" data-act="cyclePalette" title="สลับโทนสี"><span style="width:18px;height:18px;border-radius:50%;background:linear-gradient(135deg,var(--a1) 50%,var(--a2) 50%);box-shadow:inset 1px 1px 2px rgba(255,255,255,.5)"></span></button>
    <button class="btn icon" data-act="toggleDark" title="โหมดสว่าง/มืด" style="color:var(--d2)">${icon('moon',18)}</button>
    <button class="btn btn-primary" data-act="openAdd" style="height:42px">${icon('plus',16)} <span class="hide-sm">เพิ่มรายการ</span></button>
  </header>`;
}

function sidebarHTML(s){
  const link = (n, active) => `<button class="nav-item ${active?'on':''}" data-act="nav" data-id="${n.id}">
    <span class="tile sm" style="box-shadow:var(--inset-sm)">${icon(n.icon,17)}</span>
    <span class="tx"><b>${n.th}</b><small>${n.en}</small></span>
    ${n.id==='transactions' ? `<span class="count">${s.tx.filter(t=>!t.deleted).length}</span>`:''}
  </button>`;
  const closeBtn = s.isMobile ? `<div class="row between mb14" style="padding:0 4px"><div class="brand"><div class="logo">฿</div><div class="name">บัญชีนวล</div></div><button class="btn icon" data-act="closeDrawer">✕</button></div>`:'';
  const proCard = !Store.isPro() ? `<div class="sidecard">
      <div class="row gap10 center">${icon('crown',20)}<b>อัปเกรดเป็นโปร</b></div>
      <div class="tiny mt6">ซิงก์ออนไลน์ทุกเครื่อง + ใช้ร่วมกันทั้งบ้าน</div>
      <button class="btn block mt14" data-act="nav" data-id="pricing" style="background:#fff;color:var(--d2)">ดูแพ็กเกจ</button>
    </div>` : `<div class="sidecard"><div class="row gap10 center">${icon('crown',20)}<b>แพ็กโปร</b></div><div class="tiny mt6">ซิงก์ออนไลน์เปิดอยู่ · ${Store.state.session?.household?.name||'บ้านของฉัน'}</div></div>`;
  const user = Store.state.session?.user;
  const userRow = `<div class="user-row">
      <div class="avatar gold" style="width:38px;height:38px;border-radius:12px">${(user?.name||'ก').slice(0,1)}</div>
      <div style="flex:1;min-width:0"><b style="font-size:13px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${user?.name||'คุณกานต์'}</b><small class="muted">${Store.isPro()?'แพ็กโปร':'แพ็กฟรี · ออฟไลน์'}</small></div>
      <span class="syncdot ${canSync()?(Store.state.syncing?'busy':'on'):'off'}" title="${canSync()?'ซิงก์ออนไลน์':'ออฟไลน์'}"></span>
    </div>`;
  const logout = Store.loggedIn()
    ? `<button class="nav-item mt6" data-act="logout" style="color:var(--ink2)"><span class="tile sm" style="box-shadow:var(--inset-sm)">${icon('logout',17)}</span><span class="tx"><b>ออกจากระบบ</b></span></button>`
    : `<button class="nav-item mt6" data-act="nav" data-id="login" style="color:var(--d2)"><span class="tile sm" style="box-shadow:var(--inset-sm)">${icon('user',17)}</span><span class="tx"><b>เข้าสู่ระบบ / สมัคร</b></span></button>`;
  return closeBtn
    + NAV.map(n=>link(n, s.view===n.id)).join('')
    + `<div class="small muted mt14 mb10" style="padding:0 6px;letter-spacing:1px;font-weight:700">บัญชี & แพ็กเกจ</div>`
    + NAV2.map(n=>link(n, s.view===n.id)).join('')
    + proCard + userRow + logout;
}

function bottomHTML(s){
  return BOTTOM.map(b=>{
    if(b.fab) return `<button class="fab" data-act="openAdd"><span class="tile">${icon('plus',20)}</span></button>`;
    return `<button class="${s.view===b.id?'on':''}" data-act="nav" data-id="${b.id}"><span class="tile sm">${icon(b.icon,18)}</span>${b.th}</button>`;
  }).join('');
}

// capture uncontrolled modal inputs into form state before a re-render (avoids losing typed values)
function captureForm(s){
  if(!s.form) return;
  const a=document.getElementById('mn-amt'); if(a) s.form.amount=a.value;
  const n=document.getElementById('mn-note'); if(n) s.form.note=n.value;
  const d=document.getElementById('mn-date'); if(d) s.form.date=d.value;
}

// ---------- add/edit transaction modal (global) ----------
function renderModal(s){
  const root = document.getElementById('mn-modal-root');
  if(!s.modal || s.modal.type!=='add'){ if(root.dataset.t==='add'){ root.innerHTML=''; root.dataset.t=''; } if(!s.modal) return; }
  if(s.modal?.type==='add'){
    const f = s.form || {};
    const isExpense = f.type !== 'income';
    const cats = (isExpense ? D.EXPENSE_CATS : D.INCOME_CATS);
    const accs = s.accounts.filter(a=>!a.deleted);
    root.dataset.t='add';
    root.innerHTML = `<div class="modal-backdrop" data-act="closeModalBg">
      <div class="modal">
        <div class="modal-head"><div><div class="muted small b">${f.id?'แก้ไขรายการ':'เพิ่มรายการ'}</div><h2>${isExpense?'รายจ่าย':'รายรับ'}</h2></div>
          <button class="btn icon" data-act="closeModal">${icon('x',16)}</button></div>
        <div class="row gap10 mb18">
          <button class="btn block ${isExpense?'btn-neg':''}" data-act="setType" data-v="expense">รายจ่าย</button>
          <button class="btn block ${!isExpense?'btn-pos':''}" data-act="setType" data-v="income">รายรับ</button>
        </div>
        <label class="lbl">จำนวนเงิน</label>
        <div class="field mb18" style="box-shadow:var(--inset)"><span class="num b" style="font-size:20px;color:var(--d2)">฿</span>
          <input id="mn-amt" class="num" inputmode="decimal" placeholder="0" value="${f.amount||''}" style="font-size:22px;font-weight:700"></div>
        <label class="lbl">หมวดหมู่</label>
        <div class="row wrap gap6 mb18">${cats.map(c=>`<button class="chip ${f.cat===c?'on':''}" data-act="setCat" data-v="${c}">${D.CATS[c].th}</button>`).join('')}</div>
        <div class="row gap10 mb18">
          <div style="flex:1"><label class="lbl">บัญชี</label>
            <div class="row wrap gap6">${accs.map(a=>`<button class="chip ${f.accountId===a.id?'on':''}" data-act="setAcc" data-v="${a.id}">${a.name}</button>`).join('')}</div></div>
        </div>
        <div class="row gap10 mb18">
          <div style="flex:1"><label class="lbl">ประเภท (scope)</label>
            <div class="row wrap gap6">${D.SCOPES.filter(x=>x.id!=='all').map(sc=>`<button class="chip ${f.scope===sc.id?'on':''}" data-act="setScope" data-v="${sc.id}">${sc.th}</button>`).join('')}</div></div>
          <div style="width:140px"><label class="lbl">วันที่</label><div class="field" style="box-shadow:var(--inset-sm)"><input id="mn-date" type="date" value="${f.date||F.isoToday()}" style="font-size:12.5px"></div></div>
        </div>
        <label class="lbl">บันทึก (ไม่บังคับ)</label>
        <div class="field mb18" style="box-shadow:var(--inset-sm)"><input id="mn-note" placeholder="รายละเอียด…" value="${F.esc(f.note||'')}"></div>
        <button class="btn btn-primary block" data-act="saveTx" style="height:48px;font-size:14px">${f.id?'บันทึกการแก้ไข':'บันทึกรายการ'}</button>
      </div></div>`;
  }
}

// ---------- ACTIONS ----------
const ACT = {
  nav:(el)=> navigate(el.dataset.id),
  toggleDrawer:()=> Store.set({ drawerOpen: !Store.state.drawerOpen }),
  closeDrawer:()=> Store.set({ drawerOpen:false }),
  toggleDark: async ()=>{ await Store.setPref('dark', !Store.state.dark); },
  cyclePalette: async ()=>{ const ks=Object.keys(D.PALETTES); const i=ks.indexOf(Store.state.palette); await Store.setPref('palette', ks[(i+1)%ks.length]); toast('โทนสี: '+Store.state.palette); },
  setScopeGlobal:(el)=> Store.set({ scope: el.dataset.v }),
  search:(el)=> Store.update(s=>{ s.search = el.value; }),

  openAdd:()=> Store.set({ drawerOpen:false, modal:{type:'add'}, form:{ type:'expense', cat:'food', accountId:(Store.state.accounts.find(a=>!a.deleted)||{}).id, scope: Store.state.scope==='all'?'personal':Store.state.scope, note:'', date:F.isoToday(), amount:'' } }),
  closeModal:()=> Store.set({ modal:null, form:null }),
  closeModalBg:(el,ev)=>{ if(ev && ev.target.classList.contains('modal-backdrop')) Store.set({ modal:null, form:null }); },
  setType:(el)=> Store.update(s=>{ captureForm(s); s.form.type = el.dataset.v; const list = el.dataset.v==='income'?D.INCOME_CATS:D.EXPENSE_CATS; if(!list.includes(s.form.cat)) s.form.cat=list[0]; }),
  setCat:(el)=> Store.update(s=>{ captureForm(s); s.form.cat = el.dataset.v; }),
  setAcc:(el)=> Store.update(s=>{ captureForm(s); s.form.accountId = el.dataset.v; }),
  setScope:(el)=> Store.update(s=>{ captureForm(s); s.form.scope = el.dataset.v; }),
  async saveTx(){
    const s = Store.state, f = s.form;
    const amt = Math.round(parseFloat((document.getElementById('mn-amt')?.value||'').replace(/,/g,''))||0);
    if(!amt || amt<=0){ toast('กรอกจำนวนเงินก่อนนะ'); return; }
    const rec = { id:f.id, type:f.type, cat:f.cat, amount:amt, accountId:f.accountId, scope:f.scope,
      note: (document.getElementById('mn-note')?.value||'').trim() || D.CATS[f.cat].th, date: document.getElementById('mn-date')?.value || F.isoToday() };
    await Store.upsert('tx', rec);
    Store.set({ modal:null, form:null });
    toast(f.id?'แก้ไขรายการแล้ว':'บันทึกรายการแล้ว ✓');
  },
  async editTx(el){
    const t = Store.state.tx.find(x=>x.id===el.dataset.id); if(!t) return;
    Store.set({ modal:{type:'add'}, form:{ ...t } });
  },
  async delTx(el){
    if(await confirmDialog({ title:'ลบรายการ', message:'ต้องการลบรายการนี้ใช่ไหม? การลบจะซิงก์ไปยังอุปกรณ์อื่นด้วย', ok:'ลบ', danger:true })){
      await Store.remove('tx', el.dataset.id); toast('ลบแล้ว');
    }
  },
  setFilter:(el)=> Store.set({ txFilter: el.dataset.v }),

  async logout(){
    if(await confirmDialog({ title:'ออกจากระบบ', message:'ข้อมูลออฟไลน์บนเครื่องนี้จะยังอยู่ ออกจากระบบใช่ไหม?', ok:'ออกจากระบบ' })){
      setToken(null); await Store.logout(); toast('ออกจากระบบแล้ว');
    }
  },
};

// expose for views that wire their own data-act handlers
export function registerAction(name, fn){ ACT[name] = fn; }
export { ACT, ctx };

function navigate(view){
  if(!VIEWS[view]) view='dashboard';
  Store.set({ view, drawerOpen:false });
  try{ history.replaceState(null,'', '?view='+view); }catch(e){}
  document.getElementById('mn-main')?.scrollTo?.(0,0); window.scrollTo(0,0);
}

// ---------- event delegation ----------
function onEvent(type, attr){
  document.addEventListener(type, ev => {
    const el = ev.target.closest('['+attr+']'); if(!el) return;
    const name = el.getAttribute(attr); const h = ACT[name];
    if(h){ if(type==='submit') ev.preventDefault(); h(el, ev); }
  });
}

// ---------- boot ----------
async function boot(){
  document.getElementById('app').innerHTML = `
    <div class="app-root">
      <div class="lava l1"></div><div class="lava l2"></div><div class="lava l3"></div>
      <div id="mn-shell"></div>
      <div id="mn-modal-root"></div>
    </div>`;
  // delegation
  onEvent('click','data-act');
  onEvent('submit','data-act');
  document.addEventListener('input', ev => { const el = ev.target.closest('[data-input]'); if(el && ACT[el.getAttribute('data-input')]) ACT[el.getAttribute('data-input')](el, ev); });
  document.addEventListener('change', ev => { const el = ev.target.closest('[data-change]'); if(el && ACT[el.getAttribute('data-change')]) ACT[el.getAttribute('data-change')](el, ev); });
  // resize
  let rt; window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>Store.set({ vw: window.innerWidth }), 120); });

  mergeViewActions();
  Store.subscribe(render);
  try{ await db.openDB(); }catch(e){ console.warn('IndexedDB unavailable', e); }
  await Store.boot();
  initSync();

  // restore view from URL
  const params = new URLSearchParams(location.search);
  const vw = params.get('view'); if(vw && VIEWS[vw]) Store.state.view = vw;
  if(params.get('action')==='add'){ ACT.openAdd(); }

  // session → enable sync
  if(Store.loggedIn()){ setToken(Store.state.session.token); if(canSync()) runSync('boot'); }

  render();

  // service worker
  if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('./sw.js'); }catch(e){} }
  // online/offline reflect
  window.addEventListener('online', ()=>Store.set({online:true}));
  window.addEventListener('offline', ()=>Store.set({online:false}));
}

// after-login helper used by login view
ctx.afterLogin = afterLogin;
ctx.api = api; ctx.ApiError = ApiError; ctx.setToken = setToken; ctx.runSync = runSync; ctx.canSync = canSync;

boot();
