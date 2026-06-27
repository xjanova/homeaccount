// views/pricing.js — plans & pricing: billing-cycle toggle + free/pro plan cards
import { Store } from '../state.js';
import { toast } from '../ui.js';
import { api, ApiError } from '../api.js';
import { runSync } from '../sync.js';
import { kvSet } from '../db.js';

export function render(ctx){
  const { state:s, D, icon, fmtNum, esc } = ctx;
  const cycle = s.billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const curPlan = ctx.S.plan();

  const seg = `
    <div class="seg">
      <button class="${cycle==='monthly'?'on':''}" data-act="setCycle" data-v="monthly">รายเดือน</button>
      <button class="${cycle==='yearly'?'on':''}" data-act="setCycle" data-v="yearly">รายปี · ลด 17%</button>
    </div>`;

  // build one plan card
  const card = (id) => {
    const p = D.PLANS[id];
    const isPro = id === 'pro';
    const isCurrent = curPlan === id;
    const price = cycle === 'yearly' ? p.yearly : p.monthly;
    const unit = cycle === 'yearly' ? '/ปี' : '/เดือน';

    // price block
    let priceHtml;
    if(price === 0){
      priceHtml = `<div class="price num">฿0</div>
        <div class="muted small" style="${isPro?'color:rgba(255,255,255,.85)':''}">ไม่มีค่าใช้จ่าย</div>`;
    } else {
      const perMonth = isPro && cycle === 'yearly' ? Math.round(p.yearly/12) : null;
      priceHtml = `<div class="price num">฿${fmtNum(price)}<span style="font-size:15px;font-weight:600;opacity:.8"> ${unit}</span></div>
        ${perMonth!=null
          ? `<div class="small" style="${isPro?'color:rgba(255,255,255,.85)':'color:var(--ink2)'}">≈฿${fmtNum(perMonth)}/เดือน · เรียกเก็บรายปี</div>`
          : `<div class="small" style="${isPro?'color:rgba(255,255,255,.85)':'color:var(--ink2)'}">เรียกเก็บ${cycle==='yearly'?'รายปี':'รายเดือน'}</div>`}`;
    }

    const check = icon('check', 15);
    const cross = icon('x', 15);
    const feats = [
      ...p.features.map(f => `<div class="feat">${check}<span>${esc(f)}</span></div>`),
      ...p.missing.map(f => `<div class="feat miss">${cross}<span>${esc(f)}</span></div>`),
    ].join('');

    // CTA
    let cta;
    if(isCurrent){
      cta = `<button class="btn block ${isPro?'':'raise'} mt6" disabled style="opacity:.7;cursor:default">${icon('check',16)} แพ็กปัจจุบัน</button>`;
    } else if(isPro){
      cta = `<button class="btn block btn-primary mt6" data-act="selectPlan" data-v="pro">${icon('crown',16)} อัปเกรดเป็นโปร</button>`;
    } else {
      cta = `<button class="btn block raise mt6" data-act="selectPlan" data-v="free">ใช้แพ็กฟรี</button>`;
    }

    return `
      <div class="plan-card ${isPro?'pro':''}">
        ${isPro ? '<span class="ribbon">แนะนำ</span>' : ''}
        <div class="eyebrow" style="${isPro?'color:rgba(255,255,255,.9)':''}">${esc(p.en)}</div>
        <h3 style="margin:0;font-size:21px;${isPro?'color:#fff':''}">${esc(p.name)}</h3>
        <div class="small" style="${isPro?'color:rgba(255,255,255,.85)':'color:var(--ink2)'}">${esc(p.tagline)}</div>
        <div class="mt6">${priceHtml}</div>
        <div class="mt10">${feats}</div>
        ${cta}
      </div>`;
  };

  return `
  <div class="page-head" style="text-align:center">
    <div class="eyebrow">PLANS · แพ็กเกจ</div>
    <h1>เลือกแพ็กเกจที่ใช่สำหรับคุณ</h1>
    <div class="sub">เริ่มฟรีได้เลย อัปเกรดเมื่อพร้อม ยกเลิกได้ทุกเมื่อ</div>
  </div>

  <div class="row mb24" style="justify-content:center">${seg}</div>

  <div class="grid g-split">
    ${card('free')}
    ${card('pro')}
  </div>`;
}

export const actions = {
  async setCycle(el){
    const v = el.dataset.v === 'yearly' ? 'yearly' : 'monthly';
    if(v === Store.state.billingCycle) return;
    await Store.setPref('billingCycle', v);
  },

  async selectPlan(el){
    const plan = el.dataset.v;
    const cycle = Store.state.billingCycle === 'yearly' ? 'yearly' : 'monthly';

    if(plan === 'free'){
      // best-effort server update; ignore offline / errors
      if(Store.loggedIn()){
        try{ await api.setPlan('free', cycle); }catch(e){ /* offline-tolerant */ }
        const session = Store.state.session;
        if(session?.user){
          session.user.plan = 'free';
          if(session.household) session.household.plan = 'free';
          await kvSet('session', session);
        }
      }
      Store.set({ session: Store.state.session });
      toast('ใช้แพ็กฟรีแล้ว');
      return;
    }

    if(plan === 'pro'){
      if(!Store.loggedIn()){
        Store.set({ view:'login' });
        toast('เข้าสู่ระบบเพื่ออัปเกรด');
        return;
      }
      try{
        await api.setPlan('pro', Store.state.billingCycle);
        const session = Store.state.session;
        if(session?.user){
          session.user.plan = 'pro';
          if(session.household){
            session.household.plan = 'pro';
            session.household.billing_cycle = Store.state.billingCycle;
          }
          await kvSet('session', session);
        }
        Store.set({ session: Store.state.session });
        toast('อัปเกรดเป็นโปรแล้ว! ซิงก์ออนไลน์เปิดใช้งาน');
        runSync('upgrade');
      }catch(e){
        const msg = (e instanceof ApiError) ? e.message : 'อัปเกรดไม่สำเร็จ ลองใหม่อีกครั้ง';
        toast(msg);
        Store.set({ session: Store.state.session });
      }
    }
  },
};
