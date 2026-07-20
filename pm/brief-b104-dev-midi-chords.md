# Brief — B104 (DEV): ทำเสียงคอร์ดคลอใน MIDI ตามสเปก SA

**ฐาน:** `studio-shell-redesign` · **worktree/branch ใหม่:** `b104-dev-midi-chords` · **สั่งโดย:** PM (pm11)
**อ่านสเปกก่อน (SSOT ของงานนี้):** `docs/ds/midi-chord-accompaniment.md` (AC 10 ข้อ · P'Aim เคาะทิศทางแล้ว)

## สรุปสิ่งที่ต้องทำ (รายละเอียดเต็มในสเปก)
- **หลัก: music sheet = SSOT** — เล่นเสียงตรงกับแผ่น (ทำนอง=โน้ตเลข · คอร์ด=segment.chord · ไม่มีเสียงที่แผ่นไม่ได้บอก)
- **โหมดเสียง 3 แบบ** (แทน on/off): ทำนองอย่างเดียว / คอร์ดอย่างเดียว / รวม · UI สไตล์เดียวกับตัวเลือก "แสดงผล" ที่ผู้ใช้คุ้น · **default = ทำนองอย่างเดียว** (กันเสียงเดิมเปลี่ยนกะทันหัน) · จำค่าที่เลือก
- **voicing v1 = default เดียว (KISS):** เบสตัวราก + block triad (ราก+3+5(+7)) ตามที่สเปกล็อก · **"เลือก voicing ได้" = future v2** (ทำโครง `buildChordVoice` ให้เพิ่มทีหลังได้ แต่ไม่ทำ UI v1)
- **ขอบเขต: ทุกที่ยึด sheet** — ฟังท่อน + ฟังทั้งเพลง + ไฟล์ MP3
- pointer: `src/lib/chords.js` (suffix→intervals), `src/lib/midi.js` (buildChordVoice + schedule), จุดปุ่มฟัง/ตัวเลือกแสดงผล

## รั้ว
- `chords.js` · `midi.js` · UI ตัวเลือกโหมดเสียง (จุดที่มีปุ่มฟัง) + test · ตามสเปก ไม่เกิน scope v1

## ⚠️ ชนไฟล์ (PM เฝ้า)
UI โหมดเสียงอาจอยู่ใกล้ปุ่มฟังใน `EditorMode.vue`/คอมโพเนนต์เล่น ที่ **B100/B101** แตะอยู่ → แยก branch จากฐาน · region audio (midi/chords) ไม่ชน · ถ้า UI ชน region เดียวกัน flag PM

## DoD + รายงาน (session-agnostic)
- `npx vitest run` เขียว (`notationLint` quirk เดิม) + `npm run build` ผ่าน · เพิ่ม test: suffix→intervals ถูก · 3 โหมดให้ output ถูก (ทำนอง/คอร์ด/รวม)
- dev server **`--host`** + **Network URL** ในรายงาน
- **verify เบราว์เซอร์จริง:** เลือกทีละโหมด → ได้ยินตรง (ทำนองล้วน / คอร์ดล้วน / รวม) · คอร์ดตรงกับที่แผ่นแสดง · ฟังท่อน+ทั้งเพลง+MP3 มีคอร์ด · default=ทำนอง · **แนบคลิป/บันทึกว่าได้ยินจริง** (เสียง = ต้องพิสูจน์ด้วยหู ไม่ใช่แค่ DOM)
- รายงาน `docs/reports/b104-dev-midi-chords.md` + บรรทัด `board.md` §📥 inbox + ping **PM ปัจจุบัน §🎯 (pm11)** · **ไม่ commit ลง base**
- ⛔ **ห้าม self-merge / ห้าม deploy** — tester gate ก่อน แล้ว PM cherry-pick + deploy
