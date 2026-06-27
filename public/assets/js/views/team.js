// views/team.js — household team & roles: invite, member list, role cycling, roles explainer
import { Store } from '../state.js';
import { toast, confirmDialog } from '../ui.js';

const MAX_SEATS = 5;

export function render(ctx){
  const { state:s, icon, esc, D } = ctx;
  const members = s.members.filter(m => !m.deleted);
  const seats = members.length;
  const full = seats >= MAX_SEATS;
  const isPro = Store.isPro();

  // soft upgrade banner (pro feature) — built from documented surfaces only
  const banner = !isPro ? `
    <div class="panel gold-soft mb18">
      <div class="row between wrap gap14">
        <div class="row gap14" style="align-items:flex-start">
          <span class="tile md gold">${icon('crown',18)}</span>
          <div>
            <b style="display:block">ฟีเจอร์ทีมใช้ได้ในแพ็กโปร</b>
            <div class="muted small mt6">อัปเกรดเพื่อเชิญสมาชิกเข้าใช้ร่วมกันทั้งบ้าน พร้อมซิงก์ออนไลน์ทุกเครื่อง · ด้านล่างเป็นตัวอย่างการใช้งาน</div>
          </div>
        </div>
        <button class="btn btn-primary" data-act="nav" data-id="pricing">${icon('crown',16)} อัปเกรด</button>
      </div>
    </div>` : '';

  // invite panel
  const invite = `
    <div class="panel mb18">
      <h3>เชิญสมาชิกใหม่</h3>
      <div class="muted small" style="margin:-8px 0 16px">ส่งคำเชิญทางอีเมล สมาชิกในแพ็กโปรร่วมกันได้สูงสุด ${MAX_SEATS} คน</div>
      <div class="row gap10 wrap">
        <div class="field" style="flex:1;min-width:200px;box-shadow:var(--inset-sm)">
          ${icon('mail',16)}<input id="mn-invite" type="email" placeholder="อีเมลของเพื่อนร่วมทีม" autocomplete="off"
            data-act="inviteMember" data-on="enter">
        </div>
        <button class="btn btn-primary" data-act="inviteMember" ${full?'disabled style="opacity:.55"':''}>${icon('mail',16)} ส่งคำเชิญ</button>
      </div>
      ${full?`<div class="t-neg small mt10">ที่นั่งเต็มแล้ว (${MAX_SEATS}/${MAX_SEATS}) — ลบสมาชิกเดิมก่อนเชิญเพิ่ม</div>`:''}
    </div>`;

  // member rows
  const row = (m) => {
    const role = D.ROLE_META[m.role] || D.ROLE_META.member;
    const isOwner = m.role === 'owner';
    const tone = ['gold','teal','lav','rose'].includes(m.tone) ? m.tone : 'gold';
    const letter = esc((m.avatar && m.avatar !== '?') ? m.avatar : (m.name || '?').slice(0,1));
    const badge = `<button class="badge" data-act="cycleRole" data-id="${esc(m.id)}"
        style="color:${role.color};background:${role.bg};${isOwner?'cursor:default':'cursor:pointer'}"
        ${isOwner?'disabled':`title="แตะเพื่อเปลี่ยนสิทธิ์"`}>${role.th}</button>`;
    const del = isOwner ? '' :
      `<button class="btn icon sm" data-act="removeMember" data-id="${esc(m.id)}" title="นำออกจากทีม" style="color:var(--ink2)">${icon('trash',15)}</button>`;
    return `<div class="tx-row">
      <span class="avatar ${tone}" style="width:42px;height:42px;border-radius:13px;font-size:16px">${letter}</span>
      <div class="desc">
        <b>${esc(m.name)}</b>
        <small class="muted">${esc(m.email)}${m.pending?' · <span class="t-gold">รอตอบรับ</span>':''}</small>
      </div>
      <div class="row gap10" style="align-items:center">${badge}${del}</div>
    </div>`;
  };

  const list = `
    <div class="panel mb18">
      <div class="row between mb14"><h3 style="margin:0">สมาชิกในทีม</h3>
        <span class="pill"><span class="num">${seats}</span>/${MAX_SEATS} ที่นั่ง</span></div>
      ${members.length
        ? members.map(row).join('')
        : `<div class="empty"><div class="tile">${icon('team',26)}</div><h3>ยังไม่มีสมาชิก</h3><p class="muted small">เชิญเพื่อนร่วมทีมด้วยอีเมลด้านบน</p></div>`}
    </div>`;

  // roles explainer
  const roleCard = (key, ic, perms) => {
    const r = D.ROLE_META[key];
    return `<div class="card raise" style="padding:17px 18px">
      <div class="row gap10 mb10" style="align-items:center">
        <span class="tile sm" style="box-shadow:var(--inset-sm);color:${r.color}">${icon(ic,16)}</span>
        <b style="color:${r.color}">${r.th}</b>
      </div>
      <ul class="muted small" style="margin:0;padding-left:18px;line-height:1.7">
        ${perms.map(p=>`<li>${p}</li>`).join('')}
      </ul>
    </div>`;
  };
  const roles = `
    <div class="panel">
      <h3>สิทธิ์ของแต่ละบทบาท</h3>
      <div class="grid g-auto">
        ${roleCard('owner','crown',['จัดการแพ็กเกจ & การเรียกเก็บเงิน','เชิญ / นำสมาชิกออก','แก้ไขข้อมูลได้ทั้งหมด','ลบบทบาทเจ้าของไม่ได้'])}
        ${roleCard('admin','shield',['เพิ่ม / แก้ไข / ลบรายการ','จัดการงบประมาณ & หมวดหมู่','เชิญสมาชิกใหม่ได้','ดูรายงานทั้งหมด'])}
        ${roleCard('member','user',['เพิ่มรายการของตัวเอง','ดูภาพรวม & รายงาน','แก้ไขเฉพาะรายการตัวเอง','เปลี่ยนตั้งค่าทีมไม่ได้'])}
      </div>
    </div>`;

  return `
  <div class="page-head">
    <div class="row between wrap gap14" style="align-items:flex-start">
      <div>
        <div class="eyebrow">WORKSPACE · ทีม</div>
        <h1>ทีม &amp; สิทธิ์การใช้งาน</h1>
      </div>
      <span class="pill"><span class="num">${seats}</span>/${MAX_SEATS} ที่นั่ง</span>
    </div>
  </div>
  ${banner}
  ${invite}
  ${list}
  ${roles}`;
}

export function afterRender(ctx, root){
  const inp = root.querySelector('#mn-invite');
  if(inp){
    inp.addEventListener('keydown', ev => {
      if(ev.key === 'Enter'){ ev.preventDefault(); actions.inviteMember(inp, ev); }
    });
  }
}

export const actions = {
  async inviteMember(){
    const inp = document.getElementById('mn-invite');
    const email = (inp?.value || '').trim();
    if(!email || !email.includes('@')){ toast('กรอกอีเมลให้ถูกต้องก่อนนะ'); inp?.focus(); return; }
    const seats = Store.state.members.filter(m => !m.deleted).length;
    if(seats >= MAX_SEATS){ toast(`ที่นั่งเต็มแล้ว (${MAX_SEATS}/${MAX_SEATS})`); return; }
    // guard against duplicate invite
    if(Store.state.members.some(m => !m.deleted && (m.name||'').toLowerCase() === email.toLowerCase())){
      toast('เชิญอีเมลนี้ไปแล้ว'); return;
    }
    const tones = ['gold','teal','lav','rose'];
    const tone = tones[seats % tones.length];
    await Store.upsert('members', {
      name: email, email: 'รอตอบรับคำเชิญ', role: 'member',
      avatar: email.slice(0,1).toUpperCase(), tone, pending: 1,
    });
    if(inp) inp.value = '';
    toast('ส่งคำเชิญแล้ว!');
  },

  async cycleRole(el){
    const id = el.dataset.id;
    const m = Store.state.members.find(x => x.id === id && !x.deleted);
    if(!m) return;
    if(m.role === 'owner') return; // owner role is immutable
    const next = m.role === 'admin' ? 'member' : 'admin';
    await Store.upsert('members', { ...m, role: next });
    toast(next === 'admin' ? 'ตั้งเป็นแอดมินแล้ว' : 'ตั้งเป็นสมาชิกแล้ว');
  },

  async removeMember(el){
    const id = el.dataset.id;
    const m = Store.state.members.find(x => x.id === id && !x.deleted);
    if(!m) return;
    if(m.role === 'owner'){ toast('นำเจ้าของออกจากทีมไม่ได้'); return; }
    const ok = await confirmDialog({
      title: 'นำสมาชิกออก',
      message: `นำ “${m.name}” ออกจากทีมใช่ไหม? สมาชิกจะหมดสิทธิ์เข้าถึงข้อมูลร่วมทันที`,
      ok: 'นำออก', danger: true,
    });
    if(!ok) return;
    await Store.remove('members', id);
    toast('นำสมาชิกออกแล้ว');
  },
};
