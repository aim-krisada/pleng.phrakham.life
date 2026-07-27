# G consult — session dup-guard-v2-merge

- when: 2026-07-27 15:45:12
- url: https://gemini.google.com/app/74319cedf0c0151a

## Q
ผมเพิ่ง merge 3 ฟีเจอร์ Vue 3 เข้าด้วยกันและต้องการให้คุณตรวจการคลี่ conflict ว่ามีจุดพังเงียบไหม

ฐาน origin/main มี 2 ฟีเจอร์: (A) unsaved-guard — confirmDiscard() คร่อม 5 จุดที่แทนที่เอกสารในที่ (สลับเพลงจาก picker, เปิดร่าง, เริ่มเพลงใหม่, นำเข้าไฟล์, ย้อนเวอร์ชัน) และ (B) PIANO_ONLY flag ซ่อน picker เครื่องดนตรี/การบรรเลง
branch ที่ merge เข้ามามี (C) dup-title-guard — เตือนสดขณะพิมพ์ชื่อ + block ตอนเขียนลงคลัง

conflict 4 จุด ผมคลี่แบบ union ทั้งหมด จุดที่เสี่ยงที่สุดคือใน EditorMode.vue:
- ฝั่ง HEAD มี watch(pickerId) แบบใหม่ที่มี guard:
    const NO_SKIP = Symbol('no-skip'); let skipWatch = NO_SKIP
    watch(pickerId, (id, prev) => { const skip = skipWatch; skipWatch = NO_SKIP
      if (skip !== NO_SKIP && skip === id) return
      if (!confirmDiscard('เปิดเพลงอื่น')) { skipWatch = prev; pickerId.value = prev; return }
      loadSong(id) })
- ฝั่ง branch มีบล็อก B-DUP ใหม่ ตามด้วย watch(pickerId, (id) => loadSong(id)) ตัวเก่า (เพราะ branch แตกก่อน HEAD)
ผมคลี่โดยเอาบล็อก B-DUP มาไว้ต่อจาก watch ตัวใหม่ของ HEAD และ **ลบ** watch(pickerId, (id) => loadSong(id)) ตัวเก่าทิ้ง

คำถาม:
1. การลบ watch ตัวเก่าทิ้งถูกต้องไหม หรือ Vue จะเรียก watch สองตัวซ้อนถ้าเก็บไว้ทั้งคู่ (จะเกิดอะไรถ้าเผลอเก็บไว้)
2. union แบบนี้มีความเสี่ยง 'พังเงียบ' ตรงไหนที่เทสอาจจับไม่ได้ เช่น B-DUP อ่าน meta/songList ที่ตัวใหม่เปลี่ยน timing หรือไม่
3. ผมควรตรวจอะไรเพิ่มก่อนส่งให้ PM merge เข้า main (main = deploy ขึ้นเว็บทันที)
ตอบสั้น ๆ เป็นข้อ ๆ

## A
นี่คือข้อสรุปจุดเสี่ยงและการตรวจสอบสำหรับการแก้ conflict ครั้งนี้ครับ

1. การลบ watch ตัวเก่าทิ้ง

ถูกต้องแล้วครับที่ลบออก

ถ้าเผลอเก็บไว้ทั้งคู่: Vue 3 จะรัน callback ของทั้งสอง watch ตามลำดับการลงทะเบียน หากผู้ใช้กดยกเลิกใน watch ตัวใหม่ (skipWatch) ถึงแม้ตัวแรกจะย้อน pickerId.value = prev แต่ watch ตัวเก่าที่คิวอยู่ถัดไปจะทำงานต่อทันทีและสั่ง loadSong(id) เพลงใหม่อยู่ดี ทำให้ Guard ถูกข้ามไปโดยสิ้นเชิง

2. จุดเสี่ยง 'พังเงียบ' ที่เทสอาจจับไม่ได้

Race Condition ระหว่าง Async loadSong และ B-DUP Validation: หาก loadSong เป็น Async แล้ว B-DUP อ่าน songList หรือ meta ในเวลาเดียวกัน B-DUP อาจดึงข้อมูลจาก state เพลงเก่าก่อนที่เพลงใหม่จะโหลดเสร็จ ส่งผลให้เตือนชื่อซ้ำผิดพลาด

State Desync ใน skipWatch: หากมีการเปลี่ยน pickerId ซ้ำซ้อนก่อนที่ Vue tick จะจบ หรือเกิด Re-entrancy จาก Watcher ตัวอื่น ค่า skipWatch อาจหลุดจาก NO_SKIP ค้างไว้ ทำให้ guard ข้ามการเตือนในครั้งถัดไปโดยไม่ตั้งใจ

PIANO_ONLY Edge Cases: B-DUP อาจพยายาม validate หรือโฟกัส input element ของชื่อ/คลังเพลงที่ถูกซ่อนไว้โดย flag PIANO_ONLY ซึ่งอาจเกิด Unhandled Error ใน background ได้

3. สิ่งที่ต้องตรวจเพิ่มก่อนส่งให้ PM

Manual Test Case 1 (Discard Cancel): สลับเพลง -> กดยกเลิก (confirmDiscard = false) -> ตรวจสอบว่า UI ย้อนกลับมาเพลงเดิม ข้อมูลที่แก้ค้างไว้อยู่ครบ และลองพิมพ์ชื่อซ้ำว่า B-DUP ยังทำงานถูกต้องกับเพลงเดิมไหม

Manual Test Case 2 (Discard Accept): สลับเพลง -> ยืนยันสลับ -> ดูว่าเพลงใหม่โหลดสมบูรณ์ และ B-DUP สลับไปตรวจชื่อซ้ำเทียบกับฐานข้อมูลของเพลงใหม่ถูกต้องหรือไม่

Network Throttling Test: เปิด Slow 3G ใน DevTools แล้วลองสลับเพลงเพื่อดูว่า B-DUP หรือ Guard มีอาการกระตุก/อ่าน state ข้ามกันระหว่างโหลดหรือไม่

Type & Build Check: รัน vue-tsc --noEmit หรือ npm run build เพื่อให้แน่ใจว่าการคลี่ union ไม่ทำลาย Import หรือ Type definition ของ B-DUP และ Guard

What would you like to do next?
เขียน Vitest Component Test สำหรับ skipWatch guard
ร่าง QA Checklist สำหรับส่งให้ PM ตรวจสอบก่อน Deploy
ปรับปรุง skipWatch ให้เป็น Composable แยกต่างหาก
