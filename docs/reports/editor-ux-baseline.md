# Editor UX — baseline & acceptance metrics

**เป้าหมายของเอกสารนี้:** เปลี่ยนการตัดสิน redesign หน้าแก้ไขเพลงจาก "ฟีล" (งง/แย่) ให้เป็น **ตัวเลขที่วัดซ้ำได้** — ทุก metric บอกวิธีวัด เพื่อ re-run บน live ได้เสมอ (dynamic ตามจริง ไม่ hardcode).

**ขอบเขต:** หน้า แก้ไขเพลง (`EditorMode.vue` ใน `Studio.vue` โหมด `edit`) เป็นหลัก + จุดต่อ `SongList`.
**สถานะหลักฐาน:** วัดจาก **live** `https://pleng.phrakham.life/#/studio` (เพลงเปล่าใหม่ 1 ห้อง · ยังไม่ล็อกอิน) เมื่อ 2026-07-17.

---

## วิธีวัด (ทำซ้ำได้ — วางใน DevTools Console บน live)

เปิด `https://pleng.phrakham.life/#/studio` (เพลงเปล่า จะเข้าโหมดแก้ไขทันที) แล้ววาง:

```js
(() => {
  const txt = el => (el.getAttribute('aria-label')||el.title||el.textContent||'').trim();
  const vis = el => el.offsetParent !== null && el.getBoundingClientRect().width > 0;
  const all = [...document.querySelectorAll('button,input,select,[role=button],a[href]')].filter(vis);
  const has = re => all.filter(el => re.test(txt(el))).map(txt);
  const btns = all.filter(el => el.tagName==='BUTTON' || el.getAttribute('role')==='button');
  const rect = b => b.getBoundingClientRect();
  const under = px => btns.filter(b => rect(b).width < px || rect(b).height < px);
  const de = document.documentElement;
  return {
    viewport: `${innerWidth}x${innerHeight}`,
    controlsOnScreen: all.length,          // ปุ่ม/ช่องกดได้ทั้งหมดที่มองเห็นพร้อมกัน
    play:    has(/ฟัง/).length,            // ปุ่ม "ฟัง/เล่นเสียง"
    preview: has(/ตัวอย่าง|ดูผล/).length,  // ปุ่มพรีวิว/ดูผล
    move:    has(/ย้าย.*(ขึ้น|ลง|ห้อง|ท่อน|บรรทัด)/).length,
    copy:    has(/ทำซ้ำ|คัดลอก|สำเนา/).length,
    del:     has(/ลบ/).length,
    edheadButtons: document.querySelectorAll('#pk-editor button').length,
    under44: under(44).length,             // ปุ่มเล็กกว่า 44px (นิ้วกดสบาย)
    under24: under(24).length,             // ปุ่มเล็กกว่า 24px (ขั้นต่ำ WCAG 2.5.8)
    hOverflowPx: de.scrollWidth - de.clientWidth,
  };
})();
```

วัด 2 ขนาดจอ: desktop (≥1280) และมือถือ (ตั้ง DevTools device = 375px). ตัวเลข before ด้านล่างมาจากสคริปต์นี้.

---

## Baseline → Target (เกณฑ์ผ่าน redesign)

| # | Metric | Before (2026-07-17, วัดจริง) | Target | อ้างมาตรฐาน |
|---|--------|------------------------------|--------|-------------|
| M1 | ปุ่ม/ช่องกดได้พร้อมกันบน 1 จอ (desktop) | **100** | **< 25** | Nielsen H8 (minimalist) · Miller's Law (~7±2) |
| M2 | เท่ากันบนมือถือ 375px | **95** | **< 25** | เท่ากัน |
| M3 | ปุ่ม "ฟัง" ที่โชว์พร้อมกัน | **5** (ทั้งเพลง·ท่อน·ท่อนนี้·บรรทัด·ห้อง) | **1** (contextual ตามสิ่งที่เลือก) | Jakob's Law · consistency (หนึ่งงาน–หนึ่งที่) |
| M4 | ปุ่มพรีวิว/ดูผล | **3** (ตัวอย่างสด·ดูผลทั้งเพลง·ดูผลห้องนี้) | **1** | เท่ากัน |
| M5 | ปุ่มย้ายขึ้น/ลง | **6** (ท่อน 2 ที่·บรรทัด·ห้อง) | action มีที่เดียวต่อ scope | เท่ากัน |
| M6 | ปุ่มทำสำเนา | **4** | ที่เดียวต่อ scope | เท่ากัน |
| M7 | ปุ่มลบ | **3** | ที่เดียวต่อ scope | เท่ากัน |
| M8 | ปุ่มในแถบ edhead แถวเดียว | **15** | **≤ 7** ต่อกลุ่มมองเห็น | Miller's Law |
| M9 | ปุ่มมือถือเล็กกว่า 44px | **36 / 77** | **0** | Apple HIG 44pt · Material 48dp |
| M10 | ปุ่มเล็กกว่า 24px (ขั้นต่ำ) | **0** ✅ | คง 0 | WCAG 2.2 §2.5.8 (AA) |
| M11 | จอล้นแนวนอน (มือถือ) | **0px** ✅ | คง 0 | responsive baseline |

**หลักเดียวที่ปลดล็อก M1–M8:** เปลี่ยนจาก "โชว์ทุกปุ่มทุกระดับ (เพลง/ท่อน/บรรทัด/ห้อง/โน้ต) ตลอดเวลา" → **selection-driven**: จิ้มสิ่งที่จะแก้ก่อน แล้วเครื่องมือค่อยโผล่เฉพาะของสิ่งนั้น (เหมือน MuseScore / Ultimate Guitar / Hooktheory). ลดปุ่มซ้ำ 5→1, 3→1 อัตโนมัติ.

---

## จุดที่ทำมาดีแล้ว — redesign ต้องไม่ทำถอยหลัง (regression guard)

- ไม่มีจอล้นแนวนอนบนมือถือ (M11 = 0px)
- ทุกปุ่มมี `aria-label`/`title` ครบ (screen reader ผ่าน)
- ไม่มีปุ่มเล็กกว่า 24px (WCAG 2.5.8 AA ผ่าน — M10)

→ **ปัญหาไม่ใช่ accessibility hygiene แต่เป็น information architecture ล้วน** (ของเยอะเกิน ไม่มีลำดับความสำคัญ).

---

## SongList (จุดต่อ) — target เดียว ไม่ทำในงานนี้

- **ห้ามแตะโค้ด** — PM ส่งให้ SA `91b05cf3` เป็น item `2c` แล้ว (การ์ดหด/ellipsis)
- **Target ที่วัดได้:** ชื่อเพลงแสดง**เต็ม ไม่ตัด ellipsis** · การ์ด/แถว**กว้างเท่ากันทุกอัน** (P'Aim: "มีที่ตั้งเยอะ จะหดไปทำไม")
- จุดในโค้ดปัจจุบัน: `SongList.vue` `.song-row .ttl` (~บรรทัด 408–414) `white-space:nowrap; text-overflow:ellipsis` — ปล่อยให้ wrap (ความสูงเพิ่ม ไม่ใช่ความกว้าง) = ปลอดภัยกับ M11

---

## หมายเหตุการใช้งาน

- ตัวเลข before วัดบน **เพลงเปล่า 1 ห้อง** = floor (สถานการณ์ที่ควรโล่งที่สุด). เพลงจริงหลายท่อน/หลายห้อง ตัวเลขจะ**สูงกว่านี้มาก** → target ยิ่งสำคัญ.
- ทุก metric re-measure ด้วยสคริปต์ด้านบน หลัง redesign แต่ละรอบ = "รู้ว่าดีขึ้นจริงไหม" โดยไม่ต้องเดา.
