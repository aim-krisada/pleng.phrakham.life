-- คืนคอร์ดต้นฉบับของเพลง 33 "ข้าจะถวายสิ่งใดดี"  —  E7 → E
--
-- ⛔ ห้ามรันก่อนที่บั๊ก pre-echo จะปิดและถูก merge ขึ้น production แล้ว
--    (E7 คือสิ่งที่พี่เปาใส่ไว้เพื่อกลบบั๊ก · ถ้าคืน E ก่อน อาการจะกลับมาให้ผู้ใช้เจอทันที)
--    ดู docs/reports/preecho-fix.md · แก้ที่ src/lib/arranger/referee.js
--
-- ทำไมต้องคืน: พี่เอมยืนยันว่า **ต้นฉบับคือ E** · E7 ทำให้แผ่นเพลงไม่ตรงต้นฉบับ
-- ขอบเขต: เพลงเดียว · คอร์ดเดียว (stanza 'A' · บรรทัดแรก · segment ตัวสุดท้าย) · ห้าม bulk
--
-- รันแบบไหน: paste ทั้งไฟล์ลง Supabase SQL editor แล้วกด Run  (ทุกอย่างอยู่ใน transaction เดียว
-- และมี guard — ถ้าค่าปัจจุบันไม่ใช่ 'E7' มันจะ ROLLBACK เองพร้อมข้อความ ไม่แตะข้อมูล)

BEGIN;

-- 0) จดค่าปัจจุบันไว้ก่อน (เผื่อ rollback ด้วยมือทีหลัง)
SELECT id, number, title_th,
       content #>> '{stanzas,0,lines,0,14,chord}' AS chord_now,
       content #>> '{stanzas,0,lines,0,14,note}'  AS note_now
FROM songs
WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889';
-- คาดหวัง: chord_now = 'E7'  ·  note_now = '~5 - 0'

-- 1) GUARD — หยุดเองถ้าของจริงไม่ตรงกับที่เข้าใจ (บ้านเราเจอ "รีโปไม่ตรงกับของจริง" มาแล้ว)
DO $$
DECLARE c text; n text; ok boolean;
BEGIN
  SELECT content #>> '{stanzas,0,lines,0,14,chord}',
         content #>> '{stanzas,0,lines,0,14,note}',
         (content #>> '{stanzas,0,id}') = 'A'
    INTO c, n, ok
  FROM songs WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889';

  IF c IS NULL THEN
    RAISE EXCEPTION 'STOP: ไม่พบเพลง 33 หรือโครงสร้าง content เปลี่ยนไป (path stanzas.0.lines.0.14 ไม่มีคอร์ด) — ไม่แก้อะไรทั้งสิ้น';
  END IF;
  IF c <> 'E7' THEN
    RAISE EXCEPTION 'STOP: คอร์ดปัจจุบันคือ % ไม่ใช่ E7 — มีคนแก้ไปแล้วหรือชี้ผิดตำแหน่ง ไม่แก้อะไรทั้งสิ้น', c;
  END IF;
  IF n <> '~5 - 0' THEN
    RAISE EXCEPTION 'STOP: โน้ตที่ตำแหน่งนี้คือ % ไม่ใช่ ~5 - 0 — ตำแหน่งเลื่อน ไม่แก้อะไรทั้งสิ้น', n;
  END IF;
  IF NOT ok THEN
    RAISE EXCEPTION 'STOP: stanza แรกไม่ใช่ id = A — โครงสร้างเปลี่ยน ไม่แก้อะไรทั้งสิ้น';
  END IF;
END $$;

-- 2) แก้จุดเดียว
UPDATE songs
SET content = jsonb_set(content, '{stanzas,0,lines,0,14,chord}', '"E"'::jsonb, false)
WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889'
  AND content #>> '{stanzas,0,lines,0,14,chord}' = 'E7';   -- guard ซ้ำชั้นที่สอง

-- 3) ตรวจผล — ต้องได้ 'E' แถวเดียว
SELECT id, number, title_th,
       content #>> '{stanzas,0,lines,0,14,chord}' AS chord_after
FROM songs
WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (ถ้าอยากกลับไปเป็น E7): รันบล็อกนี้ — มี guard กลับทางเหมือนกัน
--
-- BEGIN;
-- DO $$
-- DECLARE c text;
-- BEGIN
--   SELECT content #>> '{stanzas,0,lines,0,14,chord}' INTO c
--   FROM songs WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889';
--   IF c <> 'E' THEN
--     RAISE EXCEPTION 'STOP: คอร์ดปัจจุบันคือ % ไม่ใช่ E — ไม่ต้อง rollback', c;
--   END IF;
-- END $$;
-- UPDATE songs
-- SET content = jsonb_set(content, '{stanzas,0,lines,0,14,chord}', '"E7"'::jsonb, false)
-- WHERE id = '644ed7d5-e64d-45a9-a11a-8d20ff0d0889'
--   AND content #>> '{stanzas,0,lines,0,14,chord}' = 'E';
-- COMMIT;
