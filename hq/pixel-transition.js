/* Cric Secrets pixel transition (shared by /hq/ and /hq/office/).
   pixelGo(url, {x, y, label}) covers the screen in a sunset pixel wave that grows from (x, y), then navigates.
   The next page reads a sessionStorage flag and dissolves the pixels away from the centre.
   Respects prefers-reduced-motion (plain navigation) and cleans up on back/forward (bfcache). */
(function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NIGHT = '#12060F';
  var PAL = ['#12060F', '#12060F', '#24091E', '#24091E', '#3A1230', '#FF3D7F', '#FF7A5C', '#FFC857', '#2EC4B6'];
  var KEY = 'px-in';

  function layer() {
    var c = document.createElement('canvas');
    c.setAttribute('aria-hidden', 'true');
    c.dataset.px = '1';
    c.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483000;pointer-events:auto';
    (document.body || document.documentElement).appendChild(c);
    var d = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.ceil(innerWidth * d); c.height = Math.ceil(innerHeight * d);
    var x = c.getContext('2d'); x.scale(d, d);
    return { c: c, x: x };
  }
  function cells(ox, oy) {
    var s = innerWidth < 700 ? 22 : 30, out = [], far = Math.hypot(innerWidth, innerHeight);
    for (var j = 0; j < Math.ceil(innerHeight / s); j++)
      for (var i = 0; i < Math.ceil(innerWidth / s); i++) {
        var d = Math.hypot((i + .5) * s - ox, (j + .5) * s - oy) / far;
        out.push([i * s, j * s, d * .8 + Math.random() * .2]);
      }
    out.sort(function (a, b) { return a[2] - b[2] });
    return { s: s, list: out };
  }
  function pick() { return PAL[(Math.random() * PAL.length) | 0] }
  function label(x, text) {
    if (!text) return;
    var size = Math.max(22, Math.min(64, innerWidth / 14));
    x.font = '800 ' + size + 'px "Anton", Impact, ui-monospace, monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    var g = x.createLinearGradient(innerWidth / 2 - size * 4, 0, innerWidth / 2 + size * 4, 0);
    g.addColorStop(0, '#FF3D7F'); g.addColorStop(.5, '#FF7A5C'); g.addColorStop(1, '#FFC857');
    x.fillStyle = g; x.fillText(text, innerWidth / 2, innerHeight / 2);
  }

  window.pixelGo = function (url, o) {
    o = o || {};
    if (RM) { location.href = url; return }
    try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), label: o.label || '' })) } catch (e) { /* private mode */ }
    var L = layer(), g = cells(o.x == null ? innerWidth / 2 : o.x, o.y == null ? innerHeight / 2 : o.y);
    var n = 0, lag = 0, dur = 760, t0 = performance.now();
    (function step(t) {
      var k = Math.min(1, (t - t0) / dur), e = k * k * (3 - 2 * k), target = Math.floor(e * g.list.length);
      for (; n < target; n++) { L.x.fillStyle = pick(); L.x.fillRect(g.list[n][0], g.list[n][1], g.s, g.s) }
      var settle = Math.floor(Math.max(0, e - .18) / .82 * g.list.length);
      L.x.fillStyle = NIGHT;
      for (; lag < settle; lag++) L.x.fillRect(g.list[lag][0], g.list[lag][1], g.s, g.s);
      if (k < 1) return requestAnimationFrame(step);
      L.x.fillStyle = NIGHT; L.x.fillRect(0, 0, innerWidth, innerHeight); label(L.x, o.label);
      setTimeout(function () { location.href = url }, 220);
    })(t0);
  };

  // Arriving: dissolve the pixels outward from the centre.
  var raw = null;
  try { raw = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY) } catch (e) { /* ignore */ }
  var info = null; try { info = raw && JSON.parse(raw) } catch (e) { /* ignore */ }
  if (info && Date.now() - info.t < 10000 && !RM) {
    var start = function () {
      var L = layer(); L.x.fillStyle = NIGHT; L.x.fillRect(0, 0, innerWidth, innerHeight); label(L.x, info.label);
      var g = cells(innerWidth / 2, innerHeight / 2), n = 0, lag = 0, dur = 900, t0 = 0;
      var go = function () {
        t0 = performance.now();
        (function step(t) {
          var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 2), target = Math.floor(e * g.list.length);
          for (; n < target; n++) { L.x.fillStyle = pick(); L.x.fillRect(g.list[n][0], g.list[n][1], g.s, g.s) }
          var clear = Math.floor(Math.max(0, e - .12) / .88 * g.list.length);
          for (; lag < clear; lag++) L.x.clearRect(g.list[lag][0], g.list[lag][1], g.s, g.s);
          if (k < 1) return requestAnimationFrame(step);
          L.c.remove();
        })(t0);
      };
      // wait for the page to paint (max ~1.4 s) so the reveal shows the real scene
      var waited = 0, ready = function () { return document.readyState === 'complete' || waited > 1400 };
      (function wait() { if (ready()) setTimeout(go, 120); else { waited += 100; setTimeout(wait, 100) } })();
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  // Back/forward cache: never come back to a covered screen.
  addEventListener('pageshow', function (ev) {
    if (ev.persisted) document.querySelectorAll('canvas[data-px]').forEach(function (c) { c.remove() });
  });
})();
