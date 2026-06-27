// data.js — domain constants + first-run seed (mirrors the design handoff)
import { uid, now, isoToday } from './format.js';

export const BASES = {
  light:{ bg:'#f3eee4', surf:'#ece5d8', sd:'#cdc1ad', sl:'#fffdf7', ink:'#544c40', ink2:'#9a8f7c' },
  dark: { bg:'#1d1912', surf:'#272118', sd:'#100d08', sl:'#352b1d', ink:'#ece3d2', ink2:'#a89c84' }
};
export const PALETTES = {
  'ทองคำ':      { a1:'#e6b347', a2:'#d98e3f', d1:'#b8892a', d2:'#b06f2f', light:{a1s:'#f6eccf',a2s:'#f4e3cc'}, dark:{a1s:'#3a2f16',a2s:'#372917'} },
  'นวลชมพู':    { a1:'#e69ec0', a2:'#b79ae8', d1:'#cf6f9c', d2:'#8c6fd6', light:{a1s:'#f9e0ea',a2s:'#e9e0f8'}, dark:{a1s:'#3a2530',a2s:'#2c2640'} },
  'ลาเวนเดอร์': { a1:'#c4a6e0', a2:'#9fb0e8', d1:'#9a6fc4', d2:'#6f82d6', light:{a1s:'#ece2f7',a2s:'#e2e7fb'}, dark:{a1s:'#2f2740',a2s:'#262a44'} },
  'มินต์':      { a1:'#86cfae', a2:'#8fbfe0', d1:'#4f9e7e', d2:'#5689b8', light:{a1s:'#e0f1ea',a2s:'#e1eef7'}, dark:{a1s:'#1f3a30',a2s:'#1f3340'} },
  'มหาสมุทร':   { a1:'#6fc3d4', a2:'#7d9ee0', d1:'#4d97a6', d2:'#5f78c2', light:{a1s:'#dbeff3',a2s:'#e0e6f9'}, dark:{a1s:'#1d3940',a2s:'#212a48'} },
  'พระอาทิตย์': { a1:'#f0a86a', a2:'#ec828f', d1:'#d6824a', d2:'#cf6f7c', light:{a1s:'#fae6d6',a2s:'#fbdfe3'}, dark:{a1s:'#3d2c1c',a2s:'#3a2226'} },
};

// categories: id -> {th, kind(รายจ่าย/รายรับ/ทั่วไป), icon, color, tint}
export const CATS = {
  food:      { th:'อาหาร & เครื่องดื่ม', kind:'รายจ่าย', icon:'tag',     color:'oklch(0.55 0.15 50)',  tint:'oklch(0.93 0.05 50)' },
  transport: { th:'เดินทาง',            kind:'รายจ่าย', icon:'trend',   color:'oklch(0.54 0.14 28)',  tint:'oklch(0.93 0.05 28)' },
  housing:   { th:'ที่พัก / ค่าบ้าน',    kind:'รายจ่าย', icon:'home',    color:'oklch(0.54 0.13 350)', tint:'oklch(0.93 0.045 350)' },
  shopping:  { th:'ช้อปปิ้ง',            kind:'รายจ่าย', icon:'tag',     color:'oklch(0.54 0.14 300)', tint:'oklch(0.93 0.045 300)' },
  utility:   { th:'สาธารณูปโภค',         kind:'รายจ่าย', icon:'bolt',    color:'oklch(0.52 0.12 220)', tint:'oklch(0.92 0.045 220)' },
  health:    { th:'สุขภาพ',              kind:'รายจ่าย', icon:'shield',  color:'oklch(0.53 0.12 165)', tint:'oklch(0.92 0.045 165)' },
  entertain: { th:'บันเทิง',             kind:'รายจ่าย', icon:'star',    color:'oklch(0.55 0.14 90)',  tint:'oklch(0.93 0.05 90)' },
  salary:    { th:'เงินเดือน',           kind:'รายรับ',  icon:'wallet',  color:'oklch(0.48 0.12 158)', tint:'oklch(0.92 0.05 158)' },
  other:     { th:'อื่นๆ',               kind:'ทั่วไป',  icon:'tag',     color:'oklch(0.50 0.04 70)',  tint:'oklch(0.91 0.02 70)' },
};
export const EXPENSE_CATS = ['food','transport','housing','shopping','utility','health','entertain','other'];
export const INCOME_CATS  = ['salary','other'];

export const DEFAULT_BUDGETS = { food:14000, transport:6000, housing:14000, shopping:9000, utility:6000, health:3000, entertain:2500 };

export const ACCOUNT_SEED = [
  { id:uid(), name:'เงินสด',      type:'CASH',     icon:'cash', balance:18450,  numLabel:'กระเป๋าเงินสด', tone:'gold' },
  { id:uid(), name:'ธนาคารกสิกร', type:'SAVINGS',  icon:'bank', balance:256780, numLabel:'•••• 1234',     tone:'teal' },
  { id:uid(), name:'บัตรเครดิต',  type:'CREDIT',   icon:'card', balance:-23400, numLabel:'•••• 8842',     tone:'rose' },
  { id:uid(), name:'พร้อมเพย์',   type:'E-WALLET', icon:'qr',   balance:5230,   numLabel:'•••• 5678',     tone:'lav'  },
];

export const MONTHS_HIST = [
  { label:'ม.ค.', inc:120000, exp:78000 },
  { label:'ก.พ.', inc:132000, exp:81000 },
  { label:'มี.ค.', inc:118000, exp:92000 },
  { label:'เม.ย.', inc:145000, exp:88000 },
  { label:'พ.ค.', inc:138000, exp:95000 },
];

export const RECURRING_SEED = [
  { id:uid(), day:25, type:'income',  cat:'salary',    amount:45000, label:'เงินเดือน' },
  { id:uid(), day:1,  type:'expense', cat:'food',      amount:3000,  label:'ตุนของเข้าบ้าน' },
  { id:uid(), day:3,  type:'expense', cat:'utility',   amount:700,   label:'อินเทอร์เน็ต' },
  { id:uid(), day:5,  type:'expense', cat:'housing',   amount:12000, label:'ค่าผ่อนบ้าน' },
  { id:uid(), day:8,  type:'expense', cat:'utility',   amount:1850,  label:'ค่าไฟ + ค่าน้ำ' },
  { id:uid(), day:12, type:'expense', cat:'utility',   amount:499,   label:'ค่าโทรศัพท์' },
  { id:uid(), day:15, type:'expense', cat:'entertain', amount:599,   label:'Netflix + Spotify' },
  { id:uid(), day:20, type:'expense', cat:'health',    amount:1500,  label:'ประกันสุขภาพ' },
  { id:uid(), day:28, type:'expense', cat:'other',     amount:5000,  label:'ออมเงิน / กองทุน' },
];

export const PLANS = {
  free:{ name:'ฟรี', en:'FREE', monthly:0, yearly:0, tagline:'เริ่มจัดการเงินส่วนตัว',
    features:['บันทึกรายรับรายจ่ายไม่จำกัด','งบประมาณ 3 หมวด','รายงานพื้นฐาน','1 ผู้ใช้','ใช้งานออฟไลน์'],
    missing:['ซิงก์ออนไลน์หลายเครื่อง','ทีม & หลายผู้ใช้','ส่งออก Excel / PDF'] },
  pro:{ name:'โปร', en:'PRO', monthly:149, yearly:1490, tagline:'ครบทุกฟีเจอร์ สำหรับครอบครัว & ธุรกิจเล็ก',
    features:['ทุกอย่างในแพ็กฟรี','ซิงก์ออนไลน์ทุกเครื่อง','งบประมาณไม่จำกัด','ปฏิทินรายการประจำ + โน้ต','ทีมสูงสุด 5 คน','ส่งออก Excel / PDF','รายงานขั้นสูง & เป้าหมายออม'],
    missing:[] },
};

export const INVOICES_DEMO = [
  { id:'INV-2606', date:'2026-06-25', amount:1490, plan:'โปร · รายปี',    status:'paid' },
  { id:'INV-2506', date:'2026-05-25', amount:149,  plan:'โปร · รายเดือน', status:'paid' },
  { id:'INV-2504', date:'2026-04-25', amount:149,  plan:'โปร · รายเดือน', status:'paid' },
  { id:'INV-2503', date:'2026-03-25', amount:149,  plan:'โปร · รายเดือน', status:'paid' },
];

export const ROLE_META = {
  owner:  { th:'เจ้าของ', color:'var(--d2)',              bg:'var(--a1s)' },
  admin:  { th:'แอดมิน',  color:'oklch(0.5 0.12 220)',    bg:'oklch(0.92 0.045 220)' },
  member: { th:'สมาชิก',  color:'var(--ink2)',            bg:'var(--surf)' },
};

export const NOTE_COLORS = [
  { bg:'#fbeec6', edge:'#f1d98e', ink:'#6b5b27' },
  { bg:'#fbdcc9', edge:'#f1c1a0', ink:'#7a4d33' },
  { bg:'#d8efda', edge:'#b2e0b8', ink:'#345f43' },
  { bg:'#e1ddf6', edge:'#c4bdec', ink:'#453d6e' },
  { bg:'#fbd6e4', edge:'#f2b4cc', ink:'#7a3852' },
  { bg:'#d6e9f7', edge:'#b0d4ed', ink:'#335872' },
];

export const SCOPES = [
  { id:'all',      th:'ทั้งหมด',   icon:'list' },
  { id:'personal', th:'ส่วนตัว',   icon:'user' },
  { id:'home',     th:'บ้าน',      icon:'home' },
  { id:'office',   th:'สำนักงาน', icon:'building' },
];
export function scopeName(sc){ return ({all:'ทุกประเภท',personal:'ส่วนตัว',home:'บ้าน',office:'สำนักงาน'})[sc] || sc; }

// ---- demo transactions for first run (so the app never looks empty) ----
export function seedTransactions(){
  const acc = ACCOUNT_SEED;
  const A = i => acc[i].id;
  const t = isoToday();
  const d = (offset) => { const x = new Date(); x.setDate(x.getDate()-offset); return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0'); };
  const mk = (o) => ({ id:uid(), updatedAt:now(), deleted:0, ...o });
  return [
    mk({ type:'income',  cat:'salary',    amount:45000, accountId:A(1), scope:'personal', note:'เงินเดือน',          date:d(2) }),
    mk({ type:'income',  cat:'other',     amount:1500,  accountId:A(0), scope:'personal', note:'ขายของมือสอง',       date:d(17) }),
    mk({ type:'expense', cat:'food',      amount:320,   accountId:A(0), scope:'personal', note:'ข้าวเที่ยง',         date:d(1) }),
    mk({ type:'expense', cat:'transport', amount:1200,  accountId:A(2), scope:'personal', note:'เติมน้ำมัน',         date:d(5) }),
    mk({ type:'expense', cat:'shopping',  amount:2490,  accountId:A(2), scope:'personal', note:'รองเท้าวิ่ง',        date:d(9) }),
    mk({ type:'expense', cat:'entertain', amount:599,   accountId:A(2), scope:'personal', note:'Netflix + Spotify',  date:d(12) }),
    mk({ type:'expense', cat:'housing',   amount:12000, accountId:A(1), scope:'home',     note:'ค่าผ่อนบ้าน',        date:d(22) }),
    mk({ type:'expense', cat:'utility',   amount:1850,  accountId:A(1), scope:'home',     note:'ค่าไฟ + ค่าน้ำ',     date:d(19) }),
    mk({ type:'expense', cat:'food',      amount:4200,  accountId:A(2), scope:'home',     note:'ซื้อของเข้าบ้าน',    date:d(15) }),
    mk({ type:'expense', cat:'health',    amount:800,   accountId:A(0), scope:'home',     note:'ยา + วิตามิน',       date:d(7) }),
    mk({ type:'income',  cat:'other',     amount:85000, accountId:A(1), scope:'office',   note:'รายได้โปรเจกต์',     date:d(12) }),
    mk({ type:'expense', cat:'utility',   amount:3200,  accountId:A(1), scope:'office',   note:'อินเทอร์เน็ต + ไฟ',  date:d(24) }),
    mk({ type:'expense', cat:'shopping',  amount:5600,  accountId:A(2), scope:'office',   note:'อุปกรณ์สำนักงาน',    date:d(18) }),
    mk({ type:'expense', cat:'food',      amount:2400,  accountId:A(2), scope:'office',   note:'เลี้ยงทีม',          date:d(10) }),
    mk({ type:'expense', cat:'transport', amount:1800,  accountId:A(0), scope:'office',   note:'เดินทางพบลูกค้า',    date:d(6) }),
  ];
}

export function seedNotes(){
  const mk = (o)=>({ id:uid(), updatedAt:now(), deleted:0, ...o });
  return [
    mk({ text:'จ่ายค่าบัตรเครดิตก่อนวันที่ 25 ทุกเดือน ไม่งั้นโดนดอกเบี้ยเพิ่ม!', color:0 }),
    mk({ text:'เก็บใบเสร็จค่าซ่อมรถไว้เคลมประกันตอนสิ้นเดือน', color:2 }),
    mk({ text:'เป้าหมายออมเดือนนี้ ฿10,000\nตอนนี้ออมได้แล้ว ฿4,500 ✦', color:3 }),
  ];
}

export function seedMembers(){
  return [
    { id:uid(), name:'คุณกานต์', email:'kan@moneynual.app',  role:'owner',  avatar:'ก', tone:'gold', pending:0 },
  ];
}
