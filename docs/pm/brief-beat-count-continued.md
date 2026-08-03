# Brief — บั๊ก: "ห้องต่อกัน" ข้ามบรรทัด นับจังหวะผิด (11/4) · B073

**สั่งโดย:** pm4 · **ฐาน:** `studio-shell-redesign` · **branch ใหม่:** `git switch -c fix-beat-count-continued studio-shell-redesign`
**⚠️ คิวหลัง `fix-editor-preview-final` merge** (ชน EditorMode.vue) — อย่าเริ่มจน PM ยืนยันฐานอัปเดต
**หลักฐาน:** `docs/backlog-assets/B073-beat-count-continued-bar.png` · `docs/pm/realuse-assets/bug-beat-count-continued.txt`

## อาการ (P'Aim)
บรรทัด 3 ห้องสุดท้าย กด "ห้องต่อกัน" เชื่อมกับห้องแรกของบรรทัด 4 → รวมกัน **ครบ 4 จังหวะพอดี** แต่ตัวตรวจโชว์ **จังหวะเกิน = 11/4** (ผิด)

## จุดที่เกี่ยว (อ่านก่อน)
`src/components/EditorMode.vue` ฟังก์ชัน `barStatus(li, bi)` (~565-605) + `pickupTotal` (~556) :
- การเชื่อมข้ามบรรทัด: `line.cont` → ห้องแรกของบรรทัดที่ต่อ join กับห้องสุดท้ายบรรทัดก่อน (บรรทัด 573-580)
  - บรรทัด 577-578: ห้องสุดท้ายของบรรทัด + `lines[li+1].cont` → `tokens = [...tokens, ...barTokensAt(li+1, 0)]`
- `got = beatCount(tokens)` (589) → รายงาน `${got}/${expBeats}` (605)
- **สงสัยต้นตอ:** `barTokensAt(li+1, 0)` อาจคืนโทเคนเกินห้องเดียว (ทั้งบรรทัด?) หรือ join ซ้ำ/ผิดฝั่ง ทำให้ผลรวม 11 แทน 4 · dev trace `barTokensAt` + การ flatten segments ว่าได้ห้องที่ถูกต้องไหม

## งาน
1. **repro** เคสจริง (สร้างเพลง 2 บรรทัด: บรรทัดจบไม่ครบห้อง + บรรทัดถัดไปตั้ง "ห้องต่อกัน" · รวม = 1 ห้องเต็มพอดี) → เห็น 11/4 (หรือค่าเกินผิด)
2. หา root cause ว่าทำไมผลรวมโทเคนเกิน (barTokensAt ขอบเขต · double-join · segment flatten)
3. แก้ให้ "ห้องต่อกัน" ข้ามบรรทัดนับ **ผลรวมจังหวะของ 2 ห้องที่เชื่อมจริง** = ถ้าครบ time signature → ✓ · ทั้งฝั่งห้องสุดท้ายบรรทัดบน และห้องแรกบรรทัดล่างต้องโชว์สถานะตรงกัน
4. **อย่าทำ B055 (pickup group) / ห้องยกในบรรทัดเดียว regress** — เพิ่ม unit test เคสข้ามบรรทัดนี้ + คงเทสต์ B055 เดิม

## รั้ว
- **แตะได้:** `src/components/EditorMode.vue` (+ `EditorMode.beats.test.js`/`edhead.test.js`) · ถ้าต้นตออยู่ `notation.js` (`beatCount`) = แตะได้แต่ระวัง shared (มี lint/midi ใช้) — เช็ก regression ทั้ง repo
- **⛔ ห้ามแตะ:** `SongSheet.vue`/`NoteRow.vue` · `StudioDock`/`SingTransport`/`SongViewer` · `styles.css`/`ShellBar`/`App.vue` · `midi.js`/`songSearch.js` (สายอื่นถือ)

## DoD + รายงาน
- `npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'` ผ่าน + `npm run build`
- dev **`--host`** + Network URL · **verify เบราว์เซอร์:** เคสข้ามบรรทัด "ห้องต่อกัน" ครบห้อง → ✓ (ไม่ใช่ 11/4) · เคสไม่ครบ → ยังแดงตามจริง · B055 pickup เดิมยังทำงาน
- รายงานกลับ: (1) `docs/reports/fix-beat-count-continued.md` (2) board §📥 inbox (3) ping PM = **`pm4`** · **⛔ ห้าม merge/deploy เอง**
