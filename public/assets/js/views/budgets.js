// views/budgets.js — budget per expense category: KPIs, progress cards, editable limits
import { Store } from '../state.js';
import { toast } from '../ui.js';

const STATUS = {
  ok:   { th:'อยู่ในงบ',  cls:'pos', fill:'linear-gradient(90deg,var(--a1),var(--a2))' },
  near: { th:'ใกล้เต็ม',  cls:'',    fill:'linear-gradient(90deg,var(--a2),var(--neg))' },
  over: { th:'เกินงบ',    cls:'neg', fill:'var(--neg)' },
};

export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, esc, CATS } = ctx;
  const t = sel.totals(s);
  const rows = sel.budgetRows(s);

  const totalSpent = rows.reduce((a,r)=>a+r.used,0);
  const overCount  = rows.filter(r=>r.status==='over').length;
  const remaining  = t.totalBudget - totalSpent;

  const kpi = (lab, val, hint, cls, ic) => `<div class="kpi">
    <div class="top"><span class="lab">${lab}</span><span class="tile sm" style="box-shadow:var(--inset-sm);color:var(--d2)">${icon(ic,16)}</span></div>
    <div class="val ${cls||''} num">${val}</div><div class="hint">${hint}</div></div>`;

  const cards = rows.map(b=>{
    const c = CATS[b.cat] || {};
    const st = STATUS[b.status] || STATUS.ok;
    return `<div class="panel">
      <div class="row between mb14">
        <div class="row gap10">
          <span class="tile sm" style="background:${c.tint};color:${c.color};box-shadow:var(--inset-sm)">${icon(c.icon||'tag',18)}</span>
          <div><div class="b">${esc(b.th)}</div><div class="muted small">${b.ratio>0?(b.ratio*100).toFixed(0):'0'}% ของงบ</div></div>
        </div>
        <button class="btn icon sm" data-act="openBudgetEdit" data-id="${b.cat}" title="ตั้งงบ">${icon('edit',16)}</button>
      </div>
      <div class="row between small mb10">
        <span class="muted">ใช้ไป</span>
        <span class="num ${b.status==='over'?'t-neg':''}">${fmt(b.used)} <span class="muted">/ ${fmtK(b.limit)}</span></span>
      </div>
      <div class="progress mb14"><i style="width:${b.pct}%;background:${st.fill}"></i></div>
      <div class="row between">
        <span class="badge ${st.cls}">${st.th}</span>
        <span class="num small ${b.limit-b.used>=0?'t-pos':'t-neg'}">${b.limit-b.used>=0?'เหลือ ':'เกิน '}${fmt(Math.abs(b.limit-b.used))}</span>
      </div>
    </div>`;
  }).join('');

  const grid = rows.length
    ? `<div class="grid g-auto">${cards}</div>`
    : `<div class="empty"><div class="tile">${icon('budget',26)}</div><h3>ยังไม่มีงบประมาณ</h3><p class="muted small">ตั้งงบให้แต่ละหมวดเพื่อคุมรายจ่ายให้อยู่หมัด</p></div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">BUDGETS · งบประมาณ</div>
    <h1>งบประมาณรายหมวด</h1>
    <div class="sub">ตั้งวงเงินแต่ละหมวดรายจ่าย แล้วติดตามว่าใช้ไปแค่ไหนแบบเรียลไทม์ · ${ctx.scopeName(s.scope)}</div>
  </div>

  <div class="grid g-kpi mb18">
    ${kpi('งบรวมทั้งหมด', fmt(t.totalBudget), `${rows.length} หมวดที่ตั้งงบไว้`, '', 'budget')}
    ${kpi('ใช้ไปแล้ว', fmt(totalSpent), t.totalBudget>0?`คิดเป็น ${(totalSpent/t.totalBudget*100).toFixed(0)}% ของงบ`:'ยังไม่มีงบ', 'neg', 'list')}
    ${kpi('คงเหลือในงบ', fmt(remaining), remaining>=0?'ยังอยู่ในกรอบงบ':'ใช้เกินงบที่ตั้งไว้', remaining>=0?'pos':'neg', 'wallet')}
    ${kpi('หมวดที่เกินงบ', String(overCount), overCount>0?'ควรลดรายจ่ายหมวดนี้':'เยี่ยม! ทุกหมวดอยู่ในงบ', overCount>0?'neg':'pos', 'shield')}
  </div>

  ${grid}
  ${renderModal(ctx)}`;
}

function renderModal(ctx){
  const { state:s, icon, CATS, fmtK } = ctx;
  const m = s.modal;
  if(!m || m.type !== 'budget') return '';
  const cat = m.cat;
  const c = CATS[cat] || {};
  const cur = s.budgets[cat] || 0;
  return `<div class="modal-backdrop" data-act="closeBudgetBg">
    <div class="modal">
      <div class="modal-head">
        <div>
          <div class="muted small b">ตั้งงบประมาณ</div>
          <h2><span class="row gap10"><span class="tile sm" style="background:${c.tint};color:${c.color};box-shadow:var(--inset-sm)">${icon(c.icon||'tag',18)}</span>${c.th||cat}</span></h2>
        </div>
        <button class="btn icon" data-act="closeBudgetBg">${icon('x',16)}</button>
      </div>
      <label class="lbl">วงเงินต่อเดือน</label>
      <div class="field mb18" style="box-shadow:var(--inset)">
        <span class="num b" style="font-size:20px;color:var(--d2)">฿</span>
        <input id="mn-bud" class="num" inputmode="numeric" placeholder="0" value="${cur||''}" style="font-size:22px;font-weight:700">
      </div>
      <div class="muted small mb18">ตั้งเป็น 0 เพื่อยกเลิกงบของหมวดนี้ · งบปัจจุบัน ${fmtK(cur)}</div>
      <button class="btn btn-primary block" data-act="saveBudget" data-id="${cat}" style="height:48px;font-size:14px">บันทึกงบประมาณ</button>
    </div>
  </div>`;
}

export function afterRender(ctx, root){
  const inp = root.querySelector('#mn-bud');
  if(inp){ inp.focus(); inp.select(); }
}

export const actions = {
  openBudgetEdit(el){
    Store.set({ modal:{ type:'budget', cat: el.dataset.id } });
  },
  closeBudgetBg(el, ev){
    // el is the element carrying data-act: the backdrop OR the explicit close button.
    // Backdrop: only close when the click landed on the backdrop itself, not a child.
    // Close button: el is not the backdrop, so always close.
    const isBackdrop = el.classList.contains('modal-backdrop');
    if(!isBackdrop || !ev || ev.target === el){
      Store.set({ modal:null });
    }
  },
  async saveBudget(el){
    const cat = el.dataset.id || Store.state.modal?.cat;
    if(!cat){ Store.set({ modal:null }); return; }
    const raw = (document.getElementById('mn-bud')?.value || '').replace(/[, ]/g,'');
    let amount = Math.round(Number(raw));
    if(!Number.isFinite(amount) || amount < 0) amount = 0;
    await Store.setPref('budgets', { ...Store.state.budgets, [cat]: amount });
    Store.set({ modal:null });
    toast(amount > 0 ? 'ตั้งงบประมาณแล้ว ✓' : 'ยกเลิกงบหมวดนี้แล้ว');
  },
};
