// views/team.js — household team & roles: invite, member list, role cycling, roles explainer.
// Two modes:
//   • Pro + online  → the server household is the source of truth (invite/role/remove hit the API).
//   • Free/offline  → local optimistic demo (so the feature is still explorable without an account).
import { Store } from '../state.js';
import { toast, confirmDialog } from '../ui.js';
import { api } from '../api.js';
import { canSync } from '../sync.js';
import { getAll } from '../db.js';

const MAX_SEATS = 5;
const TONES = ['gold','teal','lav','rose'];

// which session token we've already loaded server members for (null = local/demo)
let _loadedFor = null;

// server member shape → the shape render() expects
function mapServerMembers(list){
  return (list || []).map((m, i) => ({
    id: m.userId || ('email:' + (m.email || m.invited_email || i)),
    userId: m.userId || null,
    name: m.name || m.email || 'สมาชิก',
    email: m.email || '',
    role: m.role || 'member',
    pending: m.pending ? 1 : 0,
    tone: TONES[i % TONES.length],
    avatar: (m.name || m.email || '?').slice(0,1).toUpperCase(),
    deleted: 0,
    _server: true,
  }));
}
function applyServerMembers(list){ Store.state.members = mapServerMembers(list); Store.notify(); }

export function render(ctx){
  const { state:s, icon, esc, D } = ctx;
  const isPro = Store.isPro();
  const loggedIn = Store.loggedIn();
  const serverMode = ctx.canSync ? ctx.canSync() : false;
  const token = s.session?.token || '';
  const loading = serverMode && _loadedFor !== token;

  const members = s.members.filter(m => !m.deleted);
  const seats = members.length;
  const full = seats >= MAX_SEATS;

  // only the household owner may change roles / remove members (server enforces this too).
  // when not logged in it's a pure demo → allow full interactivity.
  const amOwner = !loggedIn ? true
    : !!(s.session?.household?.owner_id && s.session?.user?.id && s.session.household.owner_id === s.session.user.id);

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
  const hint = serverMode
    ? `เพิ่มสมาชิกที่มีบัญชีอยู่แล้วด้วยอีเมล ร่วมกันได้สูงสุด ${MAX_SEATS} คน`
    : `ส่งคำเชิญทางอีเมล สมาชิกในแพ็กโปรร่วมกันได้สูงสุด ${MAX_SEATS} คน`;
  const invite = `
    <div class="panel mb18">
      <h3>เชิญสมาชิกใหม่</h3>
      <div class="muted small" style="margin:-8px 0 16px">${hint}</div>
      <div class="row gap10 wrap">
        <div class="field" style="flex:1;min-width:200px;box-shadow:var(--inset-sm)">
          ${icon('mail',16)}<input id="mn-invite" type="email" placeholder="อีเมลของเพื่อนร่วมทีม" autocomplete="off">
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
    const roleClickable = amOwner && !isOwner && (!serverMode || m.userId);
    const badge = `<button class="badge" ${roleClickable?`data-act="cycleRole" data-id="${esc(m.id)}"`:''}
        style="color:${role.color};background:${role.bg};${roleClickable?'cursor:pointer':'cursor:default'}"
        ${roleClickable?'title="แตะเพื่อเปลี่ยนสิทธิ์"':'disabled'}>${role.th}</button>`;
    const del = (amOwner && !isOwner) ?
      `<button class="btn icon sm" data-act="removeMember" data-id="${esc(m.id)}" title="นำออกจากทีม" style="color:var(--ink2)">${icon('trash',15)}</button>` : '';
    return `<div class="tx-row">
      <span class="avatar ${tone}" style="width:42px;height:42px;border-radius:13px;font-size:16px">${letter}</span>
      <div class="desc">
        <b>${esc(m.name)}</b>
        <small class="muted">${esc(m.email)}${m.pending?' · <span class="t-gold">รอตอบรับ</span>':''}</small>
      </div>
      <div class="row gap10" style="align-items:center">${badge}${del}</div>
    </div>`;
  };

  const listBody = loading
    ? `<div class="muted small" style="padding:18px 4px">กำลังโหลดสมาชิก…</div>`
    : (members.length
        ? members.map(row).join('')
        : `<div class="empty"><div class="tile">${icon('team',26)}</div><h3>ยังไม่มีสมาชิก</h3><p class="muted small">เชิญเพื่อนร่วมทีมด้วยอีเมลด้านบน</p></div>`);

  const list = `
    <div class="panel mb18">
      <div class="row between mb14"><h3 style="margin:0">สมาชิกในทีม</h3>
        <span class="pill"><span class="num">${loading?'—':seats}</span>/${MAX_SEATS} ที่นั่ง</span></div>
      ${listBody}
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
      <span class="pill"><span class="num">${loading?'—':seats}</span>/${MAX_SEATS} ที่นั่ง</span>
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

  const serverMode = ctx.canSync ? ctx.canSync() : false;
  if(serverMode){
    const token = ctx.state.session?.token || '';
    if(_loadedFor !== token){
      _loadedFor = token;
      Promise.resolve().then(() => api.members())
        .then(res => { if(res && Array.isArray(res.members)) applyServerMembers(res.members); })
        .catch(() => { _loadedFor = null; }); // allow a retry on the next render
    }
  } else if(!Store.loggedIn() && _loadedFor !== null){
    // fully logged out — drop any previous household's members from memory, restore the local seed
    _loadedFor = null;
    getAll('members').then(all => { Store.state.members = all.filter(x => !x.deleted); Store.notify(); }).catch(() => {});
  }
}

export const actions = {
  async inviteMember(){
    const inp = document.getElementById('mn-invite');
    const email = (inp?.value || '').trim().toLowerCase();
    if(!email || !email.includes('@')){ toast('กรอกอีเมลให้ถูกต้องก่อนนะ'); inp?.focus(); return; }
    const members = Store.state.members.filter(m => !m.deleted);
    if(members.length >= MAX_SEATS){ toast(`ที่นั่งเต็มแล้ว (${MAX_SEATS}/${MAX_SEATS})`); return; }

    if(canSync()){
      try{
        const res = await api.invite(email);
        if(res && Array.isArray(res.members)) applyServerMembers(res.members);
        if(inp) inp.value = '';
        toast('เพิ่มสมาชิกเข้าบ้านแล้ว');
      }catch(e){ toast(e?.message || 'เชิญสมาชิกไม่สำเร็จ'); }
      return;
    }

    // offline / demo — optimistic local
    if(members.some(m => (m.email||'').toLowerCase() === email || (m.name||'').toLowerCase() === email)){
      toast('เชิญอีเมลนี้ไปแล้ว'); return;
    }
    await Store.upsert('members', {
      name: email, email: 'รอตอบรับคำเชิญ', role: 'member',
      avatar: email.slice(0,1).toUpperCase(), tone: TONES[members.length % TONES.length], pending: 1,
    });
    if(inp) inp.value = '';
    toast('ส่งคำเชิญแล้ว!');
  },

  async cycleRole(el){
    const id = el.dataset.id;
    const m = Store.state.members.find(x => x.id === id && !x.deleted);
    if(!m || m.role === 'owner') return;
    const next = m.role === 'admin' ? 'member' : 'admin';

    if(canSync()){
      if(!m.userId){ toast('สมาชิกยังไม่ตอบรับคำเชิญ — เปลี่ยนสิทธิ์ยังไม่ได้'); return; }
      try{
        const res = await api.setRole(m.userId, next);
        if(res && Array.isArray(res.members)) applyServerMembers(res.members);
        toast(next === 'admin' ? 'ตั้งเป็นแอดมินแล้ว' : 'ตั้งเป็นสมาชิกแล้ว');
      }catch(e){ toast(e?.message || 'เปลี่ยนสิทธิ์ไม่สำเร็จ'); }
      return;
    }

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

    if(canSync()){
      try{
        const res = await api.removeMember(m.userId || '', m.userId ? '' : (m.email || ''));
        if(res && Array.isArray(res.members)) applyServerMembers(res.members);
        toast('นำสมาชิกออกแล้ว');
      }catch(e){ toast(e?.message || 'นำสมาชิกออกไม่สำเร็จ'); }
      return;
    }

    await Store.remove('members', id);
    toast('นำสมาชิกออกแล้ว');
  },
};
