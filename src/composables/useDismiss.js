// useDismiss — one shared, world-class "close this popover" behaviour for every menu.
//
// Why this exists (BI-016): before this, each popover rolled its own dismiss. Some relied on a
// single shared .sb-backdrop (which silently died once and disabled click-outside for the whole
// shell), some had a per-component document listener, and several tool popovers (Aa size, ⬇
// download, the account menu) had ONLY @keydown.esc — so clicking away never closed them. This
// gives all of them the same behaviour in one place.
//
// What it does while `isOpen` is true (WAI-ARIA APG "menu / disclosure" + Material dismiss):
//   • pointer-down outside  → close      (mandatory; the everyday "click away")
//   • Escape                → close + return focus to the trigger   (mandatory; keyboard)
//   • focus leaves the menu → close      (tab-out; non-modal menus must not strand focus)
//
// Implementation notes that make it robust:
//   • pointerdown, not click — captures the INTENT at press, and a text-selection drag that
//     starts inside and releases outside won't spuriously close it (a plain click would).
//   • capture phase — fires even if a child calls stopPropagation() on the bubbling event.
//   • composedPath() — TELEPORT-SAFE. A panel <Teleport>ed to <body> is no longer a DOM
//     descendant of its trigger, so trigger.contains(panel) is false; composedPath still lists
//     the real elements the event passed through, so we test membership against that instead.
//   • listeners attach only while open (and detach on close / unmount) — no standing global cost,
//     and the pointerdown that OPENED the menu is already finished before we start listening, so
//     it can't immediately close it (no open→close race).
//
// Usage:
//   const wrap = ref(null)      // element that contains BOTH the trigger and the panel
//   const btn  = ref(null)      // the trigger button (for focus-return on Esc)
//   useDismiss(open, { inside: wrap, trigger: btn, onDismiss: () => (open.value = false) })
//
//   For a teleported panel, pass every "inside" region as an array:
//   useDismiss(open, { inside: [triggerEl, teleportedPanelEl], onDismiss })
import { watch, onScopeDispose } from 'vue'

const val = (r) => (typeof r === 'function' ? r() : r && 'value' in r ? r.value : r)

export function useDismiss(isOpen, options) {
  const {
    inside,                 // Ref | getter | Element | array of any of these — the "not outside" region(s)
    trigger,                // optional Ref/getter/Element — focus returns here on Esc
    onDismiss,              // required — caller owns the state; we only ask it to close
    enabled,               // optional () => boolean — return false to SUPPRESS outside-close
                            //   (e.g. a login form with unsaved input); Esc still closes.
    escape = true,
    outside = true,
    focusOut = true,
  } = options

  // Resolve every "inside" region to a live element list at event time (refs may be null until mount).
  function insideEls() {
    const raw = Array.isArray(inside) ? inside : [inside]
    return raw.map(val).filter(Boolean)
  }
  function pathHitsInside(path) {
    const els = insideEls()
    const t = val(trigger)
    if (t) els.push(t)
    return els.some((el) => path.includes(el))
  }
  function nodeInside(node) {
    if (!node) return false
    const els = insideEls()
    const t = val(trigger)
    if (t) els.push(t)
    return els.some((el) => el === node || el.contains(node))
  }

  function onPointerDown(e) {
    if (enabled && !enabled()) return
    if (!pathHitsInside(e.composedPath())) onDismiss()
  }

  function onKeyDown(e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return
    e.stopPropagation() // this popover consumes the Esc (so a nested one closes one layer at a time)
    onDismiss()
    const t = val(trigger)
    if (t && typeof t.focus === 'function') t.focus()
  }

  // Focus moved somewhere that is neither the trigger nor inside the panel → tab-out; close.
  function onFocusIn(e) {
    if (nodeInside(e.target)) return
    onDismiss()
  }

  function attach() {
    if (outside) document.addEventListener('pointerdown', onPointerDown, true)
    if (escape) document.addEventListener('keydown', onKeyDown, true)
    if (focusOut) document.addEventListener('focusin', onFocusIn, true)
  }
  function detach() {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown, true)
    document.removeEventListener('focusin', onFocusIn, true)
  }

  watch(
    () => val(isOpen),
    (open) => (open ? attach() : detach()),
    { immediate: true },
  )
  onScopeDispose(detach)
}
