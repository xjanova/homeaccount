// views/dashboard.js — overview: scope switcher, KPIs, line + donut charts, budgets, recent
import { lineChart, donutStyle } from '../charts.js';

export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, CATS, fmtDate, greeting, monthLabel, D } = ctx;
  const t = sel.totals(s);
  const user = s.session?.user?.name || 'คุณกานต์';
  const series = sel.monthSeries(s);
  const dn = sel.donut(s);
  const buds = sel.budgetRows(s).slice(0,4);
  const recent = sel.recentTx(s, 6);
  const now = new Date();

  const scopeChips = D.SCOPES.map(sc =>
    `<button class="chip ${s.scope===sc.id?'on':''}" data-act="setScopeGlobal" data-v="${sc.id}">${icon(sc.icon,14)} ${sc.th}</button>`).join('');

  const kpi = (lab, val, hint, cls, ic) => `<div class="kpi">
    <div class="top"><span class="lab">${lab}</span><span class="tile sm" style="box-shadow:var(--inset-sm);color:var(--d2)">${icon(ic,16)}</span></div>
    <div class="val ${cls||''} num">${val}</div><div class="hint">${hint}</div></div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">ภาพรวม · ${ctx.scopeName(s.scope)} · ${monthLabel(now.getMonth(), now.getFullYear())}</div>
    <h1>${greeting()} ${user} <span style="color:var(--a2)">✷</span></h1>
  </div>

  <div class="row wrap gap6 mb18">${scopeChips}</div>

  <div class="grid g-kpi mb18">
    ${kpi('รายรับเดือนนี้', fmt(t.income), `${s.tx.filter(x=>!x.deleted&&x.type==='income'&&(s.scope==='all'||x.scope===s.scope)).length} รายการรับ`, 'pos', 'trend')}
    ${kpi('รายจ่ายเดือนนี้', fmt(t.expense), `${s.tx.filter(x=>!x.deleted&&x.type==='expense'&&(s.scope==='all'||x.scope===s.scope)).length} รายการจ่าย`, 'neg', 'list')}
    ${kpi('คงเหลือสุทธิ', fmt(t.balance), t.balance>=0?'การเงินเป็นบวก ดีมาก!':'ใช้เกินรายรับ', t.balance>=0?'pos':'neg', 'wallet')}
    ${kpi('งบคงเหลือ', fmt(t.budgetLeft), `จากงบ ${fmtK(t.totalBudget)}`, t.budgetLeft>=0?'':'neg', 'budget')}
  </div>

  <div class="grid g-charts mb18">
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">รายรับ vs รายจ่าย</h3>
        <div class="row gap14 small"><span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--pos);display:inline-block"></i>รายรับ</span>
        <span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--neg);display:inline-block"></i>รายจ่าย</span></div></div>
      <div style="height:190px">${lineChart(series)}</div>
      <div class="muted small mt10">6 เดือนล่าสุด · เดือนนี้ รายรับ ${fmtK(t.income)} · รายจ่าย ${fmtK(t.expense)}</div>
    </div>
    <div class="panel">
      <h3>รายจ่ายตามหมวด</h3>
      <div class="donut-wrap mb14">
        <div class="donut" style="${donutStyle(dn.rows)}">
          <div style="width:104px;height:104px;border-radius:50%;background:var(--surf);box-shadow:var(--raise);display:grid;place-items:center;text-align:center">
            <div><div class="num b" style="font-size:18px">${fmtK(dn.total)}</div><div class="muted" style="font-size:9.5px">รวมจ่าย</div></div>
          </div>
        </div>
      </div>
      <div class="legend">${dn.rows.slice(0,5).map(r=>`<div class="it"><span class="dot" style="background:${r.color}"></span><span style="flex:1">${r.th}</span><b class="num">${r.pct.toFixed(0)}%</b></div>`).join('') || '<div class="muted small">ยังไม่มีรายจ่าย</div>'}</div>
    </div>
  </div>

  <div class="grid g-split">
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">งบประมาณ</h3><button class="btn sm" data-act="nav" data-id="budgets">ดูทั้งหมด</button></div>
      ${buds.map(b=>`<div class="mb14">
        <div class="row between small mb10"><span class="b">${b.th}</span><span class="num ${b.status==='over'?'t-neg':''}">${fmt(b.used)} / ${fmtK(b.limit)}</span></div>
        <div class="progress"><i style="width:${b.pct}%;background:${b.status==='over'?'var(--neg)':b.status==='near'?'linear-gradient(90deg,var(--a2),var(--neg))':'linear-gradient(90deg,var(--a1),var(--a2))'}"></i></div>
      </div>`).join('') || '<div class="muted small">ยังไม่มีงบประมาณ</div>'}
    </div>
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">รายการล่าสุด</h3><button class="btn sm" data-act="nav" data-id="transactions">ดูทั้งหมด</button></div>
      ${recent.map(tx=>{
        const c = CATS[tx.cat]||{}; const inc = tx.type==='income';
        return `<div class="tx-row">
          <span class="tile sm" style="background:${c.tint};color:${c.color};box-shadow:var(--inset-sm)">${icon(c.icon||'tag',16)}</span>
          <div class="desc"><b>${ctx.esc(tx.note)}</b><small>${c.th||tx.cat} · ${fmtDate(tx.date)}</small></div>
          <span class="tx-amt ${inc?'pos':'neg'} num">${inc?'+':'-'}${fmt(tx.amount)}</span>
        </div>`;
      }).join('') || '<div class="empty"><div class="tile">'+icon('list',26)+'</div><h3>ยังไม่มีรายการ</h3><p class="muted small">กดปุ่ม “เพิ่มรายการ” เพื่อเริ่มบันทึก</p></div>'}
    </div>
  </div>`;
}
