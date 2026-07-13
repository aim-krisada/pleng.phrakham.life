# Dev report — เส้นใต้ตามพยางค์ (issue8) + slur ข้ามห้อง (issues5)

branch `claude/jovial-roentgen-e8d7c0` · fork จาก `studio-shell-redesign` (ยืนยัน merge-base = `98a5818`, ไม่ใช่ main)
สเปก: `docs/ds/notation-beam-slur.md` (ทำครบทั้งฉบับ) · brief: `docs/pm/brief-notation-beam-slur.md`

## F60+ (ภาษาคน)
ทำครบ 2 บั๊ก + ระบบตรวจถาวร 2 ชั้นตามที่ P'Aim สั่ง:
1. **issue8** — เส้นใต้ (beam) เดินตาม **คำร้อง** ไม่ใช่ตามจังหวะ. โน้ตที่ **ขึ้นคำใหม่** = ตัดเส้น · โน้ต **เอื้อน** (ช่องคำว่าง) = ต่อเส้น. ไม่ต้องแก้ข้อมูล 120 เพลง (สัญญาณอยู่ใน `seg.syllables` แล้ว — แค่ต่อสายเข้าไปในตัววาด).
2. **issues5** — slur ที่เปิด `(` ท้ายห้อง ปิด `)` ต้นห้อง/บรรทัดถัดไป วาดถูกแล้ว ด้วย overlay ระดับบรรทัด (โครงเดียวกับ tie ข้ามห้อง B069/B099).
- **test เดิมไม่แตกเลย · build ผ่าน** · แยก logic เป็นฟังก์ชันบริสุทธิ์ 3 ตัวใน `notation.js` → unit-test ได้โดยไม่ต้องมี browser.

## Network URL (ทดสอบมือถือ + print PDF)
**http://192.168.1.124:5314/** (dev `--host --port 5314` · IP เครื่องเปลี่ยนได้ เช็ก vite Network line ก่อนส่งต่อ)

## ไฟล์ที่แตะ (ตรงตาม DS §ไฟล์เจ้าของ เป๊ะ)
| ไฟล์ | เปลี่ยน |
|---|---|
| `src/lib/notation.js` | +3 pure fn: `beamGroups(note, syllables)` · `slurSpans(noteStrings)` · `arcPlan(openRect, closeRect, rowH)` — export เดิมไม่แตะ |
| `src/components/NoteRow.vue` | รับ prop `syllables` · แทน beam loop เดิม (beat-only) ด้วย `beamGroups()` · คงตรรกะ `beamOnly` (ซ่อน arc) เดิม |
| `src/components/SongSheet.vue` | ส่ง `:syllables="seg.syllables"` · ขยาย overlay (`measureTies`) วาด slur ข้ามกล่อง + ซ่อน arc ค้างของ NoteRow เฉพาะกลุ่มที่ dangling |
| `src/lib/notation.beam.test.js` · `src/lib/notation.slur.test.js` | golden tests (DoD ก) |
| `tools/audit-notation.mjs` · `docs/reports/notation-audit.md` | สคริปต์ตรวจทุกเพลง (DoD ข) |

**ไม่แตะ:** arc geometry เดิม (`slurArc`/`tieStartArc`/`tieEndArc`/`buildArc`) · midi · parser core · DB · EditorMode.vue.

## DoD ชั้น 2ก — golden unit tests (รันทุก build · Tier A jsdom)
- `notation.beam.test.js` — 10 เคส: รูป1 (คว้า+เอื้อน เชื่อม) · รูป2/รูป3 (2 คำในจังหวะเดียว = ไม่เชื่อม) · issues2 `(6_ 5_)` = 1 beam · เอื้อน 3 ตัว/16th u2 · v1 fallback (null → beat-only เดิม).
- `notation.slur.test.js` — 11 เคส: ข้ามห้อง (sameSegment:false, idx ถูก) · ในกล่องเดียว (sameSegment:true) · หลาย slur · anchor ข้าม `-` นำ · dangling `(` ไม่มี pair · triplet ไม่รบกวน idx · `arcPlan` single/split + edge tolerance.
- **ผล:** `npx vitest run` → **545 tests ผ่าน** (รวม NoteRow/SongSheet/notation regression เดิมครบ). _(หมายเหตุ: `notationLint.test.mjs` โชว์ "failed suite" เพราะเรียก `process.exit(0)` — pre-existing, ไฟล์นี้ไม่ได้แตะ, เช็คภายใน 72/72 ผ่าน)_

## DoD ชั้น 2ข — สคริปต์ตรวจข้อมูลทุกเพลง (re-run ได้)
`node tools/audit-notation.mjs` → เขียน `docs/reports/notation-audit.md` (อ่าน Supabase read-only · ใช้ `beamGroups`/`slurSpans` ตัวเดียวกับ render — SSOT เดียว).
**รอบล่าสุด:** 124 เพลง · **beam-cut 3138** · **slur ข้ามห้อง 2** · ⚠️ blank-attack 98 เพลง.

## 🚩 ต้องบอก P'Aim/พี่เปา ก่อน merge (ผลข้างเคียงที่ตั้งใจของ DS)
- **beam-cut 3138 จุด = การเปลี่ยนภาพครั้งใหญ่.** เพลงส่วนมากร้อง 1 คำ/โน้ต (syllabic) → เขบ็ตในจังหวะเดียวที่เคย "ต่อเส้น" (beat-only ที่ deploy อยู่) ตอนนี้ **แยกเส้น** ตามกฎพยางค์ของ DS (รูป2/รูป3). beam จะเหลือเฉพาะช่วง **เอื้อน** จริง. นี่คือสิ่งที่ DS สั่งไว้ชัด ("อย่าแก้ให้ beam ตามจังหวะ") + ชั้น1 พี่เปายืนยัน ~10 เพลงว่าหนังสือขีดตามพยางค์ — แต่ **สเกลใหญ่ ควรให้พี่เปากวาดตา `notation-audit.md` เทียบหนังสือก่อนเคาะ merge**.
- **blank-attack 98 เพลง ≠ บั๊กการวาด** — เป็นภาพสะท้อนสถานะ import เนื้อยังไม่ครบ (DA seed+flag) · เป็น hint ให้ทีมตรวจเนื้อ ไม่ใช่ตัวบล็อกงานนี้.

## Tier B — ต้องมี real browser + print (ให้ tester ก่อน gate)
1. **issue8 บนจอ:** เปิดเพลงที่มี beam เอื้อนจริง (จาก audit เช่น มี `→ เชื่อมเส้น (beam)`) → เส้นใต้เชื่อมเฉพาะตัวเอื้อน · โน้ตคนละคำในจังหวะเดียว **แยกเส้น** (รูป2 อา/ภรณ์ · รูป3 ไม่/เคย).
2. **slur ข้ามห้อง (แถวเดียว):** เพลง **#8 พระองค์ทรงเป็นดาวประจำรุ่ง** และ **#12 เพราะพระองค์เป็นอยู่** (2 จุด cross-slur ทั้งคอร์ปัส) → arc **1 เส้น** พาดข้ามเส้นห้อง · **ไม่มี** arc ค้างครอบโน้ตเดี่ยว.
3. **slur wrap (คนละบรรทัด):** ย่อจอ/พิมพ์ให้ตัด bar ที่เปิด-ปิด slur ลงคนละบรรทัด → arc **2 ส่วน** (ท้ายแถวบน + ต้นแถวล่าง).
4. **print PDF จริง** (memory `feedback_verify_print_from_pdf`): พิมพ์ #8/#12 + เพลงมี beam เอื้อน → เส้น/โค้งถูกบนกระดาษ A4 (ไม่ใช่แค่ DOM).
- Tier A มี `arcPlan()` (single/split) ให้ tester mock rect ได้; geometry pixel = ต้องจอจริง.

## ยืนยันไม่ regress (checklist DS §ยืนยันไม่ regress)
- [x] `NoteRow.test.js` (B062/B076/issues2) เขียวครบ — `(6_ 5_)` = 1 beam ไม่มี arc · slur ยาว = 1 path · nt-ext ยังมี.
- [x] `SongSheet.test.js` (B069/B099 tie overlay) เขียว — tie ข้ามห้องยังวาด.
- [x] 3 เคส issue8 + เคส slur ผ่าน golden ใหม่.
- [x] slur ในกล่องเดียว (`(1 2 3 4)`) ยังเป็น 1 arc ของ NoteRow (slurSpans คืน sameSegment:true → overlay ไม่ยึด).
- [ ] Tier B (tester + real browser + print) — ข้อ 1–4 ข้างบน.

## Re-run / verify เอง
```sh
npm install                       # worktree ยังไม่มี node_modules
npx vitest run                    # 545 ผ่าน
npm run build                     # ผ่าน
node tools/audit-notation.mjs     # เขียน docs/reports/notation-audit.md
npm run dev -- --host --port 5314 # ทดสอบมือถือ/print
```

## ค้าง (ห้ามทำเอง — PM gate)
- **ห้าม merge/deploy เอง** — รอ PM gate + tester Tier B (real browser + print).
- Open questions ทั้ง 3 ข้อ PM เลื่อนแล้ว (รับ SA default · KISS) — ไม่ทำในรอบนี้.
