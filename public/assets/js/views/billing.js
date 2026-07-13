// views/billing.js — billing overview: current plan, payment method, tax info, invoice history
import { Store } from '../state.js';
import { toast } from '../ui.js';
import { kvGet, kvSet } from '../db.js';
import { INVOICES_DEMO } from '../data.js';
import { fmt as fmtMoney, fmtDate as fmtDateTh, esc as escT } from '../format.js';

// best-effort live invoices fetched in afterRender; rendered when present
let _serverInvoices = null;
let _fetchedFor = null; // session token we already fetched for (avoid refetch loops)

// tax / billing profile (persisted in IndexedDB kv). null until loaded.
let _taxInfo = null;
let _taxLoaded = false;

// add 1 month / 1 year to today → ISO yyyy-mm-dd (clamps month overflow naturally)
function nextRenewalISO(cycle){
  const d = new Date();
  if(cycle === 'yearly') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export function render(ctx){
  const { state:s, fmt, fmtK, icon, esc, fmtDate, PLANS, D } = ctx;
  const isPro = ctx.S.isPro();
  const cycle = s.billingCycle === 'monthly' ? 'monthly' : 'yearly';
  const plan = isPro ? PLANS.pro : PLANS.free;
  const price = isPro ? (cycle === 'yearly' ? plan.yearly : plan.monthly) : 0;
  const cycleTh = cycle === 'yearly' ? 'รายปี' : 'รายเดือน';
  const perTh = cycle === 'yearly' ? '/ปี' : '/เดือน';
  const seats = s.session?.household?.seats || (isPro ? 5 : 1);
  const renewISO = nextRenewalISO(cycle);
  const ownerName = s.session?.user?.name || 'คุณกานต์';
  const ownerEmail = s.session?.user?.email || 'kan@moneynual.app';

  // invoices: prefer live server data when available, else demo
  const invoices = (_serverInvoices && _serverInvoices.length) ? _serverInvoices : D.INVOICES_DEMO;

  // ---- upsell (free plan only) ----
  const upsell = !isPro ? `
    <div class="panel gold-soft mb18">
      <div class="row between wrap gap14">
        <div class="row gap14">
          <span class="tile gold">${icon('crown',22)}</span>
          <div>
            <div class="b" style="font-size:15px">คุณกำลังใช้แพ็กฟรี</div>
            <div class="muted small mt6">อัปเกรดเป็นโปรเพื่อซิงก์ออนไลน์ทุกเครื่อง ใช้ร่วมกันทั้งบ้าน และส่งออกรายงาน</div>
          </div>
        </div>
        <button class="btn btn-primary" data-act="nav" data-id="pricing">${icon('crown',16)} อัปเกรด</button>
      </div>
    </div>` : '';

  // ---- current plan card (gold gradient when pro) ----
  const planCard = `
    <div class="panel ${isPro ? 'gold' : ''} mb18" style="${isPro ? 'box-shadow:var(--card)' : ''}">
      <div class="row between wrap gap14">
        <div class="row gap14">
          <span class="tile md ${isPro ? '' : 'gold'}" style="${isPro ? 'background:rgba(255,255,255,.18);color:#fff' : ''}">${icon('crown',22)}</span>
          <div>
            <div class="muted small ${isPro ? '' : ''}" style="${isPro ? 'color:rgba(255,255,255,.8)' : ''};letter-spacing:.5px;font-weight:700">แพ็กเกจปัจจุบัน</div>
            <div class="b" style="font-size:20px;${isPro ? 'color:#fff' : ''}">แพ็ก${esc(plan.name)} · ${cycleTh}</div>
          </div>
        </div>
        <div class="right">
          <div class="num b" style="font-size:30px;letter-spacing:-1px;${isPro ? 'color:#fff' : ''}">${fmt(price)}<span style="font-size:15px;font-weight:600;opacity:.8">${isPro ? perTh : ''}</span></div>
        </div>
      </div>
      <div class="row wrap gap18 mt18" style="${isPro ? 'color:rgba(255,255,255,.92)' : ''}">
        <div>
          <div class="small" style="${isPro ? 'color:rgba(255,255,255,.7)' : 'color:var(--ink2)'}">ต่ออายุครั้งถัดไป</div>
          <div class="b mt6" style="${isPro ? 'color:#fff' : ''}">${isPro ? esc(fmtDate(renewISO)) : 'ไม่มีการเรียกเก็บ'}</div>
        </div>
        <div>
          <div class="small" style="${isPro ? 'color:rgba(255,255,255,.7)' : 'color:var(--ink2)'}">ที่นั่งสมาชิก</div>
          <div class="b num mt6" style="${isPro ? 'color:#fff' : ''}">${seats} ที่นั่ง</div>
        </div>
        <div>
          <div class="small" style="${isPro ? 'color:rgba(255,255,255,.7)' : 'color:var(--ink2)'}">รอบบิล</div>
          <div class="b mt6" style="${isPro ? 'color:#fff' : ''}">${cycleTh}</div>
        </div>
      </div>
      <div class="row gap10 mt18">
        ${isPro
          ? `<button class="btn" data-act="nav" data-id="pricing" style="background:#fff;color:var(--d2)">เปลี่ยนแพ็กเกจ</button>
             <button class="btn btn-ghost" data-act="cancelSub" style="color:rgba(255,255,255,.9)">ยกเลิกการต่ออายุ</button>`
          : `<button class="btn btn-primary" data-act="nav" data-id="pricing">${icon('crown',16)} อัปเกรดเป็นโปร</button>`}
      </div>
    </div>`;

  // ---- payment method + tax info (split) ----
  const tax = _taxInfo || {};
  const taxName  = tax.name  || ownerName;
  const taxId    = tax.taxId || '';
  const taxEmail = tax.email || ownerEmail;

  const detailPanels = `
    <div class="grid g-split mb18">
      <div class="panel">
        <h3>การชำระเงิน</h3>
        <div class="row gap14" style="align-items:flex-start">
          <span class="tile md gold">${icon('shield',22)}</span>
          <div>
            <div class="b" style="font-size:14px">${isPro ? 'แพ็กโปร · '+cycleTh : 'แพ็กฟรี'}</div>
            <div class="muted small mt6">โหมดสาธิต — ยังไม่ได้เชื่อมต่อช่องทางชำระเงินจริง จึงยังไม่มีการเรียกเก็บเงินใดๆ</div>
          </div>
        </div>
        <button class="btn block mt18" data-act="nav" data-id="pricing">${icon('crown',15)} จัดการแพ็กเกจ</button>
      </div>
      <div class="panel">
        <h3>ข้อมูลใบกำกับภาษี</h3>
        <div class="row between mb14">
          <span class="muted small">ชื่อผู้เสียภาษี</span>
          <span class="b small right">${esc(taxName)}</span>
        </div>
        <div class="row between mb14">
          <span class="muted small">เลขประจำตัวผู้เสียภาษี</span>
          <span class="b small num right">${taxId ? esc(taxId) : '<span class="muted">ยังไม่ได้ระบุ</span>'}</span>
        </div>
        <div class="row between mb14">
          <span class="muted small">อีเมลรับใบเสร็จ</span>
          <span class="b small right nowrap">${esc(taxEmail)}</span>
        </div>
        <button class="btn block mt6" data-act="editTaxInfo">${icon('edit',15)} แก้ไขข้อมูล</button>
      </div>
    </div>`;

  // ---- invoice history ----
  const statusBadge = (st) => st === 'paid'
    ? `<span class="badge pos">${icon('check',12)} ชำระแล้ว</span>`
    : `<span class="badge neg">${icon('x',12)} ค้างชำระ</span>`;

  const invoiceRows = invoices.map(inv => `
    <div class="tx-row">
      <span class="tile sm gold">${icon('receipt',16)}</span>
      <div class="desc">
        <b class="num">${esc(inv.id)}</b>
        <small>${esc(inv.plan)} · ${esc(fmtDate(inv.date))}</small>
      </div>
      <div class="row gap10 center nowrap">
        ${statusBadge(inv.status)}
        <span class="num b">${fmt(inv.amount)}</span>
        <button class="btn icon sm" data-act="downloadInvoice" data-id="${esc(inv.id)}" title="ดาวน์โหลดใบเสร็จ">${icon('download',16)}</button>
      </div>
    </div>`).join('');

  const invoicePanel = `
    <div class="panel">
      <div class="row between mb14">
        <h3 style="margin:0">ประวัติการเรียกเก็บเงิน</h3>
        <span class="muted small num">${invoices.length} รายการ</span>
      </div>
      ${invoices.length
        ? invoiceRows
        : `<div class="empty"><div class="tile">${icon('receipt',26)}</div><h3>ยังไม่มีใบเสร็จ</h3><p class="muted small">เมื่อมีการเรียกเก็บเงิน ใบเสร็จจะปรากฏที่นี่</p></div>`}
    </div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">BILLING · การเรียกเก็บเงิน</div>
    <h1>การเรียกเก็บเงิน</h1>
    <div class="sub">จัดการแพ็กเกจ วิธีชำระเงิน และดูประวัติใบเสร็จย้อนหลัง</div>
  </div>

  ${upsell}
  ${planCard}
  ${detailPanels}
  ${invoicePanel}`;
}

// best-effort: pull live invoices when logged in; re-render via Store.notify() when they arrive.
// fully non-blocking — ignores offline / errors and never throws.
export function afterRender(ctx){
  // load the saved tax profile once (persisted locally)
  if(!_taxLoaded){
    _taxLoaded = true;
    kvGet('taxInfo').then(v => { if(v){ _taxInfo = v; Store.notify(); } }).catch(() => {});
  }
  try{
    if(!ctx.S.loggedIn()) return;
    if(typeof ctx.canSync === 'function' && !ctx.canSync()) return;
    const token = ctx.state.session?.token || '';
    if(_fetchedFor === token) return; // already fetched for this session
    _fetchedFor = token;
    Promise.resolve()
      .then(() => ctx.api.invoices())
      .then(res => {
        const rows = Array.isArray(res) ? res : res?.invoices;
        if(Array.isArray(rows) && rows.length){
          // normalise server rows (date is a unix-seconds int) → the shape render() expects
          _serverInvoices = rows.map(r => ({
            id: r.id,
            date: typeof r.date === 'number' ? new Date(r.date * 1000).toISOString().slice(0,10) : r.date,
            amount: Number(r.amount) || 0,
            plan: r.plan || '',
            status: r.status || 'paid',
          }));
          Store.notify(); // triggers a re-render with live data
        }
      })
      .catch(() => { /* offline / not implemented — keep demo data, no UI noise */ });
  }catch(_){ /* never let billing afterRender break the app */ }
}

// build a printable invoice document (user can Save as PDF from the print dialog)
function invoiceHtml(inv){
  const s = Store.state;
  const tax = _taxInfo || {};
  const name  = escT(tax.name  || s.session?.user?.name  || 'ลูกค้า');
  const email = escT(tax.email || s.session?.user?.email || '');
  const taxId = escT(tax.taxId || '—');
  const paid  = inv.status === 'paid';
  return `<!doctype html><html lang="th"><head><meta charset="utf-8">
    <title>${escT(inv.id)} · บัญชีนวล</title>
    <style>
      *{box-sizing:border-box} body{font-family:'Anuphan','Segoe UI',sans-serif;color:#333;margin:0;padding:40px;background:#fff}
      .doc{max-width:640px;margin:0 auto}
      .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #e6b347;padding-bottom:18px;margin-bottom:24px}
      .logo{width:46px;height:46px;border-radius:14px;background:linear-gradient(135deg,#e6b347,#d98e3f);color:#fff;font-weight:800;font-size:26px;display:grid;place-items:center}
      .brand b{font-size:18px} .brand div{color:#999;font-size:12px}
      h1{font-size:22px;margin:0 0 4px} .muted{color:#999;font-size:13px}
      .row{display:flex;justify-content:space-between;margin:8px 0;font-size:14px}
      .box{background:#faf7f0;border-radius:12px;padding:16px 18px;margin:18px 0}
      table{width:100%;border-collapse:collapse;margin:18px 0}
      th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #eee;font-size:14px}
      td.r,th.r{text-align:right}
      .total{display:flex;justify-content:flex-end;gap:40px;font-size:18px;font-weight:700;margin-top:8px}
      .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700;${paid?'background:#e0f1ea;color:#4f9e7e':'background:#fbe3d9;color:#cf6f4a'}}
      .foot{margin-top:34px;color:#aaa;font-size:12px;text-align:center}
      @media print{body{padding:0}}
    </style></head><body><div class="doc">
    <div class="top">
      <div style="display:flex;gap:12px;align-items:center"><div class="logo">฿</div>
        <div class="brand"><b>บัญชีนวล</b><div>MoneyNual · hacc.xman4289.com</div></div></div>
      <div style="text-align:right"><h1>ใบเสร็จรับเงิน</h1><div class="muted">เลขที่ ${escT(inv.id)}</div>
        <div class="muted">วันที่ ${escT(fmtDateTh(inv.date))}</div></div>
    </div>
    <div class="box">
      <div class="muted" style="margin-bottom:6px">เรียกเก็บจาก</div>
      <div style="font-weight:600">${name}</div>
      ${email?`<div class="muted">${email}</div>`:''}
      <div class="muted">เลขผู้เสียภาษี: ${taxId}</div>
    </div>
    <table><thead><tr><th>รายการ</th><th class="r">จำนวนเงิน</th></tr></thead>
      <tbody><tr><td>แพ็กเกจ ${escT(inv.plan)}</td><td class="r">${escT(fmtMoney(inv.amount))}</td></tr></tbody></table>
    <div class="total"><span>ยอดรวมทั้งสิ้น</span><span>${escT(fmtMoney(inv.amount))}</span></div>
    <div style="text-align:right;margin-top:10px"><span class="badge">${paid?'ชำระเงินแล้ว':'ค้างชำระ'}</span></div>
    <div class="foot">ขอบคุณที่ใช้บริการบัญชีนวล · เอกสารนี้ออกโดยระบบอัตโนมัติ</div>
    </div>
    <script>window.onload=function(){setTimeout(function(){try{window.print()}catch(e){}},300)}<\/script>
    </body></html>`;
}

// small promise-based modal for editing the tax profile (inputs → resolve or null)
function taxModal(cur){
  return new Promise(resolve => {
    const back = document.createElement('div'); back.className = 'modal-backdrop';
    const v = k => escT((cur && cur[k]) || '');
    back.innerHTML = `<div class="modal" style="max-width:420px">
      <div class="modal-head"><div><div class="muted small b">ใบกำกับภาษี</div><h2>แก้ไขข้อมูล</h2></div>
        <button class="btn icon" data-x="1">✕</button></div>
      <label class="lbl">ชื่อผู้เสียภาษี</label>
      <div class="field mb14" style="box-shadow:var(--inset-sm)"><input id="tx-name" value="${v('name')}" maxlength="120" placeholder="ชื่อ-สกุล / ชื่อบริษัท"></div>
      <label class="lbl">เลขประจำตัวผู้เสียภาษี</label>
      <div class="field mb14" style="box-shadow:var(--inset-sm)"><input id="tx-id" value="${v('taxId')}" maxlength="20" inputmode="numeric" placeholder="เช่น 1234567890123"></div>
      <label class="lbl">อีเมลรับใบเสร็จ</label>
      <div class="field mb18" style="box-shadow:var(--inset-sm)"><input id="tx-email" type="email" value="${v('email')}" maxlength="120" placeholder="you@email.com"></div>
      <button class="btn btn-primary block" data-save="1" style="height:46px">บันทึกข้อมูล</button>
    </div>`;
    function done(val){ back.remove(); resolve(val); }
    back.addEventListener('click', e => {
      if(e.target === back || e.target.closest('[data-x]')) return done(null);
      if(e.target.closest('[data-save]')){
        done({
          name:  (back.querySelector('#tx-name')?.value || '').trim(),
          taxId: (back.querySelector('#tx-id')?.value || '').trim(),
          email: (back.querySelector('#tx-email')?.value || '').trim(),
        });
      }
    });
    document.body.appendChild(back);
    setTimeout(() => back.querySelector('#tx-name')?.focus(), 30);
  });
}

export const actions = {
  downloadInvoice(el){
    const id = el.dataset.id || '';
    const invoices = (_serverInvoices && _serverInvoices.length) ? _serverInvoices : INVOICES_DEMO;
    const inv = invoices.find(x => x.id === id);
    if(!inv){ toast('ไม่พบใบเสร็จ'); return; }
    const html = invoiceHtml(inv);
    const w = window.open('', '_blank');
    if(!w){
      // popup blocked → download the invoice as a standalone HTML file instead
      const blob = new Blob([html], { type:'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = id + '.html';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('ดาวน์โหลดใบเสร็จ ' + id + ' แล้ว');
      return;
    }
    w.document.open(); w.document.write(html); w.document.close();
    toast('เปิดใบเสร็จ — บันทึกเป็น PDF ได้จากหน้าต่างพิมพ์');
  },
  async editTaxInfo(){
    const next = await taxModal(_taxInfo);
    if(!next) return; // cancelled
    if(next.email && !next.email.includes('@')){ toast('อีเมลไม่ถูกต้อง'); return; }
    _taxInfo = next;
    try{ await kvSet('taxInfo', next); }catch(_){}
    Store.notify();
    toast('บันทึกข้อมูลใบกำกับภาษีแล้ว ✓');
  },
  async cancelSub(){
    // confirm via the global confirm dialog (lazy import keeps the static deps minimal)
    const { confirmDialog } = await import('../ui.js');
    const yes = await confirmDialog({
      title: 'ยกเลิกการต่ออายุ?',
      message: 'แพ็กโปรจะยังใช้งานได้จนถึงสิ้นรอบบิลปัจจุบัน หลังจากนั้นจะกลับไปใช้แพ็กฟรีโดยอัตโนมัติ',
      ok: 'ยืนยันยกเลิก',
      cancel: 'ไม่ยกเลิก',
      danger: true,
    });
    if(yes) toast('รับเรื่องแล้ว — จะหยุดต่ออายุเมื่อสิ้นรอบบิล');
  },
};
