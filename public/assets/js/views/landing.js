// views/landing.js — marketing landing page (chromeless, matches landing.png). No app chrome.
// Full-page output; root must NOT animate from opacity:0 (design note: can stick at 0).

export function render(ctx){
  const { icon, fmt } = ctx;

  // mock dashboard category rows (matches screenshot)
  const mockCats = [
    { th:'อาหาร & เครื่องดื่ม', pct:72 },
    { th:'ที่พัก / ค่าบ้าน',    pct:54 },
    { th:'เดินทาง',            pct:38 },
  ];
  const catRow = c => `<div class="mb14">
      <div class="row between small mb10"><span class="sb">${c.th}</span><span class="num muted">${c.pct}%</span></div>
      <div class="progress"><i style="width:${c.pct}%"></i></div>
    </div>`;

  // feature cards
  const feats = [
    { ic:'bolt',   th:'บันทึกเร็ว',          desc:'เพิ่มรายรับรายจ่ายได้ในไม่กี่วินาที พร้อมหมวดหมู่และบัญชีครบ' },
    { ic:'budget', th:'งบประมาณอัจฉริยะ',     desc:'ตั้งงบแต่ละหมวด เตือนเมื่อใกล้เกิน เห็นเงินคงเหลือทันที' },
    { ic:'team',   th:'ใช้ร่วมกันทั้งบ้าน',    desc:'ซิงก์ออนไลน์ทุกเครื่อง แชร์บัญชีกับครอบครัวและทีมงาน' },
    { ic:'cloudOff', th:'ใช้งานออฟไลน์',       desc:'บันทึกได้แม้ไม่มีเน็ต ข้อมูลเก็บในเครื่อง ซิงก์อัตโนมัติเมื่อออนไลน์' },
  ];
  const featCard = f => `<div class="panel">
      <span class="tile md gold mb14">${icon(f.ic,18)}</span>
      <h3 style="margin:0 0 8px">${f.th}</h3>
      <p class="muted small" style="line-height:1.6;margin:0">${f.desc}</p>
    </div>`;

  return `
  <div class="chromeless">

    <nav class="lnav">
      <div class="brand">
        <div class="logo">฿</div>
        <div class="name">บัญชีนวล<small>MONEYNUAL · รายรับรายจ่าย</small></div>
      </div>
      <div class="row gap10 center">
        <button class="btn" data-act="nav" data-id="login">เข้าสู่ระบบ</button>
        <button class="btn btn-primary" data-act="nav" data-id="dashboard">เริ่มใช้ฟรี</button>
      </div>
    </nav>

    <section class="hero">
      <div>
        <span class="pill" style="color:var(--d2)">${icon('star',13)} แอปจัดการเงินอันดับ 1 ของคนไทย</span>
        <h1>เห็นเงินทุกบาท<br>ออมได้ทุกเดือน</h1>
        <p class="lead">บันทึกรายรับรายจ่าย วางงบประมาณ ตั้งรายการประจำ และดูภาพรวมการเงินของคุณ ครอบครัว และธุรกิจ ในที่เดียว</p>
        <div class="row wrap gap14 mt24">
          <button class="btn btn-primary" data-act="nav" data-id="dashboard" style="height:48px;padding:0 22px;font-size:13.5px">เริ่มใช้ฟรี — ไม่ต้องใช้บัตร</button>
          <button class="btn" data-act="nav" data-id="pricing" style="height:48px;padding:0 22px;font-size:13.5px">ดูแพ็กเกจ</button>
        </div>
        <div class="stats">
          <div><div class="n num t-gold">50,000+</div><small>ผู้ใช้งาน</small></div>
          <div><div class="n num t-gold">฿2.4 พันล้าน</div><small>ยอดที่บันทึก</small></div>
          <div><div class="n num t-gold">4.9★</div><small>App Store</small></div>
        </div>
      </div>

      <div class="card">
        <div class="gold" style="border-radius:18px;padding:18px 20px;box-shadow:var(--card)">
          <div class="small" style="opacity:.9">ยอดรวมสุทธิ</div>
          <div class="num" style="font-family:'Sora';font-weight:800;font-size:32px;line-height:1.2;margin-top:2px">${fmt(257060)}</div>
          <div class="small mt6" style="opacity:.92">↑ ${fmt(14200)} จากเดือนก่อน</div>
        </div>

        <div class="grid g-split mt14" style="gap:14px">
          <div class="inset" style="border-radius:15px;padding:13px 15px">
            <div class="small muted mb10">รายรับ</div>
            <div class="num t-pos b" style="font-size:18px">${ctx.fmtK(131500)}</div>
          </div>
          <div class="inset" style="border-radius:15px;padding:13px 15px">
            <div class="small muted mb10">รายจ่าย</div>
            <div class="num t-neg b" style="font-size:18px">${ctx.fmtK(37900)}</div>
          </div>
        </div>

        <div class="mt18">
          ${mockCats.map(catRow).join('')}
        </div>
      </div>
    </section>

    <section class="feat-grid">
      ${feats.map(featCard).join('')}
    </section>

    <section class="cta-band">
      <h1 style="font-family:'Sora';font-weight:800;font-size:28px;margin:0 0 18px;color:#fff">พร้อมเริ่มจัดการเงินอย่างมืออาชีพ?</h1>
      <button class="btn" data-act="nav" data-id="dashboard" style="height:46px;padding:0 24px;font-size:13.5px;background:#fff;color:var(--d2)">เริ่มใช้ฟรี</button>
    </section>

    <footer style="text-align:center;padding:30px 26px 40px">
      <div class="muted small">© 2026 บัญชีนวล · MoneyNual</div>
    </footer>

  </div>`;
}
