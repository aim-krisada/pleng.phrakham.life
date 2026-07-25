# SA feasibility — Contextual toolbox (จิ้ม/hover element → เครื่องมือโผล่ตรงนั้น)

**ประเภท:** บทวิเคราะห์ SA (feasibility-only) · **⛔ ไม่แตะ `src/`** · docs only
**ทิศ (P'Aim ผ่าน PM):** ปฏิเสธ "ยุบปุ่ม" → เอา **contextual toolbox** แบบ Photoshop (จิ้ม/hover โน้ต/ห้อง/บรรทัด/ท่อน → เครื่องมือของ element นั้นโผล่ตรงนั้น) **แต่ต้องได้บนมือถือ**
**เจ้าของ flow:** UX seat · **ใบนี้ตอบเฉพาะ "โครงเรารองรับไหม / ต้องแตะอะไร"**
**อ่านคู่:** `docs/us/selection-driven-editor.md` (ทิศเดิมที่ P'Aim ปฏิเสธ — verdict "refine" ในนั้นเป็นของทิศ *ยุบปุ่ม* ไม่ใช่ทิศนี้ · ดู §5)
**verify:** เปิด `src/components/EditorMode.vue` (4,687 บรรทัด · null byte 1569 → `tr -d '\000'`) วัดโค้ดจริง 2026-07-17 ฐาน `studio-shell-redesign`

---

## 0 · สรุป 30 วิ (ตอบ 4 คำถาม PM)

| # | คำถาม | คำตอบสั้น |
|---|---|---|
| **Q1** | selection targeting ต่อ element ครบ 5 ระดับจริงไหม | ✅ **จริง ยืนยันในโค้ด** — ทั้ง 5 state มีอยู่ + แต่ละตัวรู้ว่า "element ไหนถูกเลือก" พอแขวน toolbox ได้ |
| **Q2** | hover (desktop) + tap (mobile) โครงรับได้แค่ไหน | ⚠️ **tap = มีอยู่แล้ว (คือโมเดลปัจจุบัน)** · **hover = ยังไม่มีเลย (0 handler) ต้องเพิ่ม** แต่เป็น *ส่วนเสริม* ซ้อนบน state เดิม ไม่ใช่ระบบใหม่ |
| **Q3** | toolbox แขวนตรงตำแหน่ง — มี pattern อยู่แล้วไหม | ✅ **มี 3 ระดับ** (CSS-anchored `slot-tools` · viewport-clamped bar popover · fixed+drag `floatEl`) — primitive ครบ · แต่ยังไม่มี "helper กลาง 1 ตัว" ที่แขวน toolbox กับ element ใดก็ได้ |
| **Q4** | refine หรือ redesign เมื่อเพิ่ม hover/tap toolbox | 🟡 **ยัง refine (ไม่รื้อสถาปัตยกรรม)** — state + positioning ใช้ของเดิม · **แต่ขนาดงานผันตาม scope ที่ UX เลือก** (เล็ก→กลาง · ไม่ถึง rebuild) |

**ฟันธง SA:** โครง **รองรับได้** และงานนี้ **ยังเป็น refine** — ของ 3 ชิ้นที่ทิศนี้ต้องการ (selection ต่อ element · anchored positioning · tap) **มีอยู่แล้วในโค้ด**. ที่ต้องเติมจริง = (1) **hover-preview** (ของใหม่ แต่เป็น progressive enhancement) (2) **ขยาย anchored toolbox ให้ครบทั้ง line + stanza** (วันนี้ line/stanza tools อยู่ในแถบถาวร ไม่ลอย) (3) **ทำ trigger/ตำแหน่งให้ consistent ทั้ง 5 ระดับ** ← ข้อ 3 คือโดเมน UX โดยตรง, ผมยืนยัน feasibility ทีละข้อได้

---

## Q1 · selection targeting ต่อ element — ✅ จริงครบ 5 ระดับ (ยืนยันในโค้ด)

| ระดับ scope | state | บรรทัด | รู้ "element ไหน" ยังไง | วันนี้ trigger ด้วย |
|---|---|---|---|---|
| **โน้ต/พยางค์** | `focusedSlot` (ref: -1) | 327 | เก็บ global slot index | `@focus="focusedSlot = cell.slot"` / `@blur=-1` (tap เข้าช่อง) |
| **คอร์ดบนโน้ต** | `editingChord {li,bi,si,p}` | 426 | เก็บพิกัดโน้ต 4 มิติ | `@click="openChord(...)"` · ปิดเมื่อคลิกนอก `.chord-cell` (458) |
| **ห้อง** | `barMenuOpen "li-bi"` | 1885 | เก็บคีย์ห้อง | `@click.stop="toggleBarMenu(li,bi)"` · ปิดเมื่อคลิกนอก (1892) |
| **บรรทัด** | `activeLine` (ref: 0) | 880 | เก็บ index บรรทัดที่แตะล่าสุด | `setActiveLine(li)` เมื่อแตะ |
| **ท่อน** | `activeStanza` / `lensChoice` | 192 | index ท่อน + row ที่ lens ชี้ | เลือกท่อน → `cshead`/lens |

**สรุป Q1:** โครง "เลือกแล้วรู้ว่าเลือก element ไหน" **มีครบทั้ง 5** และ 3 ใน 5 (`focusedSlot`, `editingChord`, `barMenuOpen`) **เป็น selection-driven + แสดง UI ตรงตำแหน่งอยู่แล้ว**. Q1 ไม่ใช่อุปสรรค.

---

## Q2 · hover (desktop) + tap (mobile) — ⚠️ tap มีแล้ว · hover ต้องเพิ่ม (แต่เสริม ไม่รื้อ)

### tap/focus (มือถือ) = **โมเดลปัจจุบันอยู่แล้ว** ✅
การเลือกทุกวันนี้ขับด้วย **tap/focus/click ล้วน** ไม่มี hover — ตรงกับมือถือเป๊ะ:
- แตะช่องโน้ต → `@focus` set `focusedSlot` → `slot-tools` (◀▶) โผล่เหนือช่อง
- แตะคอร์ด → `editingChord` → ตัวแก้คอร์ดโผล่ inline
- แตะ ⋯ ห้อง → `barMenuOpen` → popover ห้องโผล่
→ **"tap-to-select equivalent" ที่ PM ห่วงว่าต้องทำเพิ่มสำหรับมือถือ = มีอยู่แล้ว เป็น primary interaction** ไม่ต้องสร้างใหม่

### hover (desktop) = **ยังไม่มีเลย — 0 handler** ⚠️ (ของใหม่ แต่เป็น progressive enhancement)
grep ทั้งไฟล์: **ไม่มี** `@mouseenter / @mouseover / @pointerenter` สัก event เดียว. `:hover` ทุกตัวเป็น **CSS ล้วน (แค่เปลี่ยนสี)** และหลายจุดทีมครอบ **`@media (hover: hover)`** ไว้แล้ว (บรรทัด 3669/3773/4056…) = **ทีมรู้อยู่แล้วว่า hover = desktop-only ต้องกัน touch**.
→ hover-to-reveal-toolbox **ต้องเขียนใหม่** แต่ทำแบบ **ซ้อนบน state เดิม**: บนเครื่อง hover-capable ให้ `@pointerenter` (gated `@media(hover:hover)`) *พรีวิว* toolbox ของ element โดย set ตัว state เดียวกับที่ tap set → **tap = ปักหมุด (source of truth) · hover = พรีวิวชั่วคราว**. เพราะใช้ state เดียวกัน ความเสี่ยงต่ำ.

**⚠️ กับดักที่ต้องเลี่ยง (Apple HIG):** อย่าให้ element เดียวมีทั้ง hover-reveal + tap + context-menu ปนกันจนสับสน — ต้องเลือก **tap เป็นความจริง · hover เป็นน้ำตาล** ไม่ใช่ 2 กลไกแข่งกัน (ข้อนี้ UX ต้องออกแบบให้ชัด, ผมชี้ข้อจำกัด)

---

## Q3 · anchored/floating positioning — ✅ มี pattern 3 ระดับ (primitive ครบ · ยังไม่รวมเป็น helper เดียว)

| กลไกที่มีอยู่ | ทำงานยังไง | บรรทัด | ใช้ซ้ำกับ toolbox ได้ไหม |
|---|---|---|---|
| **`slot-tools`** (โน้ต) | `position:absolute; bottom:100%; left:50%; translateX(-50%)` — ลอย**เหนือ**ช่องที่เลือกด้วย CSS ล้วน | CSS 3382 | ✅ **precedent ตรงเป๊ะ** — "toolbox ที่ element" · พิสูจน์แล้วบนมือถือ (อยู่เหนือช่อง = คีย์บอร์ดไม่บัง) |
| **bar ⋯ popover / edhead menu** | anchored + **viewport clamp** `max-width: calc(100vw-16px)` เกาะ header เต็มกว้าง ไม่หลุดขอบ | 4292–4306 | ✅ ใช้ pattern clamp นี้กับ toolbox ที่ยาวได้ |
| **`floatEl` / `floatStyle`** (พรีวิว) | `position:fixed` + drag + `clampWin()` + re-clamp on resize (dock-core `clampToViewport`) | 2090/2169/2091 | ✅ primitive หนักสุด ถ้า UX อยากได้ panel ลากได้แบบ Photoshop |
| **`.chord-cell`** | `position: relative` อยู่แล้ว | 3331 | ✅ parent สำหรับ absolute-anchor toolbox ต่อโน้ตมีให้แล้ว |

**สรุป Q3:** ทุก primitive ที่ contextual toolbox ต้องใช้ — anchor เหนือ element (CSS) · clamp ไม่หลุดจอ · fixed+drag — **มีอยู่แล้ว**. `getBoundingClientRect()` ถูกใช้ ~10 จุดในไฟล์ · `clampWin()` มีแล้ว.
**ช่องว่างเดียว:** ยังไม่มี **"helper กลาง 1 ตัว"** ที่รับ element ใดก็ได้ (โน้ต/ห้อง/บรรทัด/ท่อน) แล้วแขวน toolbox + clamp ให้อัตโนมัติ — วันนี้เป็น pattern กระจาย 3 แบบ. การทำ helper กลาง = **รวบของเดิม (consolidation) ไม่ใช่สถาปัตยกรรมใหม่**.

---

## Q4 · refine หรือ redesign — 🟡 ยัง refine · แต่ขนาดผันตาม scope ที่ UX เลือก

**ไม่ใช่ redesign:** ไม่ต้องรื้อ state (5 selection มีครบ) · ไม่ต้องรื้อ positioning (3 primitive มีครบ) · ไม่ทิ้งโมเดล tap เดิม → ตรง `feedback_refine_not_redesign`.

**แต่ต้องบอกตรง — "refine" ในใบเดิม (`selection-driven-editor.md`) เป็นของทิศ *ยุบปุ่ม* ที่ P'Aim ปฏิเสธไปแล้ว ห้ามยกมาใช้ดื้อ ๆ.** ทิศใหม่ (toolbox ลอยตาม element) เป็น *คนละรูป* ของการเปลี่ยน. ประเมินใหม่ตามของที่ต้องเติมจริง:

| ต้องเติมอะไร | ขนาด | เพราะ |
|---|---|---|
| tap-to-select | **0** | มีแล้ว = โมเดลปัจจุบัน |
| toolbox anchored ต่อโน้ต | **เล็ก** | `slot-tools` + `.chord-cell` relative มีให้แล้ว — แค่เติมปุ่มในกล่องเดิม |
| toolbox anchored ต่อ **ห้อง** | **เล็ก** | `barMenuOpen` popover มีแล้ว — จัดของให้ครบ |
| toolbox anchored ต่อ **บรรทัด + ท่อน** | **กลาง** | วันนี้ line/stanza tools อยู่ในแถบ**ถาวร** (`edhead`/`cshead`) ไม่ลอย → ต้องย้ายมาเป็น anchored popover (แตะ template layout ของ 2 scope) |
| **hover-preview** (desktop) | **เล็ก–กลาง** | ของใหม่ 0 handler · gated `@media(hover:hover)` · ซ้อน state เดิม |
| ทำ trigger/ตำแหน่ง **consistent ทั้ง 5** | **กลาง** | = โดเมน UX (ผมยืนยัน feasibility) |

**ฟันธงขนาด:** ถ้า UX = "แตะ/hover element → tools ของมันลอยข้าง ๆ แทนแถวถาวร" → **refine ขนาดกลาง** (reuse state + slot-tools/clamp · restructure ที่ line+stanza) · ถ้า UX = "คงแถวถาวร เพิ่ม hover preview เฉย ๆ" → **เล็ก** · ถ้า UX = "panel เดียวลากได้แปลงร่างทุก scope แบบ Photoshop เต็มตัว" → **ใหญ่ขึ้นแต่ยังมี `floatEl` เป็นฐาน ไม่ใช่ rebuild**.

---

## 5 · ข้อควรระวัง / ที่ SA ค้าน–เตือน (ตัวเลข/โค้ดชนะสมมติฐาน)

1. **มือถือ = คีย์บอร์ดบังแถบล่าง (คอขวดจริงของพี่เปา):** toolbox ของ scope ที่**ต้องพิมพ์** (โน้ต/พยางค์) ต้องเกาะ **เหนือ** element แบบ `slot-tools` เดิม — **ห้ามตรึงล่างจอ** (คีย์บอร์ดเด้งขึ้นจะบัง). scope ที่**กดล้วน** (ห้อง/บรรทัด/ท่อน) ลอยล่างได้.
2. **แป้นพิมพ์ในช่องพยางค์ถูกจองแล้ว:** Space/Enter/Backspace/Delete = แยก/รวมพยางค์ (`onSylKey` 371) → คีย์ลัดของ toolbox **ห้ามแย่ง** ตอนโฟกัสอยู่ในช่อง.
3. **hover บน touch = ไร้ความหมาย + เสี่ยงสับสน** (Apple HIG) → tap เป็นความจริง, hover เป็นพรีวิว, **อย่าทำ 2 กลไกแข่งกัน**.
4. **clamp ไม่หลุดจอ + no-scroll + target 44px** — ทุก toolbox ต้องผ่าน `ui-standards §2` · วัดสด 360/412 จริง (ไม่ใช่ computed 375) ทุกเฟส (`feedback_verify_mobile_real_width`).
5. **ชนไฟล์:** ทั้งงานนี้อยู่ใน **`EditorMode.vue` ไฟล์เดียว** — 1 ไฟล์ 1 สาย. ถ้ามีสาย dev แตะ `EditorMode.vue` อยู่ ต้องเข้าคิว ไม่จ่ายขนาน (SOP §1.2).

---

## 6 · ที่ SA ไม่ตัดสินแทน — ส่ง UX + รอ PM/P'Aim

1. **รูปแบบ toolbox (flow/หน้าตา)** = UX ตัดสิน — ผมยืนยันได้ว่าทั้ง 3 รูป (คงแถว+hover / anchored ต่อ element / panel ลากได้) **ทำได้หมด** ต่างกันแค่ขนาดงาน (§Q4)
2. **scope ที่จะแปลงเป็น floating** (แค่โน้ต+ห้อง หรือครบ 5) = UX เลือก → กำหนดขนาดงานจริง
3. **ยังไม่ build** — ใบนี้ feasibility. UX ทำ flow/mockup → P'Aim เคาะ GATE 1 → ค่อยทำ DS + จ่าย dev

---

## 7 · ฟันธง SA — go/no-go + phase plan (พาไปถึงตัดสินใจ ไม่จบที่ "แล้วแต่")

### 7.1 คำตอบที่ P'Aim ให้ verify ตรง ๆ: **mobile ทำ hover-equivalent ได้ไหม → ✅ ได้ · เป็น refine ไม่ใช่ redesign**
คำถามจริงคือ *"มือถือไม่มี hover — โครงเดิมทำ tap-equivalent ได้ไหม"* — คำตอบเด็ดขาด: **โครงเดิม tap-to-select คือโมเดลปัจจุบันอยู่แล้ว** (`@focus`→focusedSlot · `@click`→editingChord/barMenuOpen). มือถือ**ไม่ต้องเลียนแบบ hover เลย** — มัน tap ตรง ๆ ได้ของจริงวันนี้. **hover เป็นของ desktop ล้วน (สิ่งเสริม)** ไม่ใช่ interaction หลัก. ดังนั้น *"mobile ทำไม่ได้บนโครงเดิม → redesign"* = **ไม่จริง** — มือถือคือเคสที่โครงเดิม**แข็งแรงที่สุด**. **ยืนยัน refine.**

### 7.2 phase plan ที่ SA แนะนำ (ฟันธง · UX จัด flow ในกรอบนี้)
| เฟส | ทำ | แตะ | เสี่ยง | คุ้ม |
|---|---|---|---|---|
| **A · anchored toolbox โน้ต+ห้อง (tap)** | ใช้ `slot-tools`/`barMenuOpen` เดิม จัดเครื่องมือให้ครบต่อ element | เล็ก — reuse pattern | ต่ำ | **สูงสุด — เริ่มที่นี่** |
| **B · ขยายไป line+stanza** | ย้าย edhead/cshead tools → anchored popover (helper กลาง 1 ตัว) | กลาง — restructure 2 scope | กลาง | สูง (ได้ consistency ครบ 5) |
| **C · hover-preview (desktop)** | `@pointerenter` gated `@media(hover:hover)` ซ้อน state เดิม | เล็ก–กลาง | ต่ำ (fallback = tap เดิม) | เสริม desktop |

**go:** เฟส A ทำได้ทันที (เสี่ยงต่ำ คุ้มสุด) · **no-go จนกว่า P'Aim เคาะ:** B (แตะ layout 2 scope = "รื้อ" ระดับกลาง) · **ลำดับบังคับ:** ถ้ามี dev แตะ `EditorMode.vue` อยู่ → เข้าคิว (1 ไฟล์ 1 สาย).

### 7.3 🚩 เชิงรุก — flag รูรั่วที่เร่งกว่างานนี้ (ไม่รอถูกถาม)
งาน toolbox = UX/ความสะดวก. แต่ในมือ SA มี **2 รายการที่กระทบผู้ใช้จริง/ความถูกต้อง — ควรจัดคิวก่อนหรือขนานงาน cosmetic:**
1. **🔴 verified GATE ไม่มี RLS = รูรั่ว security บน live** — anon เห็น **104 เพลงที่ยังไม่ตรวจ** (ควรเห็นเฉพาะ verified). นี่คือ**ข้อมูลรั่วบนเว็บจริงตอนนี้** ไม่ใช่ backlog เย็น ๆ → **แนะนำ P1** · ผมออกแบบ RLS policy + ตรวจ leak ได้ทันทีถ้า PM จ่าย (docs/DS ก่อน · dev รัน SQL ให้ PO)
2. **🟠 `publish_draft` เก็บ `author_id` = คนอนุมัติ ไม่ใช่คนเขียน** — ประวัติ/เครดิตผิดถาวรทุกเพลงที่อนุมัติ (แก้ย้อนหลังยากขึ้นทุกวัน) → แนะนำจัดคิวเร็ว

**ทั้งสองอยู่ในโดเมน SA เต็ม ๆ (RLS/data model) · แยกไฟล์กับ `EditorMode.vue` = ทำขนานกับ toolbox ได้ ไม่ชน** — รอ PM ชั่งลำดับกับ P'Aim.

---

*วัดโค้ดจริง 2026-07-17 · SA (feasibility-only) · ฐาน `studio-shell-redesign` · ⛔ ไม่แตะ `src/`*
