/* pk-scrollnav.js — floating scroll up/down buttons (Samsung-Internet style).
 *
 * WHY THIS FILE EXISTS
 *   Long study pages (articles, the reader) are tall on phones; jumping back to
 *   the top or down to the end by thumb-scrolling is slow. Samsung Internet shows
 *   a small ▲/▼ pill for exactly this. This is the ONE shared implementation.
 *
 * PORTABLE BY DESIGN (phrakham.life AND pleng.phrakham.life)
 *   Pure vanilla — no framework, no build step. It injects its own <style> once
 *   and reads the Warm-Study palette through CSS custom properties with hard-coded
 *   fallbacks (var(--pk-accent, #8B4513) …), so it looks right whether or not the
 *   host page defines those tokens. Drop the same file into pleng and it works.
 *
 * BEHAVIOUR
 *   - The pill appears only when the page is actually tall enough to scroll.
 *   - ▲ hides when already at the top; ▼ hides when already at the bottom — so on
 *     a page you can't scroll much, one or both simply never show.
 *   - Smooth scroll, unless the user prefers reduced motion (then it jumps).
 *
 * ACCESSIBILITY (WCAG 2.2 AA — see memory/web-quality-standards.md)
 *   44×44 touch targets, Thai aria-labels, brown :focus-visible outline, hover
 *   only under @media (hover: hover) so iOS can't leave :hover stuck after a tap.
 */
(function () {
  if (window.PKScrollNav) return;              // guard against double-load
  window.PKScrollNav = { mounted: false };

  var STYLE_ID = 'pk-scrollnav-style';
  var CSS =
    '.pk-scrollnav{position:fixed;right:max(1rem,env(safe-area-inset-right));' +
    'bottom:calc(1rem + env(safe-area-inset-bottom));z-index:var(--z-dock,1020);display:flex;' +
    'flex-direction:column;gap:.5rem;pointer-events:none}' +
    '.pk-sn-btn{pointer-events:auto;width:44px;height:44px;border-radius:50%;' +
    'display:flex;align-items:center;justify-content:center;cursor:pointer;' +
    /* semi-transparent cream so the text behind stays readable; the modern
       color-mix line overrides the rgba fallback where supported (keeps theming) */
    'background:rgba(250,246,240,.42);' +
    'background:color-mix(in srgb,var(--pk-cream,#FAF6F0) 42%,transparent);' +
    'backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);' +
    'color:var(--pk-accent,#8B4513);' +
    'border:1px solid rgba(224,214,200,.6);' +
    'box-shadow:0 2px 8px rgba(45,42,38,.16);' +
    'opacity:0;transform:translateY(6px);transition:opacity .18s ease,' +
    'transform .18s ease,background .15s ease,color .15s ease;' +
    'visibility:hidden}' +
    '.pk-sn-btn.on{opacity:1;transform:translateY(0);visibility:visible}' +
    /* fade the buttons down while the reader has stopped scrolling (Samsung-style),
       so the text behind is fully readable; any interaction brings them back */
    '.pk-scrollnav.pk-idle .pk-sn-btn.on{opacity:.28}' +
    '.pk-sn-btn:active{opacity:1!important}' +
    '.pk-sn-btn:focus-visible{opacity:1!important}' +
    '.pk-sn-btn svg{width:22px;height:22px;fill:none;stroke:currentColor;' +
    'stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}' +
    '.pk-sn-btn:focus-visible{outline:2px solid var(--pk-accent,#8B4513);' +
    'outline-offset:2px}' +
    '@media (hover:hover){.pk-sn-btn:hover{opacity:1;' +
    'background:var(--pk-accent,#8B4513);color:#fff}}' +
    '@media (prefers-reduced-motion:reduce){.pk-sn-btn{transition:opacity .01s}}' +
    '@media print{.pk-scrollnav{display:none!important}}';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // chevron-up / chevron-down (inline SVG so no extra request, currentColor-driven)
  var UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 15 12 9 18 15"/></svg>';
  var DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>';

  function mkBtn(label, svg) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'pk-sn-btn';
    b.setAttribute('aria-label', label);
    b.title = label;
    b.innerHTML = svg;
    return b;
  }

  function mount() {
    if (window.PKScrollNav.mounted) return;
    window.PKScrollNav.mounted = true;
    injectStyle();

    var prefersReduce = false;
    try { prefersReduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

    var wrap = document.createElement('div');
    wrap.className = 'pk-scrollnav';
    var up = mkBtn('เลื่อนขึ้นบนสุด', UP);
    var down = mkBtn('เลื่อนลงล่างสุด', DOWN);
    wrap.appendChild(up);
    wrap.appendChild(down);
    document.body.appendChild(wrap);

    function scrollTo(y) {
      window.scrollTo({ top: y, behavior: prefersReduce ? 'auto' : 'smooth' });
    }
    up.addEventListener('click', function () { scrollTo(0); });
    down.addEventListener('click', function () {
      scrollTo(document.documentElement.scrollHeight);
    });

    // Show a button only when there's somewhere to go in that direction, and only
    // when the page is tall enough to bother (≈ more than one extra screenful).
    var THRESH = 300;           // px from an edge before its button appears
    var MIN_SCROLLABLE = 600;   // px of overflow before the pill shows at all
    var IDLE_MS = 1200;         // dim the buttons this long after scrolling stops
    var ticking = false, idleTimer = 0;
    function wake() {
      wrap.classList.remove('pk-idle');
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { wrap.classList.add('pk-idle'); }, IDLE_MS);
    }
    function update() {
      ticking = false;
      var doc = document.documentElement;
      var y = window.pageYOffset || doc.scrollTop || 0;
      var vh = window.innerHeight;
      var full = doc.scrollHeight;
      var scrollable = full - vh;
      if (scrollable < MIN_SCROLLABLE) { up.classList.remove('on'); down.classList.remove('on'); return; }
      up.classList.toggle('on', y > THRESH);
      down.classList.toggle('on', y < scrollable - THRESH);
    }
    function onScroll() {
      wake();                   // buttons opaque while moving, dim shortly after
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    // hovering/focusing the pill also wakes it (and cancels a pending dim).
    // pointerover/focusin bubble from the buttons (the wrap itself is click-through)
    wrap.addEventListener('pointerover', wake);
    wrap.addEventListener('focusin', wake);
    update();
    wake();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
