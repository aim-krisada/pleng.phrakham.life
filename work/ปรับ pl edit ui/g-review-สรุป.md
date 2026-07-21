# สรุปผล G รีวิวสถาปัตยกรรม (21 ก.ค. · ผ่าน meeting-room)

G อ่าน `บทวิเคราะห์-สถาปัตยกรรม.md` + `song-model-v2.md` แล้ว **ยืนยัน: schema ผ่านการประเมินระดับสากล · ต่อยอดได้ ไม่ต้องรื้อ**

## ลำดับความสำคัญ 4 gap (G จัดให้ · มุมดนตรี+ผู้ใช้จริง)
1. 🥇 **D.C./D.S./Fine/Segno (กระโดดซ้ำ)** — กระทบการเล่นเสียง 100% · **เพลงโบสถ์เกิน 30% ใช้ D.C. al Fine** (เช่นเพลง 8) · ไม่มี = `expandRepeats()` เล่นไม่จบ/วนผิด → พี่เปาตรวจเพลงไม่ได้
2. 🥈 **Display compact สากล** (`:‖` + volta) — กระทบสายตา/กระดาษ · กางเต็มยาวหลายหน้า อ่านยากบนเวที
3. 🥉 **ปุ่มลัด `(รับ)`** — แค่ UI convenience ไม่แตะ data model (resolver มีแล้ว) · ทำทีหลังได้
4. 🏅 **MusicXML export** — คุยกับโลกภายนอก · ผู้ใช้โบสถ์ยังไม่จำเป็นถ้า print+playback ครบ

## แนวทาง implement ที่ G ให้ (โปรแกรมเมอร์เอาไปทำต่อได้เลย — ผมเห็นด้วยทั้งหมด)
- **Multi-voice ลูกคู่:** ไม่รื้อ · เพิ่ม `voices:["lead","response"]` ใน stanza + `syllables` แยกตาม voice key ใน arrangement
- **เปลี่ยน time signature กลางเพลง:** รองรับแล้ว · ใส่ token `{type:"timeSignature",beats,unit}` ที่หัวห้อง · ไม่กระทบ syllables (นับจาก attack note ไม่ใช่จังหวะห้อง)
- **สลับ display 2 โหมด:** schema พอ 100% ไม่ต้องเพิ่ม field · แค่ UI toggle เลือก render component (Mode A = `resolveContent` กางเต็ม · Mode B = วาด stanza ครั้งเดียว + ซ้อน syllables)
- 🔑 **แก้ issue6 (คลิกโน้ต preview → เด้งไปแก้):** ไม่ต้องแก้ DB · ใน `resolveContent()` แปะ **transient pointer** `_source:{stanzaId,lineIdx,segmentIdx,noteIdx}` ในแต่ละ node · คลิก → อ่าน `_source` → ตั้ง `activeStanza` + focus cursor ต้นทาง · แก้ปัญหา index mapping ที่ G กังวลได้ตรงจุด

## G กังวล 2 จุด (ตรงกับที่ Claude flag)
1. อย่าบังคับผู้ใช้อ่านได้แบบเดียว — ต้องสลับ compact↔church ได้จาก data core ชุดเดียว
2. index mapping source↔resolved ต้องนิ่งมาก ไม่งั้นคลิกแก้โน้ตแล้วกระทบข้ออื่น "โปรแกรมรวน" → แก้ด้วย `_source` pointer ข้างบน

## record เต็ม
transcript: `ceo/tools/meeting-room/meetings/2026-07-21-pleng-edit-ui-arch/meeting_discussion.md`
