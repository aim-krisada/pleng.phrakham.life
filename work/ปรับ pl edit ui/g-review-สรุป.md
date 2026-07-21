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

## เพิ่ม: หลายภาษา (G รอบ 3)
G เสนอ (ต่อยอด v2 ไม่รื้อ schema):
- **per-language melisma:** stanza เก็บทำนองมาตรฐาน · arrangement row แต่ละภาษาใส่ `melismaOverrides:[{slotIndex,noteSpan}]` ทับเฉพาะที่ภาษาตัวเองเอื้อนต่าง (อังกฤษ 2 โน้ต=1 พยางค์ · ไทย 2 โน้ต=2 พยางค์ บนทำนองเดียว) · parser คำนวณ syllableSlots dynamic ตาม override
- **ภาษา ≠ voice = คนละมิติ (orthogonal):** voice=timeline/pitch (ร้องขนาน) · language=presentation · โครง nested `syllables:{ lead:{th:[],en:[]}, response:{th:[],en:[]} }`
- อ้างว่า backward-compatible เพลงเก่าไม่มี override อ่าน slot จากทำนองปกติ

### 🔴 ข้อสังเกตของ Claude (โปรแกรมเมอร์) — ต้นทุนที่ G ประเมินต่ำไป
G ถูกเรื่องสถาปัตยกรรม **แต่ schema ไม่ใช่ที่ที่งานอยู่** — งานจริง+เสี่ยงอยู่ที่ `syllables` เปลี่ยนรูปจาก **flat `[...]`** เป็น **nested `{voice:{lang}}`** · **editor tooling ทั้งชุด (syllable box · shift ◀▶ · paragraph editor · auto-split) สมมติว่า syllables เป็น flat array** → ต้องรื้อ/ห่อใหม่หมด
- **นี่คือสิ่งที่ [[pleng-bilingual-approach]] เตือนไว้เป๊ะ:** "อย่าทำ native `{en,th}` slot = แพงสุด รื้อ syllable-editor/shift-tool/paragraph ทั้งหมด" · Amazing Grace พิสูจน์แล้วว่า **interlinear แบบ render-only (จับคู่ 2 row) ทำได้ 0 โค้ด**
- **trade-off จริงที่ P'Aim ต้องเคาะ:**
  - **A (nested ของ G):** ยืดหยุ่นสุด รองรับ per-language melisma + multi-voice · **แต่รื้อ editor tooling (แพง ตามที่ experiment เจอ)**
  - **B (render-only 2-row เดิม):** interlinear ได้ฟรี 0 โค้ด · **แต่รับ per-language melisma ต่างกันไม่ได้** (ต้องร้อง syllabic เท่ากัน)
- **ทางสายกลางที่ผมเสนอ:** เริ่ม B (render-only) ให้ใช้ได้ก่อน · เก็บ A (melismaOverride) ไว้เป็น optional เฉพาะเพลงที่ต้องการจริง — ค่อยเติมทีหลังโดยไม่บล็อกงานอื่น

## record เต็ม
transcript: `ceo/tools/meeting-room/meetings/2026-07-21-pleng-edit-ui-arch/meeting_discussion.md`
