# G consult — session import-guard-2026-07-27

- when: 2026-07-27 09:20:37
- url: https://gemini.google.com/app/b5b10e9f929ca78e

## Q
ตรวจดีไซน์ SQL นี้แบบเชิงรุก หาจุดที่ข้อมูลยังหายเงียบได้ (Postgres 15 / Supabase SQL Editor, คนรันคือมนุษย์ที่ไม่รู้ SQL, นำเข้าเพลงทีละเพลง)

ปัญหาเดิม: เทมเพลตคือ `insert into public.songs (number,title_th,title_en,content) values (...) on conflict (number) do update set title_th=excluded.title_th, content=excluded.content;` = เลขชน -> ทับเนื้อเพลงที่คนอื่นแก้ไว้ เงียบ ไม่มี undo

ดีไซน์ใหม่ แยก 3 ขั้น:
STEP1 (read-only): select ... from public.songs where number = N;  แสดง เล่ม/เลข/ชื่อเดิม/updated_at/md5(content::text)
STEP2 (เพิ่มอย่างเดียว ทับไม่ได้) เป็น 2 statement ไม่ห่อ transaction เดียว:
 (a) CTE:
   with incoming (category,number,title_th,title_en,content) as (values ('anuchon',31,'ชื่อ',null::text,$json$...$json$::jsonb)),
   existing as (select i.number, i.title_th as ชื่อใหม่, s.title_th as ชื่อเดิม, s.updated_at,
                 (s.title_th is not distinct from i.title_th and s.content is not distinct from i.content) as เหมือนกันทุกอย่าง
                 from incoming i join public.songs s on s.category is not distinct from i.category and s.number=i.number),
   inserted as (insert into public.songs (category,number,title_th,title_en,content,verified,review_flags)
                select i.category,i.number,i.title_th,i.title_en,i.content,false,'["unverified-import"]'::jsonb
                from incoming i where not exists (select 1 from public.songs s where s.category is not distinct from i.category and s.number=i.number)
                returning number,title_th)
   select '✅ เข้าใหม่',... from inserted union all select case when เหมือนกันทุกอย่าง then '⏩ มีอยู่แล้ว' else '⛔ เลขชน — ไม่ได้เขียนทับ' end, ... from existing;
 (b) do $$ ... นับแถวที่ (category,number) ตรงกันแต่ title/content ต่าง -> raise exception '⛔ N เลขเพลงชน' ... $$;
STEP3 (ไฟล์แยกต่างหาก ทับโดยเจตนา): update ... where category=... and number=... and title_th='<ชื่อเดิมที่เห็นใน STEP1>' and md5(content::text)='<md5 ที่เห็นใน STEP1>'; get diagnostics hit=row_count; if hit<>1 then raise exception 'มีคนแก้หลังจากที่คุณดู' end if;  (ห่อ begin/commit)

คำถาม:
1. ยังมีทางไหนที่ข้อมูลเดิมหายเงียบได้อีก
2. STEP2 ไม่ห่อ transaction (เพลงใหม่เข้าไปแล้ว ส่วนที่ชนแค่ error) -- ดีหรือแย่กว่าห่อทั้งก้อนแล้ว rollback หมด
3. race condition ระหว่าง CTE existing กับ insert ใน statement เดียวกัน / ระหว่าง STEP1 กับ STEP3 -- ที่กันด้วย md5 fingerprint พอไหม เทียบกับใช้คอลัมน์ version
4. md5(content::text) บน jsonb -- เสถียรพอเป็น fingerprint ไหม (canonical order?) มีกรณีที่ค่าเท่ากันแต่ md5 ต่างไหม
5. ถ้าตาราง songs มี unique index บน number อย่างเดียว (ไม่ใช่ (category,number)) ดีไซน์นี้พังตรงไหน
ตอบสั้น ตรงประเด็น ชี้จุดพังเป็นข้อ ๆ

## A
นี่คือการวิเคราะห์จุดพังและข้อกังวลทางเทคนิคของดีไซน์ใหม่เรียงตามคำถาม:

1. ยังมีทางไหนที่ข้อมูลเดิมหายเงียบได้อีก

MD5 บน jsonb ไม่คงที่ (False Conflict / Drift): Postgres jsonb จัดเก็บข้อมูลแบบ Binary และเรียง Key ตามความยาว/ตัวอักษรก็จริง แต่หากมี whitespace/formatting ใน String ลูก หรือประเภทตัวเลข (เช่น 1.0 vs 1) อาจทำให้ Hash เปลี่ยนทั้งที่ข้อมูลเชิงตรรกะเหมือนเดิม

อัปเดตแบบ partial/NULL หายเงียบ: ใน STEP3 หากใช้ statement อัปเดตที่ส่งค่า title_en เป็น NULL เข้าไปทับข้อมูลเดิมที่มีอยู่ โดยที่คุณไม่ได้เช็ค MD5 หรือค่าเดิมของ title_en ใน WHERE clause ข้อมูลในคอลัมน์ title_en จะถูกเขียนทับด้วย NULL ทันที

2. STEP2 ไม่ห่อ Transaction (Partial Import) — ดีหรือแย่กว่า Rollback หมด?

แย่กว่าสำหรับผู้ใช้ที่ไม่รู้ SQL:

การรัน Script นำเข้าทีละหลายเพลงแล้วเกิด Partial Success (บางเพลงเข้า บางเพลง Error) จะทำให้ User สับสนว่าต้องแก้ไฟล์ SQL อย่างไรเพื่อนำเข้าส่วนที่เหลือ

ทางแก้ที่แนะนำ: ห่อ BEGIN...COMMIT ทั้งหมด เพื่อให้เป็น Atomic operation (ถ้ามีเพลงชน ให้ล้มเหลวทั้งหมดแล้วไปเคลียร์ข้อมูลก่อนนำเข้าใหม่)

3. Race Condition & Concurrency (MD5 vs Version Column)

race condition ใน CTE STEP2:

มีโอกาสเกิด Read-Write Race Condition ในระดับ Read Committed Transaction หากมีการนำเข้าพร้อมกัน 2 Session คำสั่ง INSERT ... WHERE NOT EXISTS อาจเห็นว่าไม่มีข้อมูลทั้งคู่ และพยายาม Insert พร้อมกัน จนโดน Unique Constraint Violate พังกลางทาง

MD5 vs version / updated_at ใน STEP3:

MD5 ไม่เพียงพอในเชิง Performance & Security: MD5 มีโอกาสเกิด Hash Collision (แม้จะน้อย) และต้องเสีย CPU ในการ Cast jsonb::text แล้วคำนวณ Hash ทุกครั้ง

ใช้ version (Integer) หรือ updated_at (Timestamp) ดีกว่ามาก: ใช้ WHERE category = ... AND number = ... AND updated_at = 'STEP1_timestamp' แล้วสั่ง UPDATE ... RETURNING id หาก row_count = 0 ให้ RAISE EXCEPTION ชัดเจนกว่าและทำงานเร็วกว่า

4. md5(content::text) บน jsonb เสถียรพอไหม?

ไม่เสถียร 100%:

แม้ jsonb จะจัดระเบียบ Key ชั้นนอกสุดให้ แต่ถ้า content มี Nested JSON, Array ที่สลับ Order, หรือการใช้ Escaped Characters / Unicode ต่างกัน การ Cast เป็น text จะได้ String ที่ไม่เหมือนกัน ทำให้ MD5 ต่างกัน ทั้งที่โครงสร้าง JSON เดียวกัน

ทางออก: ใช้ jsonb_canonical_function หรือเปลี่ยนไปใช้ Optimistic Locking ผ่านคอลัมน์ version (Auto-increment integer) หรือ updated_at แทน

5. ถ้าระบบมี Unique Index แค่ (number) ไม่ใช่ (category, number) ดีไซน์นี้พังตรงไหน?

พังตั้งแต่ STEP2 (a):

ถ้าใน DB มีเพลง category='general', number=31 อยู่แล้ว

แล้วคุณนำเข้า category='anuchon', number=31

ตัว INSERT ... WHERE NOT EXISTS ใน CTE จะเช็คแค่ s.category is not distinct from i.category ซึ่งมองว่าเป็นคนละหมวดหมู่ จึงพยายามสั่ง INSERT

ผลลัพธ์: โดน Postgres ล็อคด้วย Unique Violation Exception (number) ทันที ทำให้ Query ใน STEP2 ล้มเหลวและทำงานไม่สมบูรณ์

ข้อเสนอแนะเชิงรุกสรุปสั้น

เพิ่ม Composite Unique Constraint: เปลี่ยน Constraint ใน DB ให้เป็น UNIQUE (category, number) เพื่อรองรับ Schema

ใช้ Optimistic Concurrency Control (OCC): เพิ่มคอลัมน์ version INT DEFAULT 1 ในตาราง songs แทนการใช้ MD5 Hash

ห่อ STEP2 ใน Transaction เดียวกัน: ป้องกันภาวะ Partial Import ให้รันแบบ All-or-Nothing เพื่อไม่ให้คนที่ไม่รู้ SQL สับสน

What would you like to do next?
ออกแบบโครงสร้าง SQL STEP2 ใหม่แบบ Atomic Transaction
สร้าง Migration Script สำหรับคอลัมน์ version และ Constraint
เขียนคำสั่ง STEP3 ใหม่โดยใช้ Optimistic Locking แทน MD5

---

## ตรวจซ้ำที่ source เอง (ไม่ได้เชื่อ G ตรง ๆ) — 27 ก.ค.

รันจริงบน Postgres (pglite) เพื่อพิสูจน์ข้อ 4 ของ G ("md5(content::text) ไม่เสถียร"):

| ที่ G อ้าง | ผลจริง | สรุป |
|---|---|---|
| key order สลับ → text ต่าง | `'{"b":1,"a":2}'::jsonb::text` = `'{ "a" : 2 , "b":1 }'::jsonb::text` → **true** | ❌ G ผิด — jsonb normalize ให้ |
| nested key order → text ต่าง | true | ❌ G ผิด |
| whitespace/format → text ต่าง | true | ❌ G ผิด |
| unicode escape (`\u0e01` vs `ก`) → text ต่าง | true | ❌ G ผิด |
| array order สลับ → "ค่าเท่ากันแต่ hash ต่าง" | `'[1,2]'::jsonb = '[2,1]'::jsonb` → **false** | ❌ G ผิด — เป็นคนละค่าจริง ๆ |
| ตัวเลข `1` vs `1.0` | `=` → **true** แต่ `::text` → **false** | ✅ **G ถูกข้อนี้ข้อเดียว** |

**ผลต่อดีไซน์:** เคส `1` vs `1.0` ทำให้ fingerprint ไม่ตรง = สคริปต์ **ปฏิเสธไม่ยอมทับ** —
เอียงไปทาง fail-safe เสมอ ไม่มีทางทำให้ข้อมูลหาย จึงเก็บ md5 ไว้ได้ (คอลัมน์ `version` ที่ G เชียร์
ยังไม่มีในฐานข้อมูลจริง — `docs/ds/multi-editor-safety.md` §3.1 วางแผนไว้แต่ยังไม่ได้รัน)

**ข้อที่รับมาจาก G เพราะถูกจริง:**
1. **ข้อ 1b — `title_en` หายเงียบ**: WHERE ที่เช็คแค่ content ทำให้ update เขียน `null` ทับชื่ออังกฤษเดิมได้
   → เปลี่ยน fingerprint เป็น md5 ของ `title_th + title_en + content` รวมกัน
2. **ข้อ 2 — ห่อ STEP 2 ใน transaction เดียว**: all-or-nothing เข้าใจง่ายกว่าสำหรับคนไม่รู้ SQL
   → ห่อ `begin/commit` แล้วให้ข้อความ error บอก **เลข + ชื่อเพลงที่ชน** (ไม่ใช่แค่จำนวน) เพราะ
     ตอน rollback ตารางผลจะไม่ถูกแสดง
3. **ข้อ 5 — unique index บน `number` อย่างเดียว**: STEP 1 ค้นทุกเล่ม (`where number = N`) และติดป้าย
   "เลขนี้ถูกใช้ในเล่มอื่น" อยู่แล้ว → เจอก่อนตั้งแต่ขั้นดู ไม่ใช่ไปตายตอน insert

**ข้อที่ไม่รับ:** MD5 collision / performance (ข้อ 3) — 1 แถวต่อครั้ง ไม่มีศัตรู ไม่ใช่ประเด็น ·
เพิ่มคอลัมน์ `version` + เปลี่ยน constraint = migration ที่ยังไม่ได้อนุมัติ อยู่นอกงานนี้
