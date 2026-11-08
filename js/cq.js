/* Container query units (cqw) polyfill.
   iPhone 7/8 և այլ հին սարքեր (Safari < 16) չեն հասկանում `cqw`՝ դիզայնը փլուզվում էր։
   CSS-ում 1cqw-ը գրված է որպես var(--cqw)։ Նոր զննարկիչներում --cqw = 1cqw (ոչինչ չի փոխվում),
   իսկ հինում այս սկրիպտը յուրաքանչյուր կոնտեյների վրա դնում է --cqw = (լայնություն / 100) px։ */
(function () {
  'use strict';

  var supported = false;
  try { supported = !!(window.CSS && CSS.supports && CSS.supports('width', '1cqw')); } catch (e) {}
  if (supported && !/[?&]nocq\b/.test(location.search)) return;

  var SEL = '.stage, .film__frame, .hello__stage, .route, .rsvp, .hb__frame, .v';
  var els = Array.prototype.slice.call(document.querySelectorAll(SEL));
  if (!els.length) return;

  function px(v) { v = parseFloat(v); return isNaN(v) ? 0 : v; }

  function apply(el) {
    var cs = window.getComputedStyle(el);
    var w = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
    if (w > 0) el.style.setProperty('--cqw', (w / 100).toFixed(4) + 'px');
  }
  function applyAll() { els.forEach(apply); }

  applyAll();
  // ներքին կոնտեյները կախված է արտաքինից՝ երկրորդ անցում, որ լայնությունները կայունանան
  window.addEventListener('load', applyAll);
  window.addEventListener('resize', applyAll);
  window.addEventListener('orientationchange', function () { setTimeout(applyAll, 150); });
  if (window.ResizeObserver) {
    var ro = new ResizeObserver(function () { applyAll(); });
    els.forEach(function (el) { ro.observe(el); });
  }
})();
