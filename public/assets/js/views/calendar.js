// views/calendar.js — month calendar of recurring items + sticky-note reminders
import { Store } from '../state.js';

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

    return `<div class="cal-cell ${isToday?'today':''}">
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
  ${notesBoard}`;
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
};
