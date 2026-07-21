# Editor over-haul — ดีไซน์ที่ล็อกแล้ว (ต้นทาง + DomiSol + G cross-check รอบ 2)

ล็อก 22 ก.ค. 2026 · หลังอ่านต้นทางครบ (transcript P'Aim↔G · บทวิเคราะห์สถาปัตยกรรม · g-review) +
ลองใช้ DomiSol จริง + cross-check idea กับ G รอบ 2 ผ่าน meeting-room
**นี่ไม่ใช่การออกแบบใหม่ — เป็นการรวมทุกอย่างที่ตกผลึกแล้วให้เป็นแผนลงมือ**

---

## เป้าหมายสูงสุด (พี่เอม)

**World-class app for dummies · เป็น #1 jianpu app สำหรับโบสถ์**

> 🧭 **North star (P'Aim 22 ก.ค.):** default = **ง่ายสุดสำหรับทุกเพศ ทุกวัย** · ความซับซ้อนของ music notation
> **ซ่อนไว้ แต่มีให้** คนที่ต้องการจริงๆ (progressive disclosure ทั้งแอป ไม่ใช่แค่เรื่องภาษา) — คนทั่วไปไม่เห็น คนรู้ดนตรีเรียกใช้ได้
- ผู้ใช้ 2 กลุ่ม: (1) คนทำเพลง (พี่เปา = คอขวด · รู้ดนตรี) (2) คริสเตียนฝึกร้อง/ฟัง (ไม่รู้ดนตรี)
- พี่เอม (ไม่รู้ดนตรี) = ต้องใช้ได้ · หน้าที่ Claude = แปลงเป็นดีไซน์ระดับโลก
- **เอาแค่ที่หนังสือเพลงโบสถ์ใช้ · ไม่ไล่ feature แข่งใคร**

## SSOT: ข้อมูลชุดเดียว (v2) · 2 หน้าต่าง sync กัน

ไม่ใช่ 2 ฟอร์แมตแยก — เป็น 2 มุมมองของ v2 ตัวเดียว (stanzas ทำนอง + arrangement ลำดับ/เนื้อ +
repeat/volta + resolvePlayOrder/expandRepeats) · แก้ฝั่งไหนอีกฝั่งอัปเดตเอง

---

## หน้าเดียว (SPA) · read → ดินสอ → edit (G ยืนยัน + เงื่อนไข Strict State Separation)

- **default = แผ่นเพลงฝึกร้อง (โหมดอ่าน)** · กดดินสอ ✏️ → โหมดแก้ (WYSIWYG) · ไม่เด้งหน้าใหม่
- **micro-edit (โน้ต/เนื้อ) = แก้บนแผ่นเพลงตรงๆ**
- **macro-edit (เรียงโครงลากวางการ์ด) = ห้ามปนกับแผ่นเพลง** (รก/รวน) → ใช้ **Drawer Panel** สไลด์จากขอบจอ
  ลากวางการ์ด เห็นผลบนแผ่นเพลง real-time
- สลับ compact (repeat pattern) ↔ โครงกาง ได้
- output format (PDF/staff/MusicXML) = **layer ถัดไป** ไม่ใช่ตอนนี้

## หน้าต่าง 1 — โครงสร้าง (บล็อกการ์ด + ลากวาง) · สำหรับคนไม่รู้ดนตรี

G ฟันธง: **บล็อกการ์ดชนะขาด** เหนือ "วาดสัญลักษณ์ดนตรีเอง" — ลด cognitive load · Visual Programming
(คนโฟกัส logic "ร้องข้อ1แล้วไปรับ" · โปรแกรม = compiler แปลงเป็น volta/repeat มาตรฐานให้เอง)
- ลากการ์ด "ข้อ1 · รับ · ข้อ2…" จัดลำดับ · เลือกทำนอง · **ทำซ้ำท่อน (Duplicate)**
- **โปรแกรมสร้าง repeat/กล่อง1-2/D.C. ให้เองจากการเรียงการ์ด** — คนใช้ไม่ต้องรู้สัญลักษณ์
- 🎯 จุดชนะ DomiSol (ของเขาโครงซ่อนใน settings "select a note to mark its bar" = ภาษานักดนตรี)

### กฎ Duplicate/Copy บล็อกที่ share ทำนอง (G: "Default Share + Explicit Clone")
1. **Duplicate = เนื้อใหม่บนทำนองเดิม** — สร้าง arrangement row ใหม่ (เนื้อว่าง) · pointer ยังชี้ stanza เดิม
2. **Badge + เรืองแสง** — ทุกการ์ดมี badge `[ทำนอง A]` · แก้ทำนอง A → ทุกการ์ด A ไฮไลต์พร้อมกัน
   (คนใช้เห็นทันทีว่า "แก้ตัวนี้กระทบข้อ 1,2,3 นะ") — กันงง
3. **ปุ่ม "แยกทำนองเป็นอิสระ" (Make Unique / Unlink)** — ถ้าข้อ2 อยากต่างจากข้อ1 → clone stanza A→C
   จับการ์ดข้อ2 ชี้ C · แก้ได้โดยไม่กระทบข้อ1

## หน้าต่าง 2 — เนื้อหา (inline jianpu + เนื้อ) · สำหรับคนรู้ดนตรี (พี่เปา)

- พิมพ์โน้ต+คำบนแผ่นเพลงตรงๆ (WYSIWYG) · **แทรก (ripple) + ทับ** · backspace = ลบดึงชิด (default)
- คีย์เนื้อ: `space`=พยางค์ถัดไป · `-`=แยกคำข้ามโน้ต · `_`/`~`=เอื้อน (= มาตรฐานโลก MuseScore/Dorico เป๊ะ)
- v2 primitives เดิม: `setSyl` / `pushSlot` / `pullSlot` (ยืนยันชื่อกับ `songModel.js` ตอนโค้ด)
- ⚠️ แทรก/ลบโน้ตใน "ทำนองที่ share" ต้อง ripple ทุกข้อที่ใช้ทำนองนั้นพร้อมกัน

## Input surface — Responsive (G ไกล่เกลี่ย popup vs แถบล่าง: ถูกทั้งคู่ คนละ context)

- **Desktop = Contextual popup เกาะ cursor** (idea พี่เอม · แบบ Notion/Figma) — โผล่ตรงโน้ต โชว์เฉพาะที่ทำได้
  - กับดัก+วิธีแก้ (G): (ก) **Smart Positioning** ลอยบน/ล่างบรรทัด ห้ามบังโน้ต (ข) **พิมพ์รัว→popup fade หาย**
    โผล่เมื่อคลิก/ลาก หรือหยุดพิมพ์ >1s (debounce) — "ผู้ช่วยเงียบขรึม"
- **Mobile = ห้าม floating popup** (คีย์บอร์ดชน) → **Keyboard Accessory View / Bottom Sheet** (แถบติดขอบคีย์บอร์ด)
  = responsive degradation (แบบ DomiSol แต่ **ลบต้อง work จริง**)

## หลายภาษา (ไทย/จีน/อังกฤษ อย่างน้อย) — G: progressive disclosure = ดีสุด

- 90% เพลงภาษาเดียว → **default โชว์ภาษาเดียว · มิติภาษาโผล่ตอนกด "เพิ่มภาษา"** (ไม่รก)
- ใต้ฮู้ด = เก็บเนื้อแยกภาษา (nested) — รื้อ tooling ครั้งเดียวตอน over-haul (บทเรียน: อย่ารื้อ 2 รอบ)
- **per-language melisma สำหรับ dummies = "รวบพยางค์ด้วยสายตา":** ปุ่มโซ่ 🔗 ระหว่างกล่องพยางค์ →
  กดแล้วกล่องรวมเป็นกล่องยาวครอบ 2 โน้ต (เบื้องหลังสร้าง `melismaOverrides` เงียบๆ) · คนใช้แค่เห็นว่า
  "อยากให้คำนี้ครอบ 2 โน้ต"

## 3 แกนชนะขาด → เป็น #1 สำหรับโบสถ์ (G)

1. **เปลี่ยนคีย์ + แชร์ ง่ายดั่งพลิกฝ่ามือ** — ปุ่ม +/- คีย์ (เจียนพู่+คอร์ดกีตาร์เปลี่ยนทันที ไม่เสีย layout)
   + แชร์ Link/QR ให้นักร้องเปิดบนมือถือตัวเอง **ออฟไลน์ (PWA)** · (pain โบสถ์ = ขอเปลี่ยนคีย์หน้างาน)
2. **เสียงซ้อมร้องเป็นมิตร (ไม่ใช่ MIDI หุ่นยนต์)** — sample/soundfont เสียงคน "ฮัม" หรือเปียโนมีมิติ +
   **karaoke auto-scroll ไฮไลต์เนื้อวิ่งตามจังหวะระดับพยางค์** = killer feature นักร้องประสานที่อ่านโน้ตไม่เป็น
3. **Zero-learning input** — คิดแบบ "คนพิมพ์เอกสาร" ไม่ใช่ "นักแต่งเพลง" — ก๊อปเนื้อลง · ลากการ์ดว่าซ้ำท่อนไหน · จิ้มคอร์ด จบ

---

## 📋 สำรวจโค้ดจริงแล้ว (22 ก.ค.) — เกือบทุกอย่างมีแล้ว ต้อง REUSE

**มีแล้ว (reuse ห้ามสร้างใหม่):**
- **karaoke ไฮไลต์พยางค์ + auto-scroll** ✅ (B006 · `SongViewer.vue:304-359` + `SongSheet.vue:155-166`)
- **transpose สด** (chords `chords.js` · jianpu movable-do เลยเลขไม่เปลี่ยน เสียงชิฟต์ `midi.js:25,476`) ✅
- **เสียงจริง** smplr grand 5 ชั้น + arranger เต็มระบบ (`sampler.js` · `lib/arranger/`) ✅ · **PWA offline + install** (`public/sw.js` · `InstallAppTool.vue`) ✅
- **editor (`EditorMode.vue` 245KB):** พิมพ์โน้ตทีละตัว `NoteBoxes.vue` · เนื้อทีละพยางค์ · **contextual toolbox เกาะโน้ต/พยางค์** (`:328-388` — มี popup-เกาะจุดอยู่แล้ว!) · **ripple `pushSlot`/`pullSlot`** · undo/redo · copy/paste · **duplicate ห้อง/ท่อน/ข้อ** · drag เรียง · draft/approve ✅
- **โครงเพลง rail** (`:2044-2091` sticky ซ้าย/drawer มือถือ · ลากเรียง `moveRowTo` · เพิ่มท่อน inherit ทำนอง · badge ทำนอง · reuse stanza) ✅
- **3 โหมด** ฝึกร้อง/แผ่นเพลง/แก้ไข-ดินสอ (`Studio.vue` shared ShellBar) ✅ · **print A4** ✅ · **chord↔เลข toggle** ✅ · **DockKey** shared dock engine ✅

**ยังไม่มี (net-new จริง):**
- **พิมพ์ inline บน render จริงๆ** — วันนี้แก้ผ่านกล่อง `NoteBoxes` ไม่ใช่ cursor บนแผ่นเพลง (= หัวใจ "UI ใหม่ที่ง่าย")
- **คลิกโน้ตบนพรีวิว → เด้งไปแก้จุดนั้น (jumpToSource)** — hooks มี (`SongSheet` emit `seek` + `resolveContent` tag `_stanza`/`_entryIndex`) แต่**ยังไม่ต่อเข้า edit** (แก้: ผมเคยเข้าใจผิดว่ามีแล้ว — จริงคือมีแค่ seek-playback)
- **หลายภาษาต่อพยางค์** — มีแค่ title ไทย/อังกฤษ · เนื้อ flat ภาษาเดียว · ไม่มี melismaOverrides = layer หลัง

## แผนลงมือ (REUSE-first · ทำ 1 ขั้น → หยุด → ให้ P'Aim ดู)

งานจริง = **UI/UX ใหม่ที่ง่าย ครอบ logic เดิม (`EditorMode`) + render เดิม (`SongSheet`)** ไม่ใช่สร้างฟีเจอร์ใหม่

1. **คลิกโน้ตบนแผ่นเพลง → แก้จุดนั้น** (ต่อ hooks `seek`/`_stanza` ที่มี → focus โน้ตใน editor) = net-new · ตรง "แก้ที่เห็น"
2. **พิมพ์ inline บน render** — reuse logic `NoteBoxes`/`setSyl`/`pushSlot`/`pullSlot` มาแสดงเป็น cursor บนแผ่นเพลง (ไม่ใช่กล่อง) · แทรก/ทับ + ลบดึงชิด มีอยู่แล้วในตรรกะ
3. **ทำ chrome ให้ง่าย** — เอา contextual toolbox ที่มี → เป็น popup(desktop เกาะ cursor)/แถบคีย์บอร์ด(mobile) · ซ่อนความซับซ้อน 245KB หลัง progressive disclosure
4. **โครงสร้าง Drawer** — reuse โครงเพลง rail เป็น Drawer สะอาด + เพิ่ม **Make Unique** (badge ไฮไลต์มีแล้ว?ตรวจ) — copy/move/duplicate มีแล้ว
5. **Layer หลัง:** หลายภาษา (progressive + 🔗) · ปุ่มเปลี่ยนคีย์ง่าย + QR แชร์ (engine transpose มีแล้ว) · output formats

⚠️ ก่อนแตะโค้ดแต่ละขั้น — เปิดไฟล์จริงยืนยันชื่อ/บรรทัดก่อน (เลิกเดา)

## บทเรียนที่ต้องถือ
- ทำ 1 ขั้น → หยุด → ให้ดู (task.md 🔴) · คุยภาษาคน
- ตรวจที่ชั้นอื่นจากที่พิมพ์ (แก้ source → ดูหน้าเว็บจริง)
- "กดได้จริง" ต้องวัด (elementFromPoint ไม่ใช่แค่ querySelector)
- feature เยอะ ≠ ใช้ง่าย (บทเรียนจาก DomiSol)
