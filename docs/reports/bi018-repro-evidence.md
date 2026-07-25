# BI-018 · melody A/B clarity — live repro evidence

Song: "คนบาปจงฟังเสียงพระเมตตา" (id 800b44d4…, stanzas A+B, 10 sections) on /v2 base @717fb7a.
Dev server 5318, edit mode → โครงเพลง drawer open.

## Three gaps proven from live DOM (StructureDrawer.vue)

1. **Melody list rows are inert** — `.sd-mel` items ♫A / ♫B:
   - `role` / `aria-selected` = **none**; only interactive child = "ลบทำนองนี้" (delete).
   - No click-to-select, no active/selected state. Both rows look identical & passive.
   (StructureDrawer.vue:347-351 — only @mouseenter/@mouseleave hover, no @click.)

2. **Cannot switch melody from the drawer** — clicked the ♫B row:
   - outline header BEFORE = "โครงทำนอง ♫A", AFTER = "โครงทำนอง ♫A" → **unchanged**.
   - `activeStanzaId = cursor?.stanzaId ?? stanzas[0].id` (line 137) — driven ONLY by the
     sheet cursor; no override. To see melody B you must go tap a B-section note on the sheet.

3. **"Selected position" names no melody** — hint reads
   "ตำแหน่งที่เลือก: ห้อง 1 · บรรทัด 1 · ท่อน 1" (cursorText, lines 68-74) — has bar/line/verse
   but NOT which melody. User cannot tell this ท่อน belongs to A or B.

Outline header "โครงทำนอง ♫A" (line 379) is the ONLY melody signal — small (fs-xs), and
disconnected from the melody list above.

62/170 songs have ≥2 melodies; one ("ความอุปถัมภ์…") has A/B/C/D → a fixed per-melody
color palette would run out.
