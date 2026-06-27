// views/settings.js — appearance, preferences, account & data management
import { Store } from '../state.js';
import { toast, confirmDialog } from '../ui.js';

export function render(ctx){
  const { state:s, icon, esc, D } = ctx;
  const loggedIn = ctx.S.loggedIn();
  const isPro = ctx.S.isPro();
  const user = s.session?.user;
  const sw = s.settings || {};

  // ---- palette swatches ----
  const swatches = Object.entries(D.PALETTES).map(([name, p]) => {
    const active = s.palette === name;
    return `<button class="swatch-btn ${active?'on':''}" data-act="setPalette" data-v="${esc(name)}" title="${esc(name)}"
        style="display:flex;flex-direction:column;align-items:center;gap:8px;border:0;background:transparent;cursor:pointer;font-family:inherit">
      <span style="width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,${p.a1} 50%,${p.a2} 50%);
        box-shadow:${active?'var(--inset)':'var(--raise)'};display:grid;place-items:center">
        ${active?`<span style="color:#fff;filter:drop-shadow(0 1px 1px rgba(0,0,0,.3))">${icon('check',18,2.5)}</span>`:''}
      </span>
      <span class="tiny ${active?'b t-gold':'muted'}" style="font-weight:700">${esc(name)}</span>
    </button>`;
  }).join('');

  // ---- preference rows ----
  const prefRow = (k, label, desc) => `<div class="row between gap14 ${k!=='rollover'?'mb18':''}">
    <div style="min-width:0"><div class="b" style="font-size:13.5px">${label}</div><div class="muted tiny mt6">${desc}</div></div>
    <button class="switch ${sw[k]?'on':''}" data-act="setSetting" data-k="${k}" aria-label="${label}"><i></i></button>
  </div>`;

  return `
  <div class="page-head">
    <div class="eyebrow">SETTINGS · ตั้งค่า</div>
    <h1>ตั้งค่า</h1>
    <div class="sub">ปรับแต่งรูปลักษณ์ การแจ้งเตือน และจัดการบัญชี &amp; ข้อมูลของคุณ</div>
  </div>

  <div class="grid g-split">
    <div class="col gap18" style="min-width:0">

      <div class="panel">
        <h3>รูปลักษณ์</h3>
        <label class="lbl">โทนสี</label>
        <div class="row wrap" style="gap:18px;margin:6px 0 6px">${swatches}</div>
        <div class="row between gap14 mt24" style="padding-top:18px;border-top:1px solid var(--sd)">
          <div style="min-width:0"><div class="b" style="font-size:13.5px">โหมดมืด</div>
            <div class="muted tiny mt6">สลับธีมสว่าง / มืด ถนอมสายตายามค่ำคืน</div></div>
          <button class="switch ${s.dark?'on':''}" data-act="toggleDark" aria-label="โหมดมืด"><i></i></button>
        </div>
      </div>

      <div class="panel">
        <h3>การแจ้งเตือน &amp; งบประมาณ</h3>
        ${prefRow('notif', 'แจ้งเตือนเมื่อใกล้สิ้นเดือน', 'เตือนสรุปยอดและรายการประจำก่อนสิ้นเดือน')}
        ${prefRow('overBudgetAlert', 'แจ้งเตือนเมื่อใช้เกินงบ', 'เด้งเตือนทันทีเมื่อยอดใช้จ่ายเกินงบที่ตั้งไว้')}
        ${prefRow('rollover', 'ยกยอดงบไปเดือนถัดไป', 'งบที่เหลือจะถูกบวกเพิ่มให้เดือนถัดไปอัตโนมัติ')}
      </div>

    </div>

    <div class="col gap18" style="min-width:0">

      <div class="panel">
        <h3>บัญชี &amp; แพ็กเกจ</h3>
        <div class="row between gap10 mb18">
          <span class="muted small">แพ็กเกจปัจจุบัน</span>
          <span class="pill" style="${isPro?'color:var(--d2);background:var(--a1s)':''}">
            ${icon(isPro?'crown':'star',13)} ${isPro?'โปร':'ฟรี'}
          </span>
        </div>
        ${loggedIn ? `
        <div class="row gap10 mb18" style="padding:13px 15px;border-radius:15px;box-shadow:var(--inset-sm)">
          <span class="avatar gold" style="width:40px;height:40px;border-radius:12px;flex:none">${esc((user?.name||'ก').slice(0,1))}</span>
          <div style="flex:1;min-width:0">
            <div class="b" style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(user?.name||'ผู้ใช้')}</div>
            <div class="muted tiny" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${icon('mail',11)} ${esc(user?.email||'')}</div>
          </div>
        </div>
        <button class="btn block btn-neg" data-act="logout" style="color:#fff">${icon('logout',16)} ออกจากระบบ</button>
        ` : `
        <div class="empty" style="padding:22px 16px">
          <div class="tile" style="width:54px;height:54px;margin-bottom:12px">${icon('lock',24)}</div>
          <p class="muted small" style="margin:0 0 16px">เข้าสู่ระบบเพื่อซิงก์ข้อมูลทุกเครื่องและใช้ร่วมกันทั้งบ้าน</p>
        </div>
        <button class="btn block btn-primary mb10" data-act="nav" data-id="login">${icon('user',16)} เข้าสู่ระบบ / สมัคร</button>
        <button class="btn block" data-act="nav" data-id="pricing">${icon('crown',16)} อัปเกรดเป็นโปร</button>
        `}
      </div>

      <div class="panel">
        <h3>ข้อมูล</h3>
        <button class="btn block mb10" data-act="exportJson">${icon('download',16)} ส่งออกข้อมูล (JSON)</button>
        <button class="btn block btn-neg" data-act="resetAll" style="color:#fff">${icon('trash',16)} ล้างข้อมูลทั้งหมด</button>
        <div class="muted tiny mt14" style="line-height:1.6">
          การส่งออกจะดาวน์โหลดไฟล์สำรองข้อมูลทั้งหมดบนเครื่องนี้ ส่วนการล้างข้อมูลจะลบรายการ บัญชี และโน้ตทั้งหมดอย่างถาวร
        </div>
      </div>

      <div class="row center muted tiny" style="gap:7px;padding:6px 0">
        <span class="logo" style="width:22px;height:22px;font-size:13px;border-radius:8px">฿</span>
        บัญชีนวล v1.0
      </div>

    </div>
  </div>`;
}

export const actions = {
  async setPalette(el){
    const v = el.dataset.v;
    if(!v || v === Store.state.palette) return;
    await Store.setPref('palette', v);
    toast('โทนสี: ' + v);
  },

  async setSetting(el){
    const k = el.dataset.k;
    if(!k) return;
    const next = { ...(Store.state.settings || {}) };
    next[k] = !next[k];
    Store.state.settings = next;
    await Store.setPref('settings', next);
    const labels = { notif:'แจ้งเตือนใกล้สิ้นเดือน', overBudgetAlert:'แจ้งเตือนใช้เกินงบ', rollover:'ยกยอดงบ' };
    toast((labels[k] || 'การตั้งค่า') + (next[k] ? ' · เปิด' : ' · ปิด'));
  },

  exportJson(){
    const s = Store.state;
    const payload = {
      app: 'moneynual',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      prefs: {
        palette: s.palette,
        dark: s.dark,
        budgets: s.budgets,
        settings: s.settings,
        billingCycle: s.billingCycle,
      },
      data: {
        tx: (s.tx || []).filter(x => !x.deleted),
        accounts: (s.accounts || []).filter(x => !x.deleted),
        recurring: (s.recurring || []).filter(x => !x.deleted),
        notes: (s.notes || []).filter(x => !x.deleted),
        members: (s.members || []).filter(x => !x.deleted),
      },
    };
    try{
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'moneynual-backup.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      toast('ส่งออกข้อมูลแล้ว ✓');
    }catch(e){
      toast('ส่งออกไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  },

  async resetAll(){
    const ok = await confirmDialog({
      title: 'ล้างข้อมูลทั้งหมด',
      message: 'รายการ บัญชี งบประมาณ และโน้ตทั้งหมดบนเครื่องนี้จะถูกลบอย่างถาวร และไม่สามารถกู้คืนได้ ต้องการดำเนินการต่อใช่ไหม?',
      ok: 'ล้างข้อมูลทั้งหมด',
      cancel: 'ยกเลิก',
      danger: true,
    });
    if(!ok) return;
    try{
      await Store.resetData();
      toast('ล้างข้อมูลแล้ว กำลังเริ่มใหม่…');
      setTimeout(() => { try{ location.reload(); }catch(e){ location.href = location.pathname; } }, 400);
    }catch(e){
      toast('ล้างข้อมูลไม่สำเร็จ ลองใหม่อีกครั้ง');
    }
  },
};
