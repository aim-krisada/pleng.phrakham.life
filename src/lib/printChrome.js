// The printed page "chrome" — the running footer that repeats on every sheet:
//   bottom-left  = site name (SSOT)     bottom-center = "หน้า X ของ Y"
//   bottom-right = "พิมพ์เมื่อ <วันที่>"
// All three are @page margin boxes so they share ONE baseline and ONE size (mixing a
// @page counter with a position:fixed div gave different sizes/levels — P'Aim's PDF).
// The date is dynamic, so we inject the whole footer as a <style> just before printing
// (beforeprint) and remove it after — this also makes Ctrl+P print correctly, not only
// our own buttons. counter(page)/counter(pages) resolve only inside @page, which is
// why the footer has to live here and not in a normal element.
import { SITE_NAME } from './songName.js'
import { paperSizeCss } from './paperSize.js'

const THAI_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

// "พิมพ์เมื่อ 8 ก.ค. 69" — Thai Buddhist-era year, last two digits.
export function thaiPrintDate(d = new Date()) {
  const beYear = String((d.getFullYear() + 543) % 100).padStart(2, '0')
  return `พิมพ์เมื่อ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${beYear}`
}

// The @page CSS for a given date string. One shared font decl so all three footer
// boxes read as a single line. `sizeCss` (A4/Letter/A5) is optional — when given it
// pins the physical paper via `@page{size:…}` so the printout matches the user's
// choice; omit it (or pass falsy) to leave the browser's default paper untouched.
export function footerCss(dateStr, sizeCss) {
  const f = "font-family:'Noto Sans Thai','Noto Sans',sans-serif;font-size:9pt;color:#555;"
  return '@media print{@page{'
    + (sizeCss ? `size:${sizeCss};` : '')
    + `@bottom-left{content:"${SITE_NAME}";${f}}`
    + `@bottom-center{content:"หน้า " counter(page) " ของ " counter(pages);${f}}`
    + `@bottom-right{content:"${dateStr}";${f}}`
    + '}}'
}

const STYLE_ID = 'pk-print-footer'

// Call once at app start. Injects the footer right before every print and clears it
// after, so the date is always today and the markup is clean between prints.
export function initPrintChrome() {
  if (typeof window === 'undefined') return
  const before = () => {
    let el = document.getElementById(STYLE_ID)
    if (!el) {
      el = document.createElement('style')
      el.id = STYLE_ID
      document.head.appendChild(el)
    }
    el.textContent = footerCss(thaiPrintDate(), paperSizeCss())
  }
  const after = () => document.getElementById(STYLE_ID)?.remove()
  window.addEventListener('beforeprint', before)
  window.addEventListener('afterprint', after)
}
