# รายงาน dev — dock-space / คืนพื้นที่ editor

**สาย:** dev (engine + logic lane · HYBRID SOP §3.0)
**branch:** `dock-space-dev` (แตกจาก `studio-shell-redesign` @ `fdd233f` — **ไม่ใช่ `uxui-standing`** ตามคำเตือนสเปก)
**สถานะ:** 🟡 **read-only prep เสร็จ — phase-A build plan รอ PM เคาะ + SA ตอบ Q1/Q3** · ⛔ ยังไม่เขียน engine code
**ไฟล์ของ dev:** `src/components/DockKey.vue` (engine · **แชร์พระคำ 2-host**) เท่านั้น · **ไม่แตะ `EditorMode.vue`/`editItems`/toolbox** (= lane ของ UX)

---

## 1 · verify แล้ว: โครงจริง + เลขบรรทัด (ฐานปัจจุบัน · DockKey.vue 629 บรรทัด)

| ส่วน | บรรทัด | จะทำอะไรใน phase A |
|---|---|---|
| `defineProps` | `:23-30` | **เพิ่ม prop `autoHide` (Boolean, default `false`)** — พระคำ opt-in เท่านั้น |
| `.dk-host` template | `:260` | ห่อ dock ใน `.dk-shift` + เพิ่ม `.dk-peek` handle (ดู §2) |
| `.dk-host` CSS | `:468` | +class `.dk-shift`/`.dk-peek` + `transform` transition |
| collapse `transition()` | `:157` | **ไม่แตะ** — hide-on-scroll เป็นชั้นแยกจาก collapsed |
| drag inline transform | `:168,203` เขียน `d.style.transform` บน `.dk-dock` | ⚠️ **hide ต้องเลี่ยงชั้นนี้** → translateY ที่ `.dk-shift`/`.dk-host` ไม่ใช่ `.dk-dock` (กัน inline transform ชนกัน) |
| ⚙ setting panel | `:404` iterate `settingItems` (จาก `props.items`) | **แทรกแถว engine-owned "ปิดหลบอัตโนมัติ" เมื่อ `autoHide` เปิด** (ไม่ยัดใน editItems = ไม่ล้ำ lane UX) |
| `onMounted`/`onUnmounted` | `:234/241` | add/remove scroll + reduced-motion listener |
| `mobile`/matchMedia 760 · `cap` | `:75/78/235` | **phase C ไม่ใช่ A** (width-cap) — ไม่แตะรอบนี้ |

**สรุป:** phase-A engine work ทั้งหมดอยู่ใน `DockKey.vue` ล้วน · **แยก lane กับ UX สนิท** (UX = `editItems` slim + toolbox ใน `EditorMode.vue`) → ขนานได้ ไม่ชนไฟล์

---

## 2 · phase-A engine design (hide-on-scroll + a11y toggle)

### 2.1 prop `auto-hide` (2-host กันพระคำเจ็บ)
- `autoHide: { type: Boolean, default: false }` — ค่า default **false** = พระคำ read-aloud island **พฤติกรรมเดิมเป๊ะ** ถ้าไม่ส่ง prop
- editor เปิดใช้: **UX** ใส่ `:auto-hide="true"` ที่ `<DockKey>` ใน `EditorMode.vue:2994` (1 บรรทัด · lane UX — PM sequence ให้ UX ใส่ หรือ dev ใส่ตอน wiring pass)

### 2.2 hide-on-scroll (Material BottomAppBar pattern)
- state: `autoHidden = ref(false)` · เปิดทำงานเมื่อ `props.autoHide === true` เท่านั้น
- **แยก translate จาก drag:** ห่อ `.dk-dock` ด้วย `.dk-shift` (ตัวใหม่ ไม่มี inline transform) → `.dk-shift.hidden { transform: translateY(calc(100% + 16px)); transition: transform .22s ease }`. `.dk-dock` ยังถือ inline `transform` ของ drag/collapse ได้อิสระ (คนละ element = ไม่ชน)
- **peek handle:** `.dk-peek` = ปุ่มจิ๋ว (grip icon · `aria-label="แสดงแถบเครื่องมือ"`) เป็น **พี่น้องของ `.dk-shift` ใน `.dk-host` (ไม่โดน translate)** → เห็นตลอดตอนซ่อน · แตะ = `autoHidden=false` + คืน dock
- **reducer แยกเป็น pure fn (test ได้ใน jsdom):**
  ```
  function nextHidden(prevY, curY, hidden) {
    const dy = curY - prevY
    if (dy > 24) return true       // เลื่อนลง > 24px → ซ่อน (debounce jitter)
    if (dy < -8) return false      // เลื่อนขึ้นนิดเดียว → คืน (Material: reveal ไวกว่า hide)
    return hidden                  // ในช่วง dead-zone → คงเดิม
  }
  ```
  onScroll handler แค่อ่าน `window.scrollY` (หรือ container ตาม SA Q1) → เรียก reducer → set ref · `{ passive: true }`
- **ไม่ซ่อนขณะ:** dock `collapsed` (มินิอยู่แล้ว) · popover เปิด (`openId !== null`) · drag (`gp !== null`) — กัน UX สะดุด

### 2.3 a11y (WCAG · Material · spec §6)
- **`prefers-reduced-motion: reduce` → default auto-hide = OFF** (proxy ของ AT · Material เตือน hide ทำ AT หาแถบไม่เจอ) · ผู้ใช้เปิดกลับเองได้ผ่าน toggle → **ยืนยันกับ SA (Q3)** ว่า proxy นี้พอ หรือให้ default ON + no-animation
- **toggle "ปิดหลบอัตโนมัติ" ใน ⚙:** engine-owned · persist `pleng.dockkey.<storeKey>.autohideoff` (คู่กับ pins/collapsed/alpha `:47-49`) · render เฉพาะเมื่อ `autoHide` prop เปิด → พระคำไม่เห็นแถวนี้
- peek handle + toggle มี `aria-label` ครบ · respect `env(safe-area-inset-bottom)` (มีแล้ว `:614`)

### 2.4 test (Tier A jsdom + Tier B ตามได้จริง)
- **Tier A (vitest · jsdom):** (1) `autoHide=false` → ไม่ผูก listener/ไม่ซ่อนเลย (พระคำ regression gate) (2) `nextHidden()` pure reducer: ลง>24→hidden · ขึ้น<-8→show · dead-zone→คงเดิม (3) toggle persist localStorage + reload อ่านคืน (4) mock `matchMedia('(prefers-reduced-motion: reduce)')` → default off
- **Tier B (Claude Browser MCP · เมื่อรันแอปจริง):** scroll จริงซ่อน dock · peek คืน · ไม่ซ่อนตอน popover/drag/collapsed · วัด 344/390/690/834/desktop no h-scroll
- ⚠️ **worktree caveat:** preview MCP เกาะ primary dir ไม่ใช่ worktree นี้ → self-verify ด้วย `node` import + `curl 127.0.0.1:<port>` 200 (ตาม CLAUDE.md) · Tier-B real-scroll ยืนยันตอน merge

---

## 3 · dependency กับ SA (บล็อกเฉพาะบางจุด)
- **Q1 scroll container (window vs wrapper):** กระทบว่า onScroll ฟัง `window` หรือ preview-float wrapper · **สเปก §2 = window scroll** → เริ่มด้วย window แต่ทำ container ให้ inject ได้ (prop/detect) เผื่อ SA ชี้ wrapper
- **Q3 AT-detect:** กระทบ default ตอน reduced-motion (OFF vs ON+no-anim) — **ผมเสนอ default OFF** รอ SA ฟันธง
- Q2 (visualViewport) / Q4 (width-cap) / Q5 (scope filter) = **phase C/B ไม่บล็อก phase A**

---

## 4 · 2-host DoD (บังคับก่อน merge)
1. `autoHide` default false → พระคำ island ต้องเหมือนเดิมทุกจอ (regression)
2. rebuild `pk-dock-island.js` ฝั่งพระคำ (repo `phrakham.life2` consume `@pleng`) + สโม๊คทั้ง 2 host
3. test เขียวทั้ง Tier A + Tier B

---

## 5 · Network URL (มือถือทดสอบ)
- ยังไม่ start dev server (read-only prep) · **เมื่อ PM เคาะให้ build → รัน `npm run dev -- --host --port 5312` แล้วเติม `http://<IP>:5312/#/studio` ที่นี่**

---

**ขอ PM:** (1) เคาะ phase-A plan + sequence UX/dev บน `EditorMode.vue` (ผมแตะแค่ `DockKey.vue`) (2) relay SA Q1+Q3 → ผมเริ่ม build phase A ได้ทันที · *dev prep · 2026-07-18*
