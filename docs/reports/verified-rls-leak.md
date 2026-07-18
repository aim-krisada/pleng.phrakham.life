# SA DS/report — verified GATE ไม่มี RLS (anon อ่านเพลงยังไม่ตรวจได้บน live)

**ประเภท:** SA design + security fix · **⛔ SQL เตรียมพร้อม แต่ยังไม่ให้ PO run จน P'Aim เคาะจังหวะ** (เปิดแล้วเพลง public หายทันที — ดู §4)
**ยึด:** ISO/IEC 27001 A.9 (access control) · Supabase RLS · บทเรียน recycle-bin (`songs_live` — กันที่ชั้นโครงสร้าง ไม่หวังทุก caller จำ)
**SQL พร้อมรัน:** `db/005-verified-read-rls.sql` (P1 · ใบนี้) · `db/006-author-id-fix.sql` (เข้าคิวหลัง RLS)
**verify:** วัด production ด้วย anon key จริง 2026-07-17 (ไม่เดา)

---

## 0 · สรุป 30 วิ

| | |
|---|---|
| **รั่วจริงไหม** | ✅ **จริง — พิสูจน์ด้วย anon key บน live**: anon ดึง `songs` ได้ **126 rows = verified 32 + unverified 94** · และเปิดเนื้อเพลงยังไม่ตรวจเจาะจงด้วย id ได้ (deep-link รั่ว) |
| **รั่วที่ไหน** | **ชั้น RLS**: `songs` มี SELECT policy เปิดกว้าง (`using (true)`) · gate "เห็นเฉพาะ verified" อยู่**ใน client เท่านั้น** (`bookshelf.js visibleSongs`) = ข้อมูลข้ามสายไปแล้ว เบราว์เซอร์ค่อยซ่อน → เปิด Network tab / ยิง REST ตรงก็เห็น |
| **surface** | **`songs` SELECT อย่างเดียว** · `song_drafts`/`song_revisions`/`profiles` RLS รัด anon อยู่แล้ว · PWA/SW ไม่ cache API (same-origin เท่านั้น) → ไม่ใช่ช่องรั่ว |
| **fix** | RLS policy 1 จุด: **anon เห็นเฉพาะ `verified=true` · authenticated เห็นทั้งหมด** — โปร่งใสต่อ caller **แก้ 0 บรรทัดใน `src/`** |
| **ผลตอนเปิด** | 🔴 **user-visible**: เพลง public เหลือ **verified-only (วันนี้ 32)** · unverified 94 หายจากเว็บสาธารณะจนทีมทยอยกด ✓ ตรวจแล้ว → **P'Aim เคาะจังหวะ** |

---

## 1 · หลักฐานสด (anon key production · 2026-07-17)

```
GET /rest/v1/songs?select=id,verified   (apikey = publishable key ใน src/supabase.js)
→ 126 rows: verified=true 32 · verified=false/null 94   ← 94 รั่วถึง anon
GET /rest/v1/songs?id=eq.<unverified-id> → คืน title_th + content เพลงยังไม่ตรวจเต็ม ๆ
```
**client gate เป็นแค่การซ่อนหน้าจอ ไม่ใช่ความปลอดภัย** — publishable key เปิดเผยในบันเดิล ใครก็ยิง REST ตรงได้ → **RLS คือสิ่งเดียวที่กันได้จริง**

---

## 2 · leak-hunt — ทุกจุดที่อ่าน `songs` (ยืนยันครบ)

| จุดอ่าน | ไฟล์:บรรทัด | anon รั่วไหมวันนี้ | RLS §3 ครอบไหม |
|---|---|---|---|
| catalog list | `SongList.vue:110` | ✅ รั่ว (คืน unverified) | ✅ |
| open by id | `Studio.vue:43` · `EditorMode.vue:1120` | ✅ รั่ว (deep-link) | ✅ (คืน 0 row → not found) |
| picker | `Studio.vue:202` · `EditorMode.vue:1098` | ✅ รั่ว | ✅ |
| loadSongList | `EditorMode.vue:1513` | ✅ รั่ว | ✅ |
| write (insert/update/delete/verify toggle) | `EditorMode.vue:1364/1367/1474/1493` | ไม่ (approver-only RLS จาก 002) | n/a |
| **`song_drafts`** ทุกจุด | `EditorMode.vue:1206…` | ไม่ (RLS: own/approver · anon ไม่มี uid) | มีแล้ว |
| **`song_revisions`** | audit | ไม่ (RLS: authenticated) | มีแล้ว |
| **`profiles`** | `EditorMode.vue:1197` · `store.js` | ไม่ (RLS: authenticated) | มีแล้ว |
| **PWA / SW cache** | `public/sw.js` | ไม่ — cache เฉพาะ same-origin (shell+samples) · supabase = cross-origin ไม่ถูก intercept | n/a |
| print / MP3 / JSON export | client-side | ไม่ query เอง (ทำงานบน data ที่โหลดมาแล้ว) | ครอบผ่านจุดโหลด |

> **สรุป leak-hunt:** ช่องรั่วเดียว = **`songs` SELECT**. RLS policy จุดเดียวปิดครบทุก path เพราะทุก caller วิ่งผ่านตารางเดียว/anon key เดียว (นี่คือเหตุผลที่แก้ที่ RLS ดีกว่าไล่แก้ทุก caller — บทเรียน recycle-bin).

---

## 3 · การออกแบบ fix (RLS · แก้ 0 บรรทัดใน `src/`)

**หลัก:** Postgres รวม policy แบบ permissive ด้วย OR → วาง 2 SELECT policy:
- anon + ทุกคน: เห็นเฉพาะ `verified = true` (null → ไม่ผ่าน = ซ่อน ✓)
- authenticated (ทีม): เห็นทุก row (ไว้ review/แก้เพลงยังไม่ตรวจ)

→ `verified=false` + anon = ไม่เข้าเงื่อนไขไหน = ซ่อน · ทีมล็อกอิน = เห็นครบ. **ตรง mission Tier: public เห็นเฉพาะที่อนุมัติ · ทีมเห็นหมด.**

SQL เต็ม (name-independent · idempotent · มี rollback) = **`db/005-verified-read-rls.sql`** — สรุปแกน:
```sql
alter table public.songs enable row level security;          -- idempotent
-- ลบ SELECT policy เดิมทุกชื่อ (เดิมชื่ออะไรไม่รู้ ก่อน 002) แบบไม่ต้องเดาชื่อ
do $$ declare p record; begin
  for p in select policyname from pg_policies
           where schemaname='public' and tablename='songs' and cmd='SELECT'
  loop execute format('drop policy %I on public.songs', p.policyname); end loop;
end $$;
create policy "Public reads verified songs" on public.songs
  for select using (verified = true);                          -- anon + ทุกคน
create policy "Authenticated reads all songs" on public.songs
  for select using (auth.role() = 'authenticated');            -- ทีม เห็นหมด
```

**client:** ไม่ต้องแก้ — `bookshelf.js visibleSongs` (`loggedIn ? list : list.filter(verified)`) กลายเป็น redundant-but-harmless (anon ไม่ได้รับ unverified อยู่แล้ว) → **คงไว้เป็น defense-in-depth อย่าลบ**.

---

## 4 · 🔴 ผลตอนเปิด + จังหวะ (P'Aim เคาะ — ห้าม auto)

เปิด RLS = anon หยุดเห็น unverified ทันที → **เว็บ public เหลือ verified-only**:

| | วัดสด 2026-07-17 | ต้องนับซ้ำ ณ วันเปิด (dynamic — ทีมทยอยกด ✓) |
|---|---|---|
| public เห็นตอนนี้ | 126 | — |
| หลังเปิด public เห็น | **32 (verified)** | รัน `select count(*) from songs where verified` ก่อนเปิด |
| หายจากเว็บ public | **94 (unverified)** | จนทีมกด ✓ ครบ (`docs/pm/review-anuchon.md`) |

**นี่ผูกกับ workflow ตรวจเพลง** → PM ถาม P'Aim เลือกจังหวะ:
- **ก. เปิดเลย** — ปลอดภัยสุด แต่เว็บเหลือ 32 เพลงทันที (ยอมแลกความปลอดภัย)
- **ข. เร่งตรวจ batch ก่อน** แล้วเปิดเมื่อ verified ถึงระดับที่รับได้
- **ค. เปิดพร้อม deploy รอบที่สื่อสารทีมแล้ว**

**rollback (ถ้าเปิดแล้วอยากถอย):** อยู่ท้าย `db/005` — ลบ 2 policy ใหม่ แล้ว `create policy ... for select using (true)` คืนสภาพเดิมทันที (ไม่กระทบข้อมูล แค่ visibility).

**follow-up verify หลังเปิด (ไม่บล็อก):** anon deep-link ไปเพลงยังไม่ตรวจ (`/#/song/:id`) จะได้ 0 row → `.single()` error → ต้องเช็ก SongView/Studio โชว์ "ไม่พบเพลง" สวย ๆ ไม่ใช่จอพัง (anon ไม่ควรมีลิงก์พวกนี้อยู่แล้ว · ตรวจตอน build)

---

## 4.5 · "เร่งตรวจ batch ก่อนเปิด" (P'Aim เลือก ข.) — งานเร็วหรือช้า? (นับสด anon 2026-07-18)

**คำถาม PM:** ใน 94 เพลง unverified — สมบูรณ์พอตรวจกี่เพลง · ร่างจริงกี่เพลง · ถ้ากด ✓ เฉพาะสมบูรณ์ public เหลือกี่เพลง → บอกว่า "เร่งตรวจ" เร็ว/ช้า.

**วิธีวัด (ไม่เดา · ใช้ฟังก์ชันจริงของแอป):** ดึง content ทั้ง 126 เพลงด้วย anon key → จำแนกด้วยเกณฑ์ `rowStatus.ok` ของ editor เอง (`attackSlots` จาก `src/lib/notation.js`): เพลง "ลงพอดี" = ทุกท่อน **จำนวนพยางค์ที่เติม = จำนวนโน้ต attack** · วัดความรุนแรง = ผลรวม |พยางค์−โน้ต| ทุกท่อน/เพลง.

| กลุ่ม (deficit รวม/เพลง) | จำนวน | ความหมาย |
|---|---|---|
| **clean = 0** | **22** | ทำนอง+เนื้อครบเป๊ะทุกท่อน → **พร้อมกด ✓ เลย** (แค่รอคนตรวจ) |
| **tiny = 1–2** | **11** | ต่าง 1–2 พยางค์ → แก้แป๊บเดียวแล้ว ✓ |
| **moderate = 3–8** | **28** | พอมีงานจัดพยางค์ |
| **heavy > 8** | **33** | ร่างจริง งานเยอะ (บางเพลงต่าง 99/159 = seed ยังไม่จัด) |
| **ขาดทำนอง/ไม่มีเนื้อเลย** | **0** | — ทุกเพลงมีทั้งทำนอง+เนื้อ (ไม่มีเพลงว่างเปล่า) |

**public เหลือกี่เพลงตามเกณฑ์ (verified วันนี้ = 32):**
- กด ✓ เฉพาะ **clean(22)** → **54**
- กด ✓ **clean+tiny(33 · แก้ ≤2 จุด)** → **65**  ⬅️ SA แนะนำเป็นเป้า batch แรก (win เร็ว effort ต่ำ)
- กด ✓ +moderate → **93**

**ฟันธง SA — "เร่งตรวจ" = งานเร็วสำหรับ batch แรก ไม่ block:** 22 เพลงกดได้เลย · +11 แก้เล็กน้อย → **เปิด RLS ได้เร็วด้วย public ≈ 54–65** (จาก 32) โดยไม่ต้องรอครบ · ที่เหลือ **61 (moderate+heavy)** = backlog พี่เปาทยอยทำ (โดยเฉพาะ 33 heavy). แผนแนะนำ: ตรวจ clean+tiny → เปิด RLS (public ~65) → ทีมทยอยตรวจ moderate/heavy ต่อ (RLS ปิดรูรั่วแล้ว เพลงโผล่เพิ่มเองเมื่อกด ✓).

**⚠️ ขอบเขตของตัวเลข (ซื่อสัตย์):** เกณฑ์นี้เช็กแค่ **พยางค์ตรงโน้ตไหม (โครงสร้าง)** — **ไม่ได้ตรวจ** ว่าโน้ต/ทำนองถูก · เส้นเอื้อนถูก (board: ~45 เพลงเดาเอื้อน) · คอร์ดถูก · เนื้อเป็นคำที่ถูก. "clean 22" = **ผู้สมัครที่ไม่มีช่องโหว่โครงสร้าง** ไม่ใช่ "ตรวจผ่านแล้ว" — **คนยังต้องดูด้วยตา** (พี่เปา) ก่อนกด ✓ จริง · ตัวเลขนี้ = พื้น (floor) ของงานที่เหลือ ไม่ใช่คำตัดสินคุณภาพ.

---

## 5 · Appendix — `author_id` ผิดคน (migration แยก · เข้าคิวหลัง RLS)

**ยืนยัน root cause ใน SQL จริง** (`db/004` `approve_and_publish`): ตอน insert เพลงใหม่ใช้
```sql
insert into public.songs (..., author_id) values (..., auth.uid())   -- ← uid ของ APPROVER
```
ควรเป็น `d.author_id` (คนเขียน draft). กระทบทุกเพลงที่อนุมัติผ่าน RPC = เครดิต/ประวัติผิดถาวร.
**fix พร้อมใน `db/006-author-id-fix.sql`** (replace ฟังก์ชัน `approve_and_publish` เปลี่ยน `auth.uid()`→`d.author_id` ในกิ่ง insert · ไม่แตะ update). **⛔ queue — รันหลัง 005 + PM go.**

**🔎 verify เพิ่ม (18 ก.ค.): บั๊กนี้ latent — `songs.author_id` ไม่มีใครอ่านในแอปเลย.** แอปอ่าน `song_drafts.author_id` (ตัวกรอง "ร่างของฉัน" + ป้ายคนเขียนร่าง) และประวัติที่โชว์จริง = `song_revisions.actor_name` (snapshot ต่อ event · ถูกอยู่แล้ว) · **ไม่มีจุดไหนอ่าน `songs.author_id`** → เป็น **data-integrity/future-proofing ไม่ใช่ user-visible** → **queue ต่ำถูกต้อง**.

**back-fill เพลงเก่า = `db/007-author-id-backfill.sql` (⛔ opt-in · รันหลัง 006 · ถ้า P'Aim อยากแก้ย้อนหลัง):**
- **recovery source = `song_drafts.author_id`** (draft ยัง link `song_id` · author_id คนเขียน ไม่เคยถูกเขียนทับ) → `UPDATE songs SET author_id = draft.author_id WHERE draft.song_id = songs.id AND ต่างจริง`
- เพลง **นำเข้าตรง (ไม่มี draft — 120 YS/hymnal)** = ไม่มี "คนเขียน" ให้ย้อน → **คงเดิม ไม่ null** (ซื่อสัตย์ต่อข้อมูล)
- มี **pre-flight count** วัด blast radius ก่อนรัน · แตะเฉพาะแถวที่ผิดจริง (min churn) · **ไม่ปิด audit trigger** (ISO 27001 A.12.4 · จะ log `edit_published` ต่อแถว = โปร่งใส ตั้งใจ)

---

## 6 · ที่ SA ไม่ตัดสินแทน — รอ PM/P'Aim

1. **จังหวะเปิด RLS** (ก/ข/ค §4) = P'Aim เคาะ (user-visible + ผูก workflow ตรวจ)
2. **author_id back-fill** เพลงเก่า — ย้อนจาก audit ได้ไหม/คุ้มไหม = ออกแบบต่อเมื่อ PM สั่ง
3. **SQL รันโดย PO** — ผมเตรียมพร้อม ไม่รันเอง (SA docs/design only)

---

*วัด production จริง 2026-07-17 · SA (design + security) · ฐาน `studio-shell-redesign`*
