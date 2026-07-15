# Brief — "เปียโนเดี่ยวร่างทอง" (golden universal solo piano · ~400 songs)

**สายงาน slug:** `golden-piano` · **branch:** fork ใหม่จากฐาน `studio-shell-redesign`
**PM ปัจจุบัน:** `pm27` (รายงานกลับ ping ที่นี่ · อย่า hardcode ชื่ออื่น)
**โมเดลทำงาน:** งานเสียง/creative → **P'Aim iterate ตรงกับสายนี้ได้เลย** (`feedback_paim_direct_sa_creative`) · **PM gate + merge + deploy เท่านั้น (ห้าม self-merge เข้า base)**

อ่านก่อนเขียนโค้ด: `docs/reports/piano-golden-handoff.md` (ดึงจาก branch `claude/dreamy-lumiere-68292a` ถ้าไม่มีบน base: `git show claude/dreamy-lumiere-68292a:docs/reports/piano-golden-handoff.md`) + spike report `docs/reports/dreamy-lumiere-68292a.md`.

---

## เป้าหมาย (P'Aim อนุมัติ 100% · 15 ก.ค.)
โครง arranger + ลูกเล่น + สวิตช์ UI ทั้งหมด **มีครบและถูกหลักดนตรีแล้ว** ปัญหาเดียว = **เปิดพร้อมกันแล้วเสียงเละ/ชนกันเอง** เพราะแต่ละลูกเล่นถูกจูนแยกกัน ไม่มี "วาทยกร" มองภาพรวมทุกเสียงต่อบีต.
งานนี้ = **เพิ่มด่านคุมวินัยท้ายสุด (referee layer) + แก้ data-binding ป้ายท่อน** ในตัว arranger จริงที่ `playSong` เรียกใช้ → มีผลกับ ~400 เพลงทันที **ห้ามทำ demo แยก · ห้ามผูก logic กับ Canon · ห้ามแต่งทำนองใหม่** (ทำนองมือขวา = โน้ตในชีต ตายตัว — golden rule §1a)

## ขอบเขตงาน 4 ข้อ (ตามที่ P'Aim เคาะ)

### 1. 🚦 "วาทยกร" — คุมจราจรโน้ตลูกเล่น (no-clash)
**ต้นตอ:** `embellish.js sparkle()` (และ gapFill/chromaticApproach) ยิงตาม `chordEvent.startBeat` + gate แค่ `rng()` — **ไม่เคยเช็ก melody timeline เลย** → โผล่ทับบีตที่ทำนองกำลังเคาะได้. `easeUnderHold` กรองแค่ `role==='inner'` → embellishment (`role==='emb'`) หลุดด่านนี้. `fills.js answerFills()` เช็ก hold เป็นอยู่แล้ว (ตัวอย่างที่ถูก).
**ทำ:** สร้าง melody-onset timeline ครั้งเดียวใน `arrange()` (มี `notes`/melody events อยู่แล้ว) → เพิ่ม **clash-guard pass** บังคับ **ลูกเล่นทุกตัว (emb + fills) สร้างเสียงได้เฉพาะใน "ช่องว่างทำนอง" เท่านั้น** (ทำนองกำลังลากค้าง ≥ threshold หรือพัก) · **ห้ามมี onset ของ role 'emb'/fill ตรง/ชิดบีตที่ทำนองมี attack** (เผื่อ epsilon). ทำนองวิ่งถี่ = ลูกเล่นเงียบ (คลีนทำนองมาก่อน — handoff §6).

### 2. 🛡️ "ยาม" — คุมวินัยน้ำหนัก (มือขวานำ ≥20% · กันบ๋อท่า)
**ต้นตอ:** melody gain 0.31 · sparkle = `MEL_BASE(0.35)×0.7 = 0.245` = ห่างแค่ ~21% **ไม่มี clamp เทียบทำนองจริง** (`clampAll`/`clampGainToLayer` clamp แค่ให้อยู่ในชั้น velocity ไม่ใช่เทียบทำนอง — คอมเมนต์ใน `embellish.js` optimistic เกินจริง). + สูตรลดน้ำหนัก (metricAccent × melodicContour × sectionDynamics × humanizeVel × easeUnderHold) **คูณซ้อนได้ → บางเสียงจมหาย** และทำนองเองก็โดนลด → การนำ ≥20% ไม่การันตี.
**ทำ:** เพิ่ม **balance-floor pass รันหลังสุด (หลัง clampAll)** ใน `arrange()`:
- คำนวณ concurrent melody gain ต่อบีต (ทำนองที่ดังอยู่จริง ณ startBeat ของ event นั้น หลัง dynamics)
- **clamp ทุก event ที่ไม่ใช่ role 'melody' ให้ ≤ concurrentMelodyGain × 0.8** (ต่ำกว่าทำนอง ≥20% เด็ดขาด · bass/inner/emb/fill ทุกตัว)
- ใส่ **floor กันคูณจม** — event ที่ผ่านสูตรลดหลายชั้นแล้วต่ำกว่าเกณฑ์ audible → ยกกลับขึ้นพื้นขั้นต่ำ (ยังอยู่ในชั้น velocity ที่โหลด · ไม่ silent)
- ต้องอยู่ใน `arrange()` (pure · ไม่ใช่ scheduler) → live + MP3 ตรงกันเสมอ (§1b)

### 3. 🎼 ผูกดาต้าเจียนผู้ (ป้ายท่อน ร้อง/รับ + rubato) — **บั๊กใหญ่สุด**
**ต้นตอ (handoff §1 trap):** `sectionBeatRanges(content, notes)` อ่าน `content.lines` — เพลง v2 มี `stanzas`/`arrangement` ไม่มี `lines` → คืน `[]` → `sectionDynamics`/`inRefrain`/`rubato` **ตายเงียบบนเพลงจริง ~400 เพลง** (เห็นผลแค่ Canon). rubato เหลือแค่ ritard โน้ตสุดท้ายทั้งเพลง.
**ทำ:**
- (ก) หา call site ที่สร้าง `meta.sections` (`midi.js playSong()` + `renderSongToBuffer`) → **`resolveContent(content)` ก่อนเสมอ** แล้วส่ง `{...content, lines: resolved}` เข้า `sectionBeatRanges` · verify ป้าย ร้อง/รับ/*** มีความหมายจริง
- (ข) **fallback melody-density:** เพลงไม่มีป้าย/ป้าย generic → เดา phrase/section boundary จากความถี่โน้ตทำนอง (ช่วงโน้ตถี่ = ท่อนเข้ม/รับ · ลากยาว = วรรคจบ) → `rubato` + adaptive density ทำงานได้ทุกเพลง
- ผลลัพธ์: Verse = มือซ้ายลากอุ้ม root · Chorus/รับ = แตกคอร์ดพริ้ว + sparkle ปลายท่อน · rubato ยืด 12–15% ที่ปลายวรรคจริงตามชีต

### 4. 🎧 ปุ่ม A/B ในหน้าฟังเพลงจริง (SongView)
- สวิตช์ **"ก่อน / หลัง"** ในหน้าเล่นเพลงจริง toggle ชั้น referee ใหม่ (เช่น `cfg.strictReferee` on/off) — เปิด=กวดขันเต็ม · ปิด=พฤติกรรมเดิม → **P'Aim ใช้หูเทียบ + คุม gate เอง**
- อยู่ในทางเล่นจริง (ไม่ใช่หน้า verify/harness — `feedback_show_real_ui_not_harness`) · persist เลือกไว้ได้ · มือถือแตะง่าย (target ≥44px)

## Setup (บังคับ)
1. **verify fork ถูกฐาน:** session นี้ต้องอยู่บน branch ที่ fork จาก `studio-shell-redesign` — เช็ก `git merge-base --is-ancestor origin/studio-shell-redesign HEAD` (หรือ base local) · ถ้า spawn_task fork ผิดฐาน → `git switch -c golden-piano studio-shell-redesign` แล้วเริ่มใหม่
2. `npm install` · dev **`--host`** (ให้ Network URL `http://<IP>:<port>` P'Aim ฟังมือถือ) — **ห้าม `npx vite ... &`** (orphan · ใช้ background runner ไม่ใส่ `&`) · IP เช็กสด (`Get-NetIPAddress`/vite Network line)
3. ห้าม merge/deploy เอง · commit บน branch ตัวเอง · เช็ก `git branch --show-current` ก่อน commit

## DoD + พิสูจน์ (world-class · วัดได้ + หูจริง)
- **unit test เชิงตัวเลข (invariant · pure `arrange()`):**
  (1) ไม่มี onset ของ role 'emb'/fill ตรงบีตที่ทำนองมี attack (clash = 0)
  (2) ทุก event non-melody ≤ concurrent melody × 0.8 ทุกบีต (มือขวานำ ≥20%)
  (3) ไม่มี event ต่ำกว่า floor (กันบ๋อท่า) · ทุก gain อยู่ในชั้น velocity (ไม่ silent)
  (4) sections ไม่ว่างบนเพลง v2 จริง (resolveContent ทำงาน) · rubato ยิงที่ boundary ท่อนจริง ไม่ใช่ทุกโน้ตยาว
  (5) MP3 export == live (arrange เดิม deterministic)
- **regression:** เพลงทั้งชุด test เขียว (`npx vitest run --exclude '**/.claude/**' --exclude '**/node_modules/**'`) + build ผ่าน · โหมด "ตรงโน้ต/ลูกเล่นปิด" (§6c) ยังเล่นโน้ตเป๊ะตามชีต
- **หู:** ปุ่ม A/B ให้ P'Aim ฟันธงทีละสเต็ป (อย่าถมรวดแบบไม่ได้ฟัง) · verify บนเพลงจริงหลายแบบ (มีป้ายท่อน + ไม่มีป้าย)

## รายงานกลับ (session-agnostic)
1. เขียน `docs/reports/<branch>.md`
2. เพิ่มบรรทัดใน `docs/pm/board.md` §📥 inbox
3. ping PM ปัจจุบัน = **pm27** (ระบุใน `board.md` §▶ RESUME) · **อย่า hardcode ชื่อ PM อื่น**
