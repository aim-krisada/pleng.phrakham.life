/* pk-drawer.js — the ONE shared off-canvas navigation drawer core.
 *
 * WHY THIS FILE EXISTS
 *   Both sites (phrakham.life AND pleng.phrakham.life) need the same left
 *   off-canvas menu drawer: a sliding panel + scrim behind the ☰ button, with
 *   all the fiddly a11y (focus-trap, Esc, scroll-lock, inert background, restore
 *   focus) done right ONCE. This is that single implementation. Edit it here;
 *   pleng copies the file verbatim — no second copy to keep in sync.
 *
 * PORTABLE BY DESIGN — VANILLA, ZERO FRAMEWORK, ZERO BOOTSTRAP
 *   pleng is Vue and ships no Bootstrap; phrakham is Quarto/Bootstrap. A drawer
 *   built on Bootstrap's `.offcanvas` could not be shared into Vue, so this core
 *   depends on NEITHER. It is pure DOM + one self-injected <style> that reads the
 *   Warm-Study palette through CSS custom properties with hard-coded fallbacks
 *   (var(--pk-accent,#8B4513) …), so it looks right whether or not the host page
 *   defines those tokens. Classes are namespaced `.pk-drawer*` so they never clash
 *   with Bootstrap's `.offcanvas`/`.collapse`.
 *
 * THE SEAM (what makes it host-agnostic)
 *   The core owns the SHELL — off-canvas positioning, slide + scrim, open/close,
 *   and every a11y behaviour. The CALLER owns the CONTENT — it passes a `panel`
 *   DOM node and fills it with whatever it likes (phrakham: static nav + tools;
 *   pleng: a Vue-rendered tree). The core never dictates what lives inside.
 *
 * DYNAMIC CONTENT (the Vue case)
 *   Focusable descendants are re-queried on EVERY open() — never cached at
 *   create() — because pleng renders the panel's children AFTER create(). A cached
 *   list would trap the wrong nodes. handle.refresh() re-scans while the drawer is
 *   already open (e.g. Vue swapped the panel contents live).
 *
 * ACCESSIBILITY (WCAG 2.2 AA — see memory/web-quality-standards.md)
 *   role="dialog" + aria-modal, aria-label, trigger aria-expanded synced, focus
 *   trap + restore, Esc + scrim close, background inert/aria-hidden, body scroll
 *   lock, honours prefers-reduced-motion, safe-area-inset aware, ≥44px close btn.
 *
 * API
 *   window.PKDrawer.create({
 *     side:'left'|'right', trigger:selector|Element, panel:selector|Element,
 *     label:'เมนู', width:'min(86vw,360px)', scrim:true, onOpen:fn, onClose:fn
 *   }) -> { open(), close(), toggle(), isOpen(), refresh(), destroy() }
 */
(function () {
  if (window.PKDrawer) return;                 // guard against double-load

  var STYLE_ID = 'pk-drawer-style';
  var CSS =
    /* the sliding panel — fixed, full-height, off-canvas until .is-open. The slide
       is a GPU transform; visibility is delayed on close so the slide-out plays out
       before the panel becomes unfocusable/inert. */
    '.pk-drawer{position:fixed;top:0;bottom:0;z-index:var(--z-drawer,1050);' +
    'display:flex;flex-direction:column;' +
    'width:min(86vw,360px);max-width:100vw;' +
    'background:var(--pk-cream,#FAF6F0);color:var(--pk-ink,#2D2A26);' +
    'box-shadow:0 0 24px rgba(45,42,38,.28);' +
    'visibility:hidden;' +
    'transition:transform .28s ease,visibility 0s linear .28s;' +
    'overflow-y:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}' +
    /* left / right anchoring + resting off-canvas position */
    '.pk-drawer--left{left:0;transform:translateX(-100%);' +
    'padding-left:env(safe-area-inset-left);' +
    'border-right:1px solid var(--pk-border,#E0D6C8)}' +
    '.pk-drawer--right{right:0;transform:translateX(100%);' +
    'padding-right:env(safe-area-inset-right);' +
    'border-left:1px solid var(--pk-border,#E0D6C8)}' +
    /* safe-area at top/bottom for notched phones */
    '.pk-drawer{padding-top:env(safe-area-inset-top);' +
    'padding-bottom:env(safe-area-inset-bottom)}' +
    '.pk-drawer.is-open{transform:translateX(0);visibility:visible;' +
    'transition:transform .28s ease,visibility 0s}' +
    /* scrim — dim backdrop, click-to-close */
    '.pk-drawer-scrim{position:fixed;inset:0;z-index:var(--z-scrim,1040);' +
    'background:rgba(45,42,38,.5);opacity:0;visibility:hidden;' +
    'transition:opacity .28s ease,visibility 0s linear .28s}' +
    '.pk-drawer-scrim.is-open{opacity:1;visibility:visible;' +
    'transition:opacity .28s ease,visibility 0s}' +
    /* built-in close (×) button — the caller may also close via its own controls */
    '.pk-drawer__close{position:absolute;top:calc(env(safe-area-inset-top) + .35rem);' +
    'inset-inline-end:.35rem;width:44px;height:44px;' +
    'display:flex;align-items:center;justify-content:center;' +
    'background:none;border:none;cursor:pointer;border-radius:8px;' +
    'color:var(--pk-accent,#8B4513)}' +
    '.pk-drawer__close:hover{background:rgba(139,69,19,.08)}' +
    '.pk-drawer__close:focus-visible{outline:2px solid var(--pk-accent,#8B4513);outline-offset:2px}' +
    '.pk-drawer__close svg{width:24px;height:24px;fill:none;stroke:currentColor;' +
    'stroke-width:2;stroke-linecap:round;stroke-linejoin:round}' +
    /* reduced motion: no slide, just show/hide */
    '@media (prefers-reduced-motion:reduce){' +
    '.pk-drawer{transition:visibility 0s}' +
    '.pk-drawer.is-open{transition:visibility 0s}' +
    '.pk-drawer-scrim{transition:visibility 0s}' +
    '.pk-drawer-scrim.is-open{transition:visibility 0s}}' +
    '@media print{.pk-drawer,.pk-drawer-scrim{display:none!important}}';

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var s = document.createElement('style');
    s.id = STYLE_ID;
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  function resolve(elOrSel) {
    if (!elOrSel) return null;
    return typeof elOrSel === 'string' ? document.querySelector(elOrSel) : elOrSel;
  }

  // Lucide "x" — inline so the core needs no icon dependency.
  var IC_CLOSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  var FOCUSABLE =
    'a[href],area[href],button:not([disabled]),input:not([disabled]),' +
    'select:not([disabled]),textarea:not([disabled]),iframe,object,embed,' +
    '[tabindex]:not([tabindex="-1"]),[contenteditable="true"]';

  // openInstances lets nested/stacked usage stay correct: only the LAST close
  // restores the background (removes inert) and the scroll-lock.
  var openInstances = 0;
  var savedScrollY = 0;

  function lockScroll() {
    if (openInstances > 0) return;               // already locked by another drawer
    savedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.top = '-' + savedScrollY + 'px';
    document.body.style.position = 'fixed';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
    if (sbw > 0) document.body.style.paddingRight = sbw + 'px';   // no layout jump
  }
  function unlockScroll() {
    if (openInstances > 0) return;               // another drawer still open
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    document.body.style.paddingRight = '';
    window.scrollTo(0, savedScrollY);
  }

  function create(opts) {
    opts = opts || {};
    injectStyle();

    var side = opts.side === 'right' ? 'right' : 'left';
    var panel = resolve(opts.panel);
    if (!panel) { console.warn('[pk-drawer] no panel element'); return null; }
    var trigger = resolve(opts.trigger);
    var useScrim = opts.scrim !== false;
    var label = opts.label || 'เมนู';

    // ---- Shell setup ----
    panel.classList.add('pk-drawer', 'pk-drawer--' + side);
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', label);
    panel.setAttribute('tabindex', '-1');
    if (opts.width) panel.style.width = opts.width;
    // Lift the panel to be a direct child of <body> so the off-canvas overlay sits
    // above everything and the background-inert loop (siblings of the panel) is clean.
    if (panel.parentNode !== document.body) document.body.appendChild(panel);

    var scrim = null;
    if (useScrim) {
      scrim = document.createElement('div');
      scrim.className = 'pk-drawer-scrim';
      document.body.appendChild(scrim);
    }

    // Built-in close button (first child so it's the first tab stop).
    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'pk-drawer__close';
    closeBtn.setAttribute('aria-label', 'ปิดเมนู');
    closeBtn.title = 'ปิดเมนู';
    closeBtn.innerHTML = IC_CLOSE;
    panel.insertBefore(closeBtn, panel.firstChild);

    if (trigger) {
      trigger.setAttribute('aria-haspopup', 'dialog');
      trigger.setAttribute('aria-expanded', 'false');
    }

    var isOpen = false;
    var lastFocused = null;

    function getFocusables() {
      // LIVE query every call — never cached — so dynamically added content
      // (pleng's Vue tree) is always trapped correctly.
      return [].slice.call(panel.querySelectorAll(FOCUSABLE)).filter(function (el) {
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement;
      });
    }

    function setBackgroundInert(on) {
      // inert every direct child of <body> except this panel + its scrim, so the
      // background is neither focusable nor read by AT while the drawer is open.
      var kids = document.body.children;
      for (var i = 0; i < kids.length; i++) {
        var el = kids[i];
        if (el === panel || el === scrim) continue;
        if (on) {
          if (el.hasAttribute('data-pk-drawer-inert')) continue;
          // remember what we changed so we only undo our own edits
          if (el.hasAttribute('inert')) el.setAttribute('data-pk-had-inert', '1');
          if (el.hasAttribute('aria-hidden')) el.setAttribute('data-pk-had-ah', el.getAttribute('aria-hidden'));
          el.setAttribute('data-pk-drawer-inert', '1');
          el.setAttribute('inert', '');
          el.setAttribute('aria-hidden', 'true');
        } else {
          if (!el.hasAttribute('data-pk-drawer-inert')) continue;
          el.removeAttribute('data-pk-drawer-inert');
          if (el.hasAttribute('data-pk-had-inert')) el.removeAttribute('data-pk-had-inert');
          else el.removeAttribute('inert');
          if (el.hasAttribute('data-pk-had-ah')) { el.setAttribute('aria-hidden', el.getAttribute('data-pk-had-ah')); el.removeAttribute('data-pk-had-ah'); }
          else el.removeAttribute('aria-hidden');
        }
      }
    }

    function onKeydown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      var f = getFocusables();
      if (!f.length) { e.preventDefault(); panel.focus(); return; }
      var first = f[0], last = f[f.length - 1];
      var active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !panel.contains(active)) { e.preventDefault(); last.focus(); }
      } else {
        if (active === last || !panel.contains(active)) { e.preventDefault(); first.focus(); }
      }
    }

    function focusFirst() {
      var f = getFocusables();
      (f.length ? f[0] : panel).focus();
    }

    function open() {
      if (isOpen) return;
      isOpen = true;
      lastFocused = document.activeElement;
      lockScroll();
      openInstances++;
      setBackgroundInert(true);
      if (scrim) scrim.classList.add('is-open');
      panel.classList.add('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
      document.addEventListener('keydown', onKeydown, true);
      // Focus SYNCHRONOUSLY — the panel is already visibility:visible (is-open applied
      // above), and rAF is throttled to never in a backgrounded/headless tab, so an
      // rAF-gated focus would silently strand the trap (same lesson as pk-fontsize).
      focusFirst();
      if (typeof opts.onOpen === 'function') opts.onOpen();
    }

    function close() {
      if (!isOpen) return;
      isOpen = false;
      panel.classList.remove('is-open');
      if (scrim) scrim.classList.remove('is-open');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
      document.removeEventListener('keydown', onKeydown, true);
      openInstances = Math.max(0, openInstances - 1);
      setBackgroundInert(false);
      unlockScroll();
      // restore focus to whatever opened the drawer (usually the ☰ trigger)
      var restore = trigger || lastFocused;
      if (restore && typeof restore.focus === 'function') restore.focus();
      if (typeof opts.onClose === 'function') opts.onClose();
    }

    function toggle() { isOpen ? close() : open(); }

    function refresh() {
      // Content changed while open — if focus fell outside the panel (e.g. Vue
      // replaced the focused node), pull it back to the first focusable.
      if (!isOpen) return;
      if (!panel.contains(document.activeElement)) focusFirst();
    }

    function destroy() {
      close();
      document.removeEventListener('keydown', onKeydown, true);
      if (scrim && scrim.parentNode) scrim.parentNode.removeChild(scrim);
      if (closeBtn && closeBtn.parentNode) closeBtn.parentNode.removeChild(closeBtn);
      panel.classList.remove('pk-drawer', 'pk-drawer--' + side, 'is-open');
      panel.removeAttribute('role'); panel.removeAttribute('aria-modal');
      panel.removeAttribute('aria-label'); panel.removeAttribute('tabindex');
      if (trigger) {
        trigger.removeAttribute('aria-haspopup');
        trigger.removeAttribute('aria-expanded');
        trigger.removeEventListener('click', onTriggerClick);
      }
    }

    // ---- Wiring ----
    function onTriggerClick(e) { e.preventDefault(); e.stopPropagation(); toggle(); }
    if (trigger) trigger.addEventListener('click', onTriggerClick);
    if (scrim) scrim.addEventListener('click', close);
    closeBtn.addEventListener('click', close);

    return { open: open, close: close, toggle: toggle,
             isOpen: function () { return isOpen; },
             refresh: refresh, destroy: destroy };
  }

  window.PKDrawer = { create: create };
})();
