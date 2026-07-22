// QR generation — SELF-HOSTED, no network (PWA-offline · memory pleng-pwa-self-host-samples).
// Wraps the bundled `qrcode-generator` (zero-dep, pure JS) and returns an inline <svg> string,
// so a QR renders from a data string alone — no canvas, no CDN, works offline. Used by the
// share sheet to show a scannable code for a song/playlist link.
import qrcode from 'qrcode-generator'

// Build an <svg> string for `text`. Error-correction defaults to 'M'; if the data is too large
// for that level (throws), retry down to 'L' (more capacity) so a long list link still renders.
// `cell` = module size in px, `margin` = quiet-zone in modules (QR spec wants ≥ 4).
export function qrSvg(text, { cell = 4, margin = 4 } = {}) {
  for (const ec of ['M', 'L']) {
    try {
      const qr = qrcode(0, ec) // type 0 = auto-pick the smallest version that fits
      qr.addData(String(text))
      qr.make()
      // scalable so CSS controls the on-screen size; the svg keeps crisp module edges.
      return qr.createSvgTag({ cellSize: cell, margin, scalable: true })
    } catch { /* data too big for this EC level — try the next */ }
  }
  return '' // unreachable for our short links; empty string = caller hides the QR
}
