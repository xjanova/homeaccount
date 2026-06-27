// views/calendar.js — month calendar of recurring items + sticky-note reminders
import { Store } from '../state.js';
import { toast, confirmDialog } from '../ui.js';

// editor for a single day's recurring (รายการประจำ) items — opened by clicking a day cell
function renderDayModal(ctx){
  const { state:s, icon, esc, fmt, D } = ctx;
  const m = s.modal;
  if(!m || m.type !== 'calday') return '';
  const day = m.day;
  const draft = m.draft || { type:'expense', cat:'food', amount:'', label:'', day };
  const isExpense = draft.type !== 'income';
  const cats = isExpense ? D.EXPENSE_CATS : D.INCOME_CATS;
  const items = (s.recurring || []).filter(r => !r.deleted && r.day === day);

  const list = items.length ? items.map(it => {
    const c = D.CATS[it.cat] || {}; const inc = it.type === 'income';
    return `<div class="tx-row" style="box-shadow:var(--inset-sm);margin-bottom:8px">
      <span class="tile sm" style="background:${inc?'var(--a1s)':(c.tint||'var(--surf)')};color:${inc?'var(--pos)':'var(--neg)'};box-shadow:var(--inset-sm)">${icon(c.icon||'tag',16)}</span>
      <div class="desc"><b>${esc(it.label || c.th || '')}</b><small>${c.th||it.cat} · ${inc?'รายรับ':'รายจ่าย'}</small></div>
      <span class="tx-amt ${inc?'pos':'neg'} num">${inc?'+':'-'}${fmt(it.amount)}</span>
      <button class="btn icon sm" data-act="editRecurring" data-id="${esc(it.id)}" title="แก้ไข">${icon('edit',15)}</button>
      <button class="btn icon sm" data-act="delRecurring" data-id="${esc(it.id)}" title="ลบ">${icon('trash',15)}</button>
    </div>`;
  }).join('') : `<div class="muted small" style="padding:6px 2px 14px">ยังไม่มีรายการประจำในวันนี้ — เพิ่มด้านล่างได้เลย</div>`;

  return `<div class="modal-backdrop" data-act="closeDayBg">
    <div class="modal">
      <div class="modal-head">
        <div><div class="muted small b">รายการประจำ</div><h2>ทุกวันที่ ${day} ของเดือน</h2></div>
        <button class="btn icon" data-act="closeDay">${icon('x',16)}</button>
      </div>
      ${list}
      <div style="height:1px;background:var(--sd);margin:14px 0;opacity:.6"></div>
      <div class="muted small b mb10">${draft.id ? 'แก้ไขรายการ' : 'เพิ่มรายการประจำใหม่'}</div>
      <div class="row gap10 mb14">
        <button class="btn block ${isExpense?'btn-neg':''}" data-act="setRecType" data-v="expense">รายจ่าย</button>
        <button class="btn block ${!isExpense?'btn-pos':''}" data-act="setRecType" data-v="income">รายรับ</button>
      </div>
      <label class="lbl">ชื่อรายการ</label>
      <div class="field mb14" style="box-shadow:var(--inset-sm)"><input id="cal-label" placeholder="เช่น ค่าผ่อนบ้าน, เงินเดือน" value="${esc(draft.label||'')}"></div>
      <label class="lbl">หมวดหมู่</label>
      <div class="row wrap gap6 mb14">${cats.map(c=>`<button class="chip ${draft.cat===c?'on':''}" data-act="setRecCat" data-v="${c}">${D.CATS[c].th}</button>`).join('')}</div>
      <label class="lbl">จำนวนเงิน</label>
      <div class="field mb18" style="box-shadow:var(--inset)"><span class="num b" style="font-size:18px;color:var(--d2)">฿</span><input id="cal-amt" class="num" inputmode="decimal" placeholder="0" value="${draft.amount||''}" style="font-size:18px;font-weight:700"></div>
      <div class="row gap10">
        ${draft.id?`<button class="btn block" data-act="newRecurring">+ เพิ่มใหม่</button>`:''}
        <button class="btn btn-primary block" data-act="saveRecurring" style="height:46px">${draft.id?'บันทึกการแก้ไข':'เพิ่มรายการประจำ'}</button>
      </div>
    </div>
  </div>`;
}

// short label for a calendar event (category name first, else its custom label)
function shortLabel(ctx, ev){
  const c = ctx.D.CATS[ev.cat] || {};
  const raw = c.th || ev.label || ev.cat || '';
  // keep tight so the chip never wraps
  return raw.length > 6 ? raw.slice(0, 5) + '…' : raw;
}

export function render(ctx){
  const { state:s, sel, fmt, fmtK, icon, esc, D, monthLabel, TH_DOW } = ctx;

  const rt = sel.recurringTotals(s);
  const cells = sel.calendarCells(s, s.calMonth, s.calYear);

  // is the displayed month the real "today" month?
  const realNow = new Date();
  const isThisMonth = realNow.getMonth() === s.calMonth && realNow.getFullYear() === s.calYear;
  const todayDate = realNow.getDate();

  // ---- day-of-week headers ----
  const dow = TH_DOW.map(d => `<div class="cal-dow">${d}</div>`).join('');

  // ---- calendar cells ----
  const grid = cells.map(cell => {
    if(!cell) return `<div class="cal-cell empty"></div>`;
    const isToday = isThisMonth && cell.day === todayDate;

    const evs = (cell.events || []).slice(0, 3).map(ev => {
      const inc = ev.type === 'income';
      const c = D.CATS[ev.cat] || {};
      const bg = inc ? 'var(--a1s)' : (c.tint || 'var(--surf)');
      const ink = inc ? 'var(--pos)' : 'var(--neg)';
      const sign = inc ? '+' : '-';
      return `<span class="cal-ev" style="background:${bg};color:${ink}" title="${esc(ev.label || c.th || '')} · ${esc(fmt(ev.amount))}">${esc(shortLabel(ctx, ev))} <b class="num">${sign}${fmtK(ev.amount)}</b></span>`;
    }).join('');

    const more = (cell.events || []).length > 3
      ? `<span class="cal-ev" style="background:transparent;color:var(--ink2)">+${(cell.events.length - 3)} อื่นๆ</span>`
      : '';

    return `<div class="cal-cell ${isToday?'today':''}" data-act="openDay" data-day="${cell.day}" style="cursor:pointer" title="แตะเพื่อแก้ไขรายการประจำวันที่ ${cell.day}">
      <span class="dn">${cell.day}</span>${evs}${more}
    </div>`;
  }).join('');

  // ---- sticky notes ----
  const notes = (s.notes || []).filter(n => !n.deleted);
  const noteCards = notes.map(n => {
    const col = D.NOTE_COLORS[((n.color|0) % D.NOTE_COLORS.length + D.NOTE_COLORS.length) % D.NOTE_COLORS.length] || D.NOTE_COLORS[0];
    return `<div class="note" style="background:${col.bg};border:1px solid ${col.edge};color:${col.ink}">
      <div class="acts">
        <button data-act="noteColor" data-id="${esc(n.id)}" title="เปลี่ยนสี">${icon('refresh',13)}</button>
        <button data-act="delNote" data-id="${esc(n.id)}" title="ลบโน้ต">${icon('trash',13)}</button>
      </div>
      <textarea data-change="editNote" data-id="${esc(n.id)}" placeholder="เขียนโน้ต…">${esc(n.text)}</textarea>
    </div>`;
  }).join('');

  const notesBoard = notes.length
    ? `<div class="grid g-auto">${noteCards}
        <button class="note center" data-act="addNote" style="background:var(--surf);border:2px dashed var(--sd);color:var(--ink2);box-shadow:var(--inset-sm);cursor:pointer;flex-direction:column;gap:8px;justify-content:center">
          ${icon('plus',22)}<span class="small b">เพิ่มโน้ต</span>
        </button>
      </div>`
    : `<div class="empty"><div class="tile">${icon('edit',26)}</div><h3>ยังไม่มีโน้ตเตือนความจำ</h3>
        <p class="muted small">จดเตือนค่าบ้าน บิล หรือเป้าหมายออมเงินไว้ที่นี่</p>
        <button class="btn btn-primary mt14" data-act="addNote">${icon('plus',16)} เพิ่มโน้ต</button></div>`;

  return `
  <div class="page-head">
    <div class="row between wrap gap14">
      <div>
        <div class="eyebrow">CALENDAR · รายการประจำ</div>
        <h1>ปฏิทินรายรับรายจ่าย</h1>
      </div>
      <div class="row gap6 wrap">
        <span class="pill"><i style="width:8px;height:8px;border-radius:50%;background:var(--pos);display:inline-block"></i> รับประจำ <b class="num t-pos">${fmt(rt.inc)}</b></span>
        <span class="pill"><i style="width:8px;height:8px;border-radius:50%;background:var(--neg);display:inline-block"></i> จ่ายประจำ <b class="num t-neg">${fmt(rt.exp)}</b></span>
      </div>
    </div>
  </div>

  <div class="panel mb18">
    <div class="row between mb18">
      <button class="btn icon" data-act="calPrev" title="เดือนก่อนหน้า">${icon('chevL',18)}</button>
      <h3 class="num" style="margin:0;font-size:17px">${monthLabel(s.calMonth, s.calYear)}</h3>
      <button class="btn icon" data-act="calNext" title="เดือนถัดไป">${icon('chevR',18)}</button>
    </div>
    <div class="cal-grid">${dow}${grid}</div>
  </div>

  <div class="row between mb14">
    <h3 style="margin:0">โน้ตเตือนความจำ</h3>
    <button class="btn sm" data-act="addNote">${icon('plus',15)} เพิ่มโน้ต</button>
  </div>
  ${notesBoard}
  ${renderDayModal(ctx)}`;
}

export const actions = {
  calPrev(){
    Store.update(st => {
      let m = st.calMonth - 1, y = st.calYear;
      if(m < 0){ m = 11; y -= 1; }
      st.calMonth = m; st.calYear = y;
    });
  },
  calNext(){
    Store.update(st => {
      let m = st.calMonth + 1, y = st.calYear;
      if(m > 11){ m = 0; y += 1; }
      st.calMonth = m; st.calYear = y;
    });
  },
  async addNote(){
    await Store.upsert('notes', { text:'โน้ตใหม่…', color:0 });
  },
  async editNote(el){
    const id = el.dataset.id;
    const existing = Store.state.notes.find(n => n.id === id);
    if(!existing) return;
    const text = el.value;
    if(text === existing.text) return; // no change → skip re-render churn
    await Store.upsert('notes', { ...existing, text });
  },
  async delNote(el){
    await Store.remove('notes', el.dataset.id);
  },
  async noteColor(el){
    const id = el.dataset.id;
    const existing = Store.state.notes.find(n => n.id === id);
    if(!existing) return;
    const max = 6; // D.NOTE_COLORS length
    const next = (((existing.color|0) + 1) % max + max) % max;
    await Store.upsert('notes', { ...existing, color: next });
  },

  // ----- day editor (recurring items) -----
  openDay(el){
    const day = +el.dataset.day;
    Store.set({ modal:{ type:'calday', day, draft:{ type:'expense', cat:'food', amount:'', label:'', day } } });
  },
  closeDay(){ Store.set({ modal:null }); },
  closeDayBg(el, ev){ if(ev && ev.target.classList.contains('modal-backdrop')) Store.set({ modal:null }); },
  setRecType(el){ Store.update(s=>{ capCal(s); s.modal.draft.type = el.dataset.v; const list = el.dataset.v==='income'?['salary','other']:['food','transport','housing','shopping','utility','health','entertain','other']; if(!list.includes(s.modal.draft.cat)) s.modal.draft.cat = list[0]; }); },
  setRecCat(el){ Store.update(s=>{ capCal(s); s.modal.draft.cat = el.dataset.v; }); },
  editRecurring(el){
    const it = Store.state.recurring.find(r => r.id === el.dataset.id); if(!it) return;
    Store.update(s=>{ s.modal.draft = { ...it }; });
  },
  newRecurring(){ Store.update(s=>{ const day = s.modal.day; s.modal.draft = { type:'expense', cat:'food', amount:'', label:'', day }; }); },
  async saveRecurring(){
    const s = Store.state; if(!s.modal) return;
    capCal(s);
    const d = s.modal.draft;
    const amt = Math.round(parseFloat(String(d.amount||'').replace(/,/g,'')) || 0);
    if(!amt || amt <= 0){ toast('กรอกจำนวนเงินก่อนนะ'); return; }
    const label = (d.label||'').trim() || ctxCatTh(d.cat);
    await Store.upsert('recurring', { id:d.id, day:s.modal.day, type:d.type, cat:d.cat, amount:amt, label });
    // reset form for adding another, keep the day modal open
    Store.update(st=>{ st.modal.draft = { type:'expense', cat:'food', amount:'', label:'', day:st.modal.day }; });
    toast(d.id ? 'แก้ไขรายการประจำแล้ว' : 'เพิ่มรายการประจำแล้ว ✓');
  },
  async delRecurring(el){
    if(await confirmDialog({ title:'ลบรายการประจำ', message:'ต้องการลบรายการประจำนี้ใช่ไหม?', ok:'ลบ', danger:true })){
      await Store.remove('recurring', el.dataset.id);
      toast('ลบแล้ว');
    }
  },
};

// capture uncontrolled day-modal inputs into draft before a re-render
function capCal(s){
  if(!s.modal?.draft) return;
  const l = document.getElementById('cal-label'); if(l) s.modal.draft.label = l.value;
  const a = document.getElementById('cal-amt'); if(a) s.modal.draft.amount = a.value;
}
function ctxCatTh(cat){
  const map = { food:'อาหาร & เครื่องดื่ม', transport:'เดินทาง', housing:'ที่พัก / ค่าบ้าน', shopping:'ช้อปปิ้ง', utility:'สาธารณูปโภค', health:'สุขภาพ', entertain:'บันเทิง', salary:'เงินเดือน', other:'อื่นๆ' };
  return map[cat] || cat;
}
