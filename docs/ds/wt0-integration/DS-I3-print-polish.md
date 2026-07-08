# DS-I3 — print-polish (footer + page numbers)

**คู่กับ:** `us/wt0-integration/US-I3-print-polish.md`

## ไฟล์ที่แตะ
- `src/views/Studio.vue` (โหมดแผ่นส่ง `:song-title`) · `src/styles.css` (`@page`)

## จุดเสี่ยงชน
- `Studio.vue` + `styles.css` = ว่าง (ไม่มี worktree อื่นแตะ) · `SongSheet` รับ `songTitle` prop อยู่แล้ว (WT-B merged) — แค่ส่งเข้า

## design
- `Studio.vue` โหมดแผ่น: `<SongSheet :song="song" :song-title="titleText" />` (`titleText` = ชื่อเพลงปัจจุบัน)
- `src/styles.css`:
```css
@page { margin: 14mm 16mm 18mm; }
@page { @bottom-center { content: "หน้า " counter(page) " ของ " counter(pages); } }
```
  (in-component ทำ counter ไม่ได้ ต้องอยู่ `@page` ระดับ global)

## test
- **manual/print-preview:** footer มีชื่อเพลง + "หน้า X ของ Y" · เนื้อไม่ทับ footer หลายหน้า
- **unit:** โหมดแผ่นส่ง prop `song-title` ถูกค่า
