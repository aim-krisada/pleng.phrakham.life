# Editor over-haul — ดีไซน์ฉบับปิด (Claude + G Pro · 21 ก.ค.)

ต่อยอด v2 ไม่รื้อ schema · ผ่านการปรึกษา G (Pro) + Claude (โค้ดจริง) 4 รอบ

## A. โมเดลข้อมูล — "flat rows + attribute" (G Pro หักล้าง nested ของ Claude · ดีกว่า)
- **`syllables:[...]` คง flat 1 มิติเหมือนเดิม** → editor tooling เดิม (shift ◀▶ · auto-split · paragraph) ทำงานต่อ 100% ไม่รื้อ
- **มิติ voice/lang = attribute ที่ระดับ arrangement row** (1 ภาษา/1 voice = 1 row) — arrangement รองรับหลาย row อยู่แล้ว = แทบไม่ต้องเพิ่มอะไร
  ```jsonc
  "arrangement": [
    { "stanza":"A", "voice":"lead", "lang":"th", "label":"ข้อ 1", "syllables":["พระ","คุณ"] },
    { "stanza":"A", "voice":"lead", "lang":"en", "label":"Verse 1", "syllables":["A-","grace"] },
    { "stanza":"A", "voice":"response", "lang":"th", "syllables":["(เมต-","ตา)"] }
  ]
  ```
- **per-language melisma:** `melismaOverrides:[{slotIndex,noteSpan}]` ที่ row นั้น (อังกฤษเอื้อน 2 โน้ต=1 พยางค์ · ไทยไม่ override) · parser คำนวณ syllableSlots dynamic
- **voice ≠ lang = orthogonal** · render = group row ที่ stanza เดียวกันมาซ้อน (render-only) · backward-compat เพลงเก่าไม่มี attribute = อ่านปกติ
- gap เรียงลำดับ: **1) D.C./Segno (เล่นถูก · >30% ใช้) 2) display compact 3) ปุ่มลัด(รับ) 4) MusicXML**

## B. Editor UX — "Live Sheet + Contextual Inspector" (G Pro ออกแบบ)
**ตัด/รวบ:** ❌ ยุบ Melodies + Arrangement panel เป็นอันเดียว (ผู้ใช้ไม่ต้องแยกว่าแก้ "ทำนอง" หรือ "โครง") · ❌ เลิก Verse Lens แยกโหมด → ดูเนื้อคู่โน้ตเป็น default

**Layout 2 ฝั่ง:**
- **ซ้าย 20% = Structure Dock:** บล็อก arrangement (ข้อ 1 · รับ) ลากสลับลำดับ · ปุ่ม global **[🗑️ ลบเพลง]** (แก้ issues10) · **[⚙️ คีย์/จังหวะ]**
- **ขวา 80% = Live Sheet (WYSIWYG):** แผ่นเพลง render จริงเหมือนกระดาษ = หน้าหลัก (แก้ preview เล็ก issues6/7)
- **Click-to-Edit:** คลิกห้องบน Live Sheet → `_source` trace → เปิด **Contextual Inspector** (พาเนลลอย/ดันจากล่าง) เฉพาะห้องนั้น · 3 บรรทัด: **[คอร์ด]** (พิมพ์อิสระตรงจังหวะไหนก็ได้ แก้ issue21) · **[โน้ต]** (เจียนพู่) · **[เนื้อ]** (auto-split)
- **แท็บเล็ต/มือถือ:** จอหลัก read-only · จิ้มห้องผิด → Contextual Panel + คีย์บอร์ดเด้งเป็น bottom sheet

## C. 🔴 หลุมพราง 3 ข้อ (G Pro จับได้ · ต้องอยู่ในดีไซน์)
1. **Data Desync (domino):** แก้ Stanza A (แทรกโน้ต) → `syllables` ของทุก row ที่ใช้ A ยาวไม่ตรง slot + **`melismaOverrides` ที่อ้าง slotIndex เดิมชี้ผิดหมด** → ต้องมี Alignment Validator ขึ้น warning ที่ Structure Dock ทันที ห้ามพังเงียบ
   - 🟢 **Claude เสริม: ฐานมีแล้ว** — v2 มี syllable-count indicator ต่อ row (`8/8✓ / 7/8⚠`) + migrateToV2 flag mismatch · งานคือขยายให้ครอบ melismaOverride re-index ด้วย
2. **Print matrix explosion:** 2 ภาษา × 2 voice × 3 ข้อ = 12 บรรทัดใต้ทำนองเดียว อ่านไม่ได้ → ต้องมี **View/Print Filter** (ติ๊กเลือก "เฉพาะ lead ไทย" หรือ "กางเต็ม") ก่อน export ไม่ render ทุกมิติพร้อมกัน
3. **Mobile jianpu keyboard:** คีย์บอร์ด iOS/Android ไม่มีปุ่มขีดล่าง(ครึ่งจังหวะ)/จุด octave → ต้องทำ **custom on-screen keyboard** เฉพาะบรรทัด [โน้ต]

## D. 🟢 Claude เสริม 1 จุดที่ยังหลุด — edit scope ใน Inspector
Contextual Inspector 3 บรรทัดของ G ยังไม่แยก **ขอบเขตการแก้**:
- **[โน้ต] = แก้ stanza (ทำนอง) = กระทบทุกข้อที่ใช้ทำนองนี้** — คลิกแก้โน้ตใน "ร้อง 2" ไปเปลี่ยน "ร้อง 1" ด้วย
- **[เนื้อ] = แก้เฉพาะ arrangement row นี้ (ข้อนี้ภาษานี้)**
→ ถ้าไม่บอกให้ชัดบน UI พี่เปาจะงง "แก้ตรงนี้ทำไมตรงโน้นเปลี่ยน = โปรแกรมรวน" (อาการเดียวกับ domino แต่ที่ชั้น UX) · **ต้องมี label/สีบอกใน Inspector ว่าบรรทัดไหนกระทบทั้งเพลง บรรทัดไหนเฉพาะข้อ**

## E. สถานะ = พร้อม implement · ลำดับลงมือ
1. **D.C./Segno resolver** (gap 1 · เล่นเสียง · นัดหูพี่เปา verify)
2. **Editor UX over-haul** (Live Sheet + Structure Dock + Contextual Inspector) — งานช้าง แยก session + wireframe ก่อน
3. Alignment Validator ขยาย (หลุมพราง 1) ทำคู่กับ over-haul
4. View/Print Filter + custom keyboard = เฟสถัดไป
