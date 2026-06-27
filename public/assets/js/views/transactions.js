// views/transactions.js — full transaction list with scope + filter + search
export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, CATS, fmtDate, esc, scopeName } = ctx;

  // account lookup for the account-name column
  const accName = {};
  for(const a of s.accounts) accName[a.id] = a.name;

  // 1) scope-aware base list
  let rows = sel.scopedTx(s);

  // 2) type filter (global setFilter action keeps state.txFilter)
  const filter = s.txFilter || 'all';
  if(filter !== 'all') rows = rows.filter(t => t.type === filter);

  // 3) free-text search across note / category th / account name (case-insensitive)
  const q = (s.search || '').trim().toLowerCase();
  if(q){
    rows = rows.filter(t => {
      const cTh = (CATS[t.cat]?.th || t.cat || '');
      const acc = (accName[t.accountId] || '');
      return (t.note || '').toLowerCase().includes(q)
          || cTh.toLowerCase().includes(q)
          || acc.toLowerCase().includes(q);
    });
  }

  // 4) sort by date desc, tie-break on updatedAt
  rows = rows.slice().sort((a,b)=> (b.date>a.date?1:b.date<a.date?-1:0) || (b.updatedAt||0)-(a.updatedAt||0));

  // filtered totals (always over the scope + search result, regardless of which type tab)
  const fIncome = rows.filter(t=>t.type==='income').reduce((a,t)=>a+t.amount,0);
  const fExpense = rows.filter(t=>t.type==='expense').reduce((a,t)=>a+t.amount,0);
  const net = fIncome - fExpense;

  const chip = (v, label) =>
    `<button class="chip ${filter===v?'on':''}" data-act="setFilter" data-v="${v}">${label}</button>`;

  const head = `
  <div class="page-head">
    <div class="eyebrow">รายการ · ${esc(scopeName(s.scope))}</div>
    <h1>รายการทั้งหมด</h1>
    <div class="sub">${rows.length} รายการ · สุทธิ <span class="num ${net>=0?'t-pos':'t-neg'}">${net>=0?'+':'-'}${fmt(Math.abs(net))}</span></div>
  </div>`;

  const filterRow = `
  <div class="row between wrap gap14 mb18">
    <div class="row wrap gap6">
      ${chip('all','ทั้งหมด')}
      ${chip('income','รายรับ')}
      ${chip('expense','รายจ่าย')}
    </div>
    <div class="row gap14 small">
      <span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--pos);display:inline-block"></i>รายรับ <b class="num t-pos">${fmtK(fIncome)}</b></span>
      <span class="row gap6"><i style="width:9px;height:9px;border-radius:50%;background:var(--neg);display:inline-block"></i>รายจ่าย <b class="num t-neg">${fmtK(fExpense)}</b></span>
    </div>
  </div>`;

  // empty state
  if(!rows.length){
    const msg = q
      ? `ไม่พบรายการที่ตรงกับ “${esc(s.search)}”`
      : 'ลองเปลี่ยนตัวกรอง หรือกดปุ่ม “เพิ่มรายการ” เพื่อเริ่มบันทึก';
    return `${head}${filterRow}
    <div class="empty">
      <div class="tile">${icon('search',26)}</div>
      <h3>ยังไม่มีรายการ</h3>
      <p class="muted small">${msg}</p>
    </div>`;
  }

  const thead = `
  <div class="thead">
    <span>รายการ</span>
    <span class="tx-mid">หมวดหมู่</span>
    <span class="tx-mid">บัญชี</span>
    <span class="tx-mid">วันที่</span>
    <span class="right">จำนวนเงิน</span>
    <span></span>
  </div>`;

  const body = rows.map(tx => {
    const c = CATS[tx.cat] || {};
    const inc = tx.type === 'income';
    return `<div class="trow" data-act="editTx" data-id="${esc(tx.id)}" style="cursor:pointer">
      <div class="row gap10" style="min-width:0">
        <span class="tile sm" style="background:${c.tint||'var(--surf)'};color:${c.color||'var(--ink2)'};box-shadow:var(--inset-sm)">${icon(c.icon||'tag',16)}</span>
        <div class="desc" style="min-width:0">
          <b>${esc(tx.note) || (c.th||tx.cat)}</b>
          <small>${esc(scopeName(tx.scope))}</small>
        </div>
      </div>
      <span class="tx-mid small">${esc(c.th || tx.cat)}</span>
      <span class="tx-mid small muted">${esc(accName[tx.accountId] || '—')}</span>
      <span class="tx-mid small muted nowrap">${fmtDate(tx.date)}</span>
      <span class="tx-amt ${inc?'pos':'neg'} num right">${inc?'+':'-'}${fmt(tx.amount)}</span>
      <button class="btn icon sm" data-act="delTx" data-id="${esc(tx.id)}" title="ลบรายการ" aria-label="ลบรายการ">${icon('trash',16)}</button>
    </div>`;
  }).join('');

  return `${head}${filterRow}
  <div class="panel">
    <div class="table">
      ${thead}
      ${body}
    </div>
  </div>`;
}
