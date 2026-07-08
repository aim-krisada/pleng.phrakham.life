# DS-I2 — SSOT ชื่อไฟล์

**คู่กับ:** `us/wt0-integration/US-I2-filename-ssot.md`

## ไฟล์ที่แตะ
- `src/lib/songName.js` (core lib · WT-C สร้างไว้ · merged) · `src/components/DownloadTool.vue`

## จุดเสี่ยงชน
- `songName.js`/`DownloadTool.vue` = ไฟล์ WT-C ที่ merge แล้ว (WT-C ปิดงาน) → WT-0 integration แก้ต่อได้ไม่ชน
- **หมายเหตุ:** `EditorMode.downloadJson` (WT-D file) จะมาใช้ lib นี้ใน **US-I5 (รอ WT-D)**

## design (SA — การออกแบบ library กลาง)
```js
export const SITE_NAME = 'เพลง.พระคำ.ชีวิต'
export function songName(song){ /* "N. ชื่อ" — สำหรับ "แสดง" (list) คงเดิม */ }
export function songBasename(song){                 // สำหรับ "ชื่อไฟล์"
  const t = song?.title_th?.trim() || 'แผ่นเพลง'
  return `${SITE_NAME} - ${t}`.replace(/[\\/:*?"<>|]/g,'').replace(/\s+/g,' ').trim()
}
```
- แยกให้ชัด: **display = `songName` (มีเลข)** · **filename = `songBasename` (SITE_NAME - title, ไม่มีเลข)**
- ทุกจุดตั้งชื่อไฟล์เรียก `songBasename` (JSON: `+ '.json'` · PDF: เซ็ต `document.title`)

## test
- **unit:** `songBasename` → `"เพลง.พระคำ.ชีวิต - พระเจ้าเป็นความรัก"` · ตัด `/ : *` ออก · title ว่าง → "…- แผ่นเพลง" · `songName` ยังได้ "N. ชื่อ"
- **tester:** ดาวน์โหลด JSON + Save-as-PDF → ชื่อไฟล์ตรงกันตาม format
