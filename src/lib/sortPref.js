// m1.wpa.24.us01 — how each BOOK is left sorted: which sort, and which way round.
//
// พี่เปายืนยันเอง (3 ส.ค. 2569 · ใบงาน v3/pleng#1): "เล่มใหญ่เลือกตามเลข เล่มเด็กเล็กเลือกตาม
// ตัวอักษรไว้ ก็ให้จำแยกเล่มไป" ⇒ นี่คือตารางที่คีย์ด้วยรหัสเล่ม ⛔ ไม่ใช่ค่าเดียวใช้ทุกเล่ม
// (ค่าเดียวใช้ทุกเล่มคือสิ่งที่ทีมเดาไว้ตอนแรก และเขาบอกว่าไม่ใช่)
//
// พี่เอมเติมทิศทางให้ (3 ส.ค.): "เหลือแค่ มากไปน้อย น้อยไปมาก แล้วคงไว้ กดสลับแค่ 2 สถานะพอ"
// ⇒ chooseSort() ข้างล่างคือกฎนั้น อยู่ที่เดียว หน้าจอจะได้ไม่ต้องคิดเอง
//
// ไฟล์นี้ทำแค่ "จำ" กับ "กฎการกด" ⛔ ไม่รู้วิธีเรียง — การเรียงอยู่ที่ songSort.js ที่เดียว
// เก็บในเครื่องของผู้อ่านเอง (localStorage) ไม่ผูกบัญชี ไม่มีข้อมูลส่วนตัว วิธีเดียวกับ favorites.js
import { ref, watch } from 'vue'
import { PICKABLE_SORTS, DEFAULT_SORT, DEFAULT_DIR, isDir, flipDir } from './songSort.js'

const KEY = 'pleng.sortByBook'
const PICKABLE_IDS = PICKABLE_SORTS.map((o) => o.id)

// เก็บได้เฉพาะวิธีที่มีปุ่มให้กดจริง — ค่าเก่าค้างจากรุ่นก่อน (หรือคนไปแก้ในเครื่องเอง) ต้องไม่ทำให้
// เล่มหนึ่งค้างอยู่บนวิธีเรียงที่ไม่มีปุ่มพากลับออกมา
function isPickable(id) {
  return PICKABLE_IDS.includes(id)
}

// อ่านค่าของเล่มหนึ่ง คืน null ถ้าใช้ไม่ได้ · รับได้ทั้งรูปแบบเก่าที่เป็นสายอักขระเดี่ยว
// ('<รหัสวิธีเรียง>') และรูปแบบปัจจุบัน { by, dir }
function normalise(entry) {
  if (typeof entry === 'string') return isPickable(entry) ? { by: entry, dir: DEFAULT_DIR } : null
  if (entry && typeof entry === 'object' && isPickable(entry.by)) {
    return { by: entry.by, dir: isDir(entry.dir) ? entry.dir : DEFAULT_DIR }
  }
  return null
}

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY))
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const clean = {}
      for (const [code, entry] of Object.entries(raw)) {
        const e = normalise(entry)
        if (e) clean[code] = e
      }
      return clean
    }
  } catch {
    /* ค่าเสีย / ไม่มีที่เก็บ (โหมดส่วนตัว) — เริ่มจากว่าง */
  }
  return {}
}

// ตัวจริงที่เดียว: { '<รหัสเล่ม>': { by, dir } } · เล่มที่ยังไม่เคยแตะจะไม่มีในตาราง แล้วตกไปใช้
// ค่าเริ่มต้น ⇒ เปิดเล่มใหม่ครั้งแรกยังเรียงตามเลขข้อ น้อยไปมาก เหมือนเดิม
export const sortByBook = ref(load())

watch(
  sortByBook,
  (map) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(map))
    } catch {
      /* พื้นที่เต็ม / โหมดส่วนตัว — ในหน่วยความจำยังใช้ได้ตลอด session นี้ */
    }
  },
  { deep: true, flush: 'sync' },
)

// เล่มนี้ควรแสดงแบบไหนตอนนี้ — คืนคู่ที่ใช้ได้เสมอ ไม่เคยคืน null
export function bookSortState(code) {
  const e = code ? normalise(sortByBook.value[code]) : null
  return e || { by: DEFAULT_SORT, dir: DEFAULT_DIR }
}

export function bookSort(code) {
  return bookSortState(code).by
}

export function bookDir(code) {
  return bookSortState(code).dir
}

// กฎการกด อยู่ที่เดียว (พี่เอม: 2 สถานะ ไม่มีอย่างอื่น):
//   กดวิธีที่ "ยังไม่ได้ใช้"  → ย้ายไปวิธีนั้น เริ่มที่น้อยไปมาก
//   กดวิธีที่ "ใช้อยู่"       → กลับหัวกลับหาง
// ⛔ ไม่มีการกดครั้งที่ 3 ที่ทำให้เลิกเรียง — ดูเหตุผลที่หัวไฟล์ songSort.js
export function chooseSort(code, id) {
  if (!code || !isPickable(id)) return
  const cur = bookSortState(code)
  const next = cur.by === id ? { by: id, dir: flipDir(cur.dir) } : { by: id, dir: DEFAULT_DIR }
  sortByBook.value = { ...sortByBook.value, [code]: next }
}

// ตั้งค่าตรง ๆ (ใช้ในเทส หรือผู้เรียกที่รู้แน่ว่าต้องการอะไร)
export function setBookSort(code, id, dir = DEFAULT_DIR) {
  if (!code || !isPickable(id)) return
  sortByBook.value = { ...sortByBook.value, [code]: { by: id, dir: isDir(dir) ? dir : DEFAULT_DIR } }
}
