# วิเคราะห์: ปรับ pleng → สไตล์ phrakham + แก้ Chrome zoom 125% (มือถือ)

**โหมด:** วิเคราะห์อย่างเดียว (ไม่แตะโค้ด) · **brief:** `docs/pm/brief-phrakham-style-analysis.md` · **จ่ายโดย:** pm22 · 13 ก.ค. 2026
**เทียบ:** pleng (Vue3/Vite · live https://pleng.phrakham.life) ↔ phrakham (`C:\gl\krisada\phrakham.life2` Quarto · live https://phrakham.life)
**หลักฐาน:** วัดสดจากเว็บจริงทั้งสอง (in-app browser) + อ่านโค้ดอ้าง file:line + ยืนยันอาการจาก P'Aim (มือถือจริง)

---

## F60+ Overview

- **125% ไม่ได้มาจากโค้ดเพลง** — เป็น **"ซูมเริ่มต้น" ของ Chrome Android ที่เครื่อง P'Aim ตั้งไว้ 125%** → *ทุกเว็บ* เปิดมาที่ 125% (P'Aim ยืนยัน "เป็นทุกเว็บ default 125"), รีเซ็ตกลับ 125% เพราะนั่นคือค่าเริ่มต้น
- **เห็นพังแค่เพลง เพราะเพลงไม่ทน zoom** — พระคำ/Google เป็นเอกสารไหลลื่น ซูมแล้วจัดบรรทัดใหม่ดูดีเหมือนเดิม; เพลงมี **dock/เมนูแถบตายตัว** ที่ออกแบบเผื่อแค่ ≥360px → พอซูม 125% จอจริงเหลือ ~288px ปุ่มล้นขอบ
- **"นึกว่าแก้แล้วแต่ยังเป็น" เพราะแก้ผิดกลไก** — รอบก่อน pin `text-size-adjust:100%` (คุม *font-boosting* ของมือถือ) แต่ 125% นี้เป็น *page zoom* คนละเรื่อง → pin ไม่มีผล
- **Design DNA เพลง = พระคำ ~70% แล้ว** (สี/ฟอนต์/เงา/footer โทเคนชุดเดียวกันเป๊ะ) · ช่องว่างที่เหลือ = **ตัวหนังสือเล็กกว่า (17 vs 18px), line-height แน่นกว่า, ปุ่มทึบแทนโปร่ง, มุมโค้งคมกว่า** — quick-win ไม่กี่จุด "รู้สึกเหมือนพระคำ" ทันที โดยไม่แตะ logic

> **⚠️ แก้ไข (วัดสดตอนเขียน DS phrakham-parity · 13 ก.ค.):** B-2 ในตารางล่างที่ว่า "header เพลงเทาเย็น vs พระคำครีมอุ่น" — **ผิด** · วัด live จริง phrakham navbar bg = `#f8f9fa` = **เท่า pleng เป๊ะ** (cosmo default · theme.scss ไม่ override navbar bg → รอบวิเคราะห์เลยเดาว่าครีม) → header เหมือนกันอยู่แล้ว **B-2 ควรตัดทิ้ง** (รายละเอียด `docs/ds/phrakham-parity.md` §⚠️)

---

# ส่วน A — Root cause: Chrome zoom 125% บนมือถือ

## A0. หลักฐานที่วัดได้ (ไม่เดา)

| สิ่งที่วัด | pleng (live) | phrakham (live) | อ้างอิง |
|---|---|---|---|
| viewport meta | `width=device-width, initial-scale=1.0, viewport-fit=cover` | `width=device-width, initial-scale=1.0, user-scalable=yes` | [index.html:8](index.html) · phrakham gen head |
| root font-size | **16px** | **17px** (`--bs-root-font-size` ของ Bootstrap) | วัดสด `getComputedStyle` |
| body font-size จริงบนจอ | **16.96px** | **18.02px** | วัดสด |
| line-height (body) | 1.6 (`--lh-normal`) | 1.8 (`$line-height-base`) | [styles.css:93](src/styles.css) · [theme.scss:13](../../phrakham.life2/theme.scss) |
| `text-size-adjust` (html/body) | 100% / 100% (**ขึ้น live แล้ว** build `01765cb`) | auto / 100% | [styles.css:81-98](src/styles.css) |
| initial-scale / visualViewport.scale | 1 | 1 | วัดสด |

**อ่านจากตาราง:** ไม่มีอะไรในโค้ดเพลงสั่ง zoom — root 16px (ค่ามาตรฐานเบราว์เซอร์), `initial-scale=1`, ไม่มี CSS `zoom`/`transform:scale`/font-size บน html (grep ทั้ง `src/` ไม่พบ) · เพลง**ตัวหนังสือเล็กกว่าพระคำ ~6% จริง** (17 vs 18px) ตรงกับที่ P'Aim สังเกต

## A1. ต้นตอ 125% = ค่าซูมเริ่มต้นของ Chrome Android (ฝั่งเครื่อง ไม่ใช่โค้ด)

อาการที่ P'Aim ยืนยันจากมือถือจริง — ชี้ตรงตัว:
1. **Chrome บน Android** (เอนจิน Blink) · **เปิดมาครั้งแรกก็ 125% เลย** · **กดรีเซ็ตกลับไป 125% ไม่ใช่ 100** · **เป็นทุกเว็บ** (default 125)
2. incognito ก็เป็น

"รีเซ็ตแล้วกลับ 125%" = **125% คือค่า default** ไม่ใช่ค่าที่เว็บหรือ per-site ตั้ง · "เป็นทุกเว็บ" + "incognito ก็เป็น" = **เป็น setting ระดับเบราว์เซอร์ทั้งเครื่อง** ไม่ใช่ข้อมูลรายเว็บ (per-origin) และไม่ใช่โค้ดเพลง

**กลไก:** Chrome Android มี **"Default zoom / ซูมเริ่มต้น"** (ตั้งค่า → การช่วยเหลือพิเศษ/Accessibility → ซูม) · เมื่อค่านี้ = 125% ทุกหน้าจะเปิดที่ page-zoom 125% · เป็น *page zoom จริง* (ย่อ CSS viewport ทั้งหน้า เหมือนกด Ctrl+ บนเดสก์ท็อป) — **ไม่ใช่ font-boosting**

> **ตัด 2 ทฤษฎีที่ผิดทางออก (เพื่อความชัด):**
> - ❌ *per-origin zoom ที่จำไว้* — incognito เริ่มสด ไม่มีของจำ → ตกไป
> - ❌ *font-boosting (การขยายตัวหนังสืออัตโนมัติของมือถือ)* — เราแก้ด้วย `text-size-adjust:100%` ขึ้น live แล้ว ถ้าเป็นอันนี้ต้องหาย · และ font-boosting ไม่โชว์ตัวเลข "125%" ให้กดรีเซ็ต → ตกไป

## A2. ทำไม `text-size-adjust:100%` (การแก้รอบก่อน) ไม่หาย → "นึกว่าแก้แล้วแต่ยังเป็น"

รอบก่อน (B107 step 9) แก้ที่ [styles.css:81-98](src/styles.css) — pin `text-size-adjust:100%` บน html+body · คอมเมนต์ในโค้ดเองก็เขียนว่า *"P'Aim: Chrome was auto-zooming to 125%"* → **วินิจฉัยเป็น font-boosting ของมือถือ**

แต่ `text-size-adjust` คุม*การขยายตัวหนังสืออัตโนมัติ* (text autosizing) เท่านั้น · **page zoom ไม่สนใจ property นี้เลย** → pin ไปเท่าไรก็ไม่แตะ 125% ที่เป็น page zoom · **นี่คือเหตุผลที่ "แก้แล้วแต่ยังเป็น"** — แก้ถูกครอบครัว (มือถือ) แต่ผิดกลไก (autosizing ≠ page zoom)

## A3. ทำไม "เห็นเพี้ยนแค่เพลง" ทั้งที่ทุกเว็บโดน 125% เท่ากัน

zoom 125% ย่อพื้นที่ CSS จริงลง ~20%: มือถือ 360px → **~288px**, 412px → ~330px

- **พระคำ/Google = เอกสารไหลลื่น (fluid):** คอลัมน์เดียว max ~850px จัดกึ่งกลาง ([theme.scss:224-256](../../phrakham.life2/theme.scss)) · ซูมแล้วตัวหนังสือแค่ reflow ในคอลัมน์ → ดูดี (ยิ่งอ่านง่ายขึ้น) → **ภูมิคุ้มกัน zoom**
- **เพลง = app-chrome แถบตายตัว:** dock ลอยล่าง + เมนู breakpoint ที่ `max-width:760px` — ออกแบบเผื่อแค่ **≥360px** ยังไม่เผื่อ ~288px

**จุดที่พังตอน ~288px (จากขนาดของ dock เอง):**
- DockKey mobile: `--touch-min:40px` ที่ ≤380px, gap 3px, padding 5px ([DockKey.vue:604-609](src/components/DockKey.vue)) · แถวเล่นเพลงมือถือ = **7 ปุ่ม** (`cap = mobile ? 7 : 14`, [DockKey.vue:78](src/components/DockKey.vue))
- ความกว้างแถว ≈ 7×40 + 6×3(gap) + 2×5(padding) = **≈ 308px > 288px** → ปุ่มขวาล้น/หลุดขอบ · ตรงกับที่ P'Aim เคยเจอ "ปุ่มขวาหลุดขอบ" ([DockKey.vue:596-600](src/components/DockKey.vue) คอมเมนต์)
- เมนูบน (ShellBar) flip เป็น 2 แถวที่ ≤760px ([styles.css:365-387](src/styles.css)) · ที่ ~288px แบรนด์+ชื่อเพลง+ปุ่มล็อกอินเบียดกันมาก
- dock มี `clampDock`/`clampPops` กันหลุดจอ ([DockKey.vue:168-178, 211-225](src/components/DockKey.vue)) แต่กันได้แค่ "ดันกลับเข้าจอ" ไม่ได้ "ย่อปุ่มให้พอดี" → ยังล้นภายในถ้าแถวกว้างเกินจอ

> **หมายเหตุความเชื่อมั่น:** ตัวเลข ~308px มาจากคำนวณตาม CSS ของ dock เอง (ไม่ได้จำลอง 288px บนเบราว์เซอร์ในรอบนี้) · **ควรยืนยันบนมือถือจริง** ตอน implement: เปิดเพลงหน้าแผ่นเพลง/ฝึกร้อง บน Android Chrome ที่ซูม 125% แล้วดูแถว dock — นี่คือช่องว่างที่ board launch-lesson บันทึกไว้แล้วว่า verify แค่ 360/412 **ยังไม่เคยเทียบที่ 288**

## A4. ข้อเสนอแก้ (ยังไม่ implement — บอกว่าต้องแก้อะไร ที่ไหน ผลข้างเคียง)

| # | แก้อะไร | ที่ไหน (file) | ขนาด | เสี่ยง logic | ผล |
|---|---|---|---|---|---|
| A-1 | **ทันที ฝั่งเครื่อง P'Aim:** Chrome → การช่วยเหลือพิเศษ → ตั้งซูมเริ่มต้นกลับ 100% | (device setting) | XS | ไม่มี | หายทุกเว็บทันที · **แต่ไม่ใช่การแก้เว็บ** — เครื่องอื่นที่ตั้ง 125% ก็ยังเจอ |
| A-2 | **ตัวจริง:** ทำ dock/เมนู ให้รอดที่ ~288–320px — แถวเล่นเพลงย่อ/เลื่อนแนวนอน/ตัดบรรทัดได้เมื่อกว้างเกินจอ (WCAG 1.4.10 Reflow บังคับ ≥320px อยู่แล้ว) | [DockKey.vue:594-609](src/components/DockKey.vue) (breakpoint/cap/min) | M | ต่ำ (ปรับ CSS ขนาด ไม่แตะ engine layout/drag) | เพลงทน zoom เหมือนพระคำ · ผ่าน WCAG reflow · **refine ของเดิม ไม่รื้อ** |
| A-3 | ขยายตัวหนังสือ default เพลง = พระคำ (body 17→18px) เพื่อลดแรงจูงใจให้คนตั้งซูม | [styles.css:42](src/styles.css) (`--fs-base` 1.06→1.12rem) | S | ต่ำ-กลาง (text โต ~6% ตัว px chrome เท่าเดิม → reflow เล็กน้อย) | ต้นเหตุ "ตัวเล็กเลยอยากซูม" หาย + ได้ parity (= B-1) |

**ลำดับแนะนำ:** A-1 บอก P'Aim ทำทันทีเพื่อใช้งานได้เลย → A-3 (quick win, ทับกับ Section B) → A-2 (งานจริงให้ product ทน zoom; ควร verify บนมือถือจริงที่ 125%)

**แยกให้ชัด (ตาม brief):** *มือถือ font-boosting* (เคยแก้ `text-size-adjust`, [styles.css:75-98](src/styles.css)) = คนละเรื่องกับ *เดสก์ท็อป/มือถือ page-zoom 125%* (ปัจจุบัน) · อันแรกคุมตัวหนังสือขยายเอง, อันหลังคือ zoom ทั้งหน้าจาก setting เครื่อง — `text-size-adjust` ไม่แตะอันหลัง

---

# ส่วน B — Design-parity gap: pleng → สไตล์ phrakham

## B0. Design DNA ของ phrakham (สกัดจาก `theme.scss`)

| มิติ | ค่า phrakham | อ้างอิง |
|---|---|---|
| **สี** | brand/link `#8B4513` · ink `#2D2A26` · cream `#FAF6F0`/`#FCFAF6` · line `#E0D6C8`/`#EFE6D6` · muted `#757575` · footer `#7A6A4E` · stamp `#827356` | [theme.scss:10-11,30](../../phrakham.life2/theme.scss) |
| **ฟอนต์** | Noto Sans + Noto Sans Thai + Hebrew · base **1.06rem** · root **17px** → body 18px | [theme.scss:5,12](../../phrakham.life2/theme.scss) |
| **line-height** | **1.8** (โปร่ง อากาศเยอะ) · h2 margin-top 2.2rem | [theme.scss:13,21](../../phrakham.life2/theme.scss) |
| **radius** | ปุ่ม/tool 8px · เมนู 10-12px · การ์ด/picker **14px** · pill (chip) **20px** | [theme.scss:46,136,191,291](../../phrakham.life2/theme.scss) |
| **shadow** | เมนู `0 8px 24px rgba(0,0,0,.16)` · การ์ด `0 18px 50px rgba(0,0,0,.28)` | [theme.scss:136,291](../../phrakham.life2/theme.scss) |
| **navbar** | ครีมอ่อน/ขาว · แบรนด์ **น้ำตาลหนา** #8B4513 · sticky fixed สูง ~64px (`--pk-navh:4rem`) | [theme.scss:79,111,120](../../phrakham.life2/theme.scss) |
| **container** | คอลัมน์เดียว max ~850px จัดกึ่งกลาง · side whitespace เยอะ | [theme.scss:224-256](../../phrakham.life2/theme.scss) |
| **ปุ่ม** | **โปร่ง (ghost):** พื้นครีม `#FAF6F0` ขอบ `#E0D6C8` ตัวอักษรน้ำตาล/ink — เบา โปร่ง | [theme.scss:132,191](../../phrakham.life2/theme.scss) |
| **footer** | 2 บรรทัดจัดกึ่งกลาง · เล็ก จาง | [theme.scss:70](../../phrakham.life2/theme.scss) |

## B1. สถานะ parity — เพลง "เหมือนพระคำ" อยู่แล้วเยอะ

เพลง**คัดโทเคนชุดเดียวกันมาแล้ว** ([styles.css:1-18](src/styles.css)) → **ตรงกันเป๊ะ ไม่ต้องแตะ:** สีทั้งชุด · ฟอนต์ (Noto stack เดียวกัน + มีสวิตช์ มีหัว/ไม่มีหัวเหมือนกัน) · เงาเมนู `0 8px 24px .16` · footer 2 บรรทัดกึ่งกลาง · touch target 44px · โฟกัส WCAG

**ที่ยังต่าง = ช่องว่างที่ทำให้ "รู้สึกไม่เหมือน":** ตัวหนังสือเล็กกว่า · header สีเทาเย็น · บรรทัดแน่นกว่า · ปุ่มทึบ · การ์ดมุมคมกว่า

## B2. ตารางเปลี่ยนแปลง (change plan · เรียง quick-win ก่อน)

| # | สิ่งที่ต่าง | pleng ตอนนี้ | phrakham | ต้องทำอะไร | ที่ไหน | ขนาด | เสี่ยง logic |
|---|---|---|---|---|---|---|---|
| **B-1** ⭐ | **ขนาดตัวหนังสือ** | body 17px (root 16) | body 18px (root 17) | `--fs-base` 1.06→1.12rem (หรือ root 16→17px) | [styles.css:42](src/styles.css) | S | ต่ำ-กลาง (text โต ~6%) · **= A-3** |
| **B-2** ⭐ | **สี header** | เทาเย็น `#f8f9fa` | ครีม/ขาวอุ่น | shell-bar bg → `#fff` หรือ `#FCFAF6` | [styles.css:196](src/styles.css) | S | ไม่มี (cosmetic) · header คือสิ่งแรกที่เห็น → คุ้มสุด |
| **B-3** | **line-height หน้าอ่าน** | 1.6 | 1.8 (โปร่ง) | ตั้ง 1.8 **เฉพาะหน้าอ่าน** (Guide/About) — **ห้ามแตะแผ่นเพลง** (จงใจแน่นเพื่อโน้ต) | Guide.vue/About.vue scoped | S | ต่ำ (ถ้า scope แคบ) |
| **B-4** | **มุมการ์ด/ชิป** | การ์ด 10px · ชิป 16px | การ์ด 14px · pill 20px | การ์ด 10→14 · section-chip 16→20 | [styles.css:431,570](src/styles.css) | S | ไม่มี (cosmetic) |
| **B-5** | **สไตล์ปุ่ม** | ทึบ น้ำตาลเต็ม | โปร่ง ครีม-ขอบน้ำตาล | ปุ่ม**รอง** → ghost ครีม (คง**ปุ่มหลัก**ทึบไว้) | [styles.css:390-403](src/styles.css) | M | ต่ำ (visual) แต่กระทบหลายปุ่ม → รีวิว |
| **B-6** | **การจัดหน้า/whitespace** | container 900/1160px | คอลัมน์ 850px กึ่งกลาง อากาศเยอะ | จูน max-width + gutter หน้าอ่านให้กึ่งกลางโปร่งแบบพระคำ | [styles.css:57-59,122-126](src/styles.css) | M | ต่ำ-กลาง |
| — | สี/ฟอนต์/เงา/footer | ✅ ตรงแล้ว | — | **ไม่ต้องทำ** | — | 0 | — |

## B3. component ที่เพลงมีแต่พระคำไม่มี (dock · editor · NoteBoxes)

พระคำไม่มี dock/editor → ไม่มีต้นแบบตรงๆ · **ให้กลมกลืน design language โดยไม่รื้อ logic** ([feedback_refine_not_redesign](../../../)):
- dock/editor **ใช้โทเคน Warm Study Room อยู่แล้ว** (`--cream`/`--line`/`--brand` · [DockKey.vue:480-483](src/components/DockKey.vue)) → ผิวถูกต้องแล้ว
- สิ่งที่ควรทำกับ dock = **A-2 (ทน zoom/จอแคบ)** ไม่ใช่เปลี่ยนหน้าตา · เป็นการ refine engine เดิม (ปรับ min-size/overflow) ไม่ใช่ redesign
- ปรับ radius/line ให้ล้อ B-4 เพื่อความเป็นชุดเดียวกัน (เล็กน้อย)

## B4. ลำดับ "รู้สึกเหมือนพระคำมากสุด ด้วยงานน้อยสุด"

1. **B-2 (header ครีมอุ่น)** — S · ไม่มีเสี่ยง · เห็นผลทันทีทั้งไซต์
2. **B-1 (ตัวหนังสือ 18px)** — S · แก้ Section A ต้นเหตุด้วย (ยิงปืนนัดเดียว)
3. **B-4 (มุมโค้ง)** — S · cosmetic
4. **B-3 (บรรทัดโปร่งหน้าอ่าน)** — S · scope ระวัง
5. **B-5 (ปุ่มโปร่ง)** + **B-6 (whitespace)** — M · ทำเมื่ออยากใกล้ 100%

**ห้าม:** เปลี่ยน stack (Vue→Quarto) · รื้อ dock/editor logic · แตะ line-height แผ่นเพลง (จงใจแน่นเพื่อโน้ต) · เปลี่ยนโทเคนสี (ตรงแล้ว)

---

## ภาคผนวก — วิธีพิสูจน์ (ตอน implement)
- **A (zoom):** Android Chrome ตั้งซูมเริ่มต้น 125% → เปิดเพลงหน้าแผ่นเพลง/ฝึกร้อง → ดูแถว dock ล้นขอบไหม (จอจริง ~288px) · เทียบพระคำหน้าเดียวกันไม่ล้น
- **B (design):** เทียบภาพเคียงข้างที่ width เดียวกัน · ดู header สี/ตัวหนังสือขนาด/มุมโค้ง
- ทั้งหมด = analysis-only · **รอ PM/P'Aim เคาะก่อน implement**
