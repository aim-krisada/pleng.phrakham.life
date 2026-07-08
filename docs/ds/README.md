# Design Specs (DS) — วิธีเขียน

**1 DS = 1 ไฟล์** คู่กับ US ไฟล์ต่อไฟล์: `docs/ds/<epic>/DS-<n>-<slug>.md` (เลข/slug ตรงกับ US)

แต่ละไฟล์ DS มี:
- **ไฟล์ที่แตะ** + **จุดเสี่ยงชนกับ worktree อื่น** (สำคัญต่อการทำขนาน)
- **design** — layout / contract (props·events) / states
- **test** — unit test ยิงอะไร + วิธี tester ลองผ่าน port ของงาน
- **a11y** — WCAG 2.2 AA, theme tokens เดิม
