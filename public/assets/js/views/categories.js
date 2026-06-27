// views/categories.js — catalogue of categories with totals for the current scope (read-only analytics)
import { barChart } from '../charts.js';

const KIND_META = {
  'รายจ่าย': { badge:'neg', sign:-1 },
  'รายรับ':  { badge:'pos', sign:1 },
  'ทั่วไป':  { badge:'',    sign:0 },
};

export function render(ctx){
  const { state:s, sel, fmt, fmtK, fmtNum, icon, D, scopeName } = ctx;

  // totals + count per category from the scoped transactions
  const txf = sel.scopedTx(s);
  const agg = {};
  for(const c of Object.keys(D.CATS)) agg[c] = { amount:0, count:0 };
  for(const t of txf){ if(agg[t.cat]){ agg[t.cat].amount += t.amount; agg[t.cat].count += 1; } }

  // sort: expense cats (in EXPENSE_CATS order) first, then income cats, then any stragglers
  const seen = new Set();
  const order = [];
  for(const c of D.EXPENSE_CATS){ if(D.CATS[c] && !seen.has(c)){ order.push(c); seen.add(c); } }
  for(const c of D.INCOME_CATS){ if(D.CATS[c] && !seen.has(c)){ order.push(c); seen.add(c); } }
  for(const c of Object.keys(D.CATS)){ if(!seen.has(c)){ order.push(c); seen.add(c); } }

  // headline numbers
  const usedCount = order.filter(c => agg[c].count > 0).length;
  const totalTracked = txf.length;

  // top-spend bar chart from byCategory (expenses only)
  const byCat = sel.byCategory(s);
  const topBars = byCat.slice(0, 6).map(r => ({ label: shortLabel(r.th), value: r.amount, color: r.color }));
  const topSummary = byCat.length
    ? `จ่ายมากสุด · <b class="t-neg">${ctx.esc(byCat[0].th)}</b> ${fmtK(byCat[0].amount)}`
    : 'ยังไม่มีรายจ่ายในขอบเขตนี้';

  const card = (c) => {
    const cat = D.CATS[c];
    const meta = KIND_META[cat.kind] || KIND_META['ทั่วไป'];
    const a = agg[c];
    const has = a.count > 0;
    const amtCls = meta.sign < 0 ? 'neg' : meta.sign > 0 ? 'pos' : '';
    const sign = !has || meta.sign === 0 ? '' : meta.sign < 0 ? '-' : '+';
    const badge = `<span class="badge ${meta.badge}">${cat.kind}</span>`;
    return `<div class="panel" style="display:flex;flex-direction:column;gap:14px">
      <div class="row between" style="align-items:flex-start">
        <span class="tile" style="width:46px;height:46px;border-radius:14px;background:${cat.tint};color:${cat.color};box-shadow:var(--inset-sm)">${icon(cat.icon || 'tag', 22)}</span>
        ${badge}
      </div>
      <div>
        <div class="b" style="font-size:15px">${cat.th}</div>
        <div class="muted small" style="margin-top:2px">${has ? `${fmtNum(a.count)} รายการ` : 'ยังไม่มีรายการ'}</div>
      </div>
      <div class="row between" style="align-items:flex-end;margin-top:auto">
        <span class="num ${amtCls}" style="font-size:21px;font-weight:800;letter-spacing:-.5px">${sign}${fmt(a.amount)}</span>
        <span class="muted small num">${fmtK(a.amount)}</span>
      </div>
    </div>`;
  };

  const topPanel = topBars.length ? `
    <div class="panel mb18">
      <div class="row between mb14">
        <h3 style="margin:0">หมวดที่ใช้จ่ายสูงสุด</h3>
        <button class="btn sm" data-act="nav" data-id="report">ดูรายงาน</button>
      </div>
      ${barChart(topBars, { h:150 })}
      <div class="muted small mt14">${topSummary}</div>
    </div>` : '';

  const grid = order.length ? `<div class="grid g-auto">${order.map(card).join('')}</div>` : `
    <div class="empty"><div class="tile">${icon('tag', 28)}</div>
      <h3>ยังไม่มีหมวดหมู่</h3>
      <p class="muted small">เพิ่มรายการเพื่อเริ่มจัดหมวดหมู่การเงินของคุณ</p>
    </div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">CATEGORIES · หมวดหมู่</div>
    <h1>หมวดหมู่</h1>
    <div class="sub">สรุปยอดและจำนวนรายการแต่ละหมวด · ขอบเขต ${scopeName(s.scope)} · ใช้งานแล้ว ${usedCount}/${order.length} หมวด จาก ${fmtNum(totalTracked)} รายการ</div>
  </div>

  ${topPanel}
  ${grid}`;
}

// trim long Thai category names so bar labels stay tidy
function shortLabel(th){
  const cut = th.split(/[&/]/)[0].trim();
  return cut.length > 8 ? cut.slice(0, 8) + '…' : cut;
}
