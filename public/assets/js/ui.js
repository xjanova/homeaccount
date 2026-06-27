// ui.js — theme application, toast, and small DOM helpers
import { BASES, PALETTES } from './data.js';

export function applyTheme(state){
  const r = document.querySelector('.app-root') || document.documentElement;
  const mode = state.dark ? 'dark' : 'light';
  const b = BASES[mode];
  const P = PALETTES[state.palette] || PALETTES['ทองคำ'];
  const dk = mode === 'dark';
  const set = (k,v)=> r.style.setProperty(k,v);
  set('--bg',b.bg); set('--surf',b.surf); set('--sd',b.sd); set('--sl',b.sl); set('--ink',b.ink); set('--ink2',b.ink2);
  set('--a1',P.a1); set('--a2',P.a2); set('--d1',P.d1); set('--d2',P.d2);
  set('--a1s',P[mode].a1s); set('--a2s',P[mode].a2s);
  set('--pos', dk ? '#6fc79e' : '#4f9e7e');
  set('--neg', dk ? '#e0916b' : '#cf6f4a');
  set('--raise','2px 2px 5px var(--sd),-2px -2px 5px var(--sl),inset 0 1px 1.5px '+(dk?'rgba(255,255,255,.10)':'rgba(255,255,255,.55)')+',inset 0 -1px 1.5px '+(dk?'rgba(0,0,0,.25)':'rgba(120,100,70,.10)'));
  const radial = dk
    ? 'radial-gradient(1200px 700px at 80% -5%, '+P.dark.a2s+' 0%, transparent 55%)'
    : 'radial-gradient(1200px 700px at 82% -8%, '+P.light.a1s+' 0%, transparent 52%)';
  r.style.background = radial + ', ' + b.bg;
  // PWA theme-color
  const meta = document.querySelector('meta[name="theme-color"]'); if(meta) meta.setAttribute('content', b.bg);
  document.documentElement.style.colorScheme = dk ? 'dark' : 'light';
}

let toastTimer = null;
export function toast(msg, ms=2200){
  let el = document.getElementById('mn-toast');
  if(!el){ el = document.createElement('div'); el.id='mn-toast'; document.body.appendChild(el); }
  el.className = 'toast'; el.innerHTML = `<span>✓</span><span>${escapeHtml(msg)}</span>`;
  el.style.display = 'flex';
  if(toastTimer) clearTimeout(toastTimer);
  // restart animation
  el.style.animation='none'; void el.offsetWidth; el.style.animation='';
  toastTimer = setTimeout(()=>{ el.style.display='none'; }, ms);
}

export function escapeHtml(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

// confirm dialog (promise) — neumorphic, replaces window.confirm
export function confirmDialog({ title='ยืนยัน', message='', ok='ยืนยัน', cancel='ยกเลิก', danger=false }={}){
  return new Promise(resolve => {
    const back = document.createElement('div'); back.className='modal-backdrop';
    back.innerHTML = `<div class="modal" style="max-width:380px">
      <h2>${escapeHtml(title)}</h2>
      <p class="muted" style="margin:8px 0 20px; font-size:13px; line-height:1.55">${escapeHtml(message)}</p>
      <div class="row gap10"><button class="btn block" data-r="0">${escapeHtml(cancel)}</button>
      <button class="btn block ${danger?'btn-neg':'btn-primary'}" data-r="1">${escapeHtml(ok)}</button></div></div>`;
    back.addEventListener('click', e => {
      const b = e.target.closest('[data-r]');
      if(b){ cleanup(); resolve(b.dataset.r==='1'); }
      else if(e.target===back){ cleanup(); resolve(false); }
    });
    function cleanup(){ back.remove(); }
    document.body.appendChild(back);
  });
}
