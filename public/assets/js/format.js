// format.js — Thai-aware money & date formatting, ids, misc helpers
export const TH_MONTHS = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
export const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
export const TH_DOW = ['อา','จ','อ','พ','พฤ','ศ','ส'];

// ฿1,234  /  -฿1,234
export function fmt(n){
  const neg = n < 0;
  return (neg ? '-' : '') + '฿' + Math.abs(Math.round(n)).toLocaleString('en-US');
}
// compact: ฿1.5K / ฿85
export function fmtK(n){
  const a = Math.abs(n), s = n < 0 ? '-' : '';
  if(a >= 1000) return s + '฿' + (a/1000).toFixed(a >= 100000 ? 0 : 1).replace(/\.0$/,'') + 'K';
  return s + '฿' + Math.round(a);
}
export function fmtNum(n){ return Math.round(n).toLocaleString('en-US'); }

// "25 มิ.ย. 2569"
export function fmtDate(iso){
  const d = toDate(iso); if(!d) return '';
  return d.getDate() + ' ' + TH_MONTHS_SHORT[d.getMonth()] + ' ' + (d.getFullYear()+543);
}
export function fmtDateLong(iso){
  const d = toDate(iso); if(!d) return '';
  return d.getDate() + ' ' + TH_MONTHS[d.getMonth()] + ' ' + (d.getFullYear()+543);
}
export function monthLabel(m, y){ return TH_MONTHS[m] + ' ' + (y+543); }

export function toDate(v){
  if(v instanceof Date) return v;
  if(typeof v === 'string'){ const d = new Date(v + (v.length===10?'T00:00:00':'')); return isNaN(d)?null:d; }
  if(typeof v === 'number'){ const d = new Date(v); return isNaN(d)?null:d; }
  return null;
}
export function isoToday(now){ return ymd(now || new Date()); }
export function ymd(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

export function greeting(now){
  const h = (now||new Date()).getHours();
  if(h < 11) return 'สวัสดีตอนเช้า';
  if(h < 14) return 'สวัสดีตอนเที่ยง';
  if(h < 18) return 'สวัสดีตอนบ่าย';
  return 'สวัสดีตอนค่ำ';
}

// stable client-side id (works offline; https → crypto.randomUUID present)
export function uid(){
  if(globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'x'+Date.now().toString(36)+Math.random().toString(36).slice(2,10);
}
export function now(){ return Date.now(); }

// escape user content before injecting into innerHTML (XSS guard)
export function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function clamp(n,a,b){ return Math.max(a, Math.min(b, n)); }
