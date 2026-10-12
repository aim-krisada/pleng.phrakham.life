// Footer ↔ dock clearance + the bottom bar (ใบ v3/pleng#108 → #111).
//
// The music/edit dock is a bar fixed to the viewport bottom on every page and at every width
// (ใบ#111). measureDockClear() publishes on <html>:
//   --dock-clear  the band the sticky footer must reserve so it sits flush on top of the bar
//                 (footer.footer-dock-clear in styles.css adds the iPhone home-bar inset itself)
//   --dock-bar-h  the FULL height of the bar (home-bar inset included), only while a fixed bar
//                 is showing, together with the class `has-dock-bar`. styles.css uses it to lift
//                 the round scroll-to-top/bottom buttons (pk-scrollnav) above the bar, and as
//                 `scroll-padding-bottom` so a field scrolled into view lands above the bar
//                 (WCAG 2.4.11 · technique C43 — lib/focusClear.js is the script half).
// Nothing is published while the bar is out of the way: in the page flow in a short window
// (`.dk-flow`), or stepped aside for the on-screen keyboard (its box is then 0 tall).
// Studio keeps all three modes mounted, so the bar that is actually showing is picked.
// Returns the element it measured (App.vue keeps a ResizeObserver on it), or null.
export const DOCK_BAR_SEL = '.dk-host.dk-bar:not(.dk-flow) > .dk-dock'
export function measureDockClear(doc = document, win = window) {
  const root = doc.documentElement
  const bar = [...doc.querySelectorAll(DOCK_BAR_SEL)]
    .find((el) => el.getBoundingClientRect().height > 0)
  const dock = doc.querySelector('.sd-wrap') || bar || null
  let h = 0
  let barH = 0
  if (dock) {
    const cs = win.getComputedStyle(dock)
    const r = dock.getBoundingClientRect()
    // count it only while it's a real, visible bar anchored to the bottom edge
    if (cs.display !== 'none' && r.height > 0 && r.bottom >= win.innerHeight - 4) {
      h = r.height
      if (dock === bar) {
        barH = r.height
        // the bar's own bottom padding already holds the iPhone home-bar inset, which the footer
        // rule adds again — take it out here so the footer sits flush on the bar, not a gap above
        h -= Math.max(0, (parseFloat(cs.paddingBottom) || 0) - (parseFloat(cs.paddingTop) || 0))
      }
    }
  }
  root.style.setProperty('--dock-clear', Math.round(h) + 'px')
  if (barH > 0) {
    root.style.setProperty('--dock-bar-h', Math.round(barH) + 'px')
    root.classList.add('has-dock-bar')
  } else {
    root.style.removeProperty('--dock-bar-h')
    root.classList.remove('has-dock-bar')
  }
  return dock
}
