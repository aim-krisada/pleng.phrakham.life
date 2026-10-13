// ใบ v3/pleng#116 — read a rendered SongSheet back as text (used by render.mjs and compare.mjs).
// strip = the markup without Vue's bookkeeping comments · rowsOf = each sheet line as the reader reads it,
// ' / ' where a long line is cut into a new lyric line, spaces squeezed.
export const strip = (html) => html.replace(/<!--[\s\S]*?-->/g, '')
export function rowsOf(html) {
  return strip(html)
    .split(/<div [^>]*class="song-line\b[^>]*>/).slice(1)
    .map((chunk) => chunk
      .replace(/<span class="lyric-cut"[^>]*><\/span>/g, ' / ')
      .replace(/<[^>]+>/g, '')
      .replace(/\u2060/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim())
}
