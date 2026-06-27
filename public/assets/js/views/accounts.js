// views/accounts.js — wallets/accounts with balances + add/edit/delete (modal)
import { Store } from '../state.js';
import { toast, confirmDialog } from '../ui.js';

// type → { icon, tone, numLabel } defaults
const TYPE_META = {
  'CASH':     { icon:'cash', tone:'gold', th:'เงินสด',      numLabel:'กระเป๋าเงินสด' },
  'SAVINGS':  { icon:'bank', tone:'teal', th:'ออมทรัพย์',    numLabel:'บัญชีออมทรัพย์' },
  'CREDIT':   { icon:'card', tone:'rose', th:'บัตรเครดิต',   numLabel:'วงเงินบัตร' },
  'E-WALLET': { icon:'qr',   tone:'lav',  th:'อีวอลเล็ต',    numLabel:'กระเป๋าเงินดิจิทัล' },
};
const TYPES = ['CASH','SAVINGS','CREDIT','E-WALLET'];

function blankDraft(){
  const m = TYPE_META.CASH;
  return { id:null, name:'', type:'CASH', icon:m.icon, tone:m.tone, balance:0, numLabel:m.numLabel };
}

export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, esc } = ctx;
  const at = sel.accountTotals(s);
  const list = s.accounts.filter(a => !a.deleted);

  const netCls = at.total >= 0 ? 'pos' : 'neg';

  const cards = list.map(a => {
    const tone = ['gold','teal','lav','rose'].includes(a.tone) ? a.tone : 'gold';
    const meta = TYPE_META[a.type] || {};
    const balCls = a.balance >= 0 ? 'pos' : 'neg';
    return `<div class="card raise" style="padding:18px;display:flex;flex-direction:column;gap:14px">
      <div class="row between">
        <div class="avatar ${tone}" style="width:46px;height:46px;border-radius:14px">${icon(a.icon||'wallet',22)}</div>
        <button class="btn icon sm" data-act="openAccount" data-id="${esc(a.id)}" title="แก้ไขบัญชี">${icon('edit',16)}</button>
      </div>
      <div>
        <div class="b" style="font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(a.name)}</div>
        <div class="muted small">${esc(a.numLabel || meta.numLabel || '')}</div>
      </div>
      <div class="row between center">
        <span class="badge">${esc(meta.th || a.type)}</span>
        <span class="num b ${balCls}" style="font-size:20px">${fmt(a.balance)}</span>
      </div>
    </div>`;
  }).join('');

  const addCard = `<button class="card inset" data-act="openAccount" style="padding:18px;min-height:148px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--d2);cursor:pointer;border:none;width:100%">
    <span class="tile md gold">${icon('plus',22)}</span>
    <b style="font-size:14px">+ เพิ่มบัญชี</b>
    <span class="muted small">เพิ่มกระเป๋าเงินหรือบัญชีใหม่</span>
  </button>`;

  const grid = list.length
    ? `<div class="grid g-auto">${cards}${addCard}</div>`
    : `<div class="empty"><div class="tile">${icon('wallet',26)}</div><h3>ยังไม่มีบัญชี</h3><p class="muted small">เพิ่มกระเป๋าเงินหรือบัญชีธนาคารเพื่อเริ่มติดตามยอดเงิน</p>
        <div class="mt18" style="max-width:320px;margin-left:auto;margin-right:auto">${addCard}</div></div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">ACCOUNTS · บัญชี & กระเป๋า</div>
    <h1>บัญชี & กระเป๋าเงิน</h1>
    <div class="sub">รวมทุกบัญชีเพื่อดูความมั่งคั่งสุทธิของคุณ</div>
  </div>

  <div class="panel gold-soft mb18">
    <div class="row between center wrap gap10">
      <div>
        <div class="muted small b">ความมั่งคั่งสุทธิ · NET WORTH</div>
        <div class="num b ${netCls}" style="font-size:30px;line-height:1.1">${fmt(at.total)}</div>
        <div class="muted small mt6">รวม ${at.accounts.length} บัญชี · ${at.total>=0?'สถานะการเงินเป็นบวก':'มีหนี้สินมากกว่าทรัพย์สิน'}</div>
      </div>
      <span class="tile md gold" style="align-self:center">${icon('wallet',24)}</span>
    </div>
  </div>

  ${grid}

  ${renderModal(ctx)}`;
}

function renderModal(ctx){
  const { state:s, icon, esc } = ctx;
  if(s.modal?.type !== 'account') return '';
  const d = s.modal.acc || blankDraft();
  const isEdit = !!d.id;

  const typeChips = TYPES.map(t => {
    const m = TYPE_META[t];
    return `<button class="chip ${d.type===t?'on':''}" data-act="setAccType" data-v="${t}">${icon(m.icon,14)} ${m.th}</button>`;
  }).join('');

  return `<div class="modal-backdrop" data-act="closeAccountBg">
    <div class="modal" style="max-width:440px">
      <div class="modal-head">
        <div><div class="muted small b">${isEdit?'แก้ไขบัญชี':'เพิ่มบัญชีใหม่'}</div><h2>${isEdit?esc(d.name||'บัญชี'):'บัญชี & กระเป๋าเงิน'}</h2></div>
        <button class="btn icon" data-act="closeAccountBg" data-close="1">${icon('x',16)}</button>
      </div>

      <label class="lbl">ชื่อบัญชี</label>
      <div class="field mb18" style="box-shadow:var(--inset-sm)">
        <input id="mn-acc-name" placeholder="เช่น เงินสด, ธนาคารกสิกร, พร้อมเพย์…" value="${esc(d.name||'')}" autocomplete="off" maxlength="40">
      </div>

      <label class="lbl">ประเภทบัญชี</label>
      <div class="row wrap gap6 mb18">${typeChips}</div>

      <label class="lbl">ยอดเงินคงเหลือ</label>
      <div class="field mb18" style="box-shadow:var(--inset)">
        <span class="num b" style="font-size:20px;color:var(--d2)">฿</span>
        <input id="mn-acc-bal" class="num" inputmode="numeric" placeholder="0" value="${d.balance!=null?esc(String(d.balance)):''}" style="font-size:22px;font-weight:700">
      </div>
      <div class="muted small mb18">บัตรเครดิตที่ติดลบให้ใส่เครื่องหมายลบ เช่น -23400</div>

      <div class="row gap10">
        ${isEdit?`<button class="btn icon btn-neg" data-act="delAccount" data-id="${esc(d.id)}" title="ลบบัญชี">${icon('trash',18)}</button>`:''}
        <button class="btn btn-primary block" data-act="saveAccount" style="height:48px;font-size:14px">${isEdit?'บันทึกการแก้ไข':'เพิ่มบัญชี'}</button>
      </div>
    </div></div>`;
}

export function afterRender(ctx, root){
  // focus name input when the account modal is open (new accounts)
  if(ctx.state.modal?.type === 'account' && !ctx.state.modal.acc?.id){
    const el = document.getElementById('mn-acc-name');
    if(el) el.focus();
  }
}

// merge currently typed input values into the draft so chip clicks don't lose them
function readInputsInto(draft){
  const nameEl = document.getElementById('mn-acc-name');
  const balEl  = document.getElementById('mn-acc-bal');
  const next = { ...draft };
  if(nameEl) next.name = nameEl.value;
  if(balEl)  next.balance = balEl.value === '' ? '' : parseBal(balEl.value);
  return next;
}
function parseBal(v){
  const n = parseFloat(String(v).replace(/[, ]/g,''));
  return isNaN(n) ? 0 : Math.round(n);
}

export const actions = {
  openAccount(el){
    const id = el.dataset.id;
    if(id){
      const acc = Store.state.accounts.find(a => a.id === id && !a.deleted);
      Store.set({ drawerOpen:false, modal:{ type:'account', acc: acc ? { ...acc } : blankDraft() } });
    } else {
      Store.set({ drawerOpen:false, modal:{ type:'account', acc: blankDraft() } });
    }
  },

  closeAccountBg(el, ev){
    // close on backdrop click, on the × button, or on Esc-style close button
    if(el?.dataset?.close === '1'){ Store.set({ modal:null }); return; }
    if(ev && ev.target.classList.contains('modal-backdrop')) Store.set({ modal:null });
  },

  setAccType(el){
    const t = el.dataset.v;
    const m = TYPE_META[t]; if(!m) return;
    Store.update(s => {
      const cur = s.modal?.acc || blankDraft();
      const merged = readInputsInto(cur);
      // if user hasn't customised numLabel from the previous type default, refresh it
      const prevMeta = TYPE_META[cur.type] || {};
      const keepNum = merged.numLabel && merged.numLabel !== prevMeta.numLabel;
      s.modal = { type:'account', acc: {
        ...merged,
        type: t,
        icon: m.icon,
        tone: m.tone,
        numLabel: keepNum ? merged.numLabel : m.numLabel,
      } };
    });
  },

  async saveAccount(){
    const s = Store.state;
    const draft = s.modal?.acc || blankDraft();
    const name = (document.getElementById('mn-acc-name')?.value || '').trim();
    if(!name){ toast('กรอกชื่อบัญชีก่อนนะ'); document.getElementById('mn-acc-name')?.focus(); return; }
    const balance = parseBal(document.getElementById('mn-acc-bal')?.value || '0');
    const type = TYPE_META[draft.type] ? draft.type : 'CASH';
    const m = TYPE_META[type];

    const rec = {
      id: draft.id || undefined,
      name,
      type,
      icon: draft.icon || m.icon,
      tone: ['gold','teal','lav','rose'].includes(draft.tone) ? draft.tone : m.tone,
      balance,
      numLabel: (draft.numLabel && draft.numLabel.trim()) || m.numLabel,
    };
    await Store.upsert('accounts', rec);
    Store.set({ modal:null });
    toast(draft.id ? 'บันทึกบัญชีแล้ว ✓' : 'เพิ่มบัญชีแล้ว ✓');
  },

  async delAccount(el){
    const id = el.dataset.id; if(!id) return;
    const acc = Store.state.accounts.find(a => a.id === id);
    const ok = await confirmDialog({
      title:'ลบบัญชี',
      message:`ต้องการลบบัญชี “${acc?.name || ''}” ใช่ไหม? ยอดเงินของบัญชีนี้จะถูกนำออกจากความมั่งคั่งสุทธิ และการลบจะซิงก์ไปยังอุปกรณ์อื่นด้วย`,
      ok:'ลบบัญชี', danger:true,
    });
    if(!ok) return;
    await Store.remove('accounts', id);
    Store.set({ modal:null });
    toast('ลบบัญชีแล้ว');
  },
};
