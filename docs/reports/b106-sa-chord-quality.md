# Report — B106 (SA · R&D): คุณภาพเสียงคอร์ด → โหมดบรรเลงเสียงจริง

**branch:** `b106-sa-chord-quality` (base `studio-shell-redesign`) · **บทบาท:** SA / R&D (วิเคราะห์+ออกแบบ+เดโม · ไม่แตะ src · ไม่ deploy)
**ต่อยอด:** B104 (คอร์ดคลอ 3 โหมด · deployed `b7341ee`) · **ที่มา:** P'Aim ฟัง live — "คอร์ดดังไป + มีแบบเพราะกว่านี้ไหม (โปรแกรม+ทฤษฎีดนตรี)?"
**ผล:** งานบานเป็นการสำรวจ **"โหมดบรรเลงเสียงจริง"** เต็มรูป · **P'Aim ฟังเดโมเอง แล้วเคาะ: เอาแบบเต็มระบบ**

## เส้นทาง (ทุกขั้นพิสูจน์ด้วยหูในเดโมกับ P'Aim)
1. **"คอร์ดดังไป" = จริง (วัดได้):** คอร์ด 4-5 เสียงดังรวม −2~3 dB ใต้ทำนอง + ค้างยาว → กลบ. แก้: ลด gain + บัส low-pass/compressor → −9 dB.
2. **ความเพราะ = การเรียงเสียง:** voice-leading (คอร์ดขยับน้อย ไม่ทับทำนอง) แทน block ราก-position.
3. **palette สไตล์คลอ:** 6 สไตล์ (คลอค้าง/ไล่/รูด/สตริงคลอ/ย่ำ) — feedback: ต่างที่ "จังหวะ+timbre" มากกว่าโน้ต.
4. **ตัวพลิกเกม = เสียงเครื่องดนตรีจริง (sampler ในเบราว์เซอร์):** เปียโน **Splendid Grand** (smplr) + **ไวโอลิน/สตริง อัดจริง** (tonejs-instruments = Iowa/Philharmonia · Tone.Sampler) — ฟรี/CC · เล่นสด · ยังทรานสโพส/แก้เพลงได้ · "สตริง" = เชลโล(ต่ำ)+ไวโอลิน(สูง) แบ่งย่านจริง.
5. **preset บรรเลงสำเร็จรูป (SA จัด):** 1 เปียโนล้วน(สงบ) · **2 เปียโนบรรเลงมือซ้ายไหล** · 3 ไวโอลินคลอเปียโน · **4 เต็มวง(เปียโน+สตริง)** — P'Aim ชอบ #2 และ #4.
6. **auto-arranger 3 ชั้น (กฎกลาง ทุกเพลง):** voice-leading → **dynamics** (กดหนัก-เบาตาม metric accent+contour · velocity ×0.66–1.14) → **embellishments** (ลูกเล่นสุ่ม ไม่ซ้ำแต่ละรอบ · ~10/40 คอร์ด).
7. **Felt vs Grand:** Grand = default (ชัด ร้องตามง่าย) · Felt = โทนเสริมโหมดสงบ.

## การตัดสินใจสถาปัตยกรรม (SA แนะนำ · P'Aim = full)
- **Live sampler ในเบราว์เซอร์** (ไม่ใช่ pre-render MP3 — อันนั้นทำ live-transpose/แก้เพลงพัง) + **ต่อ MP3 export เดิม (`audioExport.js` OfflineAudioContext) ให้ใช้ sampler เดียวกัน** → เล่นสด + โหลด MP3 เสียงจริง จาก engine เดียว ไม่ต้องมี DAW/pipeline แยก → 400 เพลงเพราะอัตโนมัติ ไม่ทำทีละเพลง.
- **sample = CC0/CC-BY/public-domain เท่านั้น** (VSCO2 CE, Salamander, Iowa/Philharmonia) เพื่อ host+แจกซ้ำได้ถูกกฎหมาย · **Spitfire LABS ห้าม** (ปลั๊กอิน + ลิขสิทธิ์แจกซ้ำไม่ได้ · ใช้ audition โทนเท่านั้น).

## ผลต่อ B104 architecture
`scheduleNote` (แยกไว้ให้ realtime+MP3 ใช้ร่วม) = จุด route ไป sampler แทน oscillator · voicing styles/dynamics/embellishments = ชั้นที่สร้าง "เหตุการณ์โน้ต" ไม่ผูก timbre.

## เดโม (พิสูจน์ด้วยหูครบ)
- `docs/spikes/chord-voicing-demo.html` — เพลงจริง #1 "พระเจ้าเป็นความรัก" (flatten ด้วย `songToNotes(playableContent(...))` จริง) · เลือกเครื่องจริง (เปียโน/ไวโอลิน/สตริง/ผสม) × สไตล์ × 4 preset บรรเลง + checkbox dynamics/embellishments + slider + ปุ่มหยุด.
- verify: โหลด+เล่นครบทุกเครื่อง/preset/toggle · 0 error · dynamics velocity ×0.66–1.14 · embellishments 2 รอบต่างกันจริง.
- **Network URL:** `http://10.152.249.98:8106/chord-voicing-demo.html` (vite/node · เสิร์ฟจาก `docs/spikes/`).

## Deliverables (branch นี้)
- spec เต็ม `docs/ds/chord-voicing-quality.md` (รอบ 0–6: gain · voicing · palette · sampler · architecture · humanization · Felt/Grand · full decision)
- เดโม `docs/spikes/chord-voicing-demo.html`
- report นี้

## ต้องการจาก PM (P'Aim = full)
เปิด **task ใหม่ "โหมดบรรเลงเสียงจริง"** + วางแผน dev (งานกลาง-ใหญ่: sample hosting CC · preset engine · auto-arranger 3 ชั้น · Grand default/Felt option · ต่อ MP3 export). "แก้คอร์ดดังไป + voicing" กลืนรวมในฟีเจอร์นี้. **ไม่ commit ลง base · ไม่ deploy.**
