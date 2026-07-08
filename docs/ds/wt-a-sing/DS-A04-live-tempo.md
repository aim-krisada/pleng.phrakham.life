# DS-A04 — เปลี่ยน tempo ตอนกำลังเล่น

**คู่กับ:** `us/wt-a-sing/US-A04-live-tempo.md`

## ไฟล์ที่แตะ
- `src/components/SongViewer.vue` · `src/lib/midi.js`

## จุดเสี่ยงชนกับ worktree อื่น
- `midi.js` / `SongViewer.vue` เพิ่งถูก WT-0 แก้ (live key re-tune) → **WT-A ต่อยอดบนฐานที่ merge แล้ว** (ไม่ต้อง rebase เพราะเพิ่งเริ่ม branch จากฐานใหม่)

## design
- เทียบ key: key ใช้ `detune` ได้ (seamless) แต่ **tempo ทำ seamless ไม่ได้** → เมื่อ `watch(tempo)` ตอนเล่น: หยุด schedule เดิม + **re-schedule โน้ตที่เหลือจากตำแหน่งปัจจุบัน** ด้วย bpm ใหม่ (analog ของ `setTranspose` แต่ต้อง re-schedule)
- อ้างอิงกลไก `playSong`/`liveOscs` ที่ WT-0 คืนกลับมา (ดู `midi.js`)

## test
- **unit:** เปลี่ยน tempo ตอนเล่น → เล่นต่อจากจุดเดิมที่ bpm ใหม่ · **ไม่ restart จากต้นเพลง**
- **tester:** port 5302 กดเล่น → หมุน tempo → จังหวะเปลี่ยนต่อจากจุดปัจจุบัน

## หมายเหตุ (latent bug ให้ WT-A แก้พร้อมกัน)
- `watch(() => props.song)` ใน `SongViewer` รีเซ็ต `displayKey` กลับคีย์ต้นฉบับทุกครั้ง object เพลงเปลี่ยน — WT-0 พบระหว่างทาง ปล่อยไว้ให้ WT-A จัดการ
