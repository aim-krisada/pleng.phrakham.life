# รายงาน Tester — B093 lint ก่อนเผยแพร่ (lint-before-publish)

**ตรวจโดย:** tester (`tester-qa`) · **ของ:** `lint-before-publish` `dbfbcfd` (EditorMode.vue+test · vitest 331) · **ping:** pm7
**วิธี:** vitest + **code review** (publish flow) · ⚠️ **live publish ต้อง approver login + เขียน DB → tester ทำไม่ได้** (นโยบายห้ามกรอกรหัส + ไม่เขียน DB จริง) → ยืนยันด้วย unit + โค้ด ตาม fallback ของ pm7

---

## VERDICT: ✅ ผ่าน (unit + code review · โดยเฉพาะ invariant "publish ไม่บล็อก") · live flow = P'Aim/approver

| เกณฑ์ | ยืนยันจาก | ผล |
|---|---|---|
| จังหวะไม่ครบ → ⚠️ saveMsg เตือน + `review_flags` มี `lint:beats` | code `saveDirect()` | ✅ `count>0` → `"⚠️ เผยแพร่แล้ว — แต่พบปัญหาโน้ต ${count} จุด (ติดป้ายไว้ให้ตรวจ)"` · `row.review_flags = flags` (มี `lint:beats`) |
| **ไม่บล็อก (publish ผ่าน · ok=true)** ⭐ | code | ✅ **`saveDirect` return `!error`** — lint มีผลแค่ message+flags · **ไม่กัน publish** · `approve()` key ที่ boolean ไม่ใช่ข้อความ (คอมเมนต์: "lint warning = published, else approve จะ abort") |
| เพลงสะอาด → เงียบ `✅ เผยแพร่แล้ว` ไม่มี flag | code | ✅ `count===0` → `'✅ เผยแพร่แล้ว'` · `lintFlags = []` |
| แก้ครบ → publish ซ้ำ → lint เก่าหลุด · DA flag คงอยู่ | code `reviewFlagsForPublish()` | ✅ `kept = flags.filter(f=>!f.startsWith('lint'))` (เก็บ DA) + `lint:*` ใหม่จาก pass นี้ (เก่าหลุด) |
| severity = ERROR + WARNING (จับ beats/สัญลักษณ์) | code `lintSong()` | ✅ นับทุก flag ที่ `severity !== HINT` (unreadable=ERROR · beats/R1/R4-R7=WARNING) |
| vitest | run | ✅ **331 passed** (notationLint.test.mjs "failed file" = `process.exit` quirk เดิม) |

---

## หลักฐานโค้ด (แกน "ไม่บล็อก")
```js
// saveDirect(): lint → tag flags + warn, but NEVER block publish
const { flags, count } = reviewFlagsForPublish()
row.review_flags = flags
... await supabase.from('songs').update/insert(row) ...
saveMsg = count>0 ? '⚠️ เผยแพร่แล้ว — …N จุด…' : '✅ เผยแพร่แล้ว'
return !error   // ← เฉพาะ DB error เท่านั้นที่บล็อก · lint ไม่บล็อก
// approve(): const ok = await saveDirect(); if(!ok) return;  // key boolean ไม่ใช่ message
```

## ขอบเขต / โปร่งใส
- **ผมตรวจ live publish จริงไม่ได้** — ต้อง approver login (กรอกรหัสผ่าน = นโยบายห้าม · ไม่มี credential) + เขียน DB จริง (ไม่ทำบน production) · ตาม fallback pm7 = ยืนยัน unit + code
- ตรรกะ "publish ไม่ค้าง/ไม่บล็อก" (สำคัญสุด) = **ยืนยันจากโครงสร้างโค้ด** (return !error · approve key boolean) — แน่นอนโดย construction
- `lint:beats` โชว์ raw ใน SongList = follow-up B087 (ไม่ใช่บั๊ก · ตามหมายเหตุ pm7)

## next
- pm7 → unit+code เขียว · **P'Aim/approver LAN: publish เพลงจังหวะไม่ครบ 1 เพลง ยืนยัน ⚠️ เตือน+ป้าย+ไม่ค้าง · เพลงสะอาด เงียบ · แก้แล้ว publish ซ้ำ flag เก่าหลุด**
