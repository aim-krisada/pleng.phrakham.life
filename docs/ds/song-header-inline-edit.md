# DS — Inline-editable lead-sheet song header

**Phase:** DESIGN only (no code / no merge). Build is a follow-up chunk after chrome/tab-cut lands.
**Origin:** dispatch จาก PL PM 43 · P'Aim สั่งตรง — "หัวเพลงเป็น lead-sheet มาตรฐานโลก · แก้ได้ 2 ที่ sync กัน · ไม่ทิ้งกล่อง ⚙".
**G consultation:** `docs/ds/song-header-inline-edit-G-question.md` (ร่างแล้ว · รอ slot · G serialize).

---

## 0. สิ่งที่ต้องการ (ทวนแล้ว)

หัวของแต่ละเพลง = lead-sheet มาตรฐานสากล เปิดมาเห็นทันที **คีย์ · จังหวะ · ความเร็ว · ชนิดโน้ต** และ **แก้ได้ 2 พื้นผิวที่ sync กัน**:
1. คลิกแก้ตรงหัวแผ่นเพลง (inline click-to-edit ในที่)
2. กล่อง ⚙ ตั้งค่าเพลง (B060) เดิม — **คงไว้** เป็นทางเลือก
แก้ที่ไหน อีกที่อัปเดตตาม (bind song model ชุดเดียว).

---

## 1. Current state (verified 2026-07-24 — 3 ข้อในบรีฟไม่ตรงของจริง ต้องแก้ความเข้าใจก่อน)

> บรีฟบอกว่า header "1=C / 3/4 / ♩=92 / JIANPU ⇄" **มีอยู่แล้ว (read-only)** — **จริง ๆ ยังไม่มี**. ที่มีคือแคปชันแบบง่ายในโหมดแก้:

| # | ของจริง | ที่ | รูปแบบตอนนี้ |
|---|---|---|---|
| a | แคปชันเต็มแผ่น (แก้ไข · โหมดดูผล) | `EditorMode.vue:3532` | `Key {opts.key} · {timeSignature} · ♩= {bpm}` — เขียน **"Key C"** ไม่ใช่ "1=C" · ไม่มี "JIANPU" · ไม่มี toggle |
| b | ป้ายคีย์ลอย (พรีวิว) | `EditorMode.vue:3477` | `Key {opts.key}` |
| c | กล่อง ⚙ ตั้งค่า (B060) | `EditorMode.vue:2957-2967` | คีย์=ComboSelect(KEYS) · จังหวะ=ComboSelect(TIME_SIGNATURES, allow-custom) · BPM=`<input type=number 30–240>` · **ไม่มี control ชนิดโน้ต** |

**ข้อเท็จจริงโดเมนที่ยึด:**
- **A) "1=C" คือมาตรฐานที่ถูกของ jianpu** (简谱 movable-do): "1 = C" = สเกลขั้นที่ 1 (โด) = เสียง C. เราต้อง **align UP** จาก "Key C" → "1=C" (world-class-by-default).
- **B) ชนิดโน้ต (jianpu) ไม่ใช่ field ในโมเดล** — โมเดล v2 = `{version, key, timeSignature, bpm, stanzas, arrangement}` (`songModel.js:63-67`). ตัวเลข = โน้ตหัวเลยเสมอ (jianpu always-on). "คอร์ด⇄เลข" ที่มี = **display state ต่อวิว** (`SongViewer.vue:46-51` chordSystem letter/roman/hidden · display layers) ไม่ persist ต่อเพลง.
- **C) เปลี่ยนคีย์ตอนนี้ B060 ไม่ transpose คอร์ดที่เก็บ** — แค่เปลี่ยนป้ายคีย์ (`opts.key`); transpose เกิดตอน render ให้ **ผู้ฟัง** ผ่าน `displayKey` เท่านั้น (`chords.js:101-106 displayChord`). ในโหมดแก้ `displayKey === content.key` → semis=0 → ไม่ย้าย. **นี่คือช่องโหว่:** ถ้าผู้แต่งเปลี่ยนคีย์แล้วคอร์ดไม่ย้าย = คอร์ดผิดคีย์เมื่อ publish. ดีไซน์นี้ **แก้ให้ถูก** (§5).
- **D) SongSheet reactive ต่อ content** (`SongSheet.vue:8-12, 55-61, 327-331`) — เปลี่ยน `key`/`timeSignature` แล้วแผ่นรีเฟรชเอง (bpm ไม่กระทบแผ่น กระทบแค่ playback).

---

## 2. เจ้าของไฟล์ (ตอน build — เฟสถัดไป)

- **ใหม่:** `src/components/SongHeader.vue` — header strip + inline edit (consume `opts`/content ชุดเดียวกับพรีวิว).
- **แก้:** `src/components/EditorMode.vue` — วาง `<SongHeader>` แทนแคปชัน a/b · เชื่อม action ร่วมกับกล่อง ⚙ (c).
- **ใช้ซ้ำ (ไม่ fork):** `src/lib/chords.js` (`KEYS`, `transposeChord`, `semitonesBetween`), `src/lib/midi.js` (`TEMPO_MARKS`), `ComboSelect.vue`.

---

## 3. Visual spec — header strip (lead-sheet มาตรฐาน)

```
 ┌──────────────────────────────────────────────────────────┐
 │  1=C      3/4      ♩=92      · โน้ตตัวเลข (jianpu)   [A⇄I] │
 │  └cคีย์┘   └จังหวะ┘  └เทมโป┘     └── ป้าย (คงที่) ──┘  └วิว┘ │
 └──────────────────────────────────────────────────────────┘
   ● 3 ช่องแรก = คลิกแก้ได้ (เขียน song model)   ● ป้าย+toggle = per-view
```

- **1=C** — คีย์แบบ jianpu. รูปแบบ `1=` + ตัวคีย์ (`content.key`). เป็นมาตรฐานสากลของโน้ตตัวเลข.
- **3/4** — จังหวะ (`content.timeSignature`) แสดงเป็นเศษ/ส่วน (numerator เหนือ / denominator ใต้ แบบ stacked ตามแผ่นโน้ตจริง หรือ inline `3/4` เมื่อพื้นที่แคบ).
- **♩=92** — เทมโป (`content.bpm`) กับกลิฟตัวดำ ♩. ถ้า `bpm` ว่าง → ซ่อนช่องนี้ (ไม่โชว์ "♩=").
- **โน้ตตัวเลข (jianpu)** — **ป้ายคงที่** บอกชนิดโน้ต (โน้ตนี้เป็น jianpu เสมอ · ไม่ใช่ปุ่มแก้โมเดล).
- **[A⇄I]** — (ทางเลือก) toggle การแสดงคอร์ด/ตัวเลขต่อวิว (bind `chordSystem`/display เดิม). **ไม่ใช่** ส่วนของ "แก้เพลง" และ **ไม่อยู่ใน sync 2 พื้นผิว** (ดู §6).

จัดกลุ่ม: 3 ช่องแก้ได้ชิดซ้าย · ป้าย+วิวชิดขวา · เส้น baseline เดียว · type-scale ตาม DS theme tokens (ไม่ hard-code).

---

## 4. Inline click-to-edit — ต่อช่อง

**Affordance (โลกจริง · G ยืนยันรอบ 2):** ค่าที่แก้ได้ = "chip" บาง ๆ — ปกติดูเหมือนข้อความ lead-sheet สะอาด, hover/focus ขึ้น underline จุด + พื้นจาง + ดินสอ✏️เล็ก. **บนมือถือ (ไม่มี hover)** ใช้ underline-จุดถาวรจาง ๆ + ไอคอน✏️ตัวเล็กติดค่า เพื่อสื่อว่าแตะแก้ได้ (กฎ hover→tap · memory `feedback_verify_hover_on_real_browser`).

| ช่อง | คลิกแล้วเปิด | Control | ตัวเลือก | เขียนไป |
|---|---|---|---|---|
| **คีย์ 1=C** | popover เล็ก (ยึดกับ chip · clamp บนจอ) | รายการ 12 คีย์ (radio list) | `KEYS` = C Db D Eb E F Gb G Ab A Bb B (`chords.js:7`) | `setKey()` → **transpose คอร์ด + set key** (§5) |
| **จังหวะ 3/4** | popover เล็ก | preset list + ช่อง n/d เอง | `TIME_SIGNATURES` = 4/4 3/4 2/4 6/8 … (`chords.js:109`) · allow-custom | `opts.timeSignature = v` |
| **เทมโป ♩=92** | popover เล็ก | stepper ±1/±5 + preset ศัพท์ | `TEMPO_MARKS` (Grave…Presto, `midi.js:30-40`) · หรือพิมพ์ 30–240 | `opts.bpm = v` |

**สถานะ inline editor:** เปิด (ค่าเดิมไฮไลต์) → เลือก/พิมพ์ → **Enter/เลือก = ยืนยัน · Esc = ยกเลิกกลับค่าเดิม · คลิกนอก = ยืนยันค่าปัจจุบัน**. หนึ่ง popover ต่อครั้ง (เปิดช่องใหม่ปิดช่องเก่า) — เหมือนกลไก DockKey.

**A11y (WCAG 2.2 AA):** chip = `role=button` + `aria-label` ("แก้คีย์ ปัจจุบัน 1=C") · target ≥ 24px (จับคู่ขนาด control พี่น้อง ~30px · memory `wcag-target-size-aa-24-not-44`) · popover = focus-trap เบา · ลูกศรเลื่อนตัวเลือก · ประกาศค่าที่เปลี่ยนผ่าน `aria-live`.

**Mobile:** popover ยาวเกิน → เต็มความกว้าง/ชีตล่าง (full-screen sheet ไม่ใช่ popup จิ๋ว · memory `feedback_ux_platform_patterns_sop`).

---

## 5. เปลี่ยนคีย์ = transpose (แก้ช่องโหว่ §1C · ทำให้ถูกตามมาตรฐาน)

**หลักโดเมน:** movable-do — เปลี่ยนคีย์ **ตัวเลข jianpu ไม่เปลี่ยน**, **คอร์ดต้อง transpose**, ป้าย "1=" เปลี่ยน. (ยืนยันโดย DS `ps3-viewer.md:19`.)

**`setKey(newKey)` — action เดียว ใช้ร่วมทั้ง 2 พื้นผิว:**
```
semis = semitonesBetween(opts.key, newKey)          // chords.js:43
for each stored chord:  transposeChord(chord, semis, newKey)   // chords.js:35 (engine มีอยู่แล้ว)
opts.key = newKey                                    // ป้าย 1=… เปลี่ยน
// ตัวเลข jianpu: ไม่แตะ
```
- Idempotent + round-trip ปลอดภัย (เลข/ธีม/ชื่อ ไม่เกี่ยว — B108).
- **แก้ B060 gap:** ปัจจุบัน `opts.key` เปลี่ยนป้ายเฉย ๆ ไม่ย้ายคอร์ด → design นี้ทำให้ทั้งกล่อง ⚙ และ inline เรียก `setKey()` ตัวเดียวกัน = ย้ายคอร์ดถูกทุกทาง.
- **ยืนยันก่อนย้าย?** เปลี่ยนคีย์ = side-effect ใหญ่ (เขียนทับคอร์ดทั้งเพลง). Design ให้ **ทำเลย + toast "ย้ายคีย์เป็น 1=D แล้ว · เลิกทำ"** (undo ผูก history เดิมของ editor) — ไม่ขวางด้วย modal (เร็ว + กู้ได้). *ยืนยัน pattern กับ G ก่อน build.*

---

## 6. Binding / sync — 2 พื้นผิว, source เดียว (ไม่มี watcher ข้ามกัน)

**สถาปัตยกรรม:** editor มี reactive `opts` (`EditorMode.vue:178` = `{key,timeSignature,bpm}`) + โมเดลโน้ต = **single source of truth**. ทั้ง header (inline) และกล่อง ⚙ (B060) = **สอง view ของ `opts` เดียวกัน**, เรียก **action ชุดเดียว**: `setKey()` · `setMeter(v)` · `setTempo(v)`.

```
        ┌── header inline chips ──┐
opts ◄──┤                         ├──► live-preview SongSheet (reactive)
        └── ⚙ B060 settings grid ─┘
     ทั้งคู่ = binding ตรงกับ opts + actions เดียวกัน
     → Vue reactivity อัปเดตอีกฝั่ง + แผ่นพรีวิว เอง (ไม่ต้อง sync เอง / ไม่แข่งกัน)
```

- ไม่มีการ copy ค่าไปมา → ไม่มีทางเพี้ยน/ชนกัน (แก้ที่หนึ่ง ตัวแปรเดียวเปลี่ยน อีก view re-render).
- หนึ่ง popover/หนึ่งกล่องเปิดครั้งละที่ (inline ปิดเมื่อเปิด ⚙ และกลับกัน) — กัน 2 ที่แก้ค่าเดียวพร้อมกัน.
- **ขอบเขต sync = key/meter/tempo เท่านั้น** (field โมเดลจริง). **ชนิดโน้ต/⇄ = view state** (chordSystem/display) — ไม่เข้ากล่อง ⚙ (ไม่ใช่ "ตั้งค่าเพลง"), ไม่ sync ข้ามเครื่อง/persist. ถ้าภายหลังอยากได้ "ค่าเริ่มต้นการแสดงผลต่อเพลง" = field ใหม่ในโมเดล (follow-up เล็ก · ไม่อยู่ scope นี้).
- On publish: `opts` → `content.{key,timeSignature,bpm}` (เส้นทางเดิม `EditorMode.vue:1318-1320` กลับด้าน).

---

## 7. G consultation (P'Aim สั่ง · §4.5 r10)

ร่างคำถามครบใน `docs/ds/song-header-inline-edit-G-question.md` — 5 หัวข้อ: (1) inline-edit หัว lead-sheet best practice (MuseScore/Sibelius/Flat.io/iReal) · (2) affordance คลิกแก้ได้ไม่รก + มือถือ · (3) dual-synced surface งงไหม + กติกา (Figma/Notion) · (4) control ต่อชนิดค่า · (5) a11y+mobile. **สถานะ:** รอ PM greenlight slot (G serialize · สาย onboarding ใช้) → ได้คำตอบเซฟ transcript ต่อท้ายไฟล์นั้น = EVIDENCE. **ยังไม่ปิด design จน G ตอบ** (ข้อ 5/§5 อาจปรับตาม G).

---

## 8. Acceptance criteria (สำหรับเฟส build)

1. หัวทุกเพลงแสดง **1=<คีย์> · <จังหวะ> · ♩=<bpm> · โน้ตตัวเลข(jianpu)** แบบ lead-sheet สะอาด (bpm ว่าง = ซ่อนช่องเทมโป).
2. คลิก **1=C / 3/4 / ♩=92** แต่ละช่องเปิด inline editor เฉพาะช่องนั้น แก้แล้วแผ่นพรีวิวเปลี่ยนทันที.
3. แก้ค่าเดียวกันในกล่อง ⚙ B060 → หัวเปลี่ยนตาม · แก้ที่หัว → กล่อง ⚙ เปลี่ยนตาม (source เดียว).
4. เปลี่ยนคีย์ → **คอร์ด transpose ถูกทุกคอร์ด · ตัวเลข jianpu ไม่ขยับ · ป้าย 1= เปลี่ยน** · undo ได้.
5. กล่อง ⚙ ยังอยู่ครบ (ไม่ถูกตัด) — property ทางเลือก.
6. WCAG 2.2 AA: target ≥24px · keyboard (Enter/Esc/ลูกศร) · aria-label + aria-live · มือถือ = sheet เต็ม ไม่ใช่ popup จิ๋ว.
7. Round-trip: save→load ค่า key/meter/tempo คงเดิม · ไม่กระทบ number/theme/title (B108).
8. Guide.vue อัปเดตอธิบายการคลิกแก้หัวเพลง (memory `pleng-guide-always-updated`).

---

## 9. Open decisions (ให้ PM/P'Aim + G ช่วยเคาะ — ไม่ถาม "อะไรถูก", ถามเจตนา)

- **D1** เปลี่ยนคีย์ = ทำเลย+toast-undo (เสนอ) หรือ ต้องยืนยันก่อน? — รอ G best-practice (§5).
- **D2** ⇄ toggle การแสดงคอร์ด/เลขต่อวิว จะอยู่บนหัวเพลง หรือคงไว้ที่ dock เดิม? — เสนอ: คงที่ dock, หัวมีแค่ **ป้าย** "โน้ตตัวเลข" (กันหัวรก + ไม่ปน view-state กับ edit). ยืนยันกับ P'Aim.
- **D3** "1=C" อยากได้แบบ minor ด้วยไหม (เช่น "6=A" / "1=C minor")? — ตอนนี้โมเดลเก็บคีย์เดียว (major-oriented); ถ้าต้องรองรับ minor = field เพิ่ม (follow-up).
