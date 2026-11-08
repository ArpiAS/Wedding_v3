/* ==================== ԲԱՑՈՒՄ (տարբերակ B) ====================
   Աղավնին կտուցով քաշում է վարագույրը, և այն հավաքվում է ձախ եզրին։
   Վարագույրը գծվում է <canvas>-ով (ոչ մի նկար, ոչ մի getImageData՝ file://-ով էլ աշխատում է).
     · ատլասե գործվածք՝ ծալքերով, փայլով, ստվերներով, մանր հյուսվածքով
     · ոսկե ձող՝ օղակներով (օղակները սահում և կուտակվում են ձողի վրա)
     · ժանյակե եզր՝ ատամիկներով, մարգարիտներով, փոքրիկ սրտերով
     · ասեղնագործ՝ ոսկե սրտեր, ծաղկեպսակ ստորին եզրին, փայլիկներ
     · վերջում՝ կարմիր ատլասե ժապավեն՝ ռոզաներով (tie-back)
     · թռչող վարդի թերթիկներ
   Անիմացիան՝ ~5.5 վ, սեղմելով՝ բաց թողնվում է։ prefers-reduced-motion՝ վարագույր չկա։ */
(function () {
  'use strict';

  var hb = document.getElementById('herob');
  if (!hb) return;
  var frame = hb.querySelector('.hb__frame');
  var cv = hb.querySelector('.hb__cv');
  var dove = hb.querySelector('.hb__dove');
  if (!frame || !cv || !dove || !cv.getContext) { hb.classList.add('is-names'); hb.classList.add('is-half'); return; }
  var ctx = cv.getContext('2d');
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- պարամետրեր ---------- */
  var END   = 0.085;          // վերջնական լայնությունը (հավաքված վիճակում), ամբողջ լայնության մասով
  var DELAY = 1250;           // աղավնու մոտենալուց հետո սկսելու ուշացում (մվ)
  var DUR   = 4300;           // քաշելու տևողությունը (մվ)
  var TIP   = 0.34;           // կտուցի բարձրությունը (մասով)
  var TIE   = 0.585;          // ժապավենի բարձրությունը
  var PETAL_MS = 9000;        // թերթիկների տևողությունը ավարտից հետո

  var TAU = Math.PI * 2;
  var W = 0, H = 0, dpr = 1;
  var done = false, startAt = 0, raf = 0, curP = 0, finishAt = 0, namesStarted = false;
  var petals = [], lastT = 0, spawnAcc = 0, running = false;

  // վիդեոյի թույլտվություն (main.js-ը լսում է). միանգամյա
  var halfSent = false;
  function sendHalf() {
    if (halfSent) return; halfSent = true;
    hb.classList.add('is-half');
    try { window.dispatchEvent(new Event('hb:half')); }
    catch (e) { var ev = document.createEvent('Event'); ev.initEvent('hb:half', true, true); window.dispatchEvent(ev); }
  }

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function rgb(c, k) { k = k || 1; return 'rgb(' + Math.round(c[0] * k) + ',' + Math.round(c[1] * k) + ',' + Math.round(c[2] * k) + ')'; }

  /* ---------- փոքր նկարիչներ (սիրտ, ծաղիկ, վարդ, տերև) ---------- */
  function heart(c, x, y, r, sx) {
    sx = sx || 1;
    c.beginPath();
    c.moveTo(x, y + r * .95);
    c.bezierCurveTo(x - r * 1.55 * sx, y + r * .05, x - r * 1.15 * sx, y - r * 1.0, x, y - r * .42);
    c.bezierCurveTo(x + r * 1.15 * sx, y - r * 1.0, x + r * 1.55 * sx, y + r * .05, x, y + r * .95);
    c.closePath();
  }
  function flower(c, x, y, r, sx) {
    sx = sx || 1;
    for (var i = 0; i < 5; i++) {
      var a = i * TAU / 5 - Math.PI / 2;
      c.beginPath();
      c.ellipse(x + Math.cos(a) * r * .62 * sx, y + Math.sin(a) * r * .62, r * .5 * sx, r * .5, 0, 0, TAU);
      c.fill();
    }
  }
  function leaf(c, x, y, len, wid, ang, fill, vein) {
    c.save(); c.translate(x, y); c.rotate(ang);
    c.fillStyle = fill;
    c.beginPath();
    c.moveTo(0, 0);
    c.bezierCurveTo(len * .3, -wid, len * .8, -wid * .8, len, 0);
    c.bezierCurveTo(len * .8, wid * .8, len * .3, wid, 0, 0);
    c.fill();
    if (vein) { c.strokeStyle = vein; c.lineWidth = .7; c.beginPath(); c.moveTo(len * .05, 0); c.lineTo(len * .92, 0); c.stroke(); }
    c.restore();
  }
  function rose(c, x, y, R, rot, tone) {
    var o = tone ? [[252, 228, 228], [232, 180, 186], [200, 132, 142]] : [[255, 252, 246], [240, 225, 208], [208, 185, 162]];
    c.save(); c.translate(x, y); c.rotate(rot);
    c.fillStyle = 'rgba(70,40,40,.2)';
    c.beginPath(); c.ellipse(1.3, 2.2, R * 1.04, R * .98, 0, 0, TAU); c.fill();
    function petal(px, py, rx, ry, a) {
      c.save(); c.translate(px, py); c.rotate(a);
      var g = c.createRadialGradient(0, -ry * .3, ry * .08, 0, 0, ry * 1.2);
      g.addColorStop(0, rgb(o[0])); g.addColorStop(.62, rgb(o[1])); g.addColorStop(1, rgb(o[2]));
      c.fillStyle = g;
      c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(120,80,72,.30)'; c.lineWidth = .7; c.stroke();
      c.restore();
    }
    var i, a;
    for (i = 0; i < 6; i++) { a = i * TAU / 6; petal(Math.sin(a) * R * .52, -Math.cos(a) * R * .52, R * .5, R * .46, a); }
    for (i = 0; i < 5; i++) { a = i * TAU / 5 + .4; petal(Math.sin(a) * R * .3, -Math.cos(a) * R * .3, R * .34, R * .3, a); }
    petal(0, 0, R * .27, R * .24, .5);
    c.strokeStyle = 'rgba(135,90,82,.55)'; c.lineWidth = .8;
    c.beginPath(); c.arc(-R * .02, 0, R * .17, .4, 4.7); c.stroke();
    c.beginPath(); c.arc(R * .04, R * .02, R * .09, 3.4, 7.3); c.stroke();
    c.restore();
  }

  /* ---------- նախապես պատրաստված պատկերներ (sprite) ---------- */
  var grainPat = null, tieSprite = null, TS = { w: 96, h: 100, ox: 30, oy: 50 };

  function makeGrain() {
    var c = document.createElement('canvas'); c.width = c.height = 96;
    var g = c.getContext('2d'), id = g.createImageData(96, 96), d = id.data, i, v;
    for (i = 0; i < d.length; i += 4) {
      v = 120 + Math.random() * 135;
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 22 + Math.random() * 20;
    }
    g.putImageData(id, 0, 0);
    grainPat = ctx.createPattern(c, 'repeat');
  }

  function makeTie() {
    var c = document.createElement('canvas');
    c.width = Math.round(TS.w * dpr); c.height = Math.round(TS.h * dpr);
    var g = c.getContext('2d');
    g.scale(dpr, dpr);
    g.translate(TS.ox, TS.oy);                    // (0,0) = հանգույցի կենտրոն
    var wine1 = '#6e2024', wine2 = '#9a343a', wine3 = '#c0555a';
    // տերևներ (էվկալիպտ / ձիթենի)
    var lf = 'rgba(138,160,124,.96)', lv = 'rgba(70,92,62,.55)';
    leaf(g, 8, -8, 30, 6.5, -1.05, lf, lv); leaf(g, 10, -6, 28, 6, -.35, 'rgba(158,178,142,.96)', lv);
    leaf(g, 6, -10, 26, 6, -1.7, 'rgba(120,146,108,.96)', lv); leaf(g, 12, -2, 24, 5.5, .35, lf, lv);
    // գիպսոֆիլա (մանր սպիտակ կետեր)
    g.strokeStyle = 'rgba(120,130,100,.6)'; g.lineWidth = .7;
    var gp = [[30, -34], [38, -26], [24, -40], [40, -12], [34, -38], [16, -44], [43, -20]], k;
    for (k = 0; k < gp.length; k++) {
      g.beginPath(); g.moveTo(10, -6); g.lineTo(gp[k][0], gp[k][1]); g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(gp[k][0], gp[k][1], 2.1, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(gp[k][0] + 2.3, gp[k][1] + 1.2, 1.4, 0, TAU); g.fill();
    }
    // ժապավենի պոչեր
    function tail(x0, ang, flip) {
      g.save(); g.translate(0, 2); g.scale(flip, 1); g.rotate(ang);
      var gr = g.createLinearGradient(0, 0, 14, 0);
      gr.addColorStop(0, wine1); gr.addColorStop(.5, wine3); gr.addColorStop(1, wine2);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(-1, 0); g.bezierCurveTo(4, 14, 12, 26, 8, 40); g.lineTo(13, 36); g.lineTo(18, 42); g.bezierCurveTo(20, 28, 16, 12, 9, 0); g.closePath(); g.fill();
      g.restore();
    }
    tail(0, .18, -1); tail(0, -.08, 1);
    // օղակներ
    function loop(sx, sy, ex, ey, cx1, cy1, cx2, cy2) {
      var gr = g.createLinearGradient(sx, sy, ex, ey);
      gr.addColorStop(0, wine2); gr.addColorStop(.55, wine3); gr.addColorStop(1, wine1);
      g.fillStyle = gr;
      g.beginPath(); g.moveTo(sx, sy); g.bezierCurveTo(cx1, cy1, cx2, cy2, ex, ey); g.bezierCurveTo(cx2 + 6, cy2 + 18, cx1 + 4, cy1 + 16, sx, sy); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(70,16,20,.5)'; g.lineWidth = .7; g.stroke();
    }
    loop(-1, 0, -27, -13, -14, -26, -34, -26);
    loop(1, 0, 27, -12, 14, -26, 34, -24);
    loop(-1, 1, -26, 10, -14, 18, -33, 18);
    loop(1, 1, 24, 11, 14, 19, 33, 17);
    // հանգույց
    var kg = g.createRadialGradient(-1.5, -1.5, 1, 0, 0, 7);
    kg.addColorStop(0, wine3); kg.addColorStop(1, wine1);
    g.fillStyle = kg; g.beginPath(); g.ellipse(0, 0, 6, 7, 0, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(255,220,220,.35)'; g.lineWidth = .8; g.beginPath(); g.arc(0, 0, 4, 3.6, 5.2); g.stroke();
    // վարդեր
    rose(g, 17, -22, 11.5, .3, 0);
    rose(g, 31, -8, 9, 1.1, 1);
    rose(g, 5, -31, 8.5, 2.0, 0);
    tieSprite = c;
  }

  /* ---------- չափեր ---------- */
  function layout() {
    var nw = frame.clientWidth, nh = frame.clientHeight;
    var nd = Math.min(2, window.devicePixelRatio || 1);
    if (!nw || !nh) return false;
    if (nw === W && nh === H && nd === dpr && tieSprite) return false;
    W = nw; H = nh;
    if (nd !== dpr || !tieSprite) { dpr = nd; makeTie(); }
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    makeGrain();
    return true;
  }

  /* ---------- վարագույրի եզրագիծը (կախվածք, ալիքներ, հավաքվելիս «գոտկատեղ») ---------- */
  function edgeX(yf, p, now, s) {
    var d = yf < TIP ? (TIP - yf) / TIP : (yf - TIP) / (1 - TIP);
    var swag = 1 - Math.pow(1 - d, 1.8);
    var rec = 15 * Math.min(1, p * 3.2);
    var amp = 0.9 + 2.6 * Math.sin(Math.PI * Math.min(1, p));
    var wav = amp * Math.sin(yf * 11.5 - now * 0.0042) * Math.min(1, d * 3);
    var pe = smooth(.55, 1, p);
    var wf = 1 - .46 * pe * Math.exp(-Math.pow((yf - TIE) / .085, 2)) + .3 * pe * smooth(.68, 1, yf) + .12 * pe * (1 - smooth(0, .2, yf));
    var tipBump = 1 + .022 * Math.exp(-Math.pow((yf - TIP) / .03, 2)) * (1 - pe);
    return s * W * (100 - rec * swag + wav) / 100 * wf * tipBump + W * .08 * (1 - smooth(0, .1, p));
  }

  /* ---------- ծալքերի ցանց ---------- */
  var xt = [], xb = [], cA = [], dA = [], sA = [], N = 100, KF = 8;

  function theta(u, A, ps) {
    var uu = u + .03 * Math.sin(TAU * 1.3 * u + 1) + .018 * Math.sin(TAU * 3.1 * u);
    A *= .8 + .32 * Math.sin(TAU * 2.2 * u + .5);
    var a = Math.sin(TAU * KF * uu + ps);
    var b = Math.sin(TAU * KF * 2.63 * u + ps * 1.7 + 1.3);
    var v = (a < 0 ? -Math.pow(-a, .86) : Math.pow(a, .86)) + .2 * b;
    return A * v;
  }
  function buildFolds(p, now, s) {
    var Wt = s * W, Wb = s * W * (1 + .2 * Math.min(1, p * 3));
    N = clamp(Math.round(Wt / 2.4), 30, 120);
    KF = clamp(W / 46, 6, 13);
    var A = .5 + .62 * Math.pow(p, .85);
    var psi = .5 * Math.sin(now * .0011) + p * 2.2;
    var psB = psi + .62 + .25 * Math.sin(now * .0009);
    var i, u, ct = [], cb = [], st = 0, sb = 0, tt, tb, tm, sn, cs, dif, t, sp;
    for (i = 0; i < N; i++) {
      u = (i + .5) / N;
      tt = theta(u, A, psi); tb = theta(u, A * .86, psB);
      ct[i] = Math.cos(tt); cb[i] = Math.cos(tb); st += ct[i]; sb += cb[i];
    }
    var x1 = 0, x2 = 0; xt[0] = 0; xb[0] = 0;
    for (i = 0; i < N; i++) {
      x1 += ct[i] / st * Wt; x2 += cb[i] / sb * Wb; xt[i + 1] = x1; xb[i + 1] = x2;
      u = (i + .5) / N;
      tm = theta(u, A * .93, psi + .31);
      sn = Math.sin(tm); cs = Math.cos(tm);
      dif = Math.max(0, .55 * sn + .83 * cs);
      t = clamp((dif - .36) / .62, 0, 1); t = t * t * (3 - 2 * t);
      cA[i] = 'rgb(' + Math.round(222 + 33 * t) + ',' + Math.round(222 + 31 * t) + ',' + Math.round(232 + 17 * t) + ')';
      dA[i] = (1 - t) * .3;
      sp = Math.pow(Math.max(0, .287 * sn + .958 * cs), 46);
      sA[i] = sp * .5;
    }
  }
  /* գործվածքի կետի էկրանային x-ը (u՝ 0..1 լայնքով, v՝ 0..1 բարձրությամբ) և տեղային սեղմվածքը */
  var _sx = 1;
  function fx(u, v) {
    var f = clamp(u, 0, .9999) * N, i = f | 0, r = f - i;
    var a = lerp(xt[i], xt[i + 1], r), b = lerp(xb[i], xb[i + 1], r);
    _sx = clamp(lerp(xt[i + 1] - xt[i], xb[i + 1] - xb[i], v) / (W / N), .18, 1.15);
    return lerp(a, b, v);
  }
  function shadeAt(u) { var i = clamp((u * N) | 0, 0, N - 1); return 1 - dA[i] * .9 + sA[i] * .4; }

  /* ---------- ասեղնագործ ---------- */
  var seeds = [], sd;
  (function () {
    var r = 7, i;
    function rnd() { r = (r * 16807) % 2147483647; return r / 2147483647; }
    for (i = 0; i < 22; i++) seeds.push({ u: .04 + rnd() * .92, v: .1 + rnd() * .66, r: 3 + rnd() * 3.8, k: rnd() < .62 ? 0 : 1 });
  })();

  function embroider(p, now) {
    var gold = [201, 164, 92], i, j, u, v, x, y, k, sc, c;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ցրված սրտեր ու փայլիկներ
    for (i = 0; i < seeds.length; i++) {
      sd = seeds[i]; x = fx(sd.u, sd.v); sc = _sx; y = sd.v * H;
      k = shadeAt(sd.u);
      ctx.globalAlpha = .5 * smooth(0, .25, sd.u) * (1 - smooth(.97, 1, sd.u));
      ctx.fillStyle = 'rgba(255,255,255,.9)';
      if (sd.k === 0) { heart(ctx, x - .5, y - .7, sd.r, sc); ctx.fill(); }
      ctx.fillStyle = rgb(gold, .78 + .22 * k);
      if (sd.k === 0) { heart(ctx, x, y, sd.r, sc); ctx.fill(); }
      else {
        var tw = .55 + .45 * Math.sin(now * .003 + i * 1.7);
        ctx.globalAlpha *= (.5 + .5 * tw);
        ctx.beginPath(); ctx.moveTo(x, y - sd.r * 1.5); ctx.quadraticCurveTo(x, y, x + sd.r * 1.5 * sc, y); ctx.quadraticCurveTo(x, y, x, y + sd.r * 1.5); ctx.quadraticCurveTo(x, y, x - sd.r * 1.5 * sc, y); ctx.quadraticCurveTo(x, y, x, y - sd.r * 1.5); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    // ստորին եզրի ծաղկեպսակ
    var y0 = H * .885, M = 34, px = [], py = [];
    for (i = 0; i <= M; i++) {
      u = i / M; v = (y0 + Math.sin(u * TAU * 5) * 5) / H;
      px[i] = fx(u, v); py[i] = v * H;
    }
    k = .9;
    ctx.strokeStyle = 'rgba(120,88,40,.28)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); for (i = 0; i <= M; i++) { if (i) ctx.lineTo(px[i] + .5, py[i] + .8); else ctx.moveTo(px[i] + .5, py[i] + .8); } ctx.stroke();
    ctx.strokeStyle = rgb(gold, k); ctx.lineWidth = 1.1;
    ctx.beginPath(); for (i = 0; i <= M; i++) { if (i) ctx.lineTo(px[i], py[i]); else ctx.moveTo(px[i], py[i]); } ctx.stroke();
    // երկրորդ նուրբ գիծ
    ctx.globalAlpha = .75; ctx.lineWidth = .8;
    ctx.beginPath();
    for (i = 0; i <= M; i++) { v = (y0 + 22 + Math.sin(u = i / M * TAU * 5 + 1.4) * 4) / H; x = fx(i / M, v); if (i) ctx.lineTo(x, v * H); else ctx.moveTo(x, v * H); }
    ctx.stroke(); ctx.globalAlpha = 1;
    for (i = 0; i < M; i++) {
      u = (i + .5) / M; v = (y0 + Math.sin(u * TAU * 5) * 5 + 10) / H;
      x = fx(u, v); sc = _sx; y = v * H; c = shadeAt(u);
      if (i % 2) { ctx.fillStyle = rgb([154, 52, 58], .85 + .15 * c); heart(ctx, x, y, 5.2, sc); ctx.fill(); }
      else {
        ctx.fillStyle = rgb(gold, .8 + .2 * c); flower(ctx, x, y - 1, 4.2, sc);
        ctx.fillStyle = 'rgba(255,248,230,.95)'; ctx.beginPath(); ctx.ellipse(x, y - 1, 1.7 * sc, 1.7, 0, 0, TAU); ctx.fill();
      }
      // փոքր տերևներ
      ctx.fillStyle = 'rgba(150,170,128,.75)';
      leaf(ctx, x + 6 * sc, y - 8, 7, 2.2, -.7, 'rgba(150,170,128,.75)');
      leaf(ctx, x - 6 * sc, y - 8, 7, 2.2, Math.PI + .7, 'rgba(150,170,128,.75)');
    }
    ctx.restore();
  }

  /* ---------- ժանյակե եզր ---------- */
  function laceEdge(p, now, s, ex, ey) {
    var curW = s * W, bw = clamp(curW * .42, 9, 28), M = ex.length, i;
    var nx = [], ny = [], len = [0];
    for (i = 0; i < M; i++) {
      var a = Math.max(0, i - 1), b = Math.min(M - 1, i + 1);
      var tx = ex[b] - ex[a], ty = ey[b] - ey[a], l = Math.sqrt(tx * tx + ty * ty) || 1;
      nx[i] = -ty / l; ny[i] = tx / l;                       // ներքին նորմալ (դեպի գործվածքը)
      if (i) len[i] = len[i - 1] + Math.sqrt(Math.pow(ex[i] - ex[i - 1], 2) + Math.pow(ey[i] - ey[i - 1], 2));
    }
    function off(d) { ctx.beginPath(); for (var j = 0; j < M; j++) { var x = ex[j] + nx[j] * d, y = ey[j] + ny[j] * d; if (j) ctx.lineTo(x, y); else ctx.moveTo(x, y); } }
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    // ստվեր ժանյակի տակ
    ctx.strokeStyle = 'rgba(70,64,92,.14)'; ctx.lineWidth = bw + 5; off(bw / 2 - 1); ctx.stroke();
    // ժանյակի շերտ
    var lg = ctx.createLinearGradient(0, 0, 0, H);
    lg.addColorStop(0, 'rgb(250,246,240)'); lg.addColorStop(.5, 'rgb(255,253,250)'); lg.addColorStop(1, 'rgb(246,242,238)');
    ctx.strokeStyle = lg; ctx.lineWidth = bw; off(bw / 2); ctx.stroke();
    // ներքին եզրի ոսկե գծեր
    ctx.strokeStyle = 'rgba(196,158,86,.85)'; ctx.lineWidth = .9; off(bw - .5); ctx.stroke();
    ctx.strokeStyle = 'rgba(196,158,86,.5)'; ctx.lineWidth = .7; off(bw - 3.4); ctx.stroke();
    // ատամիկներ (scallops) եզրի երկայնքով
    var pitch = 11, total = len[M - 1], d = pitch * .5, seg = 1, k = 0, j;
    var tgx = [], tgy = [], pxs = [], pys = [], pnx = [], pny = [];
    while (d < total) {
      while (seg < M - 1 && len[seg] < d) seg++;
      var f = (d - len[seg - 1]) / ((len[seg] - len[seg - 1]) || 1);
      pxs.push(lerp(ex[seg - 1], ex[seg], f)); pys.push(lerp(ey[seg - 1], ey[seg], f));
      pnx.push(lerp(nx[seg - 1], nx[seg], f)); pny.push(lerp(ny[seg - 1], ny[seg], f));
      d += pitch;
    }
    var R = pitch * .53;
    ctx.fillStyle = 'rgb(255,253,250)'; ctx.strokeStyle = 'rgba(196,158,86,.9)'; ctx.lineWidth = .9;
    for (j = 0; j < pxs.length; j++) {
      var ph = Math.atan2(-pny[j], -pnx[j]);              // դեպի դուրս
      ctx.beginPath(); ctx.arc(pxs[j], pys[j], R, ph - Math.PI / 2, ph + Math.PI / 2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.arc(pxs[j], pys[j], R, ph - Math.PI / 2, ph + Math.PI / 2); ctx.stroke();
      // ատամիկի ներսում՝ նուրբ կիսաշրջան
      ctx.strokeStyle = 'rgba(196,158,86,.5)'; ctx.lineWidth = .6;
      ctx.beginPath(); ctx.arc(pxs[j], pys[j], R * .55, ph - Math.PI / 2, ph + Math.PI / 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(196,158,86,.9)'; ctx.lineWidth = .9;
    }
    // ասեղնագործ խաղողի ողկույզ / մարգարիտներ + սրտեր
    var mid = bw * .5, tw;
    for (j = 0; j < pxs.length; j++) {
      var cx = pxs[j] + pnx[j] * mid, cy = pys[j] + pny[j] * mid;
      if (j % 6 === 3 && bw > 16) {
        ctx.fillStyle = '#8f2f36'; heart(ctx, cx, cy, Math.min(4.2, bw * .16)); ctx.fill();
        ctx.fillStyle = 'rgba(255,200,200,.55)'; ctx.beginPath(); ctx.arc(cx - 1, cy - 1.2, .9, 0, TAU); ctx.fill();
      } else {
        var pr = Math.min(2.5, bw * .1);
        ctx.fillStyle = 'rgba(80,60,50,.22)'; ctx.beginPath(); ctx.arc(cx + .6, cy + .8, pr, 0, TAU); ctx.fill();
        var pg = ctx.createRadialGradient(cx - pr * .35, cy - pr * .4, .2, cx, cy, pr);
        pg.addColorStop(0, '#ffffff'); pg.addColorStop(.6, '#efeae3'); pg.addColorStop(1, '#cfc7bb');
        ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(cx, cy, pr, 0, TAU); ctx.fill();
      }
      // փոքր ոսկե ծաղիկ ատամիկների միջև
      if (j % 2 === 0 && bw > 18) {
        ctx.fillStyle = 'rgba(210,176,104,.95)';
        var qx = pxs[j] + pnx[j] * (bw * .2), qy = pys[j] + pny[j] * (bw * .2);
        ctx.beginPath(); ctx.arc(qx, qy, 1.1, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  }

  /* ---------- ձող + օղակներ ---------- */
  function rod(p) {
    var ry = 6, g = ctx.createLinearGradient(0, 0, 0, 13);
    g.addColorStop(0, '#f8e7b8'); g.addColorStop(.35, '#d9b660'); g.addColorStop(.7, '#a97f2e'); g.addColorStop(1, '#6f4f17');
    // ստվեր ձողի տակ
    var sg = ctx.createLinearGradient(0, 11, 0, 30);
    sg.addColorStop(0, 'rgba(50,50,70,.28)'); sg.addColorStop(1, 'rgba(50,50,70,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 11, W, 19);
    // օղակներ
    var R = clamp(Math.round(W / 30), 8, 24), j, x, u;
    ctx.lineWidth = 2.1;
    for (j = 0; j < R; j++) {
      u = (j + .5) / R; x = fx(u, 0);
      ctx.strokeStyle = 'rgba(60,40,10,.35)'; ctx.beginPath(); ctx.ellipse(x + .8, ry + 5.5, 4.6, 8.4, 0, 0, TAU); ctx.stroke();
      ctx.strokeStyle = g; ctx.beginPath(); ctx.ellipse(x, ry + 4.8, 4.6, 8.4, 0, 0, TAU); ctx.stroke();
    }
    // ձողը
    ctx.fillStyle = g; ctx.fillRect(0, 1, W, 10);
    ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.fillRect(0, 2.2, W, 1.6);
    // ծայրերի գնդիկներ
    function ball(x) {
      var bg = ctx.createRadialGradient(x - 2, 3.5, 1, x, 6, 8);
      bg.addColorStop(0, '#fff4cf'); bg.addColorStop(.5, '#d6b05a'); bg.addColorStop(1, '#7c5a1b');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(x, 6, 7.2, 0, TAU); ctx.fill();
    }
    ball(5); ball(W - 5);
  }

  /* ---------- ժապավեն (tie-back) ---------- */
  function tieBack(p, now, s) {
    var a = smooth(.78, 1, p);
    if (a <= 0) return;
    var y = TIE * H, wd = edgeX(TIE, p, now, s);
    var bx = Math.max(6, wd - 1), bh = 15;
    ctx.save(); ctx.globalAlpha = a;
    // ժապավենի շերտը գործվածքի շուրջը
    var g = ctx.createLinearGradient(0, y - bh / 2, 0, y + bh / 2);
    g.addColorStop(0, '#6a1f23'); g.addColorStop(.3, '#b2474d'); g.addColorStop(.55, '#8f2f36'); g.addColorStop(1, '#5c181c');
    ctx.fillStyle = 'rgba(40,20,30,.25)'; ctx.fillRect(0, y - bh / 2 + 3, bx + 4, bh);
    ctx.fillStyle = g; ctx.fillRect(0, y - bh / 2, bx + 3, bh);
    ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(0, y - bh / 2 + 2, bx + 3, 1.3);
    // պոպը (sprite)
    var sc = lerp(.8, 1, a), sw = TS.w * sc, sh = TS.h * sc;
    ctx.drawImage(tieSprite, bx - TS.ox * sc + 4, y - TS.oy * sc, sw, sh);
    ctx.restore();
  }

  /* ---------- թերթիկներ ---------- */
  var PCOL = [[245, 205, 210], [236, 172, 182], [250, 228, 230], [218, 140, 154], [172, 70, 82], [255, 240, 238]];
  function spawnPetal(tipX) {
    petals.push({
      x: clamp(tipX + (Math.random() - .25) * W * .6, -10, W + 10), y: -14 - Math.random() * 30,
      vy: 26 + Math.random() * 34, vx: -6 + Math.random() * 22,
      s: 4.6 + Math.random() * 4.6, rot: Math.random() * TAU, vr: (Math.random() - .5) * 2.6,
      ph: Math.random() * TAU, fp: Math.random() * TAU, c: PCOL[(Math.random() * PCOL.length) | 0], sw: 14 + Math.random() * 22
    });
  }
  function drawPetals(dt, tipX, spawn) {
    var i, q;
    if (spawn) { spawnAcc += dt * 7.5; while (spawnAcc >= 1 && petals.length < 26) { spawnAcc -= 1; spawnPetal(tipX); } }
    for (i = petals.length - 1; i >= 0; i--) {
      q = petals[i];
      q.ph += dt * 1.5; q.fp += dt * 2.3; q.rot += q.vr * dt;
      q.x += (q.vx + Math.sin(q.ph) * q.sw) * dt; q.y += q.vy * dt;
      if (q.y > H + 20) { petals.splice(i, 1); continue; }
      ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.rot); ctx.scale(1, .35 + .65 * Math.abs(Math.cos(q.fp)));
      ctx.globalAlpha = .92;
      ctx.fillStyle = rgb(q.c);
      var sz = q.s;
      ctx.beginPath(); ctx.moveTo(0, -sz); ctx.bezierCurveTo(sz * .95, -sz * .55, sz * .8, sz * .55, 0, sz * .95); ctx.bezierCurveTo(-sz * .8, sz * .55, -sz * .95, -sz * .55, 0, -sz); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(0, -sz * .8); ctx.lineTo(0, sz * .6); ctx.stroke();
      ctx.restore();
    }
  }

  /* ---------- ամբողջ կադրը ---------- */
  function draw(p, now, s, dt, spawn) {
    var i, y, M = 40, ex = [], ey = [];
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    buildFolds(p, now, s);

    // եզրագիծ
    for (i = 0; i <= M; i++) { y = -6 + (H + 12) * i / M; ex.push(edgeX(y / H, p, now, s)); ey.push(y); }
    function edgePath() {
      ctx.beginPath(); ctx.moveTo(-20, -6);
      for (var k = 0; k <= M; k++) ctx.lineTo(ex[k], ey[k]);
      ctx.lineTo(-20, H + 6); ctx.closePath();
    }

    // ստվեր վիդեոյի վրա (փափուկ, 3 շերտով)
    ctx.save(); ctx.lineJoin = 'round';
    var sw = [[24, .03], [13, .045], [6, .06]];
    for (i = 0; i < sw.length; i++) {
      ctx.strokeStyle = 'rgba(52,44,62,' + sw[i][1] + ')'; ctx.lineWidth = sw[i][0];
      ctx.beginPath(); for (var k = 0; k <= M; k++) { if (k) ctx.lineTo(ex[k] + 4, ey[k] + 2); else ctx.moveTo(ex[k] + 4, ey[k] + 2); } ctx.stroke();
    }
    ctx.restore();

    // գործվածքը (կտրված եզրագծով)
    ctx.save(); edgePath(); ctx.clip();
    ctx.fillStyle = '#f3f0ec'; ctx.fillRect(-20, -6, W + 40, H + 12);
    for (i = 0; i < N; i++) {
      ctx.fillStyle = cA[i];
      ctx.beginPath(); ctx.moveTo(xt[i], -2); ctx.lineTo(xt[i + 1] + .8, -2); ctx.lineTo(xb[i + 1] + .8, H + 2); ctx.lineTo(xb[i], H + 2); ctx.closePath(); ctx.fill();
    }
    // խորացված ստվերներ (վերևում ուժեղ)
    var dg = ctx.createLinearGradient(0, 0, 0, H);
    dg.addColorStop(0, 'rgb(104,98,136)'); dg.addColorStop(.35, 'rgba(104,98,136,.7)'); dg.addColorStop(1, 'rgba(104,98,136,.32)');
    ctx.fillStyle = dg;
    for (i = 0; i < N; i++) {
      if (dA[i] < .01) continue;
      ctx.globalAlpha = dA[i] * .9;
      ctx.beginPath(); ctx.moveTo(xt[i], -2); ctx.lineTo(xt[i + 1] + .8, -2); ctx.lineTo(xb[i + 1] + .8, H + 2); ctx.lineTo(xb[i], H + 2); ctx.closePath(); ctx.fill();
    }
    // ատլասե փայլ (ծալքի գագաթին)
    var wg = ctx.createLinearGradient(0, 0, 0, H);
    wg.addColorStop(0, 'rgba(255,255,255,0)'); wg.addColorStop(.28, 'rgba(255,255,255,1)'); wg.addColorStop(.6, 'rgba(255,255,255,.85)'); wg.addColorStop(1, 'rgba(255,255,255,.45)');
    ctx.fillStyle = wg;
    for (i = 0; i < N; i++) {
      if (sA[i] < .01) continue;
      ctx.globalAlpha = sA[i];
      ctx.beginPath(); ctx.moveTo(xt[i], -2); ctx.lineTo(xt[i + 1] + .8, -2); ctx.lineTo(xb[i + 1] + .8, H + 2); ctx.lineTo(xb[i], H + 2); ctx.closePath(); ctx.fill();
    }
    ctx.globalAlpha = 1;

    // թեք փայլի շերտ
    var cx = W * (.5 + .42 * Math.sin(now * .00038));
    var sg = ctx.createLinearGradient(cx - W * .4, 0, cx + W * .4, H * .7);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.5, 'rgba(255,255,255,.2)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);

    embroider(p, now);

    // վերևից ստվեր, ներքևից թեթև մթություն
    var tg = ctx.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, 'rgba(52,60,92,.34)'); tg.addColorStop(.1, 'rgba(52,60,92,.10)'); tg.addColorStop(.2, 'rgba(52,60,92,0)');
    tg.addColorStop(.82, 'rgba(120,128,156,0)'); tg.addColorStop(1, 'rgba(120,128,156,.14)');
    ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
    // եզրի մոտ՝ թեթև մթություն (գործվածքի կորություն)
    var eg = ctx.createLinearGradient(Math.max(0, xt[N] - 36), 0, xt[N] + 2, 0);
    eg.addColorStop(0, 'rgba(60,66,96,0)'); eg.addColorStop(1, 'rgba(60,66,96,.10)');
    ctx.fillStyle = eg; ctx.fillRect(Math.max(0, xt[N] - 36), 0, 40, H);

    // հյուսվածք
    if (grainPat) { ctx.globalAlpha = .7; ctx.fillStyle = grainPat; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.restore();

    laceEdge(p, now, s, ex, ey);
    rod(p);
    tieBack(p, now, s);
    drawPetals(dt || 0, ex[Math.round(M * TIP)] || 0, spawn);
  }

  /* ---------- անիմացիա ---------- */
  function tipX(p, now) { var s = 1 - (1 - END) * p; return edgeX(TIP, p, now, s); }
  function apply(p, now, dt, spawn) {
    curP = p;
    var s = 1 - (1 - END) * p;
    draw(p, now, s, dt, spawn);
    dove.style.transform = 'translate3d(' + (edgeX(TIP, p, now, s) + 2).toFixed(1) + 'px,0,0)';
  }

  function finish(instant) {
    if (done) return; done = true;
    sendHalf();
    cancelAnimationFrame(raf); running = false;
    petals.length = 0;
    apply(1, performance.now(), 0, false);
    hb.classList.add('is-names');
    if (instant) { dove.style.display = 'none'; return; }
    hb.classList.add('is-exit');
    setTimeout(function () { dove.style.display = 'none'; }, 2400);
  }

  function loop(now) {
    if (!startAt) { startAt = now; lastT = now; }
    var dt = Math.min(.05, (now - lastT) / 1000); lastT = now;
    var t = now - startAt - DELAY, p, e, spawn;
    if (!finishAt) {
      p = t <= 0 ? 0 : Math.min(1, t / DUR); e = ease(p);
      spawn = e > .22;
      if (e >= .5) sendHalf();
      apply(e, now, dt, spawn);
      if (!namesStarted && p > .9) { namesStarted = true; hb.classList.add('is-names'); }
      if (p >= 1) {
        finishAt = now; hb.classList.add('is-exit');
        setTimeout(function () { dove.style.display = 'none'; }, 2400);
      }
    } else {
      var since = now - finishAt;
      apply(1, now, dt, since < PETAL_MS * .4);
      if (since > PETAL_MS && !petals.length) { done = true; running = false; apply(1, now, 0, false); return; }
    }
    raf = requestAnimationFrame(loop);
  }

  /* ---------- մեկնարկ ---------- */
  if (reduce) { hb.classList.add('is-names'); hb.classList.add('is-half'); dove.style.display = 'none'; return; }
  layout();
  apply(0, performance.now(), 0, false);
  running = true;
  raf = requestAnimationFrame(loop);

  // Սեղմելով՝ կարելի է բացումը բաց թողնել
  hb.addEventListener('pointerdown', function () { if (!done) finish(true); }, { once: true });

  // չափերի փոփոխություն (պտտում, URL-ի գոտու թաքնվելը և այլն)
  function onResize() {
    if (!layout()) return;
    if (!running) apply(curP, performance.now(), 0, false);
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(frame);
  else window.addEventListener('resize', onResize);
})();
