# Brief — B106 (SA R&D): เสียงคอร์ดให้ "เพราะมากๆ" + สมดุลเสียง (gain)

**ฐาน:** `studio-shell-redesign` (มี B104 แล้ว) · **branch:** `b106-sa-chord-quality` (SA วิเคราะห์/ทดลอง — เปลี่ยน src ได้เฉพาะ spike ทดลอง ไม่ merge)
**สั่งโดย:** PM (pm11) · ที่มา: P'Aim 12 ก.ค. (ลอง B104 บน live)

## Feedback P'Aim (ตรงตัว)
"เสียงมันดีขึ้นกว่า melody อย่างเดียวเยอะ **แต่บางที chord มันดังไปไหม** และจะมี **combination ไหนที่ให้ฟังดูเพราะมากๆ เติมได้อีกไหม ที่ใช้เทคนิคขึ้นสูง ทั้งทางโปรแกรมและทางทฤษฎีดนตรี**"

## งาน SA (วิเคราะห์ + ทดลอง + เสนอทางเลือก)
ตอนนี้ B104 = เบสตัวราก + block triad (ราก+3+5(+7)) เสียงค้าง. ยกระดับให้ "เพราะมากๆ":
1. **สมดุลเสียง (gain/mix):** คอร์ดดังไปเทียบทำนองไหม → เสนอค่าสมดุล (เช่น คอร์ด/เบส เบากว่าทำนอง กี่ dB) ให้ทำนองเด่น คอร์ดคลอ
2. **Voicing/accompaniment ขั้นสูง (ทฤษฎีดนตรี + โปรแกรม)** — สำรวจ+เสนอ **2-4 ตัวเลือก** พร้อมข้อดีข้อเสีย + แนะนำอันที่เพราะสุด:
   - inversions / voice-leading (เสียงเคลื่อนนุ่มระหว่างคอร์ด แทน block กระโดด)
   - รูปแบบคลอ: block ค้าง vs arpeggio/กระจายเสียง vs รูปแบบย่ำเบส (root-fifth / walking)
   - added tensions ใส่แบบพอดี (7th/9th/sus) ตามบริบทคอร์ด
   - envelope/sustain/velocity, register ที่เหมาะ (สเปก B104 แนะเบส E2–C3), การหลบไม่ให้ชนทำนอง
   - เทคนิคโปรแกรม: การ schedule, การ smooth, การเลือก voicing ตามคอร์ดก่อนหน้า
3. **ให้ P'Aim ฟังเปรียบเทียบได้:** ถ้าเป็นไปได้ ทำ spike/เดโมเล็ก (เช่นหน้า A/B หรือไฟล์ตัวอย่าง) ให้ฟังแต่ละตัวเลือก — ถ้าทำ hearable ไม่ได้ในเซสชัน ให้ระบุว่าต้องมี dev spike + บรรยายให้ชัดสุด

## Deliverable
- **spec/ข้อเสนอ `docs/ds/chord-voicing-quality.md`:** สมดุล gain ที่แนะ + ตัวเลือก voicing 2-4 แบบ (ทฤษฎี+โปรแกรม+ข้อดีข้อเสีย) + **แนะนำอันที่เพราะสุด** + วิธี implement (ต่อยอด `buildChordVoice`/`midi.js`/`chords.js` ที่ B104 วางโครงไว้) · เชื่อม voicing v2 (เลือกเองได้) ที่ค้างจาก B104
- ถ้าทำเดโม hearable ได้ = branch spike (ไม่ merge) + บอก Network URL/ไฟล์ให้ฟัง
- **ไม่ merge · ไม่ deploy** — ส่งกลับ PM → PM เสนอ P'Aim เลือก → จ่าย dev implement + tester

## รายงาน
- spec + `docs/reports/b106-sa-chord-quality.md` ลง branch ตัวเอง · §📥 inbox + ping PM (pm11) · ไม่ commit ลง base
