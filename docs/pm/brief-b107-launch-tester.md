# Brief — tester gate: B107 LAUNCH (Grand + Guitar · 2 เครื่อง)

**branch:** `b107-step9-instruments` (HEAD `8f85bbb` · fork base `ec5abc7`) · **dev server:** `http://192.168.1.173:5313/` (`--host` · dev session รันอยู่ · restart: `cd <worktree> && npm run dev -- --host --port 5313 --strictPort`)
**อ่าน:** `docs/reports/b107-step9-instruments.md` (dev report · §Dock UI) · `docs/ds/instrument-arranger-p2.md` §6a/§4B.4

## บริบท — นี่คือ gate ก่อน LAUNCH จริง
P'Aim เคาะขึ้น live **แค่ 2 เครื่อง: Grand + Guitar nylon**. ผ่าน gate นี้ → P'Aim confirm UI + ฟัง → **deploy ขึ้น live**. เครื่องอื่น (felt/violin/cello/string/เต็มวง) = เก็บบน base ยังไม่เปิด.

## ✅ เกณฑ์ตรวจ = เทียบ spec เต็มทุกข้อ (memory feedback_tester_gate_full_spec)

### A. UI dock (full-spec · browser จริง · login เห็นเพลง)
- [ ] ปุ่มเดียว **"เสียงดนตรี" (icon `audio-lines`)** โผล่บนแถบ dock ล่าง — **ทั้งหน้าฝึกร้อง + หน้าแก้เพลง**
- [ ] กดแล้วเด้ง **popover 4 กลุ่ม:** เสียงที่เล่น(ทำนอง/คอร์ด/รวม) · การบรรเลง(เดี่ยว/เต็มวง) · เครื่องดนตรี · อารมณ์/สไตล์
- [ ] **เครื่องดนตรี: active แค่ เปียโน + กีตาร์** · felt/violin/cello/string = จาง "เร็วๆนี้" กดไม่ได้ (disabled)
- [ ] **ปุ่ม "ท่อน" ยุบเหลือ icon + badge** — เห็นสถานะ "ทั้งหมด" vs "n/N (ท่อนเดียว/วนซ้ำ)" ต่างกันชัด
- [ ] **หน้าแก้เพลง default = เปียโน·เดี่ยว·ทำนอง·ตรงโน้ต** (plainest) · สลับสไตล์/เครื่องได้ครบใน popover · จำ localStorage **แยกหน้า** (`pleng.editor.*` ≠ viewer)
- [ ] มือถือ 375px ไม่ล้นจอ · ไม่มี console error

### B. เสียง (audio gate · วัด output จริง — บทเรียน B107)
- [ ] **🎸 กีตาร์ = ได้ยินลายรูด/เกาจริง** (ไม่ใช่ตอกคอร์ด/ทำนองเปล่า) บนเพลงจริง — strum/travis/rasgueado/slide · dev วัด 40 events + stagger 20–26ms peak 0.50
- [ ] **🎹 เปียโนจัดเต็ม** = arp+pedal+humanize (เหมือนที่ผ่าน gate P2 arranger)
- [ ] real audio 2 เครื่อง: peak>0 · ไม่ clip · humanize spread · velocity ในช่วง sample · ทำนองนำ
- [ ] สลับ เปียโน↔กีตาร์ กลางเล่น + 4 โหมด + ตรงโน้ต=โน้ตดิบ ไม่พัง

### C. PWA offline (dev ทำไม่ครบ — ต้องยืนยัน)
- [ ] **cold-boot offline ด้วย DevTools "Offline" checkbox จริง** บน **build** (`npm run build && npm run preview`) — โหลดหน้า + เลือก 2 เครื่อง + เล่น = **มีเสียง · external request = 0** (ไม่ใช่ kill-process ที่ dev ทำ)

### D. regression
- [ ] `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` = 516 เขียว (1 notationLint quirk = non-issue) · `npm run build` ผ่าน · smplr lazy chunk

## รายงาน (session-agnostic)
`docs/reports/tester-b107-launch.md` (PASS/FAIL ต่อข้อ + ตัวเลข audio จริง + screenshot UI) · board §📥 inbox · ping "PM ปัจจุบัน" (pm21). **PASS → PM เรียก P'Aim confirm UI + ฟัง → deploy · FAIL → หลักฐาน → PM ยิง dev**
