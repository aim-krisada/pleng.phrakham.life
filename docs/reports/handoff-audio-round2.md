# Handoff — เปียโนเดี่ยว (Grand) รอบ 2: "tune ให้เลอเลิศ" + เมนูเลือกเทคนิค

**อ่านไฟล์นี้ก่อน → ต่อได้ทันที.** งาน = SA สายเสียง iterate กับ P'Aim ตรง (creative) · **โฟกัส Grand piano อย่างเดียว ทำให้สุด** (P'Aim 14 ก.ค. "จัดเต็มรอบ 2 tune piano อย่างเดียวให้เลอเลิศ") · **ห้าม merge/deploy เอง — PM คุม gate.**

> **คำย่อ:** SA = Systems Analyst (นักวิเคราะห์+ปั้นระบบ) · comp = การเล่นคอร์ดคลอ (มือซ้าย/inner voices) · MP3 = ไฟล์เสียงดาวน์โหลด

## 1. สถานะ — รอบ 1 ทำอะไรไป (P'Aim ฟัง + GO deploy 14 ก.ค.)

รอบ 1 (branch `claude/blissful-rosalind-613f3e`) ปั้น Grand เปียโนเดี่ยวจาก "ตอกโน้ตทื่อ" → "เหมือนคนเล่น" ครบ + จูนตาม P'Aim ฟัง:

| เทคนิค | ทำอะไร | ค่าปัจจุบัน (ไฟล์) |
|---|---|---|
| BPM-auto style | เปิดเพลงเลือกสไตล์ตาม tempo + ไฮไลต์ปุ่ม + กดทับได้ | threshold **92** (<92 บรรเลง/arpeggio · ≥92 สงบ/sustained) · `styleAuto` [store.js](../../src/store.js) · `recommendRecipe` [presets.js](../../src/lib/arranger/presets.js) · `effectiveStyle` [SongViewer.vue](../../src/components/SongViewer.vue) |
| Humanize | สุ่มน้ำหนัก+เวลาให้พริ้ว | vel **±0.06** · time **±0.012s** · chord spread ×0.35 [dynamics.js](../../src/lib/arranger/dynamics.js) · [keyboard.js](../../src/lib/arranger/instruments/keyboard.js) |
| Metric accent | เน้นบีตแรก (จูนนุ่มแล้ว) | **[0.80, 0.92]** (เดิม [0.72,1.0] · ลดกระแทก) [dynamics.js](../../src/lib/arranger/dynamics.js) |
| Melodic contour | ไต่ขึ้นดังขึ้น · ปลายวรรคผ่อน | ±0.06 / long −0.06 clamp [0.5,1.2] |
| Rubato | ยืดโน้ตปลายท่อน + หายใจเข้าท่อนใหม่ | stretch **×1.12** · breath **0.06s** · ที่ section-end/song-end · grid ไม่ดริฟต์ · ใช้ `sectionBeatRanges` |
| Sparkle | ประกายอ็อกเทฟสูง (มีสไลเดอร์จูนสด) | `MEL_BASE 0.35 × sparkleLevel` · default **0.7** (−30%) · สไลเดอร์ **30–90%** โผล่เฉพาะบรรเลง [embellish.js](../../src/lib/arranger/embellish.js) |
| gapFill | หยอดโน้ตช่องคอร์ดยาว (ลดความถี่แล้ว) | prob **0.18** (เดิม 0.33) · beats≥3 · gain floor |
| **easeUnderHold (มือซ้ายหลบ)** | ทำนองค้าง → comp บางลงเหลือ downbeat (ปล่อย ring) | holdBeats **2** · keep bar-downbeat · `cfg.easeUnderHold` default on [dynamics.js](../../src/lib/arranger/dynamics.js) |
| Refrain แตกคอร์ด | ท่อนรับเล่น arpeggioDense (2 hits/beat) | จับท่อนรับจากป้าย **รับ/`***`** (`sectionBeatRanges.isRefrain`) · `cfg.refrainPattern` [patterns.js](../../src/lib/arranger/patterns.js) |
| Pedal bass | เบสอุ้มลากยาว (โหมดบรรเลง) | bass `pedal` [presets.js](../../src/lib/arranger/presets.js) |
| Touch | เบามือลด "กระแทก" | melody base gain **0.31** (เดิม 0.35) [index.js](../../src/lib/arranger/index.js) |

**ข้อจำกัดที่ควรรู้:** comp inner ถูก clamp ที่ **floor `GAIN_MIN 0.055`** (vel 41) เพราะ Grand โหลด PP layer เดียว `[41,67]` → "ผ่อนเบา" comp = ต้อง**เล่นโน้ตน้อยลง** (drop hits) ไม่ใช่ลด gain (มันชนพื้นแล้ว). Grand **makeup ×2.6** ([sampler.js](../../src/lib/sampler.js)) = lever ถ้า P'Aim ยังว่า "หนักไป" (แต่กระทบ ensemble balance — ระวัง).

## 2. รอบ 2 — งาน (P'Aim สั่ง)

**A. Tune Grand ให้ "เลอเลิศ" (โฟกัสหลัก · P'Aim iterate ตรง)** — ปั้นเสียง Grand อย่างเดียวให้สุด: voicing / reverb (ตอนนี้ room · church) / touch / dynamics / เสียงแต่ละท่อน. ฟังแล้วจูน constant ในตาราง §1.

**B. เมนูเลือกเทคนิคละเอียด (P'Aim: "เก็บทุกอย่างจะได้เลือกได้ถูก")** — ทุกเทคนิคใน §1: **ใช้/ไม่ใช้ (toggle) + เยอะ/น้อย (intensity slider) + คอมพ์ตั้ง default + คำอธิบายสั้น** (ให้คนไม่รู้ดนตรีเลือกเอง + เรียนรู้). **2 ชั้น:** ผู้ใช้ทั่วไปเห็น preset ง่าย (บรรเลง/สงบ) · "ปรับละเอียด" ซ่อนไว้กางหมด. โครงมีแล้ว: SoundControl popover รองรับ slider (sparkle) + toggle · store persist · arrange อ่าน cfg ต่อเทคนิค. → ขยาย cfg flags: `easeUnderHold`, `refrainPattern`, `dynamics.*`, `embellish[]`, `sparkleLevel` (มี), เพิ่ม gapFill level / accent amount / rubato amount ให้ปรับได้.

**C. ปุ่ม Remix + ล็อก seed → MP3 ตรง** — กด remix = เปลี่ยน seed (`seedFor(songId, pass)` [rng.js](../../src/lib/arranger/rng.js)) → สูตรใหม่ · **ล็อกสูตรที่ชอบ → download MP3 render ด้วย seed เดียว = ตรงกับที่ฟัง** (แก้ปัญหา MP3). **ต้องมี UX/UI designer ออกแบบให้ดูดี มาตรฐานสากล ใช้ง่าย** (P'Aim สั่ง). MP3 path = [audioExport.js](../../src/lib/audioExport.js) (P3 · ยังไม่ route ผ่าน arrange — ต้องทำให้ใช้ arrange+seed เดียวกับ live).

**D. แสดงเวลา current/total + seek** — ตอนนี้มี `.st-time` เวลารวมอย่างเดียว → เพิ่ม `0:12 / 1:20` + แตะแถบ seek. ช่วย feedback loop (อ้างอิงวินาที) + ผู้ใช้.

**E. "สมองรู้กาลเทศะ" (density/section engine · P'Aim ย้ำ)** — วิเคราะห์ **tempo + time-signature + โครงท่อน + density** ก่อนเลือกใส่เทคนิค · verse เรียบ / chorus เต็ม / outro ดิ่ง · ทำนองถี่→ลดลูกเล่น · ช้ามีช่องว่าง→เพิ่ม. `easeUnderHold` + refrain-detect + `sectionBeatRanges(level/isRefrain)` = จุดเริ่มที่มีแล้ว.

**F. 6 เทคนิคเสียงใหม่** (ลำดับ: ปลอดภัยก่อน → harmony ทีหลัง):
- **Passing bass** — `walking` mode **มีแล้ว** [bass.js](../../src/lib/arranger/bass.js) แค่เปิด+จูน · **slash chord (G/B)** = ใหม่ (แตะการเรียงเสียง)
- **L/R balance** — ⚠️ **อย่าล็อก "เบา 15-20%" (จะกลบทำนอง · comp=stack หลายโน้ต)** → ทำ **สไลเดอร์สมดุลซ้าย-ขวา** จูนหูแทน
- **Sus4/Sus2** — จบประโยคหยอด sus → resolve · ⚠️ guard: sus เฉพาะเมื่อทำนองไม่ใช่ 3rd/ตัวชน (golden rule แผ่น=SSOT)
- Variability → **ใช้ Remix (ข้อ C) แทน auto-สุ่ม** (ล็อกได้ + MP3 ตรง)

## 3. สถาปัตย์ (ต่อได้ทันที)

`arrange(notes, chordEvents, cfg, meta) → PerfEvent[]` = pure function กลาง ([index.js](../../src/lib/arranger/index.js)) · pipeline: LAYER1 voicing → LAYER3 pattern (comp+bass+embellish) → LAYER2 dynamics (easeUnderHold → section → accent → contour → cresc → rubato → humanize → clamp). ทุกกฎ = โมดูลแยก pure → เทส headless ได้. scheduler = `playSong` [midi.js](../../src/lib/midi.js) กิน PerfEvent. เมนู (ข้อ B) = เพิ่ม cfg flag + UI control ต่อกฎ — **ไม่ต้องรื้อแกน**.

## 4. วิธี verify (บทเรียน "อย่าเชื่อ fire ไม่ error")

1. **unit** `npx vitest run src/lib/arranger/` (ปัจจุบัน 54 เทสต์) — invariant ต่อกฎ
2. **node pure** import `arrange`/กฎ ตรง ๆ (worktree มี node_modules แล้ว · import แบบ `file:///.../src/lib/arranger/x.js`) — วัดค่า gain/hit จริง
3. **real-audio** เปิด `npx vite --host --port <p> --strictPort` (background · ไม่ใส่ `&`) → เบราว์เซอร์ AnalyserNode tap วัด peak>0 ต่อ role + **P'Aim ฟังบนมือถือ** (Network URL · เช็ก IP `ipconfig | grep IPv4`)
4. **ห้าม merge/deploy** — ping PM มา gate

## 5. การทำงาน / ติดต่อ

- **operating:** เสียง/รสนิยม = **P'Aim ↔ SA ตรง** (creative · memory `feedback_paim_direct_sa_creative`) · settled → ping PM · **PM เข้าตอน merge+publish+QA gate**
- **PM** = board `docs/pm/board.md` §RESUME (หมุน session · อย่า hardcode) · ping ผ่าน `mcp__ccd_session_mgmt__send_message`
- **รายงาน** ทุก milestone → `docs/reports/<branch>.md` + inbox board + ping PM
- **backlog เต็ม + 2 caveat** = `docs/reports/audio-piano-quality-audit.md` §ROUND 2
- **Grand only** — อย่ากระจายไปเครื่องอื่น (felt/violin/cello/guitar = หลัง piano เลอเลิศ)
