# DS — B083 จับคู่ทำนอง↔เนื้อร้อง (เสริมของเดิม)

US: `docs/us/melody-pairing.md` · visual: `docs/design/melody-pairing.html` · เคส เพลง 2 "ของขวัญ"
ไฟล์ที่แตะ (คาด): **`src/components/EditorMode.vue` เท่านั้น** (+ อาจ helper เล็กใน `lib/`). **ไม่แตะ** schema · notation.js core · viewer/print/dock.
หลัก: **เสริม element ที่มีอยู่ · เปลี่ยนน้อยสุด (KISS)** · อ้าง `ui-standards.md` §2.

## สถานะโค้ดปัจจุบัน (studio-shell-redesign · หลัง editor-section-ux)
- rail "โครงเพลง" = arrangement rows (grip/rename/▲▼/♪chip) · "ทำนอง (โน้ต)" ยุบ (`melodyOpen`)
- `lensActive = !!lensRow && lensRow.stanza === activeStanzaId` (`:242`) — คุมว่าโชว์ `cshead` + ช่องคำ
- หัวท่อน `cshead` (`v-if=lensActive` `:2006`) มี ComboSelect เลือกทำนอง → `lensRow.stanza = $event` (`:2034`)
- `stanzaIdOptions` label = `'ทำนอง '+id` (`:647`) · `rowStatus(row)` คืน `{need,got,ok}` (มีอยู่)

## MP1 — เปลี่ยนทำนองแล้วไม่หาย (บั๊กหลัก)
**ต้นเหตุ:** เปลี่ยน `lensRow.stanza` A→B แต่ `activeStanza` ยังชี้ A → `lensActive=false` → `cshead` (v-if) หาย.
**แก้ (จุดเดียว):** ที่ handler ของ ComboSelect หัวท่อน (`:2034`) แทน `lensRow.stanza = $event` ด้วยฟังก์ชัน:
```
function setRowStanza(id){
  lensRow.value.stanza = id
  const idx = stanzas.value.findIndex(s => s.id === id)
  if (idx >= 0) selectStanza(idx)   // activeStanza ตามทำนองใหม่ → lensActive คงจริง
}
```
- `selectStanza` มีอยู่แล้ว (ตั้ง activeStanza + activeLine=0). ทำเหมือนกันกับชิป ♪ ใน rail ถ้าให้เปลี่ยนจากตรงนั้นได้ (optional).
- ผล: หัวท่อน + ช่องคำไม่หาย · แก้เนื้อของท่อนบนทำนองใหม่ต่อได้ทันที.
- **เตือนไม่บล็อก (US MP·Q3):** ถ้าเนื้อเกินความจุทำนองใหม่ → ป้ายแดง (rowStatus) แต่ยอมเปลี่ยน.

## MP2 — พรีวิวทำนอง (แยกออก)
- helper `stanzaPreview(id)`: ดึงโน้ต 5–6 ตัวแรก (join จาก segments แรก ๆ) + `lines.length` + `stanzaSlots(id)` (มี `stanzaSlots` แล้ว).
- `stanzaIdOptions` (`:647`) → label เป็น `{ value:id, label:'ทำนอง '+id, hint: stanzaPreview(id) }` (ComboSelect รองรับ 2 บรรทัด/hint — ถ้าไม่รองรับ ใส่ในบรรทัดเดียว "ทำนอง A · 5 1-0̲2… · 4 บรรทัด").
- ชิป ♪ (rail row `:1852`) tooltip เติมพรีวิว · รายการ "ทำนอง (โน้ต)" (`:1870`) แสดงพรีวิวเป็น subtitle.
- **derived ล้วน — ไม่แตะโมเดล.**
- **ชื่อทำนอง (optional):** ถ้า P'Aim เอา → เพิ่ม `stanzas[].name` (string) · แก้ inline แบบเดียวกับ rename ท่อน · previewContent serialize เพิ่ม name · migrate: ไม่มี name = ใช้ id. **รอเคาะก่อน (Q1).**

## MP3 — แยกพยางค์ก้อน import
- ปุ่ม "✂ แยกพยางค์อัตโนมัติ" ในแผง para (`paraOpen`).
- helper `autoSyllable(text)`:
  1. split ด้วย `,` `，` → วรรค (import ใช้ comma คั่นวรรค)
  2. แต่ละวรรค → `Intl.Segmenter('th',{granularity:'word'})` (มากับเบราว์เซอร์ · ICU dict · **ไม่ต้อง bundle**) → tokens
  3. รวม tokens → เขียนผ่าน `setRowLyricText`/`wordsToSyllables` เดิม (map เข้า attack slots, ข้าม held/rest)
- fine-tune ต่อด้วย ◀▶ (`pushSlot`/`pullSlot`) + space/enter split ที่มีอยู่ · overflow strip เดิมจับส่วนเกิน.
- **ข้อจำกัด (Q2):** Intl.Segmenter ตัดเป็น "คำ" ไม่ใช่ "พยางค์" เป๊ะ → ใกล้ + ให้คนปรับ. ถ้าอยากเป๊ะกว่าต้องเพิ่ม lib (เช่น pythainlp ไม่ได้ฝั่ง client · อาจ wordcut/​ตาราง) — ชั่งน้ำหนักกับ KISS. **แนะนำเริ่ม Intl.Segmenter.**
- fallback: เบราว์เซอร์ไม่มี Intl.Segmenter → ตัดแค่ comma→วรรค (ผู้ใช้แยกพยางค์ต่อเอง).

## MP4 — ป้ายจับคู่ใน rail
- ในแถว rail (`:1811`+) เติม `<span class="pair-badge">` ต่อท่อน: `const st = rowStatus(row)` → `st.ok ? '✓' : st.got+'/'+st.need+' ✗'` สี เขียว/แดง.
- ป้าย **บรรทัดเดียว** (ui-standards §2: list row บรรทัดเดียว ไม่ห่อ · truncate ชื่อพร้อม tooltip ถ้าแคบ) · target/contrast ผ่าน.
- ระวัง: rail แคบ → ป้ายอาจเบียด. ให้ป้ายกระชับ ("23/7") · ชื่อ ellipsis + tooltip · อย่าให้ ▲▼ ซ้อน 2 บรรทัด (ตัวอย่างผิด `realuse-assets/songstruct-row-cramped.png`).

## WCAG / ui-standards
- ตัวเลือกทำนอง (popup) = ปิด Esc/แตะนอก · ยึดปุ่ม · ไม่ scroll · พรีวิวใน option ต้อง contrast ≥4.5 (โน้ตสีน้ำเงินบนขาว OK)
- ปุ่ม "✂ แยกพยางค์" = target ≥44px · `aria-label` · หลังกดแจ้งผลด้วย `aria-live` ("แยกได้ N ช่อง")
- ป้ายจับคู่แดง = ไม่พึ่งสีอย่างเดียว (มี ✗/✓ + ตัวเลข)
- ไม่เพิ่ม action ซ้ำ 2 ที่ (single source): เปลี่ยนทำนอง = หัวท่อน (ชิป rail = ทางลัดไปหัวท่อน ไม่ใช่ picker คนละตัวที่ทำงานต่างกัน)

## ทดสอบ (dev/QA · เคส เพลง 2)
1. เปิดเพลง 2 → rail โชว์ 3 ป้ายแดง (23/7 · 1/91 · 21/91).
2. ร้อง1 เปลี่ยนทำนอง B→A → หัวท่อน+ช่องคำ **ไม่หาย** · ป้ายอัปเดต.
3. ตัวเลือกทำนองโชว์พรีวิว A(4 บรรทัด)/B(1 บรรทัด) แยกออก.
4. "รับ" กด ✂ แยกพยางค์ → ก้อนแตกเป็นช่อง · ปรับ ◀▶ ได้ · overflow ไม่หาย.
5. regression: ไส้ในแก้โน้ต/ดูผล/บันทึก เหมือนเดิม (editor-section-ux SX7 gate) · เพลงอื่น (100) ไม่ regress.

## ✅ P'Aim เคาะแล้ว (11 ก.ค. · mockup approved)
- **Q1 ชื่อทำนอง = พรีวิวโน้ตอย่างเดียว** (5-6 ตัวแรก · derived) — **ไม่เพิ่ม field ในโมเดล · ไม่ทำช่องตั้งชื่อ**
- **Q2 แยกพยางค์ = ใช้ `Intl.Segmenter('th')` (ในเบราว์เซอร์)** — ไม่โหลด lib · ระดับ "คำ" ไม่เป๊ะทุกพยางค์ พอได้ ปรับต่อด้วย ◀▶ เดิม
- **Q3 เปลี่ยนทำนองแล้วเนื้อไม่พอดี = เตือนไม่บล็อก** (ทำต่อได้ · ป้าย got/need)
→ dev ทำตาม 4 จุดในใบสั่ง/DS · **ปรับของเดิม ไม่ทำจอใหม่** · **ชน `EditorMode.vue` กับ B081 (in tester) → PM เรียงคิว merge**
