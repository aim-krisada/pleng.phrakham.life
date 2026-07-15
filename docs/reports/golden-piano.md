# golden-piano — referee layer (วาทยกร + ยาม) + section fix + A/B toggle

**สาย:** dev/SA `golden-piano` · **branch:** `golden-piano` (fork ถูกฐาน `studio-shell-redesign` · verify แล้ว HEAD == base ตอน fork)
**PM:** pm27 · **P'Aim iterate ตรง SA ได้ · PM gate + merge + deploy เท่านั้น (ยังไม่ merge)**
**commit:** `9fd1c55`

## ฟัง (Network URL · มือถือได้เลย)
```
http://192.168.1.124:5430/
```
vite `--host --port 5430` (background runner · ไม่มี `&` orphan) · verify แล้วเสิร์ฟโค้ด worktree จริง (curl 127.0.0.1 + footer `c253b8b*`)
เปิดเพลงไหนก็ได้ → ปุ่ม **เสียงดนตรี** (ล่าง) → กลุ่ม **"วาทยกร (ก่อน/หลัง)"** = สวิตช์ A/B

## ทำอะไรไปบ้าง (ครบ 4 ข้อตาม brief)

### 1. 🚦 วาทยกร (no-clash) — `src/lib/arranger/referee.js` `refereeNoClash()`
- สร้าง melody-onset timeline แล้ว **กรอง event role `'emb'` ทุกตัว (embellishment: sparkle/gapFill/chromaticApproach + ลูกรับส่ง answerFills) ให้เล่นได้เฉพาะใน "ช่องว่างทำนอง"** — ห่างจาก melody attack ≥ `REFEREE_GAP` (0.4 บีต) ทั้งสองข้าง.
- ทำนองวิ่งถี่ (attack ทุก ~0.5 บีต) → ไม่มีช่อง → ลูกเล่นเงียบอัตโนมัติ (คลีนทำนองมาก่อน). ทำนองลากยาว/พัก → เปิดช่องให้ตอบได้.
- รันก่อน dynamics (shaping แตะเฉพาะตัวที่รอด) · melody/comp/bass ไม่โดนแตะ.

### 2. 🛡️ ยาม (balance floor) — `referee.js` `balanceFloor()`
- รัน **หลังสุด หลัง `clampAll`** ใน `arrange()`: ทุก event ที่ไม่ใช่ `melody` ถูก clamp **≤ concurrent melody gain × 0.8** (มือขวานำ ≥20% เด็ดขาด · bass/inner/emb/fill ทุกตัว · concurrent = ทำนองที่ดังจริง ณ บีตนั้น หลัง dynamics).
- **floor กันบ๋อท่า**: event ที่ผ่านสูตรลดหลายชั้นจนเกือบเงียบ → ยกกลับขึ้น `AUDIBLE_FLOOR` (0.045 · เหนือ layer floor 0.03) แต่ไม่เกินเพดานนำ 20% → ไม่มีเสียงจมหาย และไม่มี silent note.
- pure ทั้งคู่ · อยู่ใน `arrange()` → live กับ MP3 (เมื่อ route ผ่าน arrange) ตรงกันเสมอ.

### 3. 🎼 แก้ผูกป้ายท่อน + fallback — `src/lib/midi.js` `resolveSections()` / `phraseSectionsFromMelody()`
- **ต้นตอยืนยัน:** `playSong` เดิมเรียก `sectionBeatRanges(content, notes)` — live path บังเอิญได้ resolved content (SongViewer ใส่ `lines` ให้) แต่ **เพลงไม่มีป้ายท่อน (v1-migrated ~ส่วนใหญ่ของ 400) → คืน section ที่ไม่มี boundary ภายใน → rubato ยืดแค่โน้ตสุดท้ายทั้งเพลง**. เพลง raw v2 (ไม่ผ่าน SongViewer) → คืน `[]` เลย.
- **แก้:** `resolveSections()` = (ก) `resolveContent` ก่อนถ้าไม่มี `lines` (ข) ถ้าป้ายจริง < 2 ท่อน → **fallback `phraseSectionsFromMelody`**: หั่นวรรคจากรูปทำนอง (โน้ตลากยาว ≥3 บีต = วรรคจบ · พัก = หายใจ) + tag ช่วงโน้ตถี่กว่า median×1.5 เป็น `isRefrain` (density-adaptive). → **rubato หายใจทุกวรรค ทุกเพลง**, ไม่ใช่แค่โน้ตจบ.
- verify เพลงจริง "พระเจ้าเป็นความรัก" (v2 · มีป้าย ♦ร้อง1 / ♦รับ `***`) → ป้ายทำงานผ่าน label path ตามเดิม; เพลงไม่มีป้าย → fallback ทำงาน.

### 4. 🎧 วาทยกร = intrinsic (เปิดตลอด · ไม่มีปุ่ม) + default "เปิดหมด" — **สรุปสุดท้าย P'Aim 15 ก.ค.**
เดิมทำเป็นปุ่ม A/B "ก่อน/หลัง" ให้พี่เอมพิสูจน์. หลังพี่เอมฟัง + เข้าใจว่า **วาทยกร = กฎกันบั๊ก/คุมวินัย ไม่ใช่รสนิยม** → เคาะว่า:
- **ซ่อนปุ่มวาทยกร · ทำให้เปิดตลอด (intrinsic)** — `refereeNoClash` + `balanceFloor` รันเสมอเมื่อ arranger on (ตัด `cfg.strictReferee` gate ทิ้ง). ลบ `store.strictReferee` + เมนู + watcher + icon.
- **default preset "บรรเลง" = เปิดลูกเล่นหมด** (แตกคอร์ด + ลากอุ้ม + ลูกรับส่ง 40% + แขวนคอร์ด + ประกาย + หยอดโน้ต + เน้นจังหวะ + ไล่ระดับ + ยืดหายใจ + humanize/holdPulse/easeUnderHold). กลับทิศจาก minimalist 14 ก.ค. — เหตุผล: วาทยกรคุม clash+balance ให้แล้ว เปิดหมดได้โดยไม่เละ. ("สงบ" ยังคง minimal · ผู้ใช้ปิดเฉพาะตัวได้ในปรับละเอียด).
- **rubato ทำงานจริงแล้ว** (default เปิด + §3 resolveSections หา boundary วรรค) → ทุกเพลงหายใจปลายวรรค.
- verify live: ปรับละเอียด toggle เปิดครบ · fills 40% · เมนูวาทยกรหายไป · 0 console error.
- **🚩 ให้พี่เอม ear-check:** "เน้นจังหวะแรก" (accent) เคยปิดไว้ (14 ก.ค. "กระแทกหนักไป") ตอนนี้เปิดตาม "เปิดหมด" — ถ้าฟังแล้วกระแทก ปิดเฉพาะตัวได้.

## พิสูจน์ (world-class · วัดได้ + หูจริง)
- **unit invariant** `src/lib/arranger/referee.test.js` (14 เคส · pure `arrange()`): clash=0 · non-melody ≤ mel×0.8 ทุกบีต · floor/no-silent (ทุก gain ตกใน GRAND_LAYER) · sections ไม่ว่างบน v2 จริง · rubato ยิงที่ boundary วรรค ไม่ใช่ทุกโน้ตยาว · purity (same in→same out) · melody ไม่ถูกแตะ (ก่อน/หลัง เท่ากันเป๊ะ).
- **regression:** เต็มชุด **645 tests เขียว (62 ไฟล์)** + `vite build` ผ่าน · โหมด "ตรงโน้ต" (arranger off) ยังเป๊ะ (referee gate อยู่ใต้ `on && strictReferee`).
- **browser verify (worktree server):** เมนูเรนเดอร์ · toggle persist (`1`↔`0`) · re-schedule watcher เข้า · 170/170 icon มี glyph (ไม่มี blank) · **0 console error**.
- **หู = P'Aim ตัดสิน:** A/B ให้ฟันธงทีละสเต็ป (ไม่ถมรวด) — ต่างชัดสุดเมื่อเปิดลูกเล่นใน "ปรับละเอียด" (referee กันชนกันไว้).

## 🔧 รอบ "ขันน็อต" (G's audit · 15 ก.ค.) — ปิดบั๊กเชิงดนตรีให้ครบ 3 ชั้น
P'Aim เล่าให้ G ฟังว่าบาง option เสียงแปร่ง/ฟันหลอ/ชนเละ → G เสนอ 3 ข้อ. เทียบกับโค้ดจริง:
- **ข้อ 2 (วาทยกร no-clash)** = ทำแล้ว (`refereeNoClash`, intrinsic · test clash=0). audit ผ่าน ไม่ต้องแก้.
- **ข้อ 3 (ยาม balance)** = ทำแล้ว (`balanceFloor`, intrinsic · test ≤0.8×mel + floor). audit ผ่าน ไม่ต้องแก้.
- **ข้อ 1 (ลากเชื่อม/ฟันหลอ) = ตัวที่ยังขาดจริง → ขันเพิ่มรอบนี้** (commit `5a88b73`):
  - **ต้นเหตุ:** scheduler ปล่อยหางโน้ต non-melody เร็ว ~0.05s + `humanizeTime` สุ่มเลื่อนเบส → เบสลากอุ้ม/ลากเชื่อมมีรอยเงียบคั่นทุกโน้ต = "ฟันหลอ".
  - **แก้ (pure, beat-space):** `legatoBass()` ยืดความยาวโน้ตเบสให้ถึง onset ตัวถัดไป + เหลื่อม 0.2 บีต → ต่อเนื่องทุก tempo · **onset/pitch ไม่ขยับ** (golden rule §1a) · `humanizeTime` **ไม่สุ่มเบสอีกต่อไป** (เบส = สมออยู่กับกริดเป๊ะ).
  - test 4 ข้อใหม่ (รอยต่อปิด · onset/ทำนองไม่ขยับ · bass timeShift=0 ใน arrange จริง). รวม **649 tests เขียว + build ผ่าน**.

## 🎼 รอบ MP3 (P'Aim สั่ง "แก้ MP3 ให้รองรับแบบใหม่" · 15 ก.ค.) — commit `9765fef`
- **เดิม:** `renderSongToBuffer` ข้าม `arrange()` (เมโลดี้ + คอร์ดบล็อกดิบ) → MP3 ที่โหลดไม่มีลูกเล่น/วาทยกร/legato เลย.
- **แก้:** เพิ่มโหมด `arranger:true` ให้ MP3 เดินผ่าน **`arrange()` ตัวเดียวกับ live** → ไฟล์โหลดได้ arrangement ครบ (referee no-clash+balance · legato · ประกาย/หยอดโน้ต · humanize · rubato · section) เรนเดอร์ผ่าน reverb+chord-bus graph เดียวกับ synth voice ของ playSong. `arranger:false` = ทางเดิม (print/editor).
- SongViewer → SingTransport → ExportTool ส่ง `styleArrange` (recipe ที่กำลังฟัง) + instrument + songId → **MP3 ฝึกร้อง = เสียงเดียวกับที่ "ฟัง" ทุกดีเทลดนตรี**.
- **timbre:** offline render ใช้ synth voice (เหมือน fallback ของ playSong) — เปียโน Grand จริงใน OfflineAudioContext เป็น spike แยก (P3 · smplr offline scheduler). **ทุกอย่างตรง live ยกเว้น timbre**.
- verify ในเบราว์เซอร์: `songToMp3Blob(arranger:true)` เรนเดอร์ MP3 109KB สำเร็จ ไม่มี error · 649 tests เขียว + build ผ่าน.

## 🎹 รอบ MP3 timbre เปียโนจริง (P'Aim เคาะผ่าน pm27 · 16 ก.ค.) — commit `6af528d`
- **สั่ง:** MP3 ที่โหลด = เสียงเปียโน Grand จริง (ไม่ใช่ synth) → live↔MP3 ตรงกัน **รวม timbre**.
- **กับดักที่ verify จริง (memory ถูก):** smplr default scheduler คิว note ที่เกิน lookahead 200ms ไปรอ `setInterval` tick ที่ **ไม่เดินใน OfflineAudioContext** → note หลัง ~200ms **เงียบหมด** (probe RMS: long/late = 0 ยืนยัน).
- **แก้:** `sampler.js` — offline ctx (duck-type `startRendering`) → inject `Scheduler(ctx, { lookaheadMs: 1e7 })` เป็น `opts.scheduler` → smplr dispatch ทุก BufferSource ทันทีตอน schedule (ก่อน render). realtime คง default 200ms (lookahead ยักษ์ realtime จะ pre-create ทุก voice + พัง stop/reschedule). `audioExport` — โหลด Grand บน offline ctx → route ผ่าน reverb room เดียวกับ live → `fire()` ทุก PerfEvent · **fallback → synth ถ้าโหลดพลาด (export ไม่พัง)**.
- **verify:** real-Grand render **ได้ยินตลอดทั้งเพลง 14.3s (5/5 window RMS > 0 · ไม่มีช่องเงียบ)** · synth fallback ยัง render (peak 0.57) · 649 tests เขียว + build ผ่าน.
- **ผลลัพธ์: live ↔ MP3 ตรงกันทุกดีเทล รวม timbre แล้ว** ✅

## ⚠️ หมายเหตุถึง PM (ตรงไปตรงมา)
- density-adaptive `isRefrain` (§3b) ตั้ง threshold อนุรักษ์ (×1.5 median) เพื่อไม่ให้ comp รกโดยไม่ตั้งใจ — ปรับได้ตามหู P'Aim.
- accent (เน้นจังหวะแรก) เปิดตาม "เปิดหมด" · เคยปิดเพราะกระแทก → รอ P'Aim ear-check.

## next
- P'Aim ฟังเพลงจริงหลายแบบ (มีป้าย + ไม่มีป้าย) + ลองโหลด MP3 → ฟันธง ปรับค่า (GAP/LEAD/FLOOR/legato overlap/density) ทีละสเต็ป · ตัดสิน accent
- PM: gate + merge เข้า base (ห้าม self-merge)
- P'Aim ดาวน์โหลด MP3 จริงจากหน้าเพลง → ฟันธงว่าเสียงเปียโน Grand + arrangement ตรงกับตอน "ฟัง"
