// views/billing.js — billing overview: current plan, payment method, tax info, invoice history
import { Store } from '../state.js';
import { toast } from '../ui.js';

// best-effort live invoices fetched in afterRender; rendered when present
let _serverInvoices = null;
let _fetchedFor = null; // session token we already fetched for (avoid refetch loops)

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
  const detailPanels = `
    <div class="grid g-split mb18">
      <div class="panel">
        <h3>วิธีชำระเงิน</h3>
        <div class="row between wrap gap14">
          <div class="row gap14">
            <span class="tile md gold">${icon('card',22)}</span>
            <div>
              <div class="num b" style="font-size:15px">•••• 8842</div>
              <div class="muted small mt6">${esc(ownerName)} · หมดอายุ 12/27</div>
            </div>
          </div>
          <button class="btn btn-ghost" data-act="changeCard">${icon('edit',15)} เปลี่ยน</button>
        </div>
        <div class="muted small mt18 row gap6">${icon('shield',14)} ชำระเงินผ่านระบบที่เข้ารหัส ปลอดภัย 100%</div>
      </div>
      <div class="panel">
        <h3>ข้อมูลใบกำกับภาษี</h3>
        <div class="row between mb14">
          <span class="muted small">ชื่อผู้เสียภาษี</span>
          <span class="b small right">${esc(ownerName)}</span>
        </div>
        <div class="row between mb14">
          <span class="muted small">เลขประจำตัวผู้เสียภาษี</span>
          <span class="b small num right">1-2345-67890-12-3</span>
        </div>
        <div class="row between mb14">
          <span class="muted small">อีเมลรับใบเสร็จ</span>
          <span class="b small right nowrap">${esc(ownerEmail)}</span>
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
  try{
    if(!ctx.S.loggedIn()) return;
    if(typeof ctx.canSync === 'function' && !ctx.canSync()) return;
    const token = ctx.state.session?.token || '';
    if(_fetchedFor === token) return; // already fetched for this session
    _fetchedFor = token;
    Promise.resolve()
      .then(() => ctx.api.invoices())
      .then(rows => {
        if(Array.isArray(rows) && rows.length){
          _serverInvoices = rows;
          Store.notify(); // triggers a re-render with live data
        }
      })
      .catch(() => { /* offline / not implemented — keep demo data, no UI noise */ });
  }catch(_){ /* never let billing afterRender break the app */ }
}

export const actions = {
  downloadInvoice(el){
    const id = el.dataset.id || '';
    toast('กำลังเตรียมใบเสร็จ ' + id);
  },
  changeCard(){
    toast('ฟีเจอร์เปลี่ยนบัตรกำลังจะมาเร็วๆ นี้');
  },
  editTaxInfo(){
    toast('ฟีเจอร์แก้ไขข้อมูลภาษีกำลังจะมาเร็วๆ นี้');
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
