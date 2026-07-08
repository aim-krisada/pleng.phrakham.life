# DS — ps3 Epic 3: ฝึกร้อง (viewer, ④)

US: `docs/us/ps3-viewer.md` · Visual = prototype `ps2-studio-prototype.html` (ฝึกร้อง)

## ไฟล์ที่เป็นเจ้าของ
- `src/components/SongViewer.vue` — control bar (dock) · play/scroll/loop · display/chord/key/tempo state
- `src/lib/midi.js` — play + tempo + key (มีจาก WT-A ps1)
- ⚠️ `src/components/SongSheet.vue` — **render ร่วมกับ พิมพ์ + editor ดูผล** → "ห้องไหลต่อกัน" ต้องประสาน (ทำที่ render กลาง ไม่ fork)

## โครง
- **control bar:** state — `display` · `chordStyle` · `key`(ต้นฉบับ = key เดิม, transpose ต่อ · **คีย์เดียวทุกโหมด**) · `tempo`(ศัพท์ดนตรี → BPM) · `fontScale` · เป็น local state (ไม่แตะเพลงต้นฉบับ — มี unit test จาก WT-A ยืนยัน)
- **B016:** auto-scroll ตาม note index (`onNote` จาก midi) → `scrollIntoView` โน้ตปัจจุบัน · `wheel/touchmove` → พัก auto-scroll `pausedUntil = now+3500` · ปุ่มหยุด = ใน dock fixed (sticky) · `viewport-fit=cover` + safe-area (จาก B020)
- **loop multi-select:** เลือก sections → play order วนเฉพาะที่เลือก · UI = popover checkbox เหนือ dock
- **ห้องไหลต่อกัน (V4):** render = join bars ด้วย barline · `flex-wrap` ให้พับ · **แก้ที่ render กลาง (SongSheet/NoteRow) ใช้ร่วม viewer+print** · ชิปกระโดด = scroll to section head
- **tempo list:** const map {term, bpm, thai} · ตามเพลง = bpm จาก song

## ยึด / ระวัง
- SongSheet ร่วม 3 ทาง (viewer/print/editor-ดูผล) → เปลี่ยน flow layout ต้องไม่พังพิมพ์ (I3) — ทดสอบ PDF จริง
- ทรานสโพส = เปลี่ยน**คอร์ด** (jianpu ตัวเลขไม่เปลี่ยน) · WCAG · mobile expand (B025 ปรับต่อ)
