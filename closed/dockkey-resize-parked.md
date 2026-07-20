# DockKey ใหม่ (dock-resize) — พักไว้ ห้าม deploy จนกว่าจะนิ่ง

**Decision (P'Aim):** branch `dock-resize` (`f8d77a3`) ค้าง **ไม่ deploy** จนกว่าจะนิ่ง — อย่าเสนอขึ้นเว็บเอง

**ทำไม:** `DockKey.vue` = core แชร์ 2 เว็บ (เพลงเป็นเจ้าของ · พระคำยืม) → ถ้า deploy ต้องผ่านด่านทั้ง 2 host ประสาน pk pm ก่อน ([[pair-sop §7]]) · ตอนนี้ P'Aim ยังไม่พอใจความนิ่ง

**งานใหญ่ DockKey redesign (windowed/flat-list) = คนละเรื่อง** อยู่ `docs/backlog.md` ไม่ใช่ที่นี่
