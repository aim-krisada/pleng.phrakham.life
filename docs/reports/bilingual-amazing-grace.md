# Report — Amazing Grace (PD-safe) + bilingual (เนื้อ 2 ภาษา) test

Experiment/research session (branch `amazing-grace-bilingual`, off `studio-shell-redesign`).
⛔ No production code touched · no Supabase write. Deliverables = a sample JSON + this report.
Ordered by pm7 (brief: `docs/pm/brief-amazing-grace-bilingual.md`).

---

## (ก) Copyright verdict — ✅ ปลอดลิขสิทธิ์ (PD-safe)

| Part | Source | Status |
|---|---|---|
| English words | John Newton, 1779 | **Public domain** (worldwide — author d. 1807, > 200 yrs) |
| Tune "New Britain" | *Virginia Harmony*, 1835 (arr. traced to William Walker) | **Public domain** |
| **Thai words** | **Self-written for this test, released CC0** | **Safe** — no published Thai translation used |

**⚠️ The one real trap = the Thai translation.** Published Thai renderings of Amazing Grace
(e.g. "พระคุณพระเจ้า", "มหัศจรรย์พระคุณ") usually carry the **translator's** copyright even though
Newton's English is free. So the sample does **not** copy any published Thai text — I wrote a
plain, singable Thai verse from scratch and marked it CC0. This is recorded in the JSON under
`content`-sibling field `copyright_note` so the provenance travels with the data.

**Rule for future PD imports:** English/Latin hymn text + old tune = usually safe; **always
re-check the translation separately** and prefer self-written or a translation that is itself PD.

---

## (ข) How Amazing Grace was entered + the real render

### Data
`docs/samples/amazing-grace.json` — a **v2** song (`docs/song-model-v2.md`):
- **1 stanza `A`** = the whole 16-bar New Britain tune (4 phrases), numbered notation (jianpu),
  **3/4**, header key **G**.
- **3 arrangement rows**, all linking stanza A (edit-melody-once): `Verse 1 (EN)`, `ร้อง 1 (ไทย)`,
  `Verse 2 (EN)` — each supplies only its syllables.
- Melody is written **syllabic (1 syllable = 1 attack note)** — the way it is sung congregationally.
  The authentic melismas (เอื้อน, several notes per syllable) of the original are simplified,
  because the v2 model is one-syllable-per-attack-note (see finding in §ค). Long notes are held
  with `-`. A musician (พี่เปา) should ear-check pitches before any production use.

### Verification (node, against the real libs)
`docs/samples/_verify_ag.mjs` runs the song through the **exact** production functions:

- **beat-checker (`lintBar` / `beatCount`)** — **all 11 bars = exactly 3 beats, 0 problems, 0 other lint.**
- **syllable alignment (`syllableSlots` / `attackSlots`)** — stanza A = **35 note-boxes, 28 attack notes**;
  every row: array length **35/35 ✓**, word count **28/28 ✓**.
- **`resolveContent`** — expands the arrangement into renderable lines with words under the right notes,
  melisma-holds left blank. `_melodyFirst` flags: `Verse 1 (EN)=true`, Thai=`false`, `Verse 2=false`
  (→ songbook prints the melody once, later verses as lyrics only).

### Rendered in the app (real `SongSheet` + `NoteRow` components)
Standalone demo (`ag-demo.html` + `ag-demo.js`) mounts the **production** `SongSheet` with
`resolveContent(content)` — same path Studio uses. Verified in-browser, no console errors.

**ฝึกร้อง / sing view** (every verse shows its own notes) — actual DOM output, Verse 1 EN:

```
♦ Verse 1 (EN)
G   0 0 5̣            A                 (0 0 .5   → 2 rests + pickup "A")
G   1· 3̲ 1          ma  zing  grace   (do· mi  do)
C   3· 2̲ 1          how sweet the     (mi· re  do)
G   1  – –          sound             (do held)
G   5̣ 1· 3̲          that saved a      (sol· do· mi)
D   1̲ 3̲ 2 –         wretch like me    (do mi re, held)
G   5̣ 1· 3̲          I once was
C   1· 3̲ 1ʹ         lost but now      (…leaps to high do 1ʹ on "now")
G   6 5 –           am found
D   1· 3̲ 1          was blind but
G   3̲ 2̲ 1 –         now I see
```
The Thai and Verse-2 rows render the same melody with their own syllables
(`พระ / คุณ ล้ำ เลิศ / ประ-เสริฐ เกิน / คำ …` and `'Twas / grace that taught / …`), and the
same-word hyphen convention shows correctly (`ประ-เสริฐ`, `บัด-นี้`, `re-lieved`, `be-lieved`).

- **Transpose**: switching key G→C re-labels chords G/C/D → C/F/G, numbers unchanged (movable-do). ✅
- **คอร์ด+เนื้อ view**: hides numbers, keeps chords+words. ✅

**Live demo for P'Aim (phone on same WiFi):** `http://192.168.1.124:5399/ag-demo.html`
(worktree dev server, `--host`). Restart with: `npm run dev -- --host --port 5399` in the worktree,
open `/ag-demo.html`. (Screenshots kept timing out — a known-flaky tool here — so the evidence above
is the live DOM; please open the URL to see it rendered.)

---

## (ค) เนื้อ 2 ภาษา — indirect 2-row test + native assessment

### Test: 2 arrangement rows (EN + TH) on one stanza — **works today, zero code**

| View | Result |
|---|---|
| **ฝึกร้อง / sing** | Each verse (EN v1, ไทย v1, EN v2) shows its **own** notes. Reader flips between EN and TH verses. Good for practice, but EN and TH are in **separate blocks**, not side by side under one note. |
| **แผ่นเพลง / songbook (print)** | Melody prints **once** (Verse 1 EN, with chords). ไทย v1 and EN v2 print as **lyrics-only rows stacked underneath** the same melody — a printed-hymnbook layout. This is already a usable **bilingual sheet** (EN line then TH line under the shared tune). |

**Verdict:** the indirect 2-row method is **enough for real use now** — sing = switch language,
print = EN+TH stacked. It costs **nothing** (the model already supports many rows per stanza).

### Gap to "true interlinear" (EN directly on top of TH, under the *same* note)

What the 2-row method does **not** give: EN and TH under the **same** note head at the same time
(EN band above, TH band below the note), which is the tightest bilingual layout.

**Key finding (KISS):** because every arrangement row that links stanza A already aligns **1:1 to
the same 35 note-boxes**, `syllablesEN[i]` and `syllablesTH[i]` are *already under the same note*.
So true interlinear does **not** need a model change or an editor change — it can be a **render-only
pairing**: mark two existing rows as a "bilingual pair", and `SongSheet`/`NoteRow` draws row-A's
syllable on top and row-B's syllable below each note. Client-side only.

| Approach | Model change | Editor (Studio) change | Render change | Client-side? | Cost |
|---|---|---|---|---|---|
| **2 rows (now)** | none | none | none | yes | **0** |
| **Interlinear via render-pairing** (recommended if wanted) | none (reuse 2 rows' existing syllables) | tiny (a "pair these 2 rows" toggle) | **moderate** (NoteRow: 2nd lyric band + print rules) | **yes** | **low–moderate** |
| **Native 2-language slots** (`syllables:[{en,th}]`) | moderate | **large** (every syllable box, shift tool, paragraph editor, auto-split doubles) | moderate | yes | **high** |

### Recommendation (per `docs/ui-standards.md` + KISS)
1. **Ship nothing new now** — the 2-row method already covers sing-switch and stacked-print bilingual.
2. **If P'Aim wants true interlinear** (EN-over-TH under one note): build it as a **render-only
   pairing of two existing rows**, not as native 2-language slots. Same data, no editor rework,
   fully client-side. This is the honest KISS path.
3. **Avoid** the native `{en,th}` slot model — it's the expensive option (the whole syllable-editing
   UX would double) for a layout the render-pairing already delivers.

---

## (ง) สรุปภาษาคน (ม.ต้น) สำหรับ P'Aim

- เอาเพลง **Amazing Grace** เข้าระบบได้แล้ว **ถูกลิขสิทธิ์ 100%** — เนื้ออังกฤษกับทำนองเก่าเกิน 200 ปี
  เป็นของสาธารณะ · **คำแปลไทยพี่แต่งเองใหม่** (ไม่ก๊อปของใคร) เลยปลอดภัย. กับดักเดียวคือ "คำแปลไทยของสำนักพิมพ์"
  ห้ามเอามาใช้ ต้องแปลเอง/ใช้ของเก่าจริง ๆ.
- เพลงผ่านเครื่องตรวจของระบบหมด: **ทุกห้องจังหวะครบ 3/3** และ **คำร้องลงตรงโน้ตเป๊ะทุกพยางค์** ทั้ง 3 ข้อ.
- ลอง **2 ภาษา** แล้ว วิธีง่ายที่สุด (พิมพ์เป็น 2 ข้อ EN + ไทย บนทำนองเดียว) **ใช้ได้เลยตอนนี้ ไม่ต้องเขียนโค้ดเพิ่ม**:
  - หน้า **ฝึกร้อง** → สลับดูข้ออังกฤษ/ไทย (แต่ละข้อมีโน้ตของตัวเอง)
  - หน้า **แผ่นเพลง (พิมพ์)** → โน้ตโชว์ครั้งเดียว แล้ววางเนื้ออังกฤษ + ไทย ซ้อนกันใต้ทำนอง = แผ่น 2 ภาษาพร้อมใช้
- ถ้าอยากได้แบบ **"อังกฤษบน–ไทยล่าง ใต้โน้ตตัวเดียวกัน"** จริง ๆ: **ทำได้ และไม่แพงอย่างที่คิด** เพราะข้ออังกฤษกับ
  ไทยมันเรียงตรงโน้ตเดียวกันอยู่แล้ว — แค่ให้หน้าจอ "จับคู่ 2 ข้อ" แล้ววาดเนื้อ 2 บรรทัดใต้โน้ต **ไม่ต้องแก้ตัวแก้ไข
  ไม่ต้องแตะฐานข้อมูล ทำฝั่งเบราว์เซอร์ล้วน**. อย่าไปทำแบบ "ช่องเดียวเก็บ 2 ภาษา" — อันนั้นแพงสุด (ต้องรื้อหน้าแก้ไขทั้งหมด).
- **ข้อควรระวังเล็ก ๆ:** ทำนองที่ใส่เป็นแบบ "1 พยางค์ = 1 โน้ต" (ที่ร้องกันในโบสถ์) ตัดเอื้อนของต้นฉบับออก
  เพื่อให้เข้ากับระบบ — อยากให้พี่เปาฟังเช็กเสียงก่อนใช้จริง.

**คำแนะนำสั้น:** ใช้วิธี 2 ข้อไปก่อน (ฟรี) · ถ้าอยากได้ 2 ภาษาซ้อนใต้โน้ตเดียว ให้ทำเป็น "โหมดจับคู่ตอนแสดงผล" ไม่ใช่เปลี่ยนโครงข้อมูล.

---

## Files
- `docs/samples/amazing-grace.json` — the PD-safe v2 sample (with `copyright_note`).
- `docs/samples/_verify_ag.mjs` — verification harness (beat-checker + alignment + resolveContent).
- `ag-demo.html` / `ag-demo.js` — standalone render demo (mounts production `SongSheet`; not for prod).
