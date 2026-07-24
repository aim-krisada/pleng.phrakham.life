# PM state — เพลง.พระคำ.ชีวิต (อ่านไฟล์เดียวนี้ + `decisions-log.md` = rehydrate PM ทันที)

> **สมองอยู่บน disk** → PM ตายเกิดใหม่ได้ · เก็บ **สั้น** · จบแล้วตัดออกทันที · มติ → `decisions-log.md` · เก่า → `decisions-archive.md`

## ▶ pl pm 44 เริ่มที่นี่ (handoff 24 ก.ค. ~20:00 · จาก pm 43 · session เต็ม)

### 🎉 สถานะใหญ่: /v2 LIVE บน production แล้ว (deploy สำเร็จ+verified ก่อน 20:00)
- **`https://pleng.phrakham.life/v2/` = ตัวใหม่ live** (stamp `132a041` · แท็บหาย · ตัวแก้ inline ครบ · import/export ใน ⋮ · share-2 · ฟังได้ · 0 loss)
- **`https://pleng.phrakham.life/` = v1 เดิม ปลอดภัย ไม่กระเทือน** (stamp `3286a1f` = app v1 byte-identical + 2 CI ไฟล์ deploy.yml+sw.js) · DB เดียวกัน (Supabase · 170 เพลง verified ครบ)
- push แล้ว: `main` `5661068..3286a1f` (แค่ deploy.yml+sw.js) · `studio-shell-redesign` `e28c60d..132a041` (ship artifact) · FF ไม่ force · **ไม่รัน SQL เลย**
- ⛔ **อย่ารัน `reset-verified-false.sql`** (พลิก 170→0 ทั้ง 2 รุ่น) · deploy-prep runbook = `docs/deploy-v2-runbook.md`

### 🔵 คิว FOLLOW-UP (redeploy ทีละตัวขึ้น /v2 · 2-3 นาที/รอบ · P'Aim จับเวลา velocity)
**merge = PM · ทุก worker ping merge-ready → PM fast-forward studio-shell-redesign + push (Actions redeploy)**
| # | งาน | worker | สถานะ |
|---|---|---|---|
| SB1 | **แถบบนสะอาด** (ลบ share/⋮ ซ้ำ · แถบเดียว `‹ ชื่อ ↗ ⋮` · home-shell declutter) | `411913fd` | 🟢 **MERGE-READY `@55171ef`** (test 1429 · desktop ✓) = **redeploy #1** · รอ **P'Aim confirm มือถือ** ([:5321](http://192.168.1.124:5321/)) แล้ว PM merge+push · BI-001 อยู่ในนี้ |
| #4 lint | **ป้าย "ตรวจโน้ต" ในตัวแก้ inline** (✓เขียว/เหลือง+พาเนลปัญหา · reactive · แก้ wolf-cry pickup) | `a06948f3` | 🟢 **MERGE-READY `@2a972b8`** (test 1482 · SongViewer.vue · รวม item1-engine dormant harmless) = redeploy · แยก item4-ล้วนได้ถ้าอยาก |
| BI-002 | **เสียงค้าง: กด ✏️ ตอนเล่นเพลง แล้วหยุดไม่ได้** → เข้าโหมดแก้ให้ stop playback | `a06948f3` | 🔴🔴 **สถานะไม่ชัด — ถาม port-remaining แล้ว** (รายงาน lint ไม่พูดถึง BI-002 · สั่งให้ทำก่อน · PM 44 เช็กด่วน · P'Aim จับตา) |
| SB2 | ▶ Play hero + secondary→⋮ | `411913fd` | 🔴 **HOLD = P'Aim DECISION** (dock = P'Aim จูนเอง 13 ก.ค. + DockKey shared phrakham = regression risk · ⛔ ห้าม blind-restructure · ต้อง P'Aim sign-off) |
| #4 ต่อ | paste-syllable → repeat-markers UI (engine banked · spec `marker-entry-ui.md`@02cde29) | `a06948f3` | หลัง BI-002 · กำลังทำ paste |
| #5 | **header แก้ inline** (lead-sheet · 2 synced surface กับ ⚙ · design เสร็จ `docs/ds/song-header-inline-edit.md`) → build | design `534ea90d` done | รอ dispatch build |

**hot-file `SongViewer.vue`:** BI-002+#4 (`a06948f3`) กับ SB2 (`411913fd`) แชร์ → 2 สายประสาน region เอง (edit-toggle/lint vs reading-transport) · merge base ก่อน commit

### 🔴 รอ P'Aim เคาะ (ไม่บล็อก · ตามสะดวก)
1. 📱 **SB1 มือถือ** = แถวเดียวไหม (→ redeploy) + **logo มือถือ** เอาออก/คงไว้ (ทีมเอาออกตาม mockup · veto ได้)
2. 🔀 **topology swap: v2→root · v1→/v1 · ถอดป้าย ⇄** — plan เสร็จ `docs/deploy-v2-promote-plan.md` (deploy-prep `8294e63a`): **v2→root ง่ายมาก (ป้าย ⇄ หายเอง)** · งานจริง = v1→/v1: **Option B (แนะนำ ~15น · online ครบ · offline-PWA ไม่เป๊ะ · v1=fallback เลิกอยู่แล้ว)** vs A(~1ชม เป๊ะ) · `/v2/` links redirect ครบ · SW cache-bump · ~30-45น รวม · เสี่ยงกลาง-สูง(แตะ root คนใช้ทุกวัน) · rollback ~3น · **แนะทำหลัง top-bar สะอาด** · plan-ก่อน-execute · P'Aim go
3. 🐛 **bug-workflow ใหม่ (P'Aim เสนอ · PM เห็นด้วย):** per-bug = 1 session → วิเคราะห์+repro+สร้าง **GitHub issue** (evidence) → ping PM → PM จ่าย fix (session ไม่ fix เอง · search กันซ้ำก่อน) · **ต้องเช็ก: issues เปิด + token scope `aim-krisada/pleng.phrakham.life`** (`GITHUB_TOKEN_PHRAKHAM` ครอบไหม) → PM เสนอ set up template+เช็ก token

### 🧵 สาย support
- **bug-intake channel** `1290d01f` (idle · `docs/pm/bug-intake.md` BI-NNN · P'Aim ส่ง bug ผ่านช่องนี้ · batch ยกเว้น S1) — กำลังจะ evolve เป็น per-bug-session (ข้อ 3)
- **ai-bridge** `2cac6a71` — 🔴 **G automation พัง** (CDP driver/Python 3.14) → ประเมิน `enteam/ai-bridge` แทน (มี waiting-web แจ้ง P'Aim) · **อ่าน inbox `2026-07-24-ai-bridge-adopt.md`** · G consult ทุกสาย DEFER จนซ่อม
- **melody 100%** `df00094f` done รอบ 1 (worklist Tier1 11 เพลงจังหวะ · Tier2 16 เนื้อ · `2026-07-24-melody-correctness-audit.md`) → เส้นทาง 100% = `tools/pdf-melody-diff.mjs` จ่ายต่อได้
- **midbar repeat engine** `cf8a3d91` done `daa8c7f` (test 1386 · **merge HELD** · dormant จน marker-entry UI = #4-repeat ขึ้น) + glyph normalise `+id/+al/pair-by-kind` ตอน landing

### 🔴 หนี้ (ห้ามลืม)
**เพลง 33 คอร์ด `E7`→`E`** (พี่เปาแก้กลบบั๊กเสียงที่ปิดแล้ว) · `tools/restore-song33-chord-E.sql` (guard+rollback) — **รันเมื่อ P'Aim ย้ายคนไป /v2** (v2 มี fix pre-echo · แต่ / v1 ยังไม่มี → รันตอนนี้ = pre-echo กลับบน v1)

## ⭐⭐ ลำดับความสำคัญถาวร (P'Aim)
- **"สำคัญคือ UI และ engine ทำเพลง"** · **MusicScore/เมโลดี้ = SSOT ต้อง 100% · เสียง(timbre) ไม่ต้อง 100%** (piano ทองพอ · กีตาร์/ไวโอลิน/รวมวง = ได้แค่ไหนแค่นั้น)
- **ship-fast, fix-faster** · ขึ้นผิด=บั๊กแก้ทีหลัง · ⛔ เว้นกลุ่มเดียว = **ข้อมูลหายเงียบ+กู้ไม่ได้** (เกทเสมอ)

## ☑️ CHECKLIST ใบสั่งงานออกแบบ (บังคับ)
1. **คุย G ก่อนตัดสินใจออกแบบ** (ตอนนี้ G พัง → DEFER/ai-bridge · design-first บนมาตรฐาน+ดีไซน์ล็อกไปก่อน) · 2. เซฟ transcript → EVIDENCE · 3. ชื่อแชต `pleng-<หัวข้อ>-YYYY-MM-DD` · 4. ⛔ ไม่ขอตรายาง ตามต่อ 1-2 รอบ · **G เคย hallucinate ถอนคำ 2 ครั้ง → ตรวจเอง**

## กติกาถาวร
⛔ re-import/bulk-write 120 เพลง · ⛔ **merge = PM เท่านั้น** · ⛔ **main/deploy/SQL = P'Aim สั่ง go** · ⛔ SQL เพิ่มอย่างเดียว + guard/rollback · ⛔ ไม่แตะ server/browser P'Aim (:5480·Chrome 9222) · ⛔ **ไม่กั้น UI ด้วย `@media(hover)`** (เครื่อง P'Aim hover:none ทั้งที่มีเมาส์) · reuse engine · Vue3+Vite · **PM = จ่ายงาน+อ่านสรุป+gate · ไม่ code/ไม่ส่องโค้ดเอง** (§4.5)

## SSOT pointers
- **PM brain:** ไฟล์นี้ + `docs/pm/decisions-log.md` (มติ · deploy record ล่างสุด)
- **ดีไซน์ล็อก:** `work/ปรับ pl edit ui/ux-groundup-design.md` (one-surface + ✏️ + ▶ · context-B chrome)
- **รายงาน worker:** `C:\gl\pm-inbox\pleng\` · **ป้ายเรียก P'Aim:** `C:\gl\pm-inbox\_ขอความช่วยเหลือ\`
- **preview:** [:5321](http://192.168.1.124:5321/) (app · clever-einstein) · :5410/v2/ (artifact · deploy-prep) · IP บ้าน `192.168.1.124`
- **repeat/nav (future):** `docs/ds/repeat-jumps.md`+`marker-entry-ui.md` · engine spike `dc-ds-jumps@35769b1` (line-level · P'Aim เคาะ v1=รวม mid-bar)
