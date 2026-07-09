# Song data samples (offline snapshot)

ตัวอย่างข้อมูลเพลงจากคลังจริง (Supabase) สำหรับ **session ที่ต่อ Supabase ตรงไม่ได้** (เช่น Claude Code Android) — อ่านจากไฟล์นี้แทน query DB

**Snapshot จาก live Supabase · 2026-07-10** (read-only) · SSOT จริง = Supabase (live) / git tracks code · ไฟล์นี้ = ก็อปนิ่งไว้ทำงาน offline อย่าถือเป็นของจริงล่าสุด

## ไฟล์
| ไฟล์ | คือ |
|---|---|
| `song-001.json` | เพลง 1 "พระเจ้าเป็นความรัก" (กิตติคุณ) — ตัวอย่างเรียบ |
| `song-077.json` | เพลง 77 "พระคริสต์จะได้อาณาจักร" (อาณาจักร) — v2 หลาย stanza + ท่อนรับซ้ำ (โครงสร้างครบ) |
| `song-100.json` | เพลง 100 "ขอสรรเสริญพระเจ้าโดยไม่หยุดยั้ง" — **เพลงอ้างอิงงานเส้นเอื้อน B062/B068** (ต้นฉบับมี slur · ภาพ `docs/backlog-assets/B062-slur-curve-correct.jpg`) |
| `songs-index.json` | **ทั้ง 121 เพลง** (ไม่รวม `content`) — number/title/category/theme/verified/book_refs/review_flags/scripture = แคตตาล็อกครบ offline |

## Schema (เฉพาะฟิลด์ที่ export — ตัดฟิลด์ระบบ/ตัวตนออก)
`number` · `title_th` · `title_en` · `content` (jsonb — ดูล่าง) · `category` (เช่น anuchon) · `verified` (bool) · `theme` · `book_refs` (jsonb) · `scripture` · `review_flags` (jsonb · codes `repeat`/`lint`/`words` — 41 เพลงติดธง)

> **ตัดออกโดยตั้งใจ (ไม่ publish):** `id`/`author_id`/`created_at`/`updated_at` (ฟิลด์ระบบ DB · ไม่ใช้ในงานหน้าจอ) · ไม่มี key/URL/token ของ Supabase ในไฟล์ชุดนี้

## `content` jsonb — v2 model (ทั้ง 3 ตัวอย่าง = v2)
```
{
  "version": 2, "key": "...", "timeSignature": "...",
  "stanzas":   [ { "id":"A", "lines":[ [ {note,type:"segment",chord}, {type:"bar"}, ... ] ] } ],  // ทำนอง (โน้ต) ครั้งเดียว
  "arrangement":[ { "stanza":"A", "label":"ร้อง 1", "syllables":[...] } ]                          // ลำดับร้อง + เนื้อ (1 พยางค์/โน้ตมีพยางค์)
}
```
- **โน้ตตัวเลข = `content.stanzas[].lines[][].note`** (segment) · `{type:"bar"}` = เส้นห้อง
- **เส้นเอื้อน (B068):** จะ encode `( )` (slur) / `~` (tie) เพิ่มใน `note` ตรงนี้ — ตอนนี้ **0/120 มี** (arc กลายเป็น `-` ตอน import) · ดู `docs/pm/brief-b068-encode-ties.md`
- v1 เก่า = `content.lines[]` แบน (ตัวอย่างชุดนี้ไม่มี v1)
- ไวยากรณ์โน้ตเต็ม: หัวไฟล์ `src/lib/notation.js` · โมเดล: `docs/song-model-v2.md`
