# Brief — B107 (dev): ระบบเสียงเครื่องดนตรีจริง (live sampler + presets + auto-arranger)

**ฐาน:** `studio-shell-redesign` (มี B104/B105 แล้ว) · **branch ใหม่:** `b107-instrument-playback` · **สั่งโดย:** PM (pm11)
**ต่อยอดจาก B106 (SA/P'Aim ปั้นเดโมด้วยกันแล้ว)** — spec = SSOT ของงานนี้:
- **`docs/ds/chord-voicing-quality.md` (รอบ 0–6) = สเปกเต็ม** · report `docs/reports/b106-sa-chord-quality.md` · เดโมพิสูจน์แล้ว `docs/spikes/chord-voicing-demo.html`

## P'Aim เคาะ (12 ก.ค. · ผ่าน PM)
เอา **"ระบบเสียงเครื่องดนตรีจริง" เต็มระบบ** (ไม่ใช่แค่แก้ gain) · **ไม่ทำ quick gain fix แยก** — ให้ระบบนี้มาแทนเสียง synth B104 เลย (การแก้ "คอร์ดดังไป/voicing" กลืนอยู่ในนี้แล้ว)

## เป้าหมาย (รายละเอียดในสเปก)
- **live sampler ในเบราว์เซอร์** (Tone.Sampler) — เสียงเครื่องดนตรี**อัดจริง** เล่นสด · ยัง **ทรานสโพส/แก้เพลงได้** (ไม่ใช่ pre-render MP3 ที่ทรานสโพสพัง) · ต่อ **MP3 export (`audioExport.js`) ให้ใช้ sampler เดียวกัน**
- **แบบบรรเลง (preset) เลือกได้** — P'Aim ชอบ #2 เปียโนบรรเลง + #4 เต็มวง · **Grand = default** (ชัด ร้องตามง่าย) · Felt = โหมดสงบ
- **auto-arranger 3 ชั้น** (กฎกลาง ทุกเพลง ไม่ทำทีละเพลง): voice-leading → dynamics → embellishments
- **sample = CC0/CC-BY เท่านั้น** (host/แจกซ้ำได้ · **ห้าม Spitfire LABS**) — Grand=Splendid · strings=Iowa/Philharmonia

## ⚠️ แผน PM แนะ — เสนอแผนก่อนลุยหนัก (ปิง PM ยืนยันก่อน)
งานนี้กลาง-ใหญ่ + เปลี่ยนสถาปัตย์เสียง → **ก่อนสร้างส่วนที่ย้อนยาก ให้ dev เสนอแผนเป็นเฟส + ปิง PM ยืนยัน** โดยเฉพาะ:
- **วิธี host ไฟล์เสียง** (ขนาดเป็น MB · host ในรีโป/GitHub Pages ได้ไหม เรื่อง size limit · หรือที่อื่น) → **ต้องเช็ก size + เวลาโหลดบนมือถือ/เน็ตช้า ก่อน** (นี่คือความเสี่ยงหลัก)
- เฟสที่แนะ: **P1** sampler infra + Grand default + voicing/gain (แทนเสียง B104 บน live — ได้เสียงจริง + แก้คอร์ดดังไปในตัว) · **P2** presets + auto-arranger · **P3** MP3 rework · (dev ปรับเฟสได้ เสนอมา)

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียว (`notationLint` quirk เดิม) + `npm run build` ผ่าน · เพิ่ม test เท่าที่ logic จับได้
- dev server **`--host`** + Network URL · **verify เบราว์เซอร์จริง by ear:** เสียงเครื่องดนตรีจริงเล่นถูก · ทรานสโพส/แก้เพลงยังทำงาน · preset สลับได้ · MP3 export มีเสียงใหม่ · **เช็กมือถือ: เวลาโหลด sample + performance** (สำคัญ)
- รายงาน `docs/reports/b107-instrument-playback.md` + §📥 inbox + ping PM (pm11) · **ไม่ commit ลง base** · ⛔ ห้าม self-merge/deploy — tester gate (regression: playback/มือถือ/MP3 ไม่พัง) ก่อน แล้ว PM cherry-pick + deploy · เสียง/รสนิยม P'Aim เคาะเอง (คุย SA ตรงได้)
