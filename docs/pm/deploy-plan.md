# Deploy plan — studio redesign → production (main)

**เป้า:** เอาแอปใหม่ (studio redesign · base `studio-shell-redesign`) ขึ้น production (`main` → GitHub Pages auto-deploy)
**สถานะ:** ✅ **deploy รอบ 1 สำเร็จแล้ว (9 ก.ค. · `70335d5`)** — reconcile main→base ทำแล้ว → **รอบต่อไป main fast-forward ได้เลย (ไม่ต้อง force)** ตราบใดไม่มี commit ลง main ตรงๆ

## 🎯 แผน "deploy ทีเดียวตอนรอบนี้จบ" (P'Aim เคาะ 9 ก.ค.)
churn น้อย · ยังไม่มีใครใช้ รอได้ · ได้ของครบชุด. **deploy เมื่อครบ 5 ข้อ:**
1. algorithm (ค้นเนื้อ B052 / จุดคู่ B027 / lint B026) — ✅ บนฐาน
2. B055 แก้จังหวะข้ามห้อง — ✅ บนฐาน
3. B056 จบเพลง — 🔨 dev → merge
4. Import 120 เพลง — 🔨 DA gen → P'Aim run SQL (**data อิสระ ไม่บล็อก code deploy**)
5. 99/100 + verify-set — 🔨 DA
- **ไม่รวมรอบนี้:** mobile pass (Android ยังไม่เริ่ม) = รอบหน้า
- **ลำดับ:** ครบ 5 → ฐานนิ่ง (test+build เขียว) → PM เปิด localhost ให้ P'Aim verify → **P'Aim สั่ง go** → deploy ทีเดียว (main FF) → รายงาน version จริง (bundle stamp) ตาม feedback_deploy_no_shortcut
- **ห้าม deploy จน P'Aim สั่ง go** (never-publish-without-confirm)

## ⚠️ ประเด็นหลัก: main กับ base diverged
- `git rev-list --left-right --count main...studio-shell-redesign` = **main 8 / base 225**
- **base = แอปใหม่ทั้งหมด (225 commit)** · **main = แอปเก่า + 8 commit ที่ base ไม่มี**
- clean-force (main = base) แบบไม่ระวัง → **ลบ 8 commit ของ main ทิ้ง**

## 8 commit บน main ที่ต้องเช็กก่อน force (studio-shell-redesign..main)
| commit | เรื่อง | base มีแล้ว? | action |
|---|---|---|---|
| `7038d8a` | lib: notationLint (กฎตรวจโน้ต + เทสต์ 21) | ❌ ไม่มี | **cherry-pick/merge เข้า base** (= ② lint) |
| `9be5308`·`c91ff61`·`7d64a5c` | Guide: เอื้อน/tie · ♯♭♮ movable-do · slur examples | ❌ base Guide เก่ากว่า | เอา Guide เข้า base |
| `6dd927b` | CLAUDE.md: shared-dir + worktree playbook | ❌ (doc) | merge |
| `058c2cd` | ComboSelect: reopen list after select | ⚠️ | เช็ก base มีไหม |
| `4d5d49a` | SongView: change key real-time during playback | ⚠️ น่าจะมีใน SongViewer ใหม่ | ยืนยัน (ถ้ามี=ข้าม) |
| `191b886` | SongView: play melody in chosen key | ⚠️ น่าจะมีใน SongViewer ใหม่ | ยืนยัน (ถ้ามี=ข้าม) |

## ลำดับ deploy (เมื่อถึงเวลา)
1. รอ B043 (sing) + edit-fix merge เข้า base ครบ · base เสถียร (test เขียว · build)
2. **Reconcile main → base:** cherry-pick/merge commit ข้างบนที่ base ยังไม่มีจริง (เริ่ม notationLint + Guide + CLAUDE.md) · verify test/build
3. render + serve localhost → **P'Aim verify** → **สั่ง go**
4. deploy: ทำ main = base (clean) — วิธี force ที่ไม่ทิ้งงาน (main ตอนนี้ = subset ที่ reconcile เข้า base แล้ว) → push → GitHub Actions deploy
5. รายงาน version ที่ deploy จริง vs footer สด (ไม่ใช่ source HEAD) — ตาม feedback_deploy_no_shortcut

## กติกา
- **ห้าม deploy จน P'Aim สั่ง go** · main auto-deploy (push = live ทันที)
- force-push / reset main = destructive → confirm ก่อนเสมอ
- ต้องแน่ใจ 8 commit reconcile ครบก่อน ไม่งั้นงาน main หาย
