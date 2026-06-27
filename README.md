# บัญชีนวล (MoneyNual)

เว็บแอปจัดการ **รายรับ–รายจ่าย** ส่วนตัว ครอบครัว และธุรกิจเล็ก — ดีไซน์ neumorphic โทนครีม–ทอง
ภาษาไทยเต็มรูปแบบ **ติดตั้งเป็นแอป (PWA)** บนมือถือ/เดสก์ท็อปได้ และ **ใช้งานออฟไลน์ได้ตลอด**

> 🌐 Production: https://hacc.xman4289.com

## คอนเซ็ปต์การใช้งาน

| โหมด | ใครใช้ | ข้อมูล |
|------|--------|--------|
| 🆓 **ฟรี / ออฟไลน์** | ใช้คนเดียวบนเครื่องตัวเอง | เก็บในเครื่อง (IndexedDB) ทำงานออฟไลน์ ไม่ต้องสมัคร |
| 💎 **โปร / ออนไลน์** | ครอบครัว/ทีม (สูงสุด 5 คน) | สมัคร + สร้าง "บ้าน" แล้วซิงก์ข้อมูลร่วมกันทุกเครื่อง |

แอปเป็น **local-first**: ทุกการบันทึกเข้าเครื่องก่อนเสมอ เมื่อเป็นโปร + ออนไลน์ จะซิงก์ขึ้นเซิร์ฟเวอร์
(แบบ last-write-wins ตาม `updatedAt` + tombstone สำหรับการลบ)

## สถาปัตยกรรม

```
public/                         → เสิร์ฟที่ public_html (static + PHP)
  index.html  manifest.webmanifest  sw.js     ← PWA shell + service worker (offline)
  assets/css/app.css                          ← design system (tokens/เงา neumorphic)
  assets/js/
    main.js        ← bootstrap, router, shell, event-delegation, global actions
    state.js       ← reactive store (local-first, persist → IndexedDB)
    db.js          ← IndexedDB wrapper           api.js   ← backend client
    sync.js        ← offline-first sync engine    selectors.js ← derived data
    charts.js  ui.js  format.js  icons.js  data.js
    views/         ← 13 หน้าจอ (dashboard, transactions, calendar, budgets,
                     categories, accounts, reports, settings, pricing, billing,
                     team, landing, login)
  api/             → PHP 8 + SQLite REST API (auth, household, sync, billing)
    index.php  lib/{Db,Http,Auth}.php  config.sample.php  .htaccess
private/           → SQLite DB (นอก web root, ไม่อยู่ใน git)  ← สร้างบนเซิร์ฟเวอร์
tools/make-icons.php   ← สร้างไอคอน PWA (PNG) ด้วย GD ตอน deploy
deploy/deploy.sh       ← deploy script (clone → rsync → init DB)
```

**Stack:** Vanilla JS (ES modules, ไม่มี build step) · PHP 8.3 · SQLite (PDO) · Apache/DirectAdmin

## ความปลอดภัย
- รหัสผ่าน hash ด้วย `password_hash()` (bcrypt) · token แบบ Bearer (ไม่ใช้ cookie → ไม่มี CSRF)
- PDO prepared statements ทุกจุด · escape output ฝั่ง client (`esc()`) กัน XSS
- throttle ความพยายาม login ต่อ IP · ไม่ leak stack trace ออก client
- **DB อยู่นอก `public_html`** (โฟลเดอร์ `private/`) เข้าถึงผ่านเว็บไม่ได้
- repo เป็น **public** → ไม่ commit ความลับ/DB (ดู `.gitignore`); `config.php` สร้างบนเซิร์ฟเวอร์เท่านั้น

## พัฒนา (local)
```bash
php -S localhost:8000 -t public      # เปิด http://localhost:8000
```
ออฟไลน์ + ฟรีใช้งานได้ทันที (ไม่ต้องมี DB) · ฟีเจอร์ออนไลน์ต้องมี PHP/SQLite

## Deploy
```bash
ssh admin@123.253.62.251 'bash -s' < deploy/deploy.sh
# → clone/pull, rsync public/ → public_html, สร้าง private/, init DB, gen icons
```
