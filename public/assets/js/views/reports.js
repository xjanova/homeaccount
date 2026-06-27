// views/reports.js — analytics: net cash flow bars + income/expense trend + savings stats + CSV export
import { barChart, lineChart } from '../charts.js';
import { Store } from '../state.js';
import { toast } from '../ui.js';
import { CATS, scopeName } from '../data.js';

export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, esc, scopeName:scName, monthLabel } = ctx;
  const stats = sel.reportStats(s);
  const series = sel.monthSeries(s);
  const cats = sel.byCategory(s);
  const catTotal = cats.reduce((a,c)=>a+c.amount, 0) || 1;
  const top = cats.slice(0,5);
  const now = new Date();

  const net = series.map(m => ({ label:m.label, value:m.inc - m.exp }));
  const netNow = net[net.length-1]?.value || 0;

  const scopeChips = ctx.D.SCOPES.map(sc =>
    `<button class="chip ${s.scope===sc.id?'on':''}" data-act="setScopeGlobal" data-v="${sc.id}">${icon(sc.icon,14)} ${sc.th}</button>`).join('');

  const kpi = (lab, val, hint, cls, ic) => `<div class="kpi">
    <div class="top"><span class="lab">${lab}</span><span class="tile sm" style="box-shadow:var(--inset-sm);color:var(--d2)">${icon(ic,16)}</span></div>
    <div class="val ${cls||''} num">${val}</div><div class="hint">${hint}</div></div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">REPORTS · รายงาน · ${scName(s.scope)} · ${monthLabel(now.getMonth(), now.getFullYear())}</div>
    <h1>รายงาน & สถิติ</h1>
    <div class="sub">วิเคราะห์กระแสเงินสด อัตราการออม และส่งออกข้อมูลของคุณ</div>
  </div>

  <div class="row wrap gap6 mb18">${scopeChips}</div>

  <div class="grid g-charts mb18">
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">กระแสเงินสดสุทธิ</h3>
        <div class="row gap14 small">
          <span class="row gap6"><i style="width:9px;height:9px;border-radius:3px;background:linear-gradient(180deg,var(--a1),var(--a2));display:inline-block"></i>เป็นบวก</span>
          <span class="row gap6"><i style="width:9px;height:9px;border-radius:3px;background:var(--neg);display:inline-block"></i>ติดลบ</span>
        </div>
      </div>
      <div style="margin:6px 0">${barChart(net, { h:160 })}</div>
      <div class="muted small mt10">6 เดือนล่าสุด · เดือนนี้สุทธิ <b class="num ${netNow>=0?'t-pos':'t-neg'}">${fmt(netNow)}</b></div>
    </div>
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">รายรับ vs รายจ่าย</h3>
        <div class="row gap14 small">
          <span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--pos);display:inline-block"></i>รายรับ</span>
          <span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--neg);display:inline-block"></i>รายจ่าย</span>
        </div>
      </div>
      <div style="height:170px">${lineChart(series)}</div>
      <div class="muted small mt10">เดือนนี้ รายรับ ${fmtK(stats.income)} · รายจ่าย ${fmtK(stats.expense)}</div>
    </div>
  </div>

  <div class="grid g-kpi mb18">
    ${kpi('อัตราการออม', stats.savingRate.toFixed(0)+'%', stats.savingRate>=20?'เก็บออมได้ดีเยี่ยม!':stats.savingRate>0?'ออมได้บ้าง ลองเพิ่มอีกนิด':'ยังไม่มีเงินเหลือออม', stats.savingRate>=20?'pos':stats.savingRate>0?'':'neg', 'target')}
    ${kpi('จ่ายเฉลี่ย/วัน', fmt(stats.avgPerDay), 'คิดจากรายจ่ายเดือนนี้ ÷ 30 วัน', '', 'price')}
    ${kpi('จำนวนรายการ', ctx.fmtNum(stats.count), 'รายการในมุมมอง '+scName(s.scope), '', 'list')}
    ${kpi('คงเหลือสุทธิ', fmt(stats.balance), stats.balance>=0?'รายรับมากกว่ารายจ่าย':'ใช้เกินรายรับ', stats.balance>=0?'pos':'neg', 'wallet')}
  </div>

  <div class="grid g-split">
    <div class="panel">
      <div class="row between mb14"><h3 style="margin:0">หมวดที่ใช้จ่ายมากสุด</h3><button class="btn sm" data-act="nav" data-id="categories">ดูทั้งหมด</button></div>
      ${top.length ? top.map(r => {
        const pct = r.amount / catTotal * 100;
        return `<div class="mb14">
          <div class="row between small mb10">
            <span class="row gap6"><span class="dot" style="background:${r.color};width:11px;height:11px;border-radius:50%;display:inline-block"></span><b>${esc(r.th)}</b></span>
            <span class="num">${fmt(r.amount)} <span class="muted">· ${pct.toFixed(0)}%</span></span>
          </div>
          <div class="progress"><i style="width:${pct.toFixed(1)}%;background:linear-gradient(90deg,var(--a1),var(--a2))"></i></div>
        </div>`;
      }).join('') : '<div class="empty"><div class="tile">'+icon('report',26)+'</div><h3>ยังไม่มีรายจ่าย</h3><p class="muted small">เพิ่มรายการเพื่อดูสถิติการใช้จ่าย</p></div>'}
    </div>

    <div class="panel">
      <h3>ส่งออกข้อมูล</h3>
      <p class="muted small mb18" style="line-height:1.6">ดาวน์โหลดรายการทั้งหมดเป็นไฟล์ เพื่อเก็บสำรอง หรือเปิดใน Excel / Google Sheets</p>
      <div class="row gap10 wrap">
        <button class="btn btn-primary block" data-act="exportCsv" style="flex:1;min-width:160px;height:46px">${icon('download',16)} ส่งออก CSV</button>
        <button class="btn block" data-act="exportPdfTeaser" style="flex:1;min-width:160px;height:46px;color:var(--ink2)" title="ฟีเจอร์แพ็กโปร">${icon('lock',15)} ส่งออก PDF <span class="badge" style="margin-left:4px">โปร</span></button>
      </div>
      <div class="inset-sm mt18" style="border-radius:14px;padding:14px 16px">
        <div class="row between small">
          <span class="muted">รายการทั้งหมดที่จะส่งออก</span>
          <b class="num">${ctx.fmtNum(s.tx.filter(t=>!t.deleted).length)}</b>
        </div>
        <div class="row between small mt10">
          <span class="muted">รูปแบบไฟล์</span>
          <b>CSV · UTF-8 (BOM)</b>
        </div>
      </div>
      <div class="row gap6 mt14 muted small center">${icon('crown',14)} ส่งออก Excel / PDF ปลดล็อกในแพ็กโปร</div>
    </div>
  </div>`;
}

// CSV cell escaping per RFC 4180: wrap in quotes, double any inner quotes.
function csvCell(v){
  const s = String(v == null ? '' : v);
  return '"' + s.replace(/"/g, '""') + '"';
}
// Free-text cells only: neutralise spreadsheet formula injection. A leading
// =,+,-,@ can execute when opened in Excel/Sheets, so prefix a guard apostrophe.
function csvText(v){
  let s = String(v == null ? '' : v);
  if(/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return csvCell(s);
}

export const actions = {
  exportCsv(){
    const rows = Store.state.tx
      .filter(t => !t.deleted)
      .slice()
      .sort((a,b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : (b.updatedAt||0)-(a.updatedAt||0)));

    if(!rows.length){ toast('ยังไม่มีรายการให้ส่งออก'); return; }

    const accName = id => (Store.state.accounts.find(a => a.id === id)?.name) || '';
    const header = ['วันที่','ประเภท','หมวด','บัญชี','จำนวน','บันทึก'];

    const lines = [ header.map(csvCell).join(',') ];
    for(const t of rows){
      lines.push([
        csvCell(t.date || ''),
        csvCell(t.type === 'income' ? 'รายรับ' : 'รายจ่าย'),
        csvCell(CATS[t.cat]?.th || t.cat || ''),
        csvText(accName(t.accountId)),
        csvCell((t.type === 'income' ? '' : '-') + Math.abs(Math.round(t.amount||0))),
        csvText(t.note || '')
      ].join(','));
    }

    // ﻿ BOM so Thai text renders correctly when opened in Excel.
    const csv = '﻿' + lines.join('\r\n') + '\r\n';
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0,10);
    a.href = url;
    a.download = `moneynual-${stamp}.csv`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    toast(`ส่งออก ${rows.length} รายการแล้ว ✓`);
  },

  exportPdfTeaser(){
    toast('ส่งออก PDF เป็นฟีเจอร์ของแพ็กโปร');
  },
};
