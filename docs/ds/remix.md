# DS — ปุ่ม Remix + ล็อกสูตรการบรรเลง + MP3 ตรงกับที่ฟัง

**คู่กับ** [`docs/us/remix.md`](../us/remix.md) · **mockup:** [`docs/design/remix-wireframe.html`](../design/remix-wireframe.html) (เปิดในเบราว์เซอร์)
**อ่านประกอบ:** `docs/reports/handoff-audio-round2.md §C` · `src/lib/arranger/rng.js` · `src/lib/arranger/index.js` · `src/lib/audioExport.js` · `src/components/SoundControl.vue` · `docs/ui-standards.md`

มาตรฐานที่อ้าง: **WCAG 2.2 AA** (1.4.1 สีไม่ใช่ทางเดียว · 2.4.7 focus · 2.5.8 target · 2.3.3 motion · 4.1.3 status) · **WAI-ARIA APG** (disclosure/toggle button) · **Apple HIG + Material 3** (button hierarchy 1 primary/บริบท · 44px/48dp · popover grouping) · **NN/g** (system status · recognition>recall · minimalist).

---

## 0 · ปัญหาที่กำลังแก้ (สภาพปัจจุบัน — verify จากโค้ด)

1. **การบรรเลงตายตัว 1 แบบ/เพลง:** `arrange()` สุ่มด้วย `rngFor(songId, pass)` โดย `pass` = **ดัชนีรอบวนซ้ำ**
   (loop pass) เท่านั้น (`midi.js:519`). เปิดเพลงเดิมทุกครั้ง = pass 0 = **เสียงเดิมเป๊ะ** ไม่มีทางเลือกอื่น.
   → ผู้ใช้ลองสูตรอื่นไม่ได้.
2. **MP3 ไม่ผ่านตัวแต่งเสียงเลย:** `audioExport.renderSongToBuffer()` เรียก `buildChordVoice` + `scheduleNote`
   ตรง ๆ **ไม่เรียก `arrange()`** → ไม่มี humanize/embellish/dynamics/voicing → ฟัง **ทื่อและต่างจากหน้าเว็บ**.
   นี่คือ "MP3 สุ่มไม่ตรง" ที่ P'Aim เจอ (จริง ๆ คือ MP3 ไม่มีการปรุงเลย ไม่ใช่สุ่มคนละแบบ).

**หลักการแก้ (KISS):** เพิ่ม `variant` 1 ตัวเป็น "หมายเลขสูตร", route MP3 ผ่าน `arrange()` ตัวเดียวกับ live.
ไม่แตะแกน pipeline, ไม่แตะ 54 เทสต์ (variant 0 = ของเดิมทุกบิต).

---

## 1 · โมเดล seed / variant (หัวใจของ determinism)

### แนวคิด — แยก 2 มิติของการสุ่มให้ชัด
| มิติ | คุมโดย | ผู้ใช้เห็น/คุมไหม | บทบาท |
|---|---|---|---|
| **variant** (สูตร) | ปุ่ม Remix | ✅ เห็น + คุม + ล็อกได้ | "แบบที่ N" — ลูกเล่นชุดใหม่ทั้งเพลง |
| **pass** (รอบวนซ้ำ) | เอนจินเวลา `วนซ้ำ` | ❌ อัตโนมัติ (live feel) | รอบ 2/3 ต่างจากรอบ 1 นิด ๆ เหมือนเล่นสด |

> ทั้งสองเป็น deterministic. variant เป็นตัวที่ผู้ใช้ "ปัก" ได้; pass เป็นความมีชีวิตอัตโนมัติที่คงไว้.

### สเปกเทคนิค (backward-compatible เป๊ะ)
- **`rng.js` — ไม่ต้องแก้ signature.** คำนวณ seed identity ที่ **จุดเรียก** โดยประกอบ variant เข้ากับ songId:
  ```
  seedId = variant ? `${songId}~r${variant}` : songId      // variant 0 → songId เดิม 100%
  ```
  แล้วส่ง `seedId` เป็น `meta.songId` ให้ `arrange()` เหมือนเดิม. ผลลัพธ์:
  - `variant = 0` → hash string เดิม → seed เดิม → **ทุกเทสต์เดิมผ่านไม่เปลี่ยน**.
  - `variant > 0` → string ต่าง → seed ต่าง → สูตรใหม่ที่ **reproducible** (seed มาจาก string ตายตัว).
  - `pass` ยังทำงานเหมือนเดิมบนทุก variant (รอบวนซ้ำยังพริ้ว).
  > ทางเลือกอื่น (แก้ `seedFor(songId, pass, variant)` ให้ fold variant) = เปลี่ยน hash ของ variant 0 → เทสต์แดง.
  > จึงเลือกประกอบที่ call-site (dev แตะน้อยสุด · rng.js ไม่ขยับ).

- **Remix = เดินหน้า variant แบบนับได้ (monotonic):** `variant = variant + 1` (เริ่ม 0 → 1 → 2 …).
  - เหตุผลเลือก increment ไม่ใช่ random: **นับได้ → ป้าย "แบบที่ N" มีความหมาย + reproducible + อธิบายง่าย**
    (recognition > recall). ผู้ใช้ไม่ต้องได้ "สูตรเจาะจง" — แค่ "อีกแบบ" ก็พอ.
  - ครบ ~99 แบบให้วนกลับ 1 (กันตัวเลขบวม · ในทางปฏิบัติไม่มีใครกดถึง).

- **ค่าเริ่มต้น = variant 0 = "แบบเริ่มต้น"** (สูตรดั้งเดิมของเพลง · = สิ่งที่ live เป็นอยู่วันนี้).

---

## 2 · State + persistence (store.js)

เพิ่มใน `src/store.js` (เกาะรูปแบบ `sparkleLevel`/`soundMode` ที่มีอยู่):

```
// ---- remix variant + lock (per-song · หน้าฝึกร้อง) ----
// activeVariant = สูตรที่กำลังฟัง (0 = เริ่มต้น). ไม่ persist ตรง ๆ — persist เฉพาะ"ที่ล็อก".
const REMIX_KEY = 'pleng.remixLocks'     // { [songId]: variant }  (เฉพาะเพลงที่ล็อก)
export const activeVariant = ref(0)      // in-memory ต่อเพลงที่เปิดอยู่
export const remixLocked = ref(false)    // เพลงปัจจุบันล็อกอยู่ไหม
```
- **เปิดเพลง / เปลี่ยนเพลง:** อ่าน `REMIX_KEY[songId]` → ถ้ามี ⇒ `activeVariant = ค่านั้น`, `remixLocked = true`;
  ถ้าไม่มี ⇒ `activeVariant = 0`, `remixLocked = false`. (ผูกกับ watcher `props.song.number` ที่ SongViewer มีแล้ว.)
- **Remix:** `activeVariant++`; ถ้ากำลังล็อกอยู่ → ปลดล็อกอัตโนมัติ (สูตรที่ล็อกคือสูตรเดิม ไม่ใช่สูตรใหม่)
  **หรือ** อัปเดตค่าที่ล็อก — เลือกแบบแรก (ปลดล็อกเมื่อสุ่มใหม่) เพราะตรง mental model "ล็อก = ปักอันนี้".
- **ล็อก:** `REMIX_KEY[songId] = activeVariant`; `remixLocked = true`. **ปลดล็อก:** ลบคีย์นั้น; `remixLocked = false`.
- **scope:** เฉพาะหน้าฝึกร้อง (listener). หน้าแก้เพลง default ตรงโน้ต → ไม่ยุ่ง (ถ้าพี่เปาสลับไปบรรเลงเอง
  ค่อยเห็น — ใช้ state เดียวกันได้ หรือแยก editor key ภายหลัง · **launch = ฝึกร้องพอ**).

> **ทำไม lock = per-song ใน localStorage:** แต่ละเพลงมีสูตรโปรดต่างกัน · per-browser เหมือน sparkle/soundMode
> (ผู้ใช้เปลี่ยนแค่ view ตัวเอง · ไม่ต้อง auth · ไม่ชนคนอื่น).

---

## 3 · เชื่อม variant เข้า playback (SongViewer.vue + midi.js)

- **SongViewer:** ส่ง `variant: activeVariant.value` เข้าไปใน `common` (ข้าง `songId`) ของ `startPlay()`
  → ส่งต่อ `playSong`/`playEnsemble`. เพิ่ม watcher live เหมือน `sparkleLevel`:
  ```
  watch(activeVariant, () => { if (playing.value) startPlay(playedIndex.value) })
  ```
  (re-schedule ต่อจากโน้ตปัจจุบัน = ได้ยินสูตรใหม่ทันที ตาม AC1).
- **midi.js `playSong(...)`:** รับ `variant = 0` เพิ่ม 1 พารามิเตอร์. ที่จุดสร้าง meta (`midi.js:541`):
  ```
  const seedId = variant ? `${songId}~r${variant}` : songId
  const perf = arrange(notes, chordEvents, {...}, { songId: seedId, pass, ... })
  ```
  `pass` (loop) ยังทำงานเดิม.
- **`playEnsemble`** (ถ้ายังใช้ path นั้น) รับ `variant` เหมือนกันเพื่อความสม่ำเสมอ (ปัจจุบัน ensemble มี seed
  path ของตัวเอง `midi.js:762` — dev เสียบ variant ให้ salt เดียวกัน).

---

## 4 · MP3 ผ่าน `arrange()` ด้วย seed+config เดียวกับ live (แก้ปัญหาหลัก)

**เปลี่ยน `audioExport.renderSongToBuffer()` ให้ render จาก PerfEvent ของ `arrange()`** แทน path ตรงเดิม:

```
// เดิม: buildPlayNotes → scheduleNote/buildChordVoice ตรง (ไม่มี arranger)
// ใหม่: notes → arrange(notes, chordEvents, arrangeCfg, {songId: seedId, pass:0, ...}) → PerfEvent[]
//       แล้ว schedule แต่ละ PerfEvent ลง OfflineAudioContext (beats→sec ด้วย spb)
```
พารามิเตอร์ใหม่ของ `renderSongToBuffer`/`songToMp3Blob`: `{ arranger, arrangeCfg, variant, songId, instrument }`
(ชุดเดียวกับที่ `startPlay` ส่งให้ `playSong`). ExportTool/SingTransport ส่งค่าปัจจุบันลงมา (ตอนนี้ส่งแค่
`bpm/transpose/voices` — เพิ่มให้ครบ).

### 4.1 กติกา determinism (ให้ "ตรงกับที่ฟัง")
- MP3 ใช้ **`pass = 0`** เสมอ (ไฟล์ = 1 เทค). live "รอบแรก" ก็ pass 0 → **MP3 = สิ่งที่ได้ยินรอบแรกเป๊ะ**.
  (รอบวนซ้ำ 2/3 ของ live พริ้วต่างเล็กน้อยโดยตั้งใจ = live feel; ไฟล์เสียงเป็น snapshot ของเทคเดียว —
  มาตรฐานเดียวกับการอัดเสียงจริง. อธิบายผู้ใช้ผ่านป้าย §5.3).
- ใช้ **variant + arrangeCfg (สไตล์ + 12 เทคนิค + sparkle) ปัจจุบัน** = ที่กำลังฟัง.
- ⇒ MP3 เป็นฟังก์ชันบริสุทธิ์ของ (content, key, tempo, voices, variant, arrangeCfg) → ดาวน์โหลดกี่ครั้งก็ไฟล์เหมือนเดิม.

### 4.2 ⚠️ ความเสี่ยงที่ต้อง flag ให้ dev (ไม่ใช่ scope ของ SA)
- **เครื่องดนตรี sampler ใน OfflineAudioContext:** Grand เป็น sample-based. มีบทเรียนแล้วว่า smplr เงียบ
  โน้ต > ~200ms ใน offline (memory `pleng-smplr-offline-render` + `docs/reports/download-real-audio-spike.md`
  พิสูจน์ทางแก้: inject big-lookahead Scheduler + build grand เป็น Sampler ผ่าน `pianoToPreset`). **การ route
  ผ่าน arrange (งานนี้) กับการ render ด้วย sampler จริง offline เป็นคนละชั้น** — dev ต้องรวมทางแก้จาก spike
  นั้น. ถ้ายังไม่พร้อม: fallback = render ผ่าน arrange **ด้วย synth** (ยังได้ humanize/embellish/dynamics ครบ =
  ตรงกับ "ฟัง" แบบ synth) แล้วอัป sampler ทีหลัง — ยังแก้ปัญหาหลัก (MP3 มีการปรุง) ได้.

---

## 5 · UX / UI

### 5.1 ที่อยู่ = กลุ่มใหม่ในป็อปอัพ "เสียงดนตรี" (ไม่เพิ่มปุ่มบนแถบ)
**ข้อเสนอที่ดีที่สุด + เหตุผล (ฟันธง):** วาง Remix + ล็อก เป็น **กลุ่มล่างสุดของป็อปอัพ SoundControl**
แสดงเฉพาะเมื่อสไตล์ ≠ ตรงโน้ต (โผล่/ซ่อนแบบเดียวกับสไลเดอร์ "ประกายเสียงสูง").

เหตุผล (อ้างมาตรฐาน):
1. **ตรงหลัก P'Aim 13 ก.ค.** — ยุบ 4 เมนูเสียงเป็น "1 ปุ่มเสียงดนตรี". เพิ่มปุ่มใหม่บนแถบ = ถอยหลัง +
   เสี่ยง overflow มือถือ (บทเรียน launch: 360/412 ล้นจริง).
2. **Gestalt / Material grouping** — Remix เป็น "การตัดสินใจเรื่องเสียง" → อยู่บ้านเดียวกับสไตล์/ประกาย.
3. **ลูปใช้งานลื่น** — ป็อปอัพ **ไม่ปิดเมื่อกด Remix** → ฟัง→สุ่ม→ฟัง→ล็อก ในหน้าต่างเดียว (NN/g:
   ลด friction ของงานทำซ้ำ). ปุ่ม ▶ เล่น/หยุด ยังอยู่บนแถบ (Fitts's law: ปุ่มหลักใหญ่/เข้าถึงง่าย).

> ทางเลือกที่พิจารณาแล้วไม่เลือก: (ก) ปุ่ม Remix แยกบนแถบ — โดน overflow มือถือ + ขัดหลักยุบเมนู ·
> (ข) ในเมนู ⚙ ตั้งค่า — ลึกไป, remix เป็น action ระหว่างฟัง ควรอยู่คู่เสียง. **mockup แสดงแบบที่เลือก
> ให้ P'Aim เห็นภาพ + เทียบได้.**

### 5.2 หน้าตากลุ่ม "สูตรการบรรเลง" (ในป็อปอัพ)
```
┌───────────────────────────────────────────┐
│ 🎲 สูตรการบรรเลง                             │  ← หัวกลุ่ม (sc-glabel style เดิม)
│ ┌─────────────────────┐  ┌──────────────┐  │
│ │  🎲  สุ่มสูตรใหม่      │  │  🔓 ล็อกสูตรนี้ │  │  ← 2 ปุ่ม (row เดียว · ปุ่มเครื่องมือ treatment เดียวกัน)
│ └─────────────────────┘  └──────────────┘  │
│ กำลังเล่น: แบบที่ 3               (aria-live) │  ← ป้ายสถานะ (muted, เล็ก)
└───────────────────────────────────────────┘
```
- **ปุ่มสุ่ม** = ปุ่มหลักของกลุ่มนี้ (มี weight มากกว่าเล็กน้อย/ไอคอน 🎲 `shuffle` ของ Lucide) แต่ **ไม่ใช่
  filled สีเน้น** (สงวน filled ให้ ▶ ปุ่มเดียว/บริบท ตาม HIG button hierarchy + ui-standards §2).
- **ปุ่มล็อก** = toggle. ไม่ล็อก → ไอคอน `lock-open` + "ล็อกสูตรนี้"; ล็อกแล้ว → ไอคอน `lock` + "ล็อกอยู่"
  + ปุ่มเปลี่ยนเป็นสถานะ active (ขอบ/พื้น brand เหมือน `.sc-opt.on`). `aria-pressed` สะท้อนสถานะ.
- **ป้ายสถานะ** = ข้อความเดียว, `aria-live="polite"`:
  - variant 0 ไม่ล็อก → "กำลังเล่น: แบบเริ่มต้น"
  - variant N ไม่ล็อก → "กำลังเล่น: แบบที่ N"
  - ล็อก → "🔒 ล็อกไว้: แบบที่ N" (variant 0 ที่ล็อก = "🔒 ล็อกไว้: แบบเริ่มต้น")
- ไอคอนทั้งหมด = **Lucide** (`shuffle`, `lock`, `lock-open`) ตาม `reference_lucide_icons` + DS อ้าง id ตรง.

### 5.3 จุดดาวน์โหลด MP3 (ExportTool popover)
เพิ่ม **1 บรรทัด caption** ใต้แถว "เสียง (MP3)" (ก่อนกด/ระหว่างเตรียม):
> "ไฟล์ = สูตรที่กำลังฟัง · แบบที่ 3" หรือ "· 🔒 แบบที่ 3"

ตัด doubt "ไฟล์จะตรงไหม" (NN/g system status). ไม่เพิ่มปุ่ม/เมนู — แค่ข้อความ (single source of action คงเดิม).

### 5.4 states + microcopy (ภาษาคน · ไม่ศัพท์ดนตรี)
| สถานะ | ปุ่มสุ่ม | ปุ่มล็อก | ป้าย |
|---|---|---|---|
| เริ่มต้น (v0, ไม่ล็อก) | 🎲 สุ่มสูตรใหม่ | 🔓 ล็อกสูตรนี้ | กำลังเล่น: แบบเริ่มต้น |
| สุ่มแล้ว (vN, ไม่ล็อก) | 🎲 สุ่มสูตรใหม่ | 🔓 ล็อกสูตรนี้ | กำลังเล่น: แบบที่ N |
| ล็อกแล้ว (vN, ล็อก) | 🎲 สุ่มสูตรใหม่ | 🔒 ล็อกอยู่ (active) | 🔒 ล็อกไว้: แบบที่ N |

- คำว่า "สูตร" (recipe) = ตัวแทน "arrangement/seed" ที่คนทั่วไปเข้าใจ. หลีกเลี่ยง "seed/variant" ใน UI.
- ปุ่มไม่ต้องมีลูกศร ▾ (ไม่ได้เปิดเมนูย่อย · ui-standards §2).

### 5.5 a11y (ตรวจตาม ui-standards §1–2)
- `role="group"` + `aria-label="สูตรการบรรเลง"` ครอบกลุ่ม.
- ปุ่มสุ่ม: `<button aria-label="สุ่มสูตรการบรรเลงใหม่">`; หลังคลิก **โฟกัสคงที่ปุ่ม** (กดรัวด้วย Enter/Space ได้).
- ปุ่มล็อก: `<button :aria-pressed="remixLocked" aria-label="ล็อกสูตรนี้ไว้">`.
- ป้ายสถานะ: element เดียว `aria-live="polite"` (ประกาศเมื่อ variant/lock เปลี่ยน · 4.1.3).
- โฟกัส ring จาก token `:focus-visible` เดิม (2px brand) · contrast ≥ 4.5:1 (ข้อความ) / ≥ 3:1 (ขอบปุ่ม/ไอคอน) —
  ใช้ token เดิม (ผ่านมาแล้ว).
- **motion:** ถ้าใส่ feedback ตอนสุ่ม (เช่น ไอคอน 🎲 หมุน 1 ครั้ง) → หุ้ม `@media (prefers-reduced-motion: reduce)`
  ให้ไม่หมุน (2.3.3). ค่า default = subtle มาก (≤150ms) หรือไม่ใส่เลยก็ได้ (minimalist).

### 5.6 มือถือ / no-scroll
- กลุ่มนี้ = 1 หัว + 1 แถวปุ่ม + 1 ป้าย ≈ สูงพอ ๆ กับกลุ่ม slider เดิม → ป็อปอัพยังพอดีจอ (max-height เดิม
  `min(90dvh, 100dvh-200px)` รองรับ). 2 ปุ่มเรียงบรรทัดเดียว, ยุบเป็นเต็มความกว้างถ้าแคบ (wrap) — ห้ามซ้อน 2 บรรทัด
  แบบ cramped (ui-standards §2). **verify จริง 360/412** (ไม่ใช่ computed 375).

---

## 6 · ความสัมพันธ์กับเมนู "ปรับละเอียด" 12 เทคนิค (สำคัญ — ตอบคำถาม P'Aim)

**คำถาม:** "ล็อกรวมทั้ง config เทคนิค + seed ไหม?"

**คำตอบที่ออกแบบ (world-class + KISS): ล็อกเฉพาะ seed (variant). ไม่ต้อง snapshot config เทคนิค.** เหตุผล:
- **config 12 เทคนิค = deterministic + ผู้ใช้เห็นผลสด** (เปิด/ปิด/สไลด์แล้วได้ยินทันที). มันไม่ใช่ "การสุ่ม" —
  เป็นการตั้งค่าที่ผู้ใช้เจตนา. ค่าเหล่านี้ **persist per-browser อยู่แล้ว** (เหมือน sparkle/style).
- **seed (variant) = ส่วนเดียวที่ "สุ่ม"** → จึงเป็นสิ่งเดียวที่ต้อง "ปัก". ล็อก = ปักส่วนสุ่ม.
- ผล: "สูตรที่ได้ยิน" = **config ปัจจุบัน (เห็นได้) + variant (ล็อกได้)**. ถ้าผู้ใช้ปรับเทคนิคทีหลัง → เสียงอัปเดต
  สด + เขา re-ล็อกได้ถ้าชอบ. **MP3 ใช้ config ปัจจุบัน + variant ปัจจุบันเสมอ → "ตรงกับที่ฟัง" จริงทุกกรณี.**
- ทำให้ mental model เรียบ: "ล็อก = จำการสุ่มที่ฉันชอบ" ไม่ใช่ "จำทุกปุ่มที่ฉันตั้ง" (ซึ่งจำอยู่แล้ว).

> ทั้ง Remix และเมนูเทคนิคเขียนลง **`arrangeCfg` เดียวกัน** ที่ `arrange()` กิน — ไม่ชนกัน. Remix แตะ `variant`
> (นอก cfg, ใน meta); เทคนิคแตะ flags ใน cfg. dev ทำสองงานนี้แยกกันได้ (คนละ PR) เพราะแตะคนละฟิลด์.

---

## 7 · สรุป dev checklist (สเปกให้ implement — design-only จนกว่า P'Aim เคาะ)
1. `store.js`: `activeVariant` · `remixLocked` · โหลด/บันทึก `pleng.remixLocks[songId]` · actions `remix()` / `toggleLock()` · reset ตอนเปลี่ยนเพลง.
2. `SongViewer.vue`: ส่ง `variant` เข้า `startPlay/playSong` · watcher `activeVariant` re-schedule live · ต่อ SoundControl group + ExportTool caption · โผล่เฉพาะสไตล์ ≠ plain.
3. `midi.js`: `playSong({... variant})` → ประกอบ `seedId` → `arrange(meta.songId=seedId)` · เสียบ ensemble path เช่นกัน.
4. `audioExport.js`: `renderSongToBuffer`/`songToMp3Blob` route ผ่าน `arrange()` (pass 0 · variant · arrangeCfg) → schedule PerfEvent · **รวมทางแก้ offline-sampler จาก spike (§4.2)**.
5. `SoundControl.vue`: รองรับ group kind ใหม่ (`remix`) — 2 ปุ่ม + ป้าย aria-live (หรือ page ส่ง group ผ่าน slot เหมือน soundctl).
6. tests: determinism (variant N reproducible · MP3 render == live pass 0 events) · variant 0 no-regression (54 arranger) · axe/target/no-scroll.

## 8 · เปิดค้าง (รอ P'Aim เคาะตอน GATE 1)
- **Q1 ตำแหน่ง:** เห็นด้วยกับ "กลุ่มในป็อปอัพเสียงดนตรี" ไหม (ข้อเสนอ) หรืออยากได้ปุ่มแยก? (mockup โชว์แบบเสนอ)
- **Q2 microcopy:** "สูตร" โอเคไหม (เทียบ "แบบการเล่น" / "สไตล์เสียง")? "แบบที่ N" หรือ "สูตร #N"?
- **Q3 ปุ่มสุ่มใหม่ = ปลดล็อกอัตโนมัติ** (ข้อเสนอ §2) โอเคไหม หรืออยากให้สุ่มแล้วยังคงล็อก (ล็อกตามสูตรใหม่)?
- **Q4 อนิเมชันตอนสุ่ม:** ใส่ subtle (🎲 หมุน 1 ครั้ง) หรือไม่ใส่เลย (minimalist)?
