# รายงาน — songsheet-barline-tie (สาย A · dev)

**Branch:** `fix-songsheet-barline-tie` (แตกจาก `studio-shell-redesign` = deploy รอบ 7) · commit `314e99c`
**แตะไฟล์:** `src/components/SongSheet.vue` + `SongSheet.test.js` + `.claude/launch.json` (port 5410) — **ไฟล์เดียวตามใบสั่ง**
**Network (ตรวจ LAN/มือถือ):** `http://192.168.1.124:5410/`
**ห้าม merge/deploy** — รอ PM ตรวจ DoD + P'Aim print PDF จริง

---

## ⭐ B069 — ไทข้ามห้องต้องเป็นโค้งเดียว (ต่อจากงานเดิม · เจอเคสที่ยังเหลือ)

**ทำไมยังขาดทั้งที่มี overlay แล้ว:** ไทของ**เพลง 3** encode `tie-START` ที่โน้ตต้นทางด้วย
(`"5~ - - -"` = มาร์ก `~` ที่โน้ต**ตัวแรก** แล้วลากยาว) → NoteRow วาด **ครึ่งหัว (start-hook)**
ที่โน้ตตัวแรก · CSS เดิมซ่อน start-half เฉพาะกรณี tie-start เป็นโน้ต**ตัวสุดท้าย**ของ NoteRow →
เคสนี้ tie-start เป็นตัว**แรก** เลยไม่โดนซ่อน = เหลือ hook ค้างข้างๆ overlay = "2 ครึ่ง" ที่พี่เปาเห็น
(receiver end-half ถูกซ่อนถูกแล้ว · overlay ก็วาดถูก · ตัวปัญหาคือ hook ต้นทางที่หลุด)

**แก้ (SongSheet.vue เท่านั้น · ไม่แตะ NoteRow):**
1. **ซ่อน 2 ครึ่งของ NoteRow ใน JS (measureTies) แทน CSS** — ซ่อน**ทั้ง** end-half (ตัวรับ) และ
   start-half (ตัวต้นทาง) โดยหาจาก **segment ต้นทาง** (`srcSeg.querySelector('.tie-start-arc')`)
   ไม่ผูกตำแหน่งโน้ต → จับ hook ที่อยู่โน้ตไหนก็ได้ · ซ่อน**พร้อมกับที่วาด overlay เป๊ะ** (lockstep):
   ไทไหนวาด overlay = ซ่อน 2 ครึ่ง · ไทที่ข้าม (wrap คนละแถว) = ไม่วาด+ไม่ซ่อน → fallback เป็น
   NoteRow 2 ครึ่งเหมือนเดิม (ไม่มีครึ่งลอยเดี่ยว) · restore ทุกครั้งก่อนวัดใหม่ + ตอน unmount
2. **overlay = 1 SVG ต่อ 1 บรรทัด (per-line)** แทน SVG เดียวคลุมทั้งแผ่น — SVG absolute เดียวที่สูง
   หลายหน้าจะ**พิมพ์แค่หน้าแรก** · ตอนนี้แต่ละบรรทัดถือ arc ของตัวเอง (offset parent = `.song-line`)
   → **ไทพิมพ์ติดทุกหน้า**ที่บรรทัดนั้นไปตก

**verify (Browser MCP · เพลง 3 ที่พี่เปาเจอ · แผ่นเพลง):**
- overlay 1 SVG อยู่ในบรรทัดที่มีไท (per-line ✓) · path เดียวต่อเนื่อง · **start-hook + end-half =
  `display:none`** (leftoverStart/End = 0) → ไม่มี "2 ครึ่ง" อีก
- **เพลง 100 ไม่ regress:** 3 ไท = 3 overlay (คนละบรรทัด) · 3 path · ครึ่งซ่อนหมด

## ⭐ B082 — ห้องสุดท้ายของบรรทัดที่ครบจังหวะ ต้องมีเส้นปิด

**ต้นเหตุ:** เส้นห้องวาดเป็น**เส้นซ้าย**ของห้องถัดไป → ห้องกลางมีเส้นปิด (จากห้องถัดไป) แต่ห้อง
**สุดท้าย**ไม่มีห้องถัดไป เลยไม่มีเส้นปิด · บางบรรทัดจบด้วย `bar-final`(‖)/repeat เลยดูเหมือนมีบ้าง
ไม่มีบ้าง = ไม่สม่ำเสมอ (ภาพพี่เปา `B082-lastbar-closing-barline.png` เพลง 4)

**แก้ (SongSheet.vue):** ห้องสุดท้ายของบรรทัด ถ้า **beatCount == expectedBeats(timeSignature)**
(ครบห้องจริง) → วาดเส้นปิดขวา (`.bar-close`) · ใช้ util เดิม `beatCount`/`expectedBeats`/`parseNotes`
- **pickup / ห้องต่อกันข้ามบรรทัด** (beats ไม่ครบ) → **ไม่ปิด** (ไม่ลากเส้นกลางห้องที่ยังไม่จบ)
- **บรรทัดจบด้วย Fine ‖ / repeat :‖** → tail ไม่ใช่ bar ธรรมดา → **ไม่ปิดซ้ำ** (ไม่มีเส้นคู่)

**verify (เพลง 4 · แผ่นเพลง):** 3 บรรทัดโน้ตที่จบห้องครบ → ได้เส้นปิดครบทั้ง 3 (`.bar-close`) ·
บรรทัดที่ 4 จบด้วย `bar-final` → **ไม่มี** `.bar-close` (ไม่ซ้ำ) → **สม่ำเสมอทุกบรรทัดแล้ว** ·
เส้นปิดสูง/ตำแหน่งตรงกับเส้นห้องภายใน (h=52 top=184 เท่ากัน) · ไม่มี H-overflow

## B076 (slur NoteRow) ไม่ regress
ไม่แตะ NoteRow · overlay ซ่อนเฉพาะ `.tie-*-arc` (ไท) · `.slur-arc` (เอื้อน) ไม่ยุ่ง · เพลง 100
เอื้อน/ไทอยู่ร่วมกันปกติ

## ผลทดสอบ
- **vitest 322 passed** (SongSheet 14→**19** · +5 B082: ห้องครบปิด/ห้องไม่ครบไม่ปิด/ปิดเฉพาะห้อง
  สุดท้าย/จบด้วย Fine ไม่ซ้ำ/เคารพ time-sig 3/4) · `notationLint.test.mjs` = **node lint 72/72**
  (รันเดี่ยว · vitest แสดง fail เพราะ script เรียก `process.exit` = ของเดิม)
- **build ✅**

## ⚠️ ต้อง P'Aim print PDF จริงยืนยัน (ตาม memory `feedback_verify_print_from_pdf`)
ทั้ง 2 เรื่องเห็นผลตอนพิมพ์กระดาษ · ผมยืนยัน Tier-B ด้วย DOM geometry จริง (พิกัด arc/เส้นปิด/
ครึ่งที่ซ่อน) ครบแล้ว แต่ **เส้นพิมพ์จริง + arc ข้ามหน้า** ต้องให้ P'Aim สั่ง print เพลง 3 (ไท) +
เพลง 4 (เส้นปิด) + เพลงยาวหลายหน้า (เช็ก arc พิมพ์ติดทุกหน้า) → เปิด PDF ดู แล้วส่งไฟล์ให้ผมตรวจ

## URL
`http://localhost:5410` · LAN `http://192.168.1.124:5410` · เพลง 3 = `#/song/55dd87b4-e743-472f-bc6f-a3bc899f189a` · เพลง 4 = `#/song/dceba2f7-616c-4496-aff7-0cced51490bf` · โหมด **แผ่นเพลง**
