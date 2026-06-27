// views/login.js — chromeless Login / Sign-up (matches login.png). Real backend auth + offline fallback.
import { Store } from '../state.js';
import { toast } from '../ui.js';
import { api, ApiError, setToken } from '../api.js';
import { kvSet } from '../db.js';
import { afterLogin } from '../sync.js';

// module-scoped auth mode (kept out of Store; Store.notify() re-renders on toggle)
let mode = 'login';
let busy = false;

export function render(ctx){
  const { icon } = ctx;
  const signup = mode === 'signup';

  const heading = signup ? 'สร้างบัญชีใหม่' : 'ยินดีต้อนรับกลับ';
  const sub = signup ? 'สมัครฟรี เริ่มจัดการเงินของคุณวันนี้' : 'เข้าสู่ระบบเพื่อจัดการเงินของคุณ';

  const nameField = signup ? `
    <div class="mb14">
      <label class="lbl" for="mn-name">ชื่อ</label>
      <div class="field">${icon('user',18)}<input id="mn-name" type="text" autocomplete="name" placeholder="ชื่อของคุณ"></div>
    </div>` : '';

  const forgotLink = signup ? '' : `
    <div class="right mt6"><a class="small b t-gold" data-act="forgotPass" style="cursor:pointer">ลืมรหัสผ่าน?</a></div>`;

  const submitLabel = signup ? 'สมัครฟรี' : 'เข้าสู่ระบบ';
  const toggleText = signup
    ? `มีบัญชีแล้ว? <a class="b t-gold" data-act="toggleAuthMode" style="cursor:pointer">เข้าสู่ระบบ</a>`
    : `ยังไม่มีบัญชี? <a class="b t-gold" data-act="toggleAuthMode" style="cursor:pointer">สมัครฟรี</a>`;

  return `
  <div class="auth-wrap">
    <div class="auth-card">
      <div class="center" style="text-align:center">
        <div class="tile gold center" style="width:54px;height:54px;border-radius:17px;font-family:'Sora';font-weight:800;font-size:26px;margin:0 auto 14px;text-shadow:0 1px 2px rgba(0,0,0,.22)">฿</div>
        <h1 style="font-family:'Sora';font-weight:800;font-size:23px;margin:0 0 6px">${ctx.esc(heading)}</h1>
        <div class="muted small mb18">${ctx.esc(sub)}</div>
      </div>

      <button class="btn block" data-act="googleLogin">${icon('google',18)} ดำเนินการต่อด้วย Google</button>

      <div class="divider">หรือ</div>

      <form data-act="submitAuth">
        ${nameField}
        <div class="mb14">
          <label class="lbl" for="mn-email">อีเมล</label>
          <div class="field">${icon('mail',18)}<input id="mn-email" type="email" autocomplete="email" placeholder="you@email.com"></div>
        </div>
        <div>
          <label class="lbl" for="mn-pass">รหัสผ่าน</label>
          <div class="field">${icon('lock',18)}<input id="mn-pass" type="password" autocomplete="${signup?'new-password':'current-password'}" placeholder="••••••••"></div>
        </div>
        ${forgotLink}
        <button type="submit" class="btn-primary btn block mt18" ${busy?'disabled':''}>${busy?'กำลังดำเนินการ…':submitLabel}</button>
      </form>

      <div class="center small muted mt18" style="text-align:center">${toggleText}</div>

      <div class="center mt14" style="text-align:center">
        <a class="small muted" data-act="nav" data-id="dashboard" style="cursor:pointer">← ใช้งานต่อแบบออฟไลน์ (ไม่ต้องล็อกอิน)</a>
      </div>
    </div>
  </div>`;
}

export function afterRender(ctx, root){
  const email = root.querySelector('#mn-email');
  if(email) email.focus();
}

export const actions = {
  toggleAuthMode(){
    mode = mode === 'login' ? 'signup' : 'login';
    Store.notify();
  },

  googleLogin(){ toast('ฟีเจอร์นี้เปิดให้บริการเร็วๆ นี้'); },
  forgotPass(){ toast('ฟีเจอร์นี้เปิดให้บริการเร็วๆ นี้'); },

  async submitAuth(el, ev){
    if(ev) ev.preventDefault();
    if(busy) return;

    const root = (el.closest && el.closest('.auth-card')) || document;
    const email = (root.querySelector('#mn-email')?.value || '').trim();
    const pass = root.querySelector('#mn-pass')?.value || '';
    const name = (root.querySelector('#mn-name')?.value || '').trim();
    const signup = mode === 'signup';

    if(!email.includes('@')){ toast('กรุณากรอกอีเมลให้ถูกต้อง'); return; }
    if(pass.length < 6){ toast('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'); return; }
    if(signup && !name){ toast('กรุณากรอกชื่อของคุณ'); return; }

    busy = true; Store.notify();
    try{
      const result = signup ? await api.register(email, pass, name) : await api.login(email, pass);
      const data = result;
      setToken(data.token);
      Store.state.session = data;
      await kvSet('session', data);
      await afterLogin();
      Store.set({ view:'dashboard' });
      toast(signup ? 'สมัครสำเร็จ! ยินดีต้อนรับ' : 'เข้าสู่ระบบสำเร็จ');
    }catch(e){
      if(e instanceof ApiError && e.status === 0){
        toast('ออฟไลน์อยู่ — ใช้งานแบบไม่ล็อกอินได้เลย');
      }else{
        toast(e?.message || 'เข้าสู่ระบบไม่สำเร็จ');
      }
    }finally{
      busy = false; Store.notify();
    }
  },
};
