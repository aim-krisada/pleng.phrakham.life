# SoundControl popover — พอดีจอ ไม่ต้อง scroll (task_35ebc356)

**Branch:** `sc-popover-no-scroll` (fork จาก `studio-shell-redesign` · merge-base = `489a7b2` = base HEAD)
**ไฟล์แก้:** `src/components/SoundControl.vue` (CSS `.sc-pop` เท่านั้น + comment) — ไม่แตะ logic เสียง/arranger, ไม่แตะ DockKey

## ปัญหา (P'Aim เห็นตอน serve)
popover "เสียงดนตรี" มีได้ถึง 5 หัวข้อ (เสียงที่เล่น · การบรรเลง · เครื่องดนตรี · อารมณ์/สไตล์ · ประกายเสียงสูง)
cap เดิม `max-height: min(56vh, 360px)` เตี้ยเกิน → บนจอทั่วไปต้อง scroll + หัวข้อบนสุด "เสียงที่เล่น" ถูกตัด

## สาเหตุ
popover เปิด**เหนือ** dock (`bottom: calc(100% + 8px)`) · `clampPops()` ใน DockKey แค่ *เลื่อน* ไม่ *ย่อ* → ถ้ากล่องสูงเกินที่ว่างเหนือ dock หัวจะโดนตัด. cap `360px` ตายตัวไม่สัมพันธ์กับความสูงจอเลย

## วิธีแก้ (KISS · refine)
เปลี่ยน cap เป็น **viewport-based** ที่กันที่ให้ dock ด้านล่าง:
```css
max-height: min(90vh, calc(100vh - 200px));    /* fallback ที่ไม่รองรับ dvh */
max-height: min(90dvh, calc(100dvh - 200px));
```
- `100dvh - 200px` = ที่ว่างที่ popover โตขึ้นไปได้โดยไม่ทับ dock/แผ่นเพลง และไม่ล้นขอบบน (200px ครอบ dock สูงสุด + ช่องล่างพอดี — วัดจริง: sing dock ~107–125px, editor dock ~161–175px, reserveToFit สูงสุดที่วัดได้ = 195px)
- จอสูงปกติ → เห็นครบ 5 หัวข้อ **ไม่มี scrollbar**
- จอเตี้ยจริง (≈ < 620px) → fallback scroll ปกติ (sticky หัว "เสียงดนตรี" + หัวข้อแรกยังเห็น)
- `clampPops()` ยังทำงาน (nudge +8px สุดท้าย) · popover ยังเป็น overlay (dock ไม่ inflate)

## verify (real browser · DOM measured · localhost:5431)
> `preview` screenshot ค้าง (flaky ตามที่โปรเจกต์ระบุ — ใช้ DOM query แทน). ค่าจาก `getComputedStyle` + `getBoundingClientRect` สด:

| กรณี | จอ (dvh) | dock | กลุ่ม | maxH | scrollH/clientH | scroll? | หัวถูกตัด? | ทับ dock? |
|---|---|---|---|---|---|---|---|---|
| **AC1 sing desktop** | 900 | 125px | 5 | 700px | 417/417 | ❌ ไม่ | ❌ ไม่ | ❌ ไม่ |
| **AC1 sing mobile** | 915 | 107px | 5 | 715px | 415/415 | ❌ ไม่ | ❌ ไม่ (เห็น "เสียงที่เล่น") | ❌ ไม่ |
| **AC2 sing จอเตี้ย** | 560 | 107px | 5 | 360px | 415/358 | ✅ scroll | ❌ ไม่ (sticky หัว + กลุ่มแรกเห็น) | ❌ ไม่ · ไม่ล้นจอ |
| **AC4 editor** | 900/915 | 175/161px | 4 | 700/715px | 330/330 | ❌ ไม่ | ❌ ไม่ | ❌ ไม่ |

- **AC3:** popover เป็น overlay — dock height คงที่ (107/125/175) ตอนเปิด/ปิด (ไม่ inflate) · เลือก option (บรรเลง → กลุ่มที่ 5 โผล่) + สไลเดอร์ประกายเสียงสูง (70→90%) ทำงานปกติ
- **AC4 test/build:** `vitest run` = **594 passed** (59 suites; `notationLint.test.mjs` fail = pre-existing `process.exit` quirk ไม่นับ) · `SingTransport.test.js` 22/22 · `npm run build` ✓ (built in 2.2s)

## Deliverable
- dev server `--host` · **Network URL: http://192.168.1.124:5431/** (launch config `nsp` · port 5431)
- P'Aim เปิดเพลง → ฝึกร้อง/แก้ไข → กดปุ่ม "เสียงดนตรี" (ไอคอนขวาแถวล่าง) → เห็นครบไม่ต้อง scroll
- **ไม่ merge/deploy เอง** — รอ PM gate (HOLD push รอบ 23)
