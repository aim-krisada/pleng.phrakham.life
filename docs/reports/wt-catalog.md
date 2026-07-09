# report — catalog + review UI (B053 + B054) · `wt-catalog`

**branch:** `wt-catalog` (ฐาน `studio-shell-redesign` @ `3d6f607`) · **port:** 5370 (`--host`)
**LAN:** `http://192.168.1.124:5370/` (P'Aim/พี่เปา ทดสอบบนมือถือ)
**ไฟล์ที่แตะ:** `src/views/SongList.vue` · `src/components/EditorMode.vue` เท่านั้น
**ไม่แตะ:** `songSearch.js` (สาย B058) · `store.js`/`supabase.js` (ไม่ต้องแก้)

## ทำอะไรไปบ้าง (3 ส่วนตาม brief)

### 1. หน้ารายการ `SongList.vue` — filter + ป้าย ✅
- **select เพิ่ม field:** `theme, verified, book_refs` (จากเดิม `id,number,title_th,title_en,content`)
- **filter "เฉพาะที่ยังไม่ตรวจ"** (ปุ่ม chip · `verified=false`) — วางบน `filterSongs()` ของ songSearch (ไม่แตะไฟล์นั้น)
- **filter ธีม** (dropdown) — ตัวเลือกดึงจากธีมจริงในฐาน (distinct + sort ไทย) ไม่ hardcode → 8 ธีมโผล่ครบ (กิตติคุณ/คริสตจักร/รักปรารถนา/ประสบการณ์/พระคัมภีร์/อาณาจักร/มอบถวาย/ความสุขแห่งความรอด)
- **ป้าย ✓ ตรวจแล้ว** บนการ์ด `verified=true`
- **ป้าย ⚠️ ต้องตรวจ** อ่านจาก `s.review_flags` (array) — **DA ยังไม่ได้เก็บ field นี้** → ตอนนี้ป้ายไม่โผล่ (guard `Array.isArray`) · **wire อัตโนมัติเมื่อ DA ลง column** (ต้องเพิ่ม `review_flags` ใน select ด้วย 1 บรรทัด · ดู §ค้าง)
- **ป้ายธีม** เล็กๆ ใต้การ์ด + ตัวนับจำนวนเพลง

### 2. หน้าแก้ไข `EditorMode.vue` — ปุ่ม "ตรวจแล้ว" ✅
- ในเมนู **"จัดการ"** เพิ่มปุ่ม toggle **"ทำเครื่องหมายว่าตรวจแล้ว ✓" / "ยกเลิกเครื่องหมายตรวจแล้ว"** (โชว์เมื่อ `login + มีเพลงเปิดอยู่`)
- เขียน `songs.verified` ตรง (ตาม RLS) · โหลดสถานะ verified ตอนเปิดเพลง (`applyRow`)

### 3. warning ในหน้าแก้ไข — ไม่ต้องทำเพิ่ม (มีอยู่แล้ว จาก notationLint/B055) · หน้ารายการชี้เพลงที่ต้องเปิดด้วยป้าย ⚠️ (รอ field)

## ⚠️ เรื่องต้องให้ PM/P'Aim เคาะ (สำคัญ)

### A. สิทธิ์เขียน `verified` = **approver เท่านั้น** (ไม่ใช่ "team write" ทั่วไป)
- RLS จริง (`db/002-draft-review-system.sql`): `"Approvers can update songs" for update using (app_role() = 'approver')`
- **แปลว่า editor ที่ login แต่ไม่ใช่ approver กดปุ่มตรวจแล้ว = เขียนไม่ติด** (PostgREST คืน 0 แถว เงียบๆ)
- **แก้ให้ซื่อสัตย์:** ปุ่ม `.select()` เช็คแถวที่คืนมา — ถ้า 0 แถว โชว์ **"🔒 ต้องเป็นผู้อนุมัติ (approver) หรือขอสิทธิ์จากทีม"** (ไม่หลอกว่าสำเร็จ)
- **ถาม P'Aim:** พี่เปา (คนรีวิว) login เป็น **approver** หรือ **editor**?
  - ถ้า **approver** → ใช้ได้เลย ไม่ต้องทำอะไรเพิ่ม
  - ถ้า **editor** → ต้องเปิดสิทธิ์ให้ editor เซ็น verified ได้ · แนะ **RPC security-definer** (แบบเดียวกับ `update_my_display_name` ใน db/003) — SQL พร้อมรันด้านล่าง (P'Aim run เอง · DA/dev เขียน DB ไม่ได้)

```sql
-- db/004 (ถ้าต้องการให้ editor เซ็น verified ได้ · P'Aim run)
create or replace function public.set_song_verified(song_id uuid, val boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() is null then
    raise exception 'must be a team member';
  end if;
  update public.songs set verified = val where id = song_id;
end $$;
revoke all on function public.set_song_verified(uuid, boolean) from public;
grant execute on function public.set_song_verified(uuid, boolean) to authenticated;
```
(ถ้ารับทางนี้ dev เปลี่ยน `toggleVerified` ให้เรียก `supabase.rpc('set_song_verified', …)` แทน update ตรง — งานเล็ก รอ P'Aim เคาะก่อน)

### B. ป้าย ⚠️ รอ field `review_flags` จาก DA
- ตอนนี้ filter/toggle/ป้าย ✓ ครบ · ป้าย ⚠️ code พร้อม แต่ยังไม่มีข้อมูล → ไม่โผล่ (ตาม brief "ทำ filter/toggle ก่อน · wire ป้ายทีหลัง")
- **พอ DA ลง `review_flags` (array):** เพิ่ม `review_flags` ในบรรทัด `.select(...)` ของ `SongList.vue` → ป้ายโผล่เอง (มี `flagCount()` รออยู่)

## Verify

- **build เขียว** (`npm run build` ✅)
- **unit เขียว** — `vitest run --exclude .claude/** = 196 passed` (1 failed suite = `notationLint.test.mjs` `process.exit` **ของเดิมบนฐาน** ไม่เกี่ยวงานนี้)
- **เบราว์เซอร์จริง (127.0.0.1:5370 · Supabase live 121 เพลง):**
  - โหลด 121 เพลง · 8 ธีม + "ทุกธีม" ครบ · console error 0
  - filter "ยังไม่ตรวจ" → 121 (ทุกเพลง verified=false ตอนนี้) · aria-pressed สลับถูก
  - filter ธีม "อาณาจักร" → 11 เพลง (ตรงกับฐาน) · reset → 121
  - compose search + facet ทำงาน (filterSongs + facet layered)
  - `/studio` โหลด เมนู "จัดการ" อยู่ครบ · ไม่มี console error
- **RLS:** ยิง PATCH ด้วย anon key → 0 แถว (verified คง false) = RLS กันจริง ✅
- **ยังไม่ได้ e2e ปุ่มตรวจแล้ว→verified ในฐาน** — ต้อง login ทีม (approver) ซึ่ง session นี้ไม่มี credential → **ให้ P'Aim/พี่เปา accept บน LAN** (มาตรฐาน verify-fallback ของโปรเจกต์)

## ค้าง / ส่งต่อ
1. P'Aim เคาะ §A (พี่เปา = approver? หรือเปิด RPC ให้ editor)
2. DA ลง `review_flags` → dev เพิ่ม 1 บรรทัดใน select (§B)
3. ห้าม merge main/deploy — รอ PM
