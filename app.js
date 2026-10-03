/* The AI Counterfactual: interface v2. Hash router, canvas galaxy, SVG instruments. Depends only on engine.js and cases.js. */
(function () {
  "use strict";
  var A = window.AICF, CASES = window.AICF_CASES, SRC = window.AICF_SOURCES;
  var fm = A.util.fmtMoney, rnd = A.util.round;
  var root = document.getElementById("app");
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var VIEWS = [["overview", "Overview", "o"], ["withwithout", "With and without AI", "w"], ["bridge", "Value flow", "b"], ["evidence", "Causal evidence", "e"], ["lineage", "Lineage", "l"],
               ["worlds", "Alternative worlds", "a"], ["welfare", "Welfare", "d"], ["claim", "Claim to value", "c"], ["adversarial", "Adversarial", "x"], ["montecarlo", "Monte Carlo", "m"],
               ["report", "Report", "r"], ["checklist", "Checklist", "k"], ["methods", "Methods and code", "s"]];
  var RANKS = { 1: "Randomised or threshold design", 2: "Staggered or phased rollout", 3: "Pre and post with concurrent control", 4: "Matched comparison", 5: "Adopter versus non-adopter", 6: "Engineering or operational bound", 7: "Documented scenario range" };
  var GRADES = { A: "Audited or randomised record", B: "Internal system record or published study", C: "Verified expert testimony or audit", D: "Synthetic or unverified internal estimate", E: "Marketing claim, uncorroborated" };
  var GVAR = { A: "pos", B: "blue", C: "amb", D: "c5", E: "neg" };
  var ICONS = {
    galaxy: '<circle cx="12" cy="12" r="2.2"/><circle cx="5" cy="7" r="1.3"/><circle cx="19" cy="6" r="1.3"/><circle cx="18" cy="17" r="1.3"/><circle cx="6" cy="18" r="1.3"/><path d="M6.2 7.8l4.3 3M13.8 10.6l4.2-3.6M13.6 13.4l3.4 2.9M10.4 13.5L7.2 17"/>',
    portfolio: '<path d="M4 19V9M9 19V5M14 19v-8M19 19v-4"/><path d="M3 19h18"/>',
    framework: '<path d="M4 6h16M4 12h10M4 18h13"/><circle cx="19" cy="12" r="1.5"/>',
    tests: '<path d="M5 12l4 4L19 6"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>',
    overview: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',
    withwithout: '<path d="M3 17c4-6 7-9 10-9s5 3 8 6M3 17c4-3 7-4 10-4s5 1 8 2"/>',
    bridge: '<path d="M3 8h6c4 0 4 8 8 8h4M3 16h6c4 0 4-8 8-8h4"/>',
    evidence: '<path d="M4 18L9 9l4 5 3-7 4 11"/><path d="M3 20h18"/>',
    lineage: '<circle cx="5" cy="6" r="1.6"/><circle cx="5" cy="18" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/><path d="M6.5 7l4 4M6.5 17l4-4M13.6 12h3.8"/>',
    worlds: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="9.5"/><circle cx="17" cy="8.5" r="1.3"/><circle cx="6" cy="14" r="1.3"/>',
    welfare: '<path d="M12 4v16M5 9l7-3 7 3M5 9l-2 5h4zM19 9l-2 5h4z"/>',
    claim: '<path d="M4 8h9M4 16h16"/><circle cx="16" cy="8" r="1.6"/><circle cx="9" cy="16" r="1.6"/>',
    adversarial: '<path d="M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7z"/><path d="M9 12l2 2 4-4"/>',
    montecarlo: '<circle cx="7" cy="8" r="1.2"/><circle cx="14" cy="6" r="1.2"/><circle cx="18" cy="11" r="1.2"/><circle cx="10" cy="13" r="1.2"/><path d="M4 20h16M6 20v-3M10 20v-5M14 20v-4M18 20v-2"/>',
    report: '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h7M9 8h3"/>',
    checklist: '<path d="M4 6h3M4 12h3M4 18h3M10 6h10M10 12h10M10 18h10"/>',
    methods: '<path d="M8 6l-5 6 5 6M16 6l5 6-5 6M13 4l-2 16"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'
  };
  function ico(k) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[k] || ICONS.overview) + "</svg>"; }

  /* ------------------------------------------------------------ helpers */
  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function n(x, d) { if (x === null || x === undefined || isNaN(x)) return "n/a"; d = d === undefined ? 2 : d; return Number(rnd(x, d)).toLocaleString("en-US", { maximumFractionDigits: d }); }
  function pct(x, d) { return x === null || x === undefined ? "n/a" : n(x * 100, d === undefined ? 1 : d) + "%"; }
  function money(x) { return x === null || x === undefined || isNaN(x) ? "n/a" : fm(x); }
  function sgn(x) { return x < 0 ? "neg" : x > 0 ? "pos" : ""; }
  function grade(g) { return '<span class="tag g ' + esc(g) + '" title="' + esc(GRADES[g] || "") + '">' + esc(g) + "</span>"; }
  function byId(list, id) { return list.filter(function (x) { return x.id === id; })[0]; }
  function fx(x, c) { return n(x, Math.abs(x) < 0.01 ? 5 : Math.abs(x) < 1 ? 3 : 2) + " " + esc(c.technical.unit); }
  function link(hash, text, cls) { return '<a href="#' + hash + '"' + (cls ? ' class="' + cls + '"' : "") + ">" + text + "</a>"; }
  function uniq(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }
  function table(head, rows) { return '<div class="tbl"><table><thead><tr>' + head.map(function (h) { return "<th" + (/^#/.test(h) ? ' class="num"' : "") + ">" + h.replace(/^#/, "") + "</th>"; }).join("") + "</tr></thead><tbody>" +
    rows.map(function (r) { return "<tr" + (r.__cls ? ' class="' + r.__cls + '"' : "") + ">" + r.map(function (cell, i) { return "<td" + (/^#/.test(head[i]) ? ' class="num"' : "") + ">" + cell + "</td>"; }).join("") + "</tr>"; }).join("") + "</tbody></table></div>"; }
  function cssv(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
  function ro(label, value, sub, cls, big) { return '<div class="ro' + (big ? " big" : "") + '"><div class="l">' + label + '</div><div class="v ' + (cls || "") + '">' + value + "</div>" + (sub ? '<div class="s">' + sub + "</div>" : "") + "</div>"; }
  function pane(inner, cls) { return '<div class="pane' + (cls ? " " + cls : "") + '">' + inner + "</div>"; }
  function vhead(title, text) { return '<div class="vhead"><h2>' + title + "</h2>" + (text ? "<p>" + text + "</p>" : "") + "</div>"; }
  var CACHE = {};
  function calc(c) { if (CACHE[c.id]) return CACHE[c.id]; var v = A.valuate(c), aw = A.alternativeWorlds(c), mc = A.monteCarlo(c, 800), cov = A.evidenceCoverage(c); return (CACHE[c.id] = { v: v, aw: aw, mc: mc, cov: cov }); }
  function theme() { return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light"; }
  function isDark() { return theme() === "dark"; }
  function hex2rgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map(function (x) { return x + x; }).join(""); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function rgba(hex, a) { var c = hex2rgb(hex); return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }
  function seeded(seed) { return A.util.seeded(seed); }

  /* ------------------------------------------------------------ SVG primitives */
  function svg(w, h, body, cap, extra) { return '<div class="chart"' + (extra ? " " + extra : "") + '><svg viewBox="0 0 ' + w + " " + h + '" role="img" preserveAspectRatio="xMidYMid meet">' + body + "</svg>" + (cap ? '<p class="cap">' + cap + "</p>" : "") + "</div>"; }
  function scale(dom, range) { var d0 = dom[0], d1 = dom[1], r0 = range[0], r1 = range[1]; if (d1 === d0) d1 = d0 + 1; return function (x) { return r0 + (x - d0) / (d1 - d0) * (r1 - r0); }; }
  function ticks(lo, hi, k) { var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log10(span / (k || 5)))), err = span / (k || 5) / step; step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1; var out = []; for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }
  function fmtAxis(v, isMoney) { return isMoney ? fm(v) : n(v, Math.abs(v) < 1 ? 3 : 1); }
  function T(x, y, txt, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : "") + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(txt) + "</text>"; }

  /* lines with glow, optional filled gap between first two series, optional marker */
  function glowLines(series, o) {
    o = o || {}; var W = 760, H = o.height || 280, m = { t: 24, r: 16, b: 34, l: 66 }, iw = W - m.l - m.r, ih = H - m.t - m.b;
    var xs = [], ys = []; series.forEach(function (s) { s.points.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); }); });
    var xlo = Math.min.apply(null, xs), xhi = Math.max.apply(null, xs), ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys); if (o.zero) { ylo = Math.min(ylo, 0); yhi = Math.max(yhi, 0); } var pad = (yhi - ylo || 1) * 0.12; ylo -= pad; yhi += pad;
    var x = scale([xlo, xhi], [m.l, W - m.r]), y = scale([ylo, yhi], [m.t + ih, m.t]), b = "";
    ticks(ylo, yhi, 5).forEach(function (t) { if (t < ylo || t > yhi) return; b += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(m.l - 8, y(t) + 4, fmtAxis(t, o.money), "", "end"); });
    if (o.gap && series.length >= 2) { var a = series[0].points, c = series[1].points, d = ""; a.forEach(function (p, i) { d += (i ? "L" : "M") + x(p[0]) + "," + y(p[1]); }); for (var i = c.length - 1; i >= 0; i--) d += "L" + x(c[i][0]) + "," + y(c[i][1]); b += '<path d="' + d + 'Z" fill="' + (o.gapColor || "var(--pos)") + '" opacity=".13"/>'; }
    if (o.marker !== undefined) b += '<line x1="' + x(o.marker) + '" x2="' + x(o.marker) + '" y1="' + m.t + '" y2="' + (m.t + ih) + '" stroke="var(--amb)" stroke-dasharray="3 5" opacity=".8"/>' + T(x(o.marker) + 5, m.t - 8, o.markerLabel || "deployment");
    series.forEach(function (s) {
      var d = s.points.map(function (p, i) { return (i ? "L" : "M") + x(p[0]) + "," + y(p[1]); }).join("");
      b += '<path d="' + d + '" fill="none" stroke="' + s.color + '" stroke-width="' + (s.width || 2.2) + '"' + (s.dash ? ' stroke-dasharray="' + s.dash + '"' : "") + ' class="draw"' + (s.dash ? ' opacity=".8"' : "") + "/>";
      if (!s.noDots) s.points.forEach(function (p) { b += '<circle cx="' + x(p[0]) + '" cy="' + y(p[1]) + '" r="2.6" fill="' + s.color + '"><title>' + esc(s.label + " " + (o.xfmt ? o.xfmt(p[0]) : p[0]) + ": " + (o.money ? fm(p[1]) : n(p[1], 3))) + "</title></circle>"; });
    });
    ticks(xlo, xhi, 8).forEach(function (t) { b += T(x(t), H - 10, o.xfmt ? o.xfmt(t) : t, "", "middle"); });
    return svg(W, H, b, o.cap) + '<div class="legend">' + series.map(function (s) { return "<span><i style=\"background:" + s.color + '"></i>' + esc(s.label) + "</span>"; }).join("") + "</div>";
  }

  /* horizontal beams: rows [{label, value, lo?, hi?, color?, note?}] on one shared scale with zero marked */
  function beams(rows, o) {
    o = o || {}; var W = 760, rh = o.rowH || 34, ml = o.labelW || 250, H = rows.length * rh + 42;
    var lo = 0, hi = 0; rows.forEach(function (r) { lo = Math.min(lo, r.value, r.lo === undefined ? r.value : r.lo); hi = Math.max(hi, r.value, r.hi === undefined ? r.value : r.hi); }); var pad = (hi - lo || 1) * 0.08; lo -= pad; hi += pad; if (lo > 0) lo = 0; if (hi < 0) hi = 0;
    var x = scale([lo, hi], [ml, W - 20]), b = "";
    ticks(lo, hi, 6).forEach(function (t) { b += '<line class="grid" x1="' + x(t) + '" x2="' + x(t) + '" y1="18" y2="' + (H - 22) + '"/>' + T(x(t), H - 6, o.fmt ? o.fmt(t) : fmtAxis(t, o.money !== false), "", "middle"); });
    b += '<line x1="' + x(0) + '" x2="' + x(0) + '" y1="14" y2="' + (H - 22) + '" stroke="var(--ink2)" stroke-width="1.2"/>';
    rows.forEach(function (r, i) {
      var yy = 22 + i * rh + rh / 2, col = r.color || (r.value < 0 ? "var(--neg)" : "var(--pos)"), x0 = x(0), x1 = x(r.value);
      var lab = r.label.length > (o.maxLabel || 40) ? r.label.slice(0, (o.maxLabel || 40) - 2) + "…" : r.label;
      b += T(ml - 12, yy + 4, lab, "lbl", "end");
      if (r.lo !== undefined && r.hi !== undefined) b += '<rect x="' + x(Math.min(r.lo, r.hi)) + '" y="' + (yy - 9) + '" width="' + Math.max(1, Math.abs(x(r.hi) - x(r.lo))) + '" height="18" rx="4" fill="' + col + '" opacity=".16"/>';
      b += '<rect x="' + Math.min(x0, x1) + '" y="' + (yy - 4) + '" width="' + Math.max(2, Math.abs(x1 - x0)) + '" height="8" rx="4" fill="' + col + '"><title>' + esc(r.label + ": " + (o.fmt ? o.fmt(r.value) : fmtAxis(r.value, o.money !== false)) + (r.note ? ". " + r.note : "")) + "</title></rect>";
      b += '<circle cx="' + x1 + '" cy="' + yy + '" r="4" fill="' + col + '"/>';
      b += T(x1 + (r.value >= 0 ? 10 : -10), yy + 4, o.fmt ? o.fmt(r.value) : fmtAxis(r.value, o.money !== false), "", r.value >= 0 ? "start" : "end");
    });
    return svg(W, H, b, o.cap);
  }

  /* arc gauge: value within [lo, hi] with zero marked */
  function arcGauge(value, lo, hi, o) {
    o = o || {}; var W = 320, H = 190, cx = 160, cy = 160, R = 120;
    function ang(v) { var t = Math.max(0, Math.min(1, (v - lo) / ((hi - lo) || 1))); return Math.PI * (1 - t); }
    function pt(v, r) { var a = ang(v); return [cx + Math.cos(a) * r, cy - Math.sin(a) * r]; }
    function arc(v0, v1, r, col, w, op) { var p0 = pt(v0, r), p1 = pt(v1, r); return '<path d="M' + p0[0] + "," + p0[1] + " A" + r + "," + r + " 0 0,1 " + p1[0] + "," + p1[1] + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round"' + (op ? ' opacity="' + op + '"' : "") + "/>"; }
    var b = arc(lo, hi, R, "var(--line2)", 10);
    if (lo < 0 && hi > 0) b += arc(lo, 0, R, "var(--neg)", 10, 0.4) + arc(0, hi, R, "var(--pos)", 10, 0.4); else b += arc(lo, hi, R, value < 0 ? "var(--neg)" : "var(--pos)", 10, 0.4);
    if (lo < 0 && hi > 0) { var z0 = pt(0, R - 13), z1 = pt(0, R + 13); b += '<line x1="' + z0[0] + '" y1="' + z0[1] + '" x2="' + z1[0] + '" y2="' + z1[1] + '" stroke="var(--ink)" stroke-width="1.5"/>'; }
    var p = pt(value, R); b += '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="7" fill="' + (value < 0 ? "var(--neg)" : "var(--pos)") + '"/>';
    b += T(cx, cy - 30, o.value || money(value), "big", "middle") + T(cx, cy - 10, o.label || "", "", "middle") + T(cx - R, cy + 20, fmtAxis(lo, true), "", "middle") + T(cx + R, cy + 20, fmtAxis(hi, true), "", "middle");
    return '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;max-width:340px;height:auto;display:block;margin:0 auto">' + b + "</svg>";
  }
  function ring(share, label, o) {
    o = o || {}; var r = 40, c = 2 * Math.PI * r, s = Math.max(0, Math.min(1, share)), col = o.color || "var(--accent)";
    return '<svg viewBox="0 0 110 112" style="width:100%;max-width:130px;height:auto;display:block;margin:0 auto;overflow:visible"><circle cx="55" cy="55" r="' + r + '" fill="none" stroke="var(--line2)" stroke-width="7"/><circle cx="55" cy="55" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + (c * s) + " " + c + '" transform="rotate(-90 55 55)"/>' + T(55, 60, o.value || pct(share, 0), "big", "middle") + T(55, 104, label, "", "middle") + "</svg>";
  }

  /* ------------------------------------------------------------ background mesh */
  (function bg() {
    var cv = document.getElementById("bg"); if (!cv) return; var ctx = cv.getContext("2d"), pts = [], W = 0, H = 0, raf = null, last = 0;
    function size() { W = cv.width = innerWidth; H = cv.height = innerHeight; var k = Math.min(160, Math.round(W * H / 14000)); pts = []; var r = seeded(11); for (var i = 0; i < k; i++) pts.push({ x: r() * W, y: r() * H, vx: (r() - 0.5) * 0.12, vy: (r() - 0.5) * 0.12, s: 0.6 + r() * 1.2, p: r() * 6 }); }
    function draw(ts) {
      if (ts - last < 40) { raf = requestAnimationFrame(draw); return; } last = ts;
      ctx.clearRect(0, 0, W, H); var dark = isDark(), acc = cssv("--accent") || "#6A4CFF", base = cssv("--line-rgb") || (dark ? "255,255,255" : "51,36,155"), t = ts / 1000;
      for (var i = 0; i < pts.length; i++) { var p = pts[i]; p.x += p.vx; p.y += p.vy; if (p.x < 0) p.x = W; if (p.x > W) p.x = 0; if (p.y < 0) p.y = H; if (p.y > H) p.y = 0; }
      ctx.lineWidth = 0.6;
      for (var a = 0; a < pts.length; a++) for (var b2 = a + 1; b2 < pts.length; b2++) { var dx = pts[a].x - pts[b2].x, dy = pts[a].y - pts[b2].y, d2 = dx * dx + dy * dy; if (d2 < 22500) { ctx.strokeStyle = "rgba(" + base + "," + ((1 - d2 / 22500) * (dark ? 0.07 : 0.09)) + ")"; ctx.beginPath(); ctx.moveTo(pts[a].x, pts[a].y); ctx.lineTo(pts[b2].x, pts[b2].y); ctx.stroke(); } }
      for (var j = 0; j < pts.length; j++) { var q = pts[j], tw = 0.5 + 0.5 * Math.sin(t * 1.3 + q.p); ctx.fillStyle = j % 9 === 0 ? rgba(acc, 0.35 + tw * 0.4) : "rgba(" + base + "," + (dark ? 0.18 + tw * 0.3 : 0.25 + tw * 0.3) + ")"; ctx.beginPath(); ctx.arc(q.x, q.y, q.s * (0.8 + tw * 0.4), 0, Math.PI * 2); ctx.fill(); }
      if (!REDUCED) raf = requestAnimationFrame(draw);
    }
    size(); addEventListener("resize", function () { size(); if (REDUCED) draw(1e6); });
    document.addEventListener("visibilitychange", function () { if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else if (!raf && !REDUCED) raf = requestAnimationFrame(draw); });
    raf = requestAnimationFrame(draw);
  })();

  /* ------------------------------------------------------------ shell */
  function navItem(hash, label, on) { return '<a href="#' + hash + '"' + (on ? ' class="on"' : "") + ">" + label + "</a>"; }
  function shell(active, body, c, view) {
    var nav = navItem("/", "Cases", active === "" && !c) + navItem("/portfolio", "Portfolio", active === "portfolio") + navItem("/markets", "Markets", active === "markets") + navItem("/framework", "Framework", active === "framework") + navItem("/add", "Add a case", active === "add") + navItem("/tests", "Tests", active === "tests") + navItem("/about", "About", active === "about");
    var top = '<header class="top"><a class="brand" href="#/"><i></i>The AI Counterfactual</a><nav>' + nav + '</nav><div class="right">' + (c ? '<select class="case" data-case-switch aria-label="Switch case">' + CASES.map(function (k) { return '<option value="' + k.id + '"' + (k.id === c.id ? " selected" : "") + ">" + esc(k.id + "  " + k.title) + "</option>"; }).join("") + "</select>" : "") +
      '<button class="btn sm" type="button" data-palette>Search <span class="kbd">/</span></button><button class="btn sm" type="button" data-theme-btn aria-label="Appearance">' + (theme() === "dark" ? "Light" : "Dark") + '</button><a class="pill sm" href="/work/">abhaychakra.com <i>←</i></a></div></header>';
    return '<div class="wrap">' + top + '<main id="main">' + body + "</main>" +
      '<footer class="foot"><span>The AI Counterfactual</span><span>Abhay Chakra Sadineni</span><span>September 2026</span><span>Every case is synthetic and labelled as such; public sources are cited for calibration only.</span><span>Runs entirely in the browser. Nothing is sent anywhere.</span></footer></div>' +
      '<div class="pal" id="pal" hidden><div class="box"><input type="search" id="palq" placeholder="Jump to a case or view…" autocomplete="off"><ul id="pall"></ul></div></div><div class="tipbox" id="tipbox" hidden></div>';
  }
  function synthBanner() { return '<div class="banner"><b>Synthetic cases.</b> Every case is constructed to demonstrate the method. Names, volumes, prices and costs are invented; effect sizes are calibrated to public ranges where a public source exists and the source is cited on the lineage view. No case describes a real company, product or contract.</div>'; }

  /* ------------------------------------------------------------ sub-cases: every comparator, assumption world and subgroup is a case of its own */
  function subcases(c) {
    var k = calc(c), out = [];
    (c.alternatives || []).forEach(function (w, i) { var r = k.aw.worlds.filter(function (x) { return x.label === w.label; })[0]; out.push({ id: c.id + ".c" + (i + 1), parent: c, kind: "comparator", label: w.label, value: r ? r.value : null, view: "worlds", note: w.note, rank: w.rank }); });
    (c.assumptionWorlds || []).forEach(function (w, i) { var r = k.aw.worlds.filter(function (x) { return x.label === w.label; })[0]; out.push({ id: c.id + ".a" + (i + 1), parent: c, kind: "assumption", label: w.label, value: r ? r.value : null, view: "worlds", note: w.note }); });
    ((c.distribution && c.distribution.subgroups) || []).forEach(function (g, i) { out.push({ id: c.id + ".s" + (i + 1), parent: c, kind: "subgroup", label: g.label, effect: g.effect, value: null, view: "welfare", note: "effect " + n(g.effect, 3) + " " + c.technical.unit }); });
    return out;
  }
  function allSubcases() { return CASES.reduce(function (acc, c) { return acc.concat(subcases(c)); }, []); }
  var LOCAL_KEY = "aicf-local-cases";
  function loadLocal() {
    try { var arr = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]"); if (!Array.isArray(arr)) return; arr.forEach(function (c) { try { if (c && c.id && !byId(CASES, c.id)) { A.valuate(c); c.local = true; CASES.push(c); } } catch (e) { if (window.console) console.warn("local case skipped", c && c.id, e.message); } }); } catch (e) {}
  }
  function saveLocal(list) { try { localStorage.setItem(LOCAL_KEY, JSON.stringify(list)); } catch (e) {} }
  function localCases() { return CASES.filter(function (c) { return c.local; }); }
  loadLocal();

  /* ------------------------------------------------------------ galaxy */
  var GAL = null;
  function galaxyView(q) {
    var f = q || {}, inds = uniq(CASES.map(function (c) { return c.industry; })), apps = uniq(CASES.map(function (c) { return c.appClass; })), subs = allSubcases();
    function chips(key, opts, cur) { return opts.map(function (o) { return '<button class="chip' + (o === cur ? " on" : "") + '" data-f="' + key + '" data-v="' + esc(o) + '" type="button">' + esc(o.split(",")[0].split(" and ")[0]) + "</button>"; }).join(""); }
    var list = CASES.filter(function (c) { var r = calc(c); return (!f.industry || c.industry === f.industry) && (!f.app || c.appClass === f.app) && (!f.sign || (f.sign === "positive" ? r.v.value > 0 : r.v.value <= 0)); });
    return '<div class="gwrap"><div class="ghero"><p class="label">Case galaxy</p><h1>What did AI <em>actually</em> add, against the same business without it?</h1><p>Each sphere is a case; the small bodies in orbit are its sub-cases. Size is the value at stake, colour its sign. Hover to read, click to open.</p></div>' +
      '<div class="galaxy" id="galaxy"><canvas id="gal"></canvas><div class="tip" id="galtip" hidden></div><div class="legend"><span><i style="background:var(--pos)"></i>positive value</span><span><i style="background:var(--neg)"></i>negative value</span><span><i style="background:var(--amb)"></i>sign undetermined</span><span><i style="background:var(--tint2);border:1px solid var(--line2)"></i>sub-case in orbit</span><span>lines join cases that share an application class</span></div></div>' +
      '<div class="gstats">' + ro("Cases", String(CASES.length), localCases().length ? localCases().length + " added here" : "") + ro("Sub-cases", String(subs.length)) + ro("Industries", String(inds.length)) + ro("Sources", String(Object.keys(SRC).length)) + "</div></div>" +
      '<div class="section"><div class="vhead"><h2>The cases</h2><p>Filter by industry, application class or sign. Every card is a full counterfactual valuation; the number is the AI-attributable value over the case horizon.</p></div>' +
      '<div class="chips">' + chips("industry", inds, f.industry) + '</div><div class="chips">' + chips("app", apps, f.app) + chips("sign", ["positive", "negative"], f.sign) + (f.industry || f.app || f.sign ? '<button class="chip" data-clear type="button">Clear</button>' : "") + "</div>" +
      '<p class="caseshint">Swipe through the cases</p><div class="cases">' + list.map(function (c, i) { var k = calc(c), und = k.aw.low < 0 && k.aw.high > 0; return '<a class="ccard" href="#/case/' + c.id + '/overview"><div class="n"><span>' + String(CASES.indexOf(c) + 1).replace(/^(\d)$/, "0$1") + "</span><span>" + esc(c.id) + (c.local ? " · added here" : "") + '</span></div><div class="mini">' + orb(und ? "var(--amb)" : k.v.value < 0 ? "var(--neg)" : "var(--pos)") + "</div><h3>" + esc(c.title) + "</h3><p>" + esc(c.industry) + "</p><div class=\"v " + (und ? "amb" : sgn(k.v.value)) + '">' + money(k.v.value) + '</div><div class="sub">' + subcases(c).length + " sub-cases, " + esc(k.v.estimate.method.toLowerCase()) + ", grade " + esc(c.identification.grade) + "</div></a>"; }).join("") + "</div></div>" +
      (window.AICF_MARKETS ? window.AICF_MARKETS.section(q, { ro: ro, pane: pane, table: table }, function () { if (!parse().path.length) render(); }) : "") +
      coverage() + growth() + synthBanner();
  }
  function orb(col) { return '<svg viewBox="0 0 60 60" width="54" height="54"><defs><radialGradient id="o' + col.replace(/[^a-z]/g, "") + '" cx="35%" cy="30%" r="70%"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".35" stop-color="' + col + '" stop-opacity=".85"/><stop offset="1" stop-color="' + col + '"/></radialGradient></defs><circle cx="30" cy="30" r="24" fill="url(#o' + col.replace(/[^a-z]/g, "") + ')"/></svg>'; }
  function coverage() {
    var inds = uniq(CASES.map(function (c) { return c.industry; })), apps = ["Prediction and classification", "Generation and synthesis", "Optimisation and control", "Monitoring and anomaly detection", "Scientific discovery and design"];
    var rows = inds.map(function (ind) { return '<div class="rl">' + esc(ind) + "</div>" + apps.map(function (ap) { var hits = CASES.filter(function (c) { return c.industry === ind && c.appClass === ap; }); return '<div class="cell' + (hits.length ? " on" : "") + '">' + (hits.length ? hits.map(function (h) { return '<a href="#/case/' + h.id + '/overview">' + esc(h.id) + "</a>"; }).join(" ") : "") + "</div>"; }).join(""); }).join("");
    var filled = CASES.length, total = inds.length * apps.length;
    return '<div class="section"><div class="vhead"><h2>Where the galaxy has <em>reach</em></h2><p>The portfolio is a grid of industries by application class. ' + filled + " of " + total + " cells hold a case today; every empty cell is a case the method can take as soon as a record exists.</p></div>" + pane('<div class="covwrap"><div class="cov"><div class="h"></div>' + apps.map(function (a) { return '<div class="h">' + esc(a) + "</div>"; }).join("") + rows + "</div></div>") + "</div>";
  }
  function growth() {
    return '<div class="section"><div class="vhead"><h2>How the galaxy <em>grows</em></h2><p>The twelve cases are the proposal\'s first portfolio, one per domain. The galaxy is not a fixed picture of them; it is a structure that gains a body every time the record gains a case.</p></div>' +
      '<div class="bento">' + pane('<p class="label">1. A new case record adds a sphere</p><p>A case is one JSON record in the shape the engine reads: question, treatment, comparator, evidence, variables, channel formulas. Paste one on the <a href="#/add" style="text-decoration:underline">Add a case</a> page and it is valued, checked against the release checklist and placed in the galaxy in this browser.</p>', "s4") +
      pane('<p class="label">2. Every alternative adds a body in orbit</p><p>Each alternative comparator, assumption world and subgroup is a sub-case with its own value. Twelve cases already carry ' + allSubcases().length + " of them. A model version change or a new review threshold is a new treatment under the case rules, so it becomes a new sub-case rather than a revision of the old one.</p>", "s4") +
      pane('<p class="label">3. Evidence upgrades move a case, they do not replace it</p><p>When a grade D estimate is replaced by a grade B record, the case is re-valued and its stability range narrows; the halo shrinks. The history of a case is the sequence of its versions, each reproducible from its stored inputs and code.</p>', "s4") +
      pane('<p class="label">Phases in the proposal</p><ul class="clean"><li><b>Phase 1</b> Method, engine, first cases, this release.</li><li><b>Phase 2</b> One case per industry by application class where a public or client record exists; the coverage grid above fills cell by cell.</li><li><b>Phase 3</b> Real records under confidentiality, with only the synthetic twins published; benchmarking against published effect sizes.</li><li><b>Phase 4</b> Cross-case findings: how often claims exceed measurement, how often the sign depends on the comparator, which designs hold up.</li></ul>', "s6") +
      pane('<p class="label">Public markets, refreshed daily</p><p>Beside the synthetic cases sits one live feed: quarterly filings of 29 listed companies from SEC EDGAR and macro series from FRED, with the same counterfactual method applied to real numbers. <a href="#/markets" style="text-decoration:underline">Open the markets module.</a></p>', "s12") +
      pane('<p class="label">What never changes</p><ul class="clean"><li>The identity: value = PV(profit with AI) − PV(profit without AI) − AI-specific investment − PV(expected AI-specific losses).</li><li>Assumptions and threats written before the conclusion.</li><li>Private profit and welfare reported side by side, never summed.</li><li>A negative or undetermined result published as found.</li><li>No confidential record in a public case.</li></ul>', "s6") + "</div></div>";
  }
  function startGalaxy(q) {
    var cv = document.getElementById("gal"); if (!cv) return; var box = cv.parentNode, ctx = cv.getContext("2d"), tip = document.getElementById("galtip"), f = q || {};
    var W, H, stars = [], edges = [], hover = null, hoverSat = null, raf = null, last = 0, view = { x: 0, y: 0, k: 1 }, drag = null, t0 = performance.now(), dpr = Math.min(2, devicePixelRatio || 1);
    function match(c) { var r = calc(c); return (!f.industry || c.industry === f.industry) && (!f.app || c.appClass === f.app) && (!f.sign || (f.sign === "positive" ? r.v.value > 0 : r.v.value <= 0)); }
    function colOf(k) { return (k.aw.low < 0 && k.aw.high > 0) ? cssv("--amb") : k.v.value < 0 ? cssv("--neg") : cssv("--pos"); }
    function size() { W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); layout(); }
    function layout() {
      var r = seeded(2026), wide = W > 900, hud = wide ? box.parentNode.querySelector(".ghero") : null, hudH = hud ? hud.getBoundingClientRect().height + 30 : 0, hudW = hud ? hud.getBoundingClientRect().width + 40 : 0;
      var statsEl = wide ? box.parentNode.querySelector(".gstats") : null, statsW = statsEl ? statsEl.getBoundingClientRect().width + 40 : 0, statsH = statsEl ? statsEl.getBoundingClientRect().height + 30 : 0;
      var cx = W * (wide ? 0.55 : 0.5), cy = H * (wide ? 0.58 : 0.5), R = Math.min(W, H) * (wide ? 0.44 : 0.5), sz = Math.max(0.5, Math.min(1, Math.min(W, H) / 820));
      var maxV = Math.max.apply(null, CASES.map(function (c) { return Math.abs(calc(c).v.value); }));
      stars = CASES.map(function (c, i) {
        var k = calc(c), ang = -Math.PI / 2 + (i / CASES.length) * Math.PI * 2 + (r() - 0.5) * 0.3, rad = R * (0.5 + r() * 0.6);
        var subs = subcases(c);
        return { c: c, k: k, x: cx + Math.cos(ang) * rad * (W > 700 ? 1.3 : 1), y: cy + Math.sin(ang) * rad, vx: 0, vy: 0, r: (9 + 20 * Math.sqrt(Math.abs(k.v.value) / maxV)) * sz, col: colOf(k), ph: r() * 6, tilt: 0.45 + r() * 0.25,
                 sats: subs.map(function (sc, j) { var v = sc.value; return { sc: sc, a: r() * 6.28, d: 1.9 + (j % 3) * 0.55 + r() * 0.3, s: (0.0025 + r() * 0.003) * (j % 2 ? 1 : -1), col: v === null ? cssv("--c5") : v < 0 ? cssv("--neg") : cssv("--pos"), rr: (v === null ? 3 : 3.4 + 2.2 * Math.sqrt(Math.abs(v) / maxV)) * sz }; }) };
      });
      stars.forEach(function (s) { s.reach = s.r * 2.85 + 8; });
      for (var it = 0; it < 260; it++) {
        stars.forEach(function (a) {
          var fx = (cx - a.x) * 0.003, fy = (cy - a.y) * 0.003;
          stars.forEach(function (b) { if (a === b) return; var dx = a.x - b.x, dy = a.y - b.y, d2 = dx * dx + dy * dy + 1, d = Math.sqrt(d2), min = a.reach + b.reach + (wide ? 40 : 22); if (d < min) { fx += dx / d * (min - d) * 0.08; fy += dy / d * (min - d) * 0.08; } });
          if (hudW && a.x < hudW && a.y < hudH + 60) { fy += 3; fx += 1.5; }
          if (statsW && a.x > W - statsW && a.y < statsH + 40) { fy += 3; fx -= 1.5; }
          a.vx = (a.vx + fx) * 0.6; a.vy = (a.vy + fy) * 0.6;
        });
        stars.forEach(function (a) { a.x = Math.max(a.reach + 16, Math.min(W - a.reach - 16, a.x + a.vx)); a.y = Math.max(hudW && a.x < hudW ? hudH : (statsW && a.x > W - statsW ? statsH : a.reach + 20), Math.min(H - a.reach - (wide ? 78 : 40), a.y + a.vy)); });
      }
      edges = [];
      for (var i = 0; i < stars.length; i++) for (var j = i + 1; j < stars.length; j++) { var a = stars[i], b = stars[j]; if (a.c.appClass === b.c.appClass) edges.push({ a: a, b: b }); }
    }
    function sphere(x, y, r, col, alpha) {
      var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05);
      g.addColorStop(0, "rgba(255,255,255," + (0.95 * alpha) + ")"); g.addColorStop(0.3, rgba(col, 0.85 * alpha)); g.addColorStop(1, rgba(col, alpha));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill();
    }
    function draw(ts) {
      if (ts - last < 16) { raf = requestAnimationFrame(draw); return; } last = ts; var t = (ts - t0) / 1000, dark = isDark(), lineCol = cssv("--line-rgb") || (dark ? "255,255,255" : "51,36,155");
      ctx.clearRect(0, 0, W, H); ctx.save(); ctx.translate(view.x, view.y); ctx.scale(view.k, view.k);
      stars.forEach(function (s) { s.dx = Math.sin(t * 0.3 + s.ph) * 5; s.dy = Math.cos(t * 0.25 + s.ph * 1.3) * 5; s.X = s.x + s.dx; s.Y = s.y + s.dy; });
      edges.forEach(function (e) { var on = match(e.a.c) && match(e.b.c), hl = hover && (e.a === hover || e.b === hover); ctx.strokeStyle = "rgba(" + lineCol + "," + (hl ? 0.45 : on ? 0.14 : 0.04) + ")"; ctx.lineWidth = hl ? 1.4 : 1; ctx.beginPath(); ctx.moveTo(e.a.X, e.a.Y); ctx.lineTo(e.b.X, e.b.Y); ctx.stroke(); });
      stars.forEach(function (s) {
        var on = match(s.c), hl = s === hover, dim = on ? 1 : 0.22;
        /* soft shadow under the sphere */
        var sh = ctx.createRadialGradient(s.X, s.Y + s.r * 0.6, 0, s.X, s.Y + s.r * 0.6, s.r * 2.2); sh.addColorStop(0, "rgba(" + lineCol + "," + 0.14 * dim + ")"); sh.addColorStop(1, "rgba(" + lineCol + ",0)");
        ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(s.X, s.Y + s.r * 0.6, s.r * 2.2, 0, 6.29); ctx.fill();
        /* orbits */
        s.sats.forEach(function (m) { var orr = s.r * m.d; ctx.strokeStyle = "rgba(" + lineCol + "," + 0.09 * dim + ")"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(s.X, s.Y, orr, orr * s.tilt, 0, 0, 6.29); ctx.stroke(); });
        /* satellites behind */
        s.sats.forEach(function (m) { m.a += m.s * (hl ? 2 : 1); var orr = s.r * m.d; m.X = s.X + Math.cos(m.a) * orr; m.Y = s.Y + Math.sin(m.a) * orr * s.tilt; m.back = Math.sin(m.a) < 0; if (m.back) sphere(m.X, m.Y, m.rr * (m === hoverSat ? 1.5 : 1), m.col, 0.75 * dim); });
        sphere(s.X, s.Y, s.r * (hl ? 1.08 : 1), s.col, dim);
        s.sats.forEach(function (m) { if (!m.back) sphere(m.X, m.Y, m.rr * (m === hoverSat ? 1.5 : 1), m.col, 0.95 * dim); });
        ctx.fillStyle = "rgba(" + cssv("--ink-rgb") + "," + (hl ? 1 : 0.85 * dim) + ")"; ctx.font = (hl ? "600 12px " : "600 11px ") + cssv("--sans"); ctx.textAlign = "center";
        ctx.fillText(s.c.id, s.X, s.Y + s.reach + 4);
        ctx.fillStyle = rgba(cssv("--ink2"), 0.85 * dim); ctx.font = "500 10.5px " + cssv("--sans"); ctx.fillText(money(s.k.v.value), s.X, s.Y + s.reach + 18);
      });
      ctx.restore();
      if (!REDUCED) raf = requestAnimationFrame(draw);
    }
    function hit(ev) {
      var r = cv.getBoundingClientRect(), x = (ev.clientX - r.left - view.x) / view.k, y = (ev.clientY - r.top - view.y) / view.k, best = null, bd = 1e9, sat = null;
      stars.forEach(function (s) { s.sats.forEach(function (m) { if (m.X === undefined) return; var dx = m.X - x, dy = m.Y - y, d = dx * dx + dy * dy; if (d < (m.rr + 6) * (m.rr + 6) && d < bd) { bd = d; sat = m; best = s; } }); });
      if (!sat) stars.forEach(function (s) { var dx = (s.X || s.x) - x, dy = (s.Y || s.y) - y, d = dx * dx + dy * dy, R = s.r + 8; if (d < R * R && d < bd) { bd = d; best = s; } });
      return { star: best, sat: sat };
    }
    function showTip() {
      if (!hover) { tip.hidden = true; return; } var s = hover, k = s.k, px = s.X * view.k + view.x, py = s.Y * view.k + view.y, html;
      if (hoverSat) { var sc = hoverSat.sc; html = '<span class="tag">' + esc(sc.id) + '</span><span class="tag">' + esc(sc.kind) + "</span><b>" + esc(sc.label) + '</b><p class="q">' + esc(sc.note || "") + '</p><div class="kv">' + (sc.value !== null ? "<span>value <span class=\"" + sgn(sc.value) + '">' + money(sc.value) + "</span></span>" : "<span>subgroup effect " + n(sc.effect, 3) + "</span>") + "<span>parent " + esc(s.c.id) + "</span></div>"; px = hoverSat.X * view.k + view.x; py = hoverSat.Y * view.k + view.y; }
      else html = '<span class="tag">' + esc(s.c.id) + "</span>" + grade(s.c.identification.grade) + "<b>" + esc(s.c.title) + '</b><p class="q">' + esc(s.c.question) + '</p><div class="kv"><span>value <span class="' + sgn(k.v.value) + '">' + money(k.v.value) + "</span></span><span>range " + money(k.aw.low) + " to " + money(k.aw.high) + "</span><span>" + s.sats.length + " sub-cases</span><span>" + esc(k.v.estimate.method) + "</span></div>";
      tip.innerHTML = html; tip.hidden = false; var tw = tip.offsetWidth, th = tip.offsetHeight, lx = px + s.reach * view.k + 14, ly = py - th / 2; if (lx + tw > W - 10) lx = px - s.reach * view.k - 14 - tw; tip.style.left = Math.max(8, lx) + "px"; tip.style.top = Math.max(8, Math.min(H - th - 8, ly)) + "px";
    }
    cv.addEventListener("mousemove", function (ev) { if (drag) { view.x = drag.vx + (ev.clientX - drag.x); view.y = drag.vy + (ev.clientY - drag.y); drag.moved = true; if (REDUCED) draw(1e9); return; } var h = hit(ev); if (h.star !== hover || h.sat !== hoverSat) { hover = h.star; hoverSat = h.sat; cv.style.cursor = h.star ? "pointer" : "grab"; showTip(); if (REDUCED) draw(1e9); } else if (h.star) showTip(); });
    cv.addEventListener("mouseleave", function () { hover = null; hoverSat = null; drag = null; showTip(); });
    cv.addEventListener("mousedown", function (ev) { drag = { x: ev.clientX, y: ev.clientY, vx: view.x, vy: view.y, moved: false }; cv.style.cursor = "grabbing"; });
    addEventListener("mouseup", function () { if (drag) cv.style.cursor = "grab"; });
    cv.addEventListener("click", function (ev) { var moved = drag && drag.moved; drag = null; if (moved) return; var h = hit(ev); if (h.sat) location.hash = "#/case/" + h.star.c.id + "/" + h.sat.sc.view; else if (h.star) location.hash = "#/case/" + h.star.c.id + "/overview"; });
    cv.addEventListener("wheel", function (ev) { ev.preventDefault(); var r = cv.getBoundingClientRect(), mx = ev.clientX - r.left, my = ev.clientY - r.top, k = Math.max(0.6, Math.min(2.6, view.k * (ev.deltaY < 0 ? 1.1 : 0.9))); view.x = mx - (mx - view.x) * k / view.k; view.y = my - (my - view.y) * k / view.k; view.k = k; if (REDUCED) draw(1e9); }, { passive: false });
    cv.addEventListener("touchstart", function (ev) { var t = ev.touches[0]; drag = { x: t.clientX, y: t.clientY, vx: view.x, vy: view.y, moved: false }; }, { passive: true });
    cv.addEventListener("touchmove", function (ev) { if (!drag) return; var t = ev.touches[0]; view.x = drag.vx + (t.clientX - drag.x); view.y = drag.vy + (t.clientY - drag.y); drag.moved = true; }, { passive: true });
    cv.addEventListener("touchend", function (ev) { if (drag && !drag.moved) { var h = hit(ev.changedTouches[0]); if (h.star) location.hash = "#/case/" + h.star.c.id + "/" + (h.sat ? h.sat.sc.view : "overview"); } drag = null; });
    size(); addEventListener("resize", size);
    function vis() { if (document.hidden) cancelAnimationFrame(raf); else if (!REDUCED && GAL) raf = requestAnimationFrame(draw); }
    document.addEventListener("visibilitychange", vis);
    GAL = { stop: function () { cancelAnimationFrame(raf); removeEventListener("resize", size); document.removeEventListener("visibilitychange", vis); GAL = null; } };
    if (REDUCED) draw(1e9); else raf = requestAnimationFrame(draw);
  }

  /* ------------------------------------------------------------ case instruments */
  function caseHead(c, view) {
    var k = calc(c), v = k.v, aw = k.aw, und = aw.low < 0 && aw.high > 0, subs = subcases(c);
    return '<div class="chead"><div><div class="id"><b>' + esc(c.id) + "</b><span>" + esc(c.industry) + "</span><span>" + esc(c.appClass) + "</span>" + (c.local ? "<span>added in this browser</span>" : "") + "</div><h1>" + esc(c.title) + '</h1><p class="lede">' + esc(c.question) + '</p><div class="meta"><span>' + esc(c.unit) + "</span><span>" + esc(c.period) + "</span><span>" + esc(c.geography) + "</span><span>" + esc(c.status) + "</span><span>Grade " + esc(c.identification.grade) + "</span><span>" + subs.length + " sub-cases</span><span>Synthetic</span></div></div>" +
      '<div class="ro navy big"><div class="l">AI-attributable value, PV over ' + c.model.horizonYears + ' years</div><div class="v">' + money(v.value) + '</div><div class="s">' + (v.bound ? "A bound, not a point estimate. " : "") + "Across " + aw.worlds.length + " worlds: " + money(aw.low) + " to " + money(aw.high) + (und ? ". The sign is not determined by the evidence." : "") + "</div></div></div>" +
      '<nav class="viewbar">' + VIEWS.map(function (x) { return '<a href="#/case/' + c.id + "/" + x[0] + '"' + (view === x[0] ? ' class="on"' : "") + ">" + ico(x[0]) + x[1] + "</a>"; }).join("") + "</nav>";
  }

  function timelineSvg(c) {
    var ev = c.timeline.slice().sort(function (a, b) { return a[0] < b[0] ? -1 : 1; }), W = 1100, H = 104, xs = ev.map(function (e) { return Date.parse(e[0]); }), lo = Math.min.apply(null, xs), hi = Math.max.apply(null, xs), x = scale([lo, hi], [90, W - 90]), b = "";
    var col = { claim: "var(--neg)", complement: "var(--c5)", deployment: "var(--pos)", version: "var(--blue)", economic: "var(--amb)", risk: "var(--pink)", concurrent: "var(--vio)" };
    b += '<line x1="60" x2="' + (W - 60) + '" y1="46" y2="46" stroke="var(--line2)"/><line x1="60" x2="' + (W - 60) + '" y1="46" y2="46" stroke="var(--accent)" stroke-width="1" opacity=".5"/>';
    ev.forEach(function (e, i) { var px = x(Date.parse(e[0])), up = i % 2 === 0, anchor = px < 140 ? "start" : px > W - 140 ? "end" : "middle", tx = anchor === "start" ? px - 8 : anchor === "end" ? px + 8 : px; b += '<circle cx="' + px + '" cy="46" r="5" fill="' + (col[e[2]] || "var(--ink2)") + '"><title>' + esc(e[0] + "  " + e[1]) + "</title></circle>" + T(tx, up ? 26 : 70, e[0], "", anchor) + T(tx, up ? 12 : 86, e[1].length > 36 ? e[1].slice(0, 34) + "…" : e[1], "lbl", anchor); });
    return svg(W, H, b) + '<div class="legend">' + Object.keys(col).map(function (k) { return "<span><i style=\"background:" + col[k] + '"></i>' + k + "</span>"; }).join("") + "</div>";
  }

  function vOverview(c) {
    var k = calc(c), v = k.v, aw = k.aw, mc = k.mc, cov = k.cov;
    var flags = "";
    if (v.bound) flags += '<div class="banner warn"><b>Bound, not a point estimate.</b> No field counterfactual exists; the design is a ' + esc(v.estimate.method.toLowerCase()) + " and the value is a range. The central figure is a midpoint and carries no more authority than the ends.</div>";
    if (aw.low < 0 && aw.high > 0) flags += '<div class="banner warn"><b>The sign depends on the comparator or an assumption.</b> At least one plausible alternative world gives the opposite sign; the report states this rather than the preferred figure alone.</div>';
    if (v.claimed !== null) flags += '<div class="banner"><b>Claim to value gap:</b> the recorded claim implies ' + money(v.claimed) + " over the same horizon against a measured " + money(v.value) + ". " + link("/case/" + c.id + "/claim", "Open the claim view.") + "</div>";
    var top = '<div class="grid3">' + pane('<p class="eyebrow"><span>AI-attributable value</span><span>PV over ' + c.model.horizonYears + " years at " + pct(c.model.discountRate, 0) + "</span></p>" + arcGauge(v.value, aw.low, aw.high, { label: "within the stability range" }) + '<p class="cap" style="text-align:center">Range across ' + aw.worlds.length + " alternative worlds: " + money(aw.low) + " to " + money(aw.high) + "</p>", "hi") +
      pane('<p class="eyebrow">Uncertainty</p><div class="grid2">' + ring(mc.probNegative, "P(value < 0)", { color: mc.probNegative > 0.5 ? "var(--neg)" : mc.probNegative > 0.2 ? "var(--amb)" : "var(--pos)" }) + ring(cov.share, "evidence coverage", { color: "var(--blue)" }) + '</div><p class="cap">Monte Carlo over stated input ranges and the effect interval; coverage is the share of material inputs with grade A to D sources.</p>') +
      pane('<p class="eyebrow">Readouts</p><div class="grid2">' + ro("Technical effect", '<span class="num">' + n(v.estimate.effect, Math.abs(v.estimate.effect) < 1 ? 4 : 2) + "</span>", esc(c.technical.unit) + ", 95% interval " + n(v.estimate.lo, 3) + " to " + n(v.estimate.hi, 3)) + ro("Contribution share", v.contributionShare === null ? "n/a" : pct(v.contributionShare), v.contributionShare === null ? "cost centre" : "of profit without AI") + ro("Head-start value", money(v.headStartValue), v.headStartYears + " of " + c.model.horizonYears + " years") + ro("Expected AI-specific loss", money(-v.expectedLossPV), "present value", "neg") + "</div>") + "</div>";
    var body = flags + '<div class="grid2">' + pane('<p class="eyebrow">Treatment</p><ul class="clean"><li><b>System</b> ' + esc(c.treatment.system) + "</li><li><b>Version</b> " + esc(c.treatment.version) + "</li><li><b>Deployed</b> " + esc(c.treatment.deployed) + "</li><li><b>Scope</b> " + esc(c.treatment.scope) + "</li><li><b>Autonomy</b> " + esc(c.treatment.autonomy) + "</li><li><b>Data</b> " + esc(c.treatment.data) + "</li><li><b>Users</b> " + esc(c.treatment.users) + "</li><li><b>Complements</b> " + esc((c.treatment.complements || []).join("; ")) + "</li></ul>") +
      pane('<p class="eyebrow"><span>No-AI comparator</span><span>Rank ' + c.comparator.rank + " of 7</span></p><ul class=\"clean\"><li><b>" + esc(RANKS[c.comparator.rank]) + "</b></li><li><b>Comparator</b> " + esc(c.comparator.label) + "</li><li><b>Basis</b> " + esc(c.comparator.basis) + "</li>" + (c.comparator.contamination || []).map(function (x) { return "<li><b>Contamination check</b> " + esc(x) + "</li>"; }).join("") + '</ul><p class="eyebrow" style="margin-top:1rem">Intended use</p><p>' + esc(c.intendedUse) + '</p><p class="eyebrow">Why this unit</p><p>' + esc(c.unitRationale) + "</p>") + "</div>" +
      pane('<p class="eyebrow">Timeline</p>' + timelineSvg(c)) +
      '<div class="grid2">' + pane('<p class="eyebrow">Calibration</p><p>' + esc(c.calibration) + "</p>") + pane('<p class="eyebrow">Limitations</p><ul class="clean">' + c.limitations.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>") + "</div>";
    return top + body;
  }

  function vWithWithout(c) {
    var k = calc(c), v = k.v, rows = v.rows;
    var pts = function (key) { return rows.map(function (r) { return [r.year, r[key]]; }); };
    var extra = v.headStartYears < c.model.horizonYears ? '<div class="banner"><b>Head start ends in year ' + v.headStartYears + ".</b> After that the no-AI alternative is assumed to have caught up and the operating delta stops; only losses that persist remain.</div>" : "";
    return vhead("Profit with AI and profit without AI", "Same base, same prices, same horizon. The only difference is the estimated effect translated through the channel formulas, less AI-specific costs and losses. The shaded band is the difference.") +
      pane(glowLines([{ label: "Profit with AI", color: "var(--blue)", points: pts("profitWith") }, { label: "Profit without AI", color: "var(--c5)", points: pts("profitWithout"), dash: "5 6" }], { money: true, gap: true, gapColor: v.value < 0 ? "var(--neg)" : "var(--pos)", xfmt: function (t) { return "Y" + t; }, cap: "Annual operating profit of the unit, nominal; the axis does not start at zero. The base without AI is a synthetic budget line; only the difference is estimated." }) + extra) +
      '<div class="grid4">' + ro("PV profit with AI", money(v.profitWithPV)) + ro("PV profit without AI", money(v.profitWithoutPV)) + ro("Operating difference and losses", money(v.profitWithPV - v.profitWithoutPV), "", sgn(v.profitWithPV - v.profitWithoutPV)) + ro("After AI-specific investment", money(v.value), "AI-attributable value", sgn(v.value)) + "</div>" +
      pane('<p class="eyebrow">Year by year</p>' + table(["Year", "#Revenue", "#Variable cost", "#Fixed cost", "#Cannibalisation", "#Expected loss", "#Delta", "#Discount", "#PV of delta"], rows.map(function (r) { return [r.year, money(r.revenue), money(r.variableCost), money(r.fixedCost), money(r.cannibalization), money(r.expectedLoss), money(r.delta), n(r.df, 3), money(r.pvDelta)]; })) + '<p class="note">Costs and losses shown negative. Ramp ' + (c.model.rampYears || 1) + " year(s) to full effect. The delta excludes the one-off investment, shown on the value flow.</p>");
  }

  /* value flow: ribbons from gains into the operating pool, out to costs and losses, remainder to value */
  function flowSvg(c) {
    var k = calc(c), v = k.v, b = v.bridge, W = 760, H = 380;
    var gains = [["Revenue channel", b.revenue], ["Variable cost saved", b.variableCost], ["Fixed cost saved", -0], ["Capital avoided", v.capitalAvoided], ["Option value", b.optionValue]].filter(function (g) { return g[1] > 0.5; });
    var drains = [["Revenue lost", -b.revenue], ["Extra variable cost", -b.variableCost], ["Fixed cost", -b.fixedCost], ["Cannibalisation", -b.cannibalization], ["Expected loss", -b.expectedLoss], ["AI investment", v.capital]].filter(function (d) { return d[1] > 0.5; });
    var gTot = gains.reduce(function (s, g) { return s + g[1]; }, 0), dTot = drains.reduce(function (s, d) { return s + d[1]; }, 0), value = v.value, total = Math.max(gTot, dTot, 1);
    var unit = 250 / total, x0 = 190, x1 = 380, x2 = 570, s = "";
    /* left: gains stacked */
    var gy = (H - gTot * unit) / 2, out = "";
    var poolH = gTot * unit, poolY = (H - poolH) / 2;
    var cursorL = gy, cursorPool = poolY;
    gains.forEach(function (g, i) {
      var h = g[1] * unit, col = "var(--pos)";
      out += ribbon(x0, cursorL, x1, cursorPool, h, col, g[0] + ": " + money(g[1]));
      out += T(x0 - 8, cursorL + h / 2 + 4, g[0], "lbl", "end") + T(x0 - 8, cursorL + h / 2 + 16, money(g[1]), "", "end");
      cursorL += h + 6; cursorPool += h;
    });
    /* pool */
    out += '<rect x="' + x1 + '" y="' + poolY + '" width="14" height="' + Math.max(2, poolH) + '" rx="3" fill="var(--ink)" opacity=".9"/>' + T(x1 + 7, poolY - 10, "gross gains " + money(gTot), "", "middle");
    /* right: drains then value */
    var rightTot = dTot + Math.max(0, value), cursorR = (H - rightTot * unit) / 2, cursorP = poolY;
    drains.forEach(function (d) {
      var h = d[1] * unit; out += ribbon(x1 + 14, cursorP, x2, cursorR, h, "var(--neg)", d[0] + ": " + money(-d[1]));
      out += T(x2 + 8, cursorR + h / 2 + 4, d[0], "lbl") + T(x2 + 8, cursorR + h / 2 + 16, money(-d[1]));
      cursorR += h + 6; cursorP += h;
    });
    if (value > 0) { var vh = value * unit; out += ribbon(x1 + 14, cursorP, x2, cursorR, vh, "var(--accent)", "AI-attributable value: " + money(value)); out += T(x2 + 8, cursorR + vh / 2 + 4, "AI-attributable value", "lbl") + T(x2 + 8, cursorR + vh / 2 + 16, money(value)); }
    else { out += T(x2 + 8, H - 24, "Drains exceed gains: value " + money(value), "lbl"); out += '<rect x="' + (x1 + 14) + '" y="' + (poolY + poolH) + '" width="0" height="0"/>'; }
    if (dTot > gTot) { var dh = (dTot - gTot) * unit; out += '<rect x="' + x1 + '" y="' + (poolY + poolH) + '" width="14" height="' + dh + '" rx="3" fill="var(--neg)" opacity=".5"/>' + T(x1 + 7, poolY + poolH + dh + 14, "shortfall " + money(gTot - dTot), "", "middle"); }
    return svg(W, H, out, "Present values over the horizon. Ribbons are drawn to scale; gains on the left flow into the pool, costs and losses drain it on the right, and what remains is the AI-attributable value. Flowing dashes mark direction.", 'data-fit');
  }
  function ribbon(xa, ya, xb, yb, h, col, title) {
    var mx = (xa + xb) / 2, d = "M" + xa + "," + ya + " C" + mx + "," + ya + " " + mx + "," + yb + " " + xb + "," + yb + " L" + xb + "," + (yb + h) + " C" + mx + "," + (yb + h) + " " + mx + "," + (ya + h) + " " + xa + "," + (ya + h) + "Z";
    var mid = "M" + xa + "," + (ya + h / 2) + " C" + mx + "," + (ya + h / 2) + " " + mx + "," + (yb + h / 2) + " " + xb + "," + (yb + h / 2);
    return '<path d="' + d + '" fill="' + col + '" opacity=".28"><title>' + esc(title) + '</title></path><path d="' + mid + '" fill="none" stroke="' + col + '" stroke-width="' + Math.min(3, Math.max(1, h / 6)) + '" class="flow" opacity=".9"/>';
  }
  function vBridge(c) {
    var k = calc(c), v = k.v, b = v.bridge;
    var steps = [["Revenue channel", b.revenue], ["Variable cost channel", b.variableCost], ["Fixed cost channel", b.fixedCost], ["Cannibalisation", b.cannibalization], ["Expected loss", b.expectedLoss], ["AI investment", b.capital], ["Option value", b.optionValue]].filter(function (s) { return Math.abs(s[1]) > 0.5; });
    var eL = c.model.channels.expectedLoss ? A.evaluate(c.model.channels.expectedLoss, v.vars) : 0;
    var run = 0, wf = steps.map(function (s) { var from = run; run += s[1]; return { label: s[0], value: s[1], from: from, to: run }; });
    var W = 760, H = 250, lo = Math.min(0, run), hi = Math.max(0, run); wf.forEach(function (w) { lo = Math.min(lo, w.from, w.to); hi = Math.max(hi, w.from, w.to); }); var pad = (hi - lo) * 0.1; lo -= pad; hi += pad;
    var y = scale([lo, hi], [H - 40, 20]), bw = (W - 80) / (wf.length + 1), o = "";
    ticks(lo, hi, 5).forEach(function (t) { o += '<line class="grid" x1="60" x2="' + (W - 10) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(52, y(t) + 4, fm(t), "", "end"); });
    o += '<line class="ax" x1="60" x2="' + (W - 10) + '" y1="' + y(0) + '" y2="' + y(0) + '"/>';
    wf.concat([{ label: "Value", value: run, from: 0, to: run, total: true }]).forEach(function (w, i) {
      var x0 = 70 + i * bw, col = w.total ? "var(--ink)" : w.value >= 0 ? "var(--pos)" : "var(--neg)";
      o += '<rect x="' + x0 + '" y="' + Math.min(y(w.from), y(w.to)) + '" width="' + (bw - 14) + '" height="' + Math.max(1.5, Math.abs(y(w.to) - y(w.from))) + '" rx="3" fill="' + col + '" opacity=".85"><title>' + esc(w.label + ": " + fm(w.value)) + "</title></rect>";
      if (!w.total) o += '<line x1="' + (x0 + bw - 14) + '" x2="' + (x0 + bw) + '" y1="' + y(w.to) + '" y2="' + y(w.to) + '" stroke="var(--line2)" stroke-dasharray="2 3"/>';
      o += T(x0 + (bw - 14) / 2, H - 24, w.label.split(" ").slice(0, 2).join(" "), "", "middle") + T(x0 + (bw - 14) / 2, H - 11, w.label.split(" ").slice(2).join(" "), "", "middle") + T(x0 + (bw - 14) / 2, Math.min(y(w.from), y(w.to)) - 5, fm(w.value), "lbl", "middle");
    });
    return vhead("Value flow", "Every dollar walks through one channel of the identity: AI-attributable value = PV(profit with AI) − PV(profit without AI) − AI-specific investment − PV(expected AI-specific losses).") +
      pane(flowSvg(c), "hi") +
      '<div class="grid2">' + pane('<p class="eyebrow">Bridge, step by step</p>' + svg(W, H, o)) +
      pane('<p class="eyebrow">Channels as evaluated</p>' + table(["Channel", "Formula (annual)", "#Annual", "#PV"], [
        ["Revenue", "<code>" + esc(c.model.channels.revenue || "0") + "</code>", money(v.annual.revenue), money(b.revenue)],
        ["Variable cost (+ = extra cost)", "<code>" + esc(c.model.channels.variableCost || "0") + "</code>", money(v.annual.variableCost), money(b.variableCost)],
        ["Fixed cost", "<code>" + esc(c.model.channels.fixedCost || "0") + "</code>", money(v.annual.fixedCost), money(b.fixedCost)],
        ["Cannibalisation", "<code>" + esc(c.model.channels.cannibalization || "0") + "</code>", money(v.annual.cannibalization), money(b.cannibalization)],
        ["Expected AI-specific loss", "<code>" + esc(c.model.channels.expectedLoss || "0") + "</code>", money(eL), money(b.expectedLoss)],
        ["AI-specific investment (one-off)", "<code>" + esc(c.model.channels.capital || "0") + "</code>", money(v.capital), money(b.capital)],
        ["Timing (head start " + v.headStartYears + " of " + c.model.horizonYears + " years)", "", "", money(b.timing)],
        (function () { var r = ["AI-attributable value", "", "", money(v.value)]; r.__cls = "total"; return r; })()
      ]) + '<p class="note">' + esc(c.model.note || "") + "</p>") + "</div>";
  }

  function vEvidence(c) {
    var k = calc(c), est = k.v.estimate, d = c.identification.data, m = c.identification.method, chart = "";
    if (m === "did") {
      var pre = d.treated.pre.length, pts = function (arr, off) { return arr.map(function (y, i) { return [i + off, y]; }); };
      var tp = pts(d.treated.pre, 1).concat(pts(d.treated.post, pre + 1)), cp = pts(d.control.pre, 1).concat(pts(d.control.post, pre + 1));
      var shift = A.util.mean(d.treated.pre) - A.util.mean(d.control.pre), ghost = pts(d.control.post.map(function (y) { return y + shift; }), pre + 1);
      ghost.unshift([pre, d.treated.pre[pre - 1]]);
      chart = glowLines([{ label: "Treated, observed", color: "var(--blue)", points: tp }, { label: "Treated without AI (control path, level-matched)", color: "var(--amb)", points: ghost, dash: "5 6" }, { label: "Control", color: "var(--c5)", points: cp, noDots: true, width: 1.4 }], { marker: pre + 0.5, gap: true, gapColor: est.effect < 0 ? "var(--neg)" : "var(--pos)", xfmt: function (t) { return "m" + t; }, cap: "The dashed orange line is the counterfactual: the treated series had it followed the control group's change. The shaded gap is the effect. Pre-period slope gap " + n(est.detail.preTrendGap, 4) + " per month." });
    } else if (m === "rct") {
      var all = d.treated.units.concat(d.control.units), lo = Math.min.apply(null, all), hi = Math.max.apply(null, all), bw2 = (hi - lo) / 6 || 1;
      function kde(u) { var xs = [], k2 = 60; for (var i = 0; i <= k2; i++) { var x0 = lo - bw2 + (hi - lo + 2 * bw2) * i / k2, s = 0; u.forEach(function (v) { var z = (x0 - v) / (bw2 * 0.35); s += Math.exp(-0.5 * z * z); }); xs.push([x0, s / u.length]); } return xs; }
      chart = glowLines([{ label: "Treated units (n=" + d.treated.units.length + ")", color: "var(--blue)", points: kde(d.treated.units), noDots: true }, { label: "Control units (n=" + d.control.units.length + ")", color: "var(--c5)", points: kde(d.control.units), noDots: true }], { xfmt: function (t) { return n(t, Math.abs(hi) < 1 ? 4 : 1); }, cap: "Density of unit-level outcomes by arm. Effect is the difference in means: " + n(est.detail.meanTreated, 4) + " against " + n(est.detail.meanControl, 4) + "." });
    } else if (m === "rdd") {
      var W = 760, H = 300, xs = d.obs.map(function (p) { return p.x; }), ys = d.obs.map(function (p) { return p.y; }), x = scale([Math.min.apply(null, xs), Math.max.apply(null, xs)], [66, W - 16]), ylo = Math.min.apply(null, ys), yhi = Math.max.apply(null, ys), y = scale([ylo, yhi], [H - 34, 20]), o = "";
      ticks(ylo, yhi, 5).forEach(function (t) { o += '<line class="grid" x1="66" x2="' + (W - 16) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(58, y(t) + 4, n(t, 3), "", "end"); });
      d.obs.forEach(function (p) { o += '<circle cx="' + x(p.x) + '" cy="' + y(p.y) + '" r="2.4" fill="' + (p.x >= d.cutoff ? "var(--pos)" : "var(--blue)") + '" opacity=".7"/>'; });
      o += '<line x1="' + x(d.cutoff) + '" x2="' + x(d.cutoff) + '" y1="20" y2="' + (H - 34) + '" stroke="var(--amb)" stroke-dasharray="4 5"/>';
      var L = d.obs.filter(function (p) { return p.x < d.cutoff && p.x >= d.cutoff - d.bandwidth; }), R = d.obs.filter(function (p) { return p.x >= d.cutoff && p.x <= d.cutoff + d.bandwidth; });
      function fit(pts2) { var xm = A.util.mean(pts2.map(function (p) { return p.x; })), ym = A.util.mean(pts2.map(function (p) { return p.y; })), num = 0, den = 0; pts2.forEach(function (p) { num += (p.x - xm) * (p.y - ym); den += (p.x - xm) * (p.x - xm); }); var b = den ? num / den : 0; return { a: ym - b * xm, b: b }; }
      var fl = fit(L), fr = fit(R), xl0 = d.cutoff - d.bandwidth, xr1 = d.cutoff + d.bandwidth;
      o += '<line x1="' + x(xl0) + '" y1="' + y(fl.a + fl.b * xl0) + '" x2="' + x(d.cutoff) + '" y2="' + y(fl.a + fl.b * d.cutoff) + '" stroke="var(--ink)" stroke-width="2.4"/><line x1="' + x(d.cutoff) + '" y1="' + y(fr.a + fr.b * d.cutoff) + '" x2="' + x(xr1) + '" y2="' + y(fr.a + fr.b * xr1) + '" stroke="var(--ink)" stroke-width="2.4"/>';
      o += '<path d="M' + x(d.cutoff) + "," + y(fl.a + fl.b * d.cutoff) + " L" + x(d.cutoff) + "," + y(fr.a + fr.b * d.cutoff) + '" stroke="var(--neg)" stroke-width="4" stroke-linecap="round"/>' + T(x(d.cutoff) + 8, (y(fl.a + fl.b * d.cutoff) + y(fr.a + fr.b * d.cutoff)) / 2 + 4, "jump " + n(est.effect, 4), "lbl");
      ticks(Math.min.apply(null, xs), Math.max.apply(null, xs), 8).forEach(function (t) { o += T(x(t), H - 10, n(t, 0), "", "middle"); });
      chart = svg(W, H, o, "Outcome by running variable. Local linear fits on each side of the cutoff; the red segment is the discontinuity. Bandwidth " + d.bandwidth + ", " + est.detail.nLeft + " left, " + est.detail.nRight + " right. No bunching at the cutoff.");
    } else if (m === "survival") {
      var km = function (rows) { var s = rows.slice().sort(function (a, b) { return a.t - b.t; }), alive = s.length, out = [[0, 1]], surv = 1; s.forEach(function (r) { if (!r.censored) surv *= (alive - 1) / alive; alive--; out.push([r.t, surv]); }); return out; };
      chart = glowLines([{ label: "Platform programmes (share not yet at candidate)", color: "var(--blue)", points: km(d.treated) }, { label: "Matched conventional programmes", color: "var(--c5)", points: km(d.control) }], { xfmt: function (t) { return t + " mo"; }, gap: true, gapColor: "var(--pos)", cap: "Kaplan-Meier: share of programmes without a candidate over time. Exponential fit gives mean times " + n(est.detail.meanTimeTreated, 1) + " and " + n(est.detail.meanTimeControl, 1) + " months; hazard ratio " + n(est.detail.hazardRatio, 2) + ". Censored programmes stay in the curve." });
    } else {
      chart = beams([{ label: est.method, value: est.effect, lo: est.lo, hi: est.hi, color: "var(--amb)" }], { money: c.technical.unit.indexOf("$") >= 0, cap: "No field comparison: the range is the estimate. Basis: " + esc(est.detail.basis || (est.detail.scenarios || []).join("; ")) + (est.detail.calibration ? ". Calibration: " + esc(est.detail.calibration) : "") + "." });
    }
    return vhead("Causal evidence", "The design, the estimate, and the assumptions written before the conclusion.") +
      '<div class="grid4">' + ro("Design", '<span style="font-size:1rem">' + esc(est.method) + "</span>", "rank " + c.comparator.rank + ": " + esc(RANKS[c.comparator.rank])) + ro("Effect", '<span class="num">' + n(est.effect, Math.abs(est.effect) < 1 ? 4 : 2) + "</span>", esc(c.technical.unit) + ", standard error " + n(est.se, 4)) + ro("95% interval", '<span style="font-size:1rem">' + n(est.lo, 3) + " to " + n(est.hi, 3) + "</span>", est.lo < 0 && est.hi > 0 ? "includes zero" : "excludes zero", est.lo < 0 && est.hi > 0 ? "amb" : "") + ro("Identification grade", esc(c.identification.grade), esc(GRADES[c.identification.grade] || "")) + "</div>" +
      pane(chart, "hi") +
      '<div class="grid2">' + pane('<p class="eyebrow">Assumptions, stated before the conclusion</p><ul class="clean">' + c.identification.assumptions.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>") + pane('<p class="eyebrow">Threats and how each is handled</p><ul class="clean">' + c.identification.threats.map(function (a) { return "<li>" + esc(a) + "</li>"; }).join("") + "</ul>") + "</div>" +
      pane('<p class="eyebrow">Pre-trends and balance</p><p>' + esc(c.identification.preTrends) + '</p><details><summary>Estimator detail</summary><pre>' + esc(JSON.stringify(est.detail, null, 2)) + "</pre></details>");
  }

  /* lineage as a network: evidence → variables → channels → value */
  function lineageSvg(c) {
    var L = A.lineage(c), W = 760, evs = c.evidence, chans = Object.keys(c.model.channels), H = Math.max(evs.length, L.length) * 30 + 60;
    var xE = 120, xV = 340, xC = 580, xO = 700, yE = function (i) { return 40 + i * ((H - 60) / Math.max(1, evs.length - 1)); }, yV = function (i) { return 40 + i * ((H - 60) / Math.max(1, L.length - 1)); }, yC = function (i) { return 60 + i * ((H - 100) / Math.max(1, chans.length - 1)); };
    var maxSw = Math.max.apply(null, L.map(function (r) { return r.swing; })) || 1, o = "", ev = {}, vi = {};
    evs.forEach(function (e, i) { ev[e.id] = i; }); L.forEach(function (r, i) { vi[r.variable.id] = i; });
    function curve(x0, y0, x1, y1) { var mx = (x0 + x1) / 2; return "M" + x0 + "," + y0 + " C" + mx + "," + y0 + " " + mx + "," + y1 + " " + x1 + "," + y1; }
    L.forEach(function (r, i) {
      r.evidence.forEach(function (e) { o += '<path d="' + curve(xE, yE(ev[e.id]), xV, yV(i)) + '" fill="none" stroke="var(--' + GVAR[e.grade] + ')" stroke-width="' + (1 + 2.5 * r.swing / maxSw) + '" opacity=".45" class="flow" data-v="' + esc(r.variable.id) + '"/>'; });
      r.formulas.forEach(function (fch) { var ci = chans.indexOf(fch); if (ci >= 0) o += '<path d="' + curve(xV, yV(i), xC, yC(ci)) + '" fill="none" stroke="var(--blue)" stroke-width="' + (1 + 2.5 * r.swing / maxSw) + '" opacity=".35" class="flow" data-v="' + esc(r.variable.id) + '"/>'; });
    });
    chans.forEach(function (ch, i) { o += '<path d="' + curve(xC, yC(i), xO, H / 2) + '" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".5" class="flow"/>'; });
    evs.forEach(function (e, i) { o += '<circle cx="' + xE + '" cy="' + yE(i) + '" r="5" fill="var(--' + GVAR[e.grade] + ')"><title>' + esc(e.id + ", grade " + e.grade + ": " + e.cite) + "</title></circle>" + T(xE - 12, yE(i) + 4, e.id + "\u2002" + e.grade, "", "end"); });
    L.forEach(function (r, i) { var rr = 4 + 7 * Math.sqrt(r.swing / maxSw); o += '<circle cx="' + xV + '" cy="' + yV(i) + '" r="' + rr + '" fill="var(--ink)" opacity=".9" data-node="' + esc(r.variable.id) + '" style="cursor:pointer"><title>' + esc(r.variable.name + ", swing " + money(r.swing)) + "</title></circle>" + T(xV + rr + 6, yV(i) + 4, r.variable.name.length > 42 ? r.variable.name.slice(0, 40) + "…" : r.variable.name, "lbl"); });
    chans.forEach(function (ch, i) { o += '<rect x="' + (xC - 5) + '" y="' + (yC(i) - 8) + '" width="10" height="16" rx="3" fill="var(--blue)"/>' + T(xC + 10, yC(i) + 4, ch, "lbl"); });
    o += '<circle cx="' + xO + '" cy="' + (H / 2) + '" r="14" fill="var(--accent)"/>' + T(xO, H / 2 + 30, "value", "lbl", "middle");
    o += T(xE, 16, "EVIDENCE", "", "middle") + T(xV, 16, "VARIABLES (size = swing)", "", "middle") + T(xC + 10, 16, "CHANNELS", "") ;
    return svg(W, H, o, "Every input traces from a graded source through an inference to a variable, into the channel formulas and out to the value. Link width follows the input's swing; link colour follows the evidence grade.");
  }
  function vLineage(c) {
    var L = A.lineage(c);
    return vhead("Source to dollar lineage", "Every number in the valuation is reachable from a piece of evidence with a grade and an inference step.") + pane(lineageSvg(c), "hi") +
      pane('<p class="eyebrow">Inputs, ordered by swing</p>' + table(["Variable", "Value", "Evidence", "Inference", "Used in", "#Swing"], L.map(function (r) {
        var ev = r.evidence.map(function (e) { return '<div class="evrow">' + grade(e.grade) + '<span class="evid">' + esc(e.id) + '</span><span class="small">' + esc(e.type) + "</span><div>" + esc(e.cite) + (e.url ? ' <a class="src" href="' + esc(e.url) + '" rel="noopener" target="_blank">source</a>' : "") + '</div><div class="small quote">' + esc(e.excerpt) + "</div></div>"; }).join("");
        return ["<b>" + esc(r.variable.name) + '</b><span class="small mono">' + esc(r.variable.id) + "</span>", (r.variable.unit === "$" ? "$" + n(r.variable.value, 4) : n(r.variable.value, 4) + " " + esc(r.variable.unit)) + (r.variable.low !== undefined ? '<span class="small">range ' + n(r.variable.low, 4) + " to " + n(r.variable.high, 4) + "</span>" : '<span class="small">held fixed</span>'), ev || '<span class="tag E">no source</span>', esc(r.inference), r.formulas.map(function (f) { return '<span class="tag">' + esc(f) + "</span>"; }).join(" "), r.swing ? money(r.swing) : "fixed"];
      }))) +
      pane('<p class="eyebrow">Evidence register</p>' + table(["Id", "Grade", "Type", "Citation", "Location", "Accessed", "Verification"], c.evidence.map(function (e) { return [esc(e.id) + (e.synthetic ? '<span class="small">synthetic</span>' : ""), grade(e.grade), esc(e.type), esc(e.cite) + (e.url ? ' <a href="' + esc(e.url) + '" rel="noopener" target="_blank">link</a>' : ""), esc(e.location), esc(e.date), esc(e.verified)]; })) + '<p class="note">Grades: A audited or randomised record; B internal system record or published study; C verified expert testimony or audit; D synthetic or unverified internal estimate; E marketing claim. Grade E appears only in the claim-to-value view and never enters the valuation.</p>');
  }

  /* alternative worlds as an orbit map: preferred at centre, each world at radius |Δ|, negative side left, positive right */
  function orbitSvg(c) {
    var k = calc(c), aw = k.aw, W = 760, H = 420, cx = 380, cy = 210, base = aw.central, maxD = Math.max.apply(null, aw.worlds.map(function (w) { return Math.abs(w.value - base); })) || 1, Rmax = 170, o = "";
    var rr = function (d) { return 26 + (Rmax - 26) * Math.sqrt(Math.abs(d) / maxD); };
    [0.25, 0.5, 0.75, 1].forEach(function (f) { var d = maxD * f, r = rr(d); o += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--line)"/>' + T(cx + r + 4, cy - 4, "±" + fm(d)); });
    if (Math.abs(base) <= maxD) { var rz = rr(base); var side = base > 0 ? -1 : 1; o += '<path d="M' + cx + "," + (cy - rz) + " A" + rz + "," + rz + " 0 0," + (side > 0 ? 1 : 0) + " " + cx + "," + (cy + rz) + '" fill="none" stroke="var(--neg)" stroke-width="1.5" stroke-dasharray="4 5"/>' + T(cx + side * (rz + 6), cy + 4, "zero", "", side > 0 ? "start" : "end"); }
    o += '<line x1="' + cx + '" x2="' + cx + '" y1="' + (cy - Rmax - 10) + '" y2="' + (cy + Rmax + 10) + '" stroke="var(--line2)"/>' + T(cx - 8, cy - Rmax - 14, "worlds below the preferred value", "", "end") + T(cx + 8, cy - Rmax - 14, "worlds above");
    var others = aw.worlds.slice(1), nL = 0, nR = 0, cntL = others.filter(function (w) { return w.value < base; }).length, cntR = others.length - cntL;
    others.forEach(function (w) {
      var d = w.value - base, left = d < 0, idx = left ? nL++ : nR++, cnt = left ? cntL : cntR, ang = -Math.PI / 2 + (idx + 1) / (cnt + 1) * Math.PI * (left ? -1 : 1), r = rr(d);
      var x = cx + Math.cos(ang) * r, y = cy + Math.sin(ang) * r, col = w.assumption ? "var(--amb)" : "var(--blue)";
      o += '<line x1="' + cx + '" y1="' + cy + '" x2="' + x + '" y2="' + y + '" stroke="' + col + '" opacity=".35"/>';
      o += '<circle cx="' + x + '" cy="' + y + '" r="' + (w.value < 0 ? 7 : 6) + '" fill="' + (w.value < 0 ? "var(--neg)" : col) + '"><title>' + esc(w.label + ": " + fm(w.value) + (w.note ? ". " + w.note : "")) + "</title></circle>";
      var lab = w.label.length > 34 ? w.label.slice(0, 32) + "…" : w.label;
      o += T(x + (left ? -12 : 12), y + 4, lab, "lbl", left ? "end" : "start") + T(x + (left ? -12 : 12), y + 17, fm(w.value), "", left ? "end" : "start");
    });
    o += '<circle cx="' + cx + '" cy="' + cy + '" r="12" fill="' + (base < 0 ? "var(--neg)" : "var(--pos)") + '"/>' + T(cx, cy + 34, "preferred " + fm(base), "lbl", "middle");
    return svg(W, H, o, "Orbit map. The preferred estimate sits at the centre; each world orbits at a distance equal to how far it moves the value (square-root scale). Blue: alternative comparators. Amber: assumption worlds. Red: a world where the value turns negative. The dashed red arc is where zero lies.", 'data-fit');
  }
  function vWorlds(c) {
    var k = calc(c), aw = k.aw, t = A.tornado(c);
    return vhead("Alternative worlds", "The same case valued under every comparator and assumption the record supports. The stability range is the spread of these values; if it crosses zero the sign is not determined by the evidence.") +
      '<div class="grid4">' + ro("Preferred value", money(aw.central), esc(c.comparator.label), sgn(aw.central)) + ro("Lowest world", money(aw.low), "", sgn(aw.low)) + ro("Highest world", money(aw.high), "", sgn(aw.high)) + ro("Worlds tested", String(aw.worlds.length), (c.alternatives || []).length + " comparators, " + (c.assumptionWorlds || []).length + " assumptions") + "</div>" +
      pane(orbitSvg(c), "hi") +
      pane('<p class="eyebrow">Worlds</p>' + table(["World", "Kind", "Rank", "Method", "#Effect", "#Value", "Note"], aw.worlds.map(function (w) { var r = [esc(w.label), w.preferred ? "preferred" : w.assumption ? "assumption world" : "alternative comparator", w.rank ? w.rank + " " + esc(RANKS[w.rank]) : "", esc(w.method) + (w.bound ? " (bound)" : ""), fx(w.effect, c), '<span class="' + sgn(w.value) + '">' + money(w.value) + "</span>", esc(w.note || "")]; if (w.preferred) r.__cls = "hl"; return r; }))) +
      pane('<p class="eyebrow"><span>Sensitivity to each input</span><span>One input at a time across its stated range</span></p>' + beams(t.map(function (r) { return { label: r.name + " (" + r.grade + ")", value: 0, lo: r.valueAtLow - aw.central, hi: r.valueAtHigh - aw.central, color: r.grade === "E" ? "var(--neg)" : r.grade === "D" ? "var(--amb)" : "var(--blue)", note: "value " + money(Math.min(r.valueAtLow, r.valueAtHigh)) + " to " + money(Math.max(r.valueAtLow, r.valueAtHigh)) }; }), { labelW: 290, maxLabel: 46, fmt: function (v) { return (v >= 0 ? "+" : "") + fm(v); }, cap: "Change in value relative to the preferred estimate. Colour by evidence grade of the input: blue A to C, orange D, red E. A red or orange band near the top is the case's weakest point." }));
  }

  function vWelfare(c) {
    var k = calc(c), v = k.v, sub = (c.distribution && c.distribution.subgroups) || [];
    var cards = '<div class="grid3">' + ro("Private AI-attributable value", money(v.value), "the firm", sgn(v.value), true) + v.welfare.map(function (w) { return ro(esc(w.who), Math.abs(w.value) >= 1000 ? money(w.value) : n(w.value, 3), esc(w.label), sgn(w.value), true); }).join("") + "</div>";
    return vhead("Distribution and welfare", "Private profit and consumer or social welfare are reported side by side and never added together. A positive private value beside a negative consumer effect is a finding, not a contradiction.") + cards +
      pane('<p class="eyebrow">Welfare items as evaluated</p>' + table(["Who", "Item", "Formula", "#Value", "Note"], (c.model.welfare || []).map(function (w, i) { return [esc(w.who), esc(w.label), "<code>" + esc(w.formula) + "</code>", Math.abs(v.welfare[i].value) >= 1000 ? money(v.welfare[i].value) : n(v.welfare[i].value, 3), esc(w.note)]; }))) +
      (sub.length ? pane('<p class="eyebrow"><span>Subgroups</span><span>Effect in ' + esc(c.technical.unit) + "</span></p>" + beams(sub.map(function (s) { return { label: s.label, value: s.effect, color: s.effect < 0 === (v.estimate.effect < 0) ? "var(--blue)" : "var(--neg)" }; }).concat([{ label: "Average (preferred estimate)", value: v.estimate.effect, color: "var(--ink)" }]), { money: false, cap: esc(c.distribution.note || "") + " Red marks a subgroup whose sign differs from the average." }), "") : "");
  }

  function vClaim(c) {
    var k = calc(c), v = k.v, claims = c.evidence.filter(function (e) { return e.grade === "E"; });
    var body = vhead("Claim to value", "Statements about AI's contribution are matched against the measured contribution. A claim is grade E evidence: recorded, dated, attributed, and excluded from the valuation.");
    if (v.claimed === null) body += '<div class="banner good"><b>No quantified public claim is recorded for this case.</b> ' + (claims.length ? "The grade E material below is qualitative." : "No grade E evidence appears in the record.") + "</div>";
    else body += '<div class="grid3">' + ro("Value implied by the claim", money(v.claimed), "<code>" + esc(c.model.claimedValue) + "</code>", "amb", true) + ro("Measured value", money(v.value), "preferred comparator", sgn(v.value), true) + ro("Claim-to-value gap", money(v.claimGap), v.value ? n(v.claimed / v.value, 1) + " times the measured value" : "", v.claimGap > 0 ? "neg" : "pos", true) + "</div>" +
      pane(beams([{ label: "Claimed", value: v.claimed, color: "var(--amb)" }, { label: "Measured", value: v.value }, { label: "Gap", value: v.claimGap, color: "var(--neg)" }], { rowH: 44, cap: "Present value over the same horizon." }), "hi");
    body += pane('<p class="eyebrow">Claims on record</p>' + (claims.length ? table(["Id", "Source", "Statement", "Where it fails"], claims.map(function (e) { return [esc(e.id), esc(e.cite), "“" + esc(e.excerpt) + "”", "Not corroborated by a grade A to D record; where it cites a number, the number describes a subgroup, a pilot, or a gross figure before costs and losses."]; })) : "<p>None.</p>") +
      '<p class="note">Regulatory context: the Federal Trade Commission sought comment in July 2026 on a policy statement addressing representations about AI accuracy and effectiveness. A gap of the kind measured here is the type of representation that policy concerns; the case does not conclude that any statement is deceptive, only that the measured value differs from the claimed value.</p>');
    return body;
  }

  function vAdversarial(c) {
    var tests = A.adversarial(c), k = calc(c);
    return vhead("Adversarial tests", "Six tests from the validation plan, run against this case. A test passes when the interface reports the changed result rather than suppressing it; several are designed to make the case look worse.") +
      '<div class="grid3">' + tests.map(function (t, i) { var lo = Math.min(t.low, t.high), hi = Math.max(t.low, t.high); return '<div class="probe"><span class="st' + (t.passes ? "" : " no") + '"></span><div class="n">probe ' + (i + 1) + "</div><h3>" + esc(t.test) + '</h3><p class="r"><b>' + esc(t.target) + "</b></p><p class=\"r\">" + esc(t.result) + "</p>" + beams([{ label: "", value: k.v.value, lo: lo, hi: hi, color: lo < 0 ? "var(--neg)" : "var(--blue)" }], { labelW: 10, rowH: 30 }) + '<p class="small">' + esc(t.note) + "</p></div>"; }).join("") + "</div>";
  }

  function vMonteCarlo(c, q) {
    var nDraws = Math.max(200, Math.min(20000, parseInt((q && q.n) || 3000, 10) || 3000)), seed = parseInt((q && q.seed) || 20260913, 10) || 20260913, mc = A.monteCarlo(c, nDraws, seed);
    window.__MC = mc;
    return vhead("Monte Carlo", "Inputs with a stated range are drawn from a triangular distribution over that range; the effect from a normal distribution with the estimator's standard error. Seeded, so reproducible.") +
      '<form class="controls" id="mcForm"><label>Draws<input type="number" name="n" min="200" max="20000" step="100" value="' + nDraws + '"></label><label>Seed<input type="number" name="seed" value="' + seed + '"></label><button class="btn sm" type="submit">Rerun</button><button class="btn ghost sm" type="button" id="mcReplay">Replay</button></form>' +
      '<div class="grid4">' + ro("Mean", money(mc.mean), "", sgn(mc.mean)) + ro("Median", money(mc.p50)) + ro("5th to 95th percentile", '<span style="font-size:1rem">' + money(mc.p05) + " to " + money(mc.p95) + "</span>") + ro("P(value < 0)", pct(mc.probNegative), "", mc.probNegative > 0.5 ? "neg" : mc.probNegative > 0.2 ? "amb" : "pos") + "</div>" +
      pane('<div class="chart"><canvas id="mcv" height="300"></canvas><p class="cap">' + nDraws.toLocaleString() + " draws, seed " + seed + ". Each grain is one draw falling into its bin; red bins lie below zero; orange lines mark the 5th, 50th and 95th percentiles.</p></div>", "hi") +
      '<p class="note">The Monte Carlo describes uncertainty inside the preferred comparator. It does not cover the choice of comparator; that is the alternative worlds view, and the two are reported separately by design.</p>';
  }
  function startMonteCarlo() {
    var cv = document.getElementById("mcv"), mc = window.__MC; if (!cv || !mc) return; var ctx = cv.getContext("2d"), W = cv.width = cv.parentNode.clientWidth, H = cv.height = 300, k = 48, lo = mc.samples[0], hi = mc.samples[mc.samples.length - 1], bins = [], done = 0, order = [], raf, rain = [];
    for (var i = 0; i < k; i++) bins.push(0);
    var r = seeded(5); order = mc.samples.map(function (v, i) { return i; }).sort(function () { return r() - 0.5; });
    var bw = (W - 40) / k, x = function (v) { return 20 + (v - lo) / ((hi - lo) || 1) * (W - 40); }, maxC = 0; var tmp = []; for (var j = 0; j < k; j++) tmp.push(0); mc.samples.forEach(function (v) { tmp[Math.min(k - 1, Math.floor((v - lo) / ((hi - lo) || 1) * k))]++; }); maxC = Math.max.apply(null, tmp);
    var perFrame = Math.max(3, Math.ceil(mc.samples.length / 150)), dark = isDark(), pos = cssv("--blue"), neg = cssv("--neg"), amb = cssv("--amb"), ink = "rgba(" + cssv("--ink-rgb") + ",";
    function frame() {
      for (var q = 0; q < perFrame && done < order.length; q++, done++) { var v = mc.samples[order[done]], b = Math.min(k - 1, Math.floor((v - lo) / ((hi - lo) || 1) * k)); rain.push({ x: x(v) + (Math.random() - 0.5) * bw * 0.6, y: 10, vy: 2 + Math.random() * 3, b: b, neg: v < 0, land: H - 34 - (bins[b] / maxC) * (H - 70) }); bins[b]++; }
      ctx.clearRect(0, 0, W, H);
      for (var i2 = 0; i2 < k; i2++) { var v0 = lo + (i2 + 0.5) * (hi - lo) / k, h = (bins[i2] / maxC) * (H - 70); ctx.fillStyle = v0 < 0 ? rgba(neg, 0.75) : rgba(pos, 0.75); ctx.fillRect(20 + i2 * bw + 1, H - 34 - h, bw - 2, h); }
      ctx.fillStyle = ink + "0.9)";
      for (var p = rain.length - 1; p >= 0; p--) { var g = rain[p]; g.y += g.vy; g.vy += 0.25; if (g.y >= g.land) { rain.splice(p, 1); continue; } ctx.fillStyle = g.neg ? rgba(neg, 0.9) : rgba(pos, 0.9); ctx.beginPath(); ctx.arc(g.x, g.y, 1.6, 0, 6.29); ctx.fill(); }
      ctx.strokeStyle = ink + "0.5)"; ctx.beginPath(); ctx.moveTo(20, H - 34); ctx.lineTo(W - 20, H - 34); ctx.stroke();
      if (lo < 0 && hi > 0) { ctx.strokeStyle = ink + "0.8)"; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x(0), 10); ctx.lineTo(x(0), H - 34); ctx.stroke(); ctx.setLineDash([]); }
      [mc.p05, mc.p50, mc.p95].forEach(function (qv, i3) { ctx.strokeStyle = rgba(amb, 0.9); ctx.beginPath(); ctx.moveTo(x(qv), 14); ctx.lineTo(x(qv), H - 34); ctx.stroke(); ctx.fillStyle = rgba(amb, 1); ctx.font = "600 10px " + cssv("--sans"); ctx.textAlign = "center"; ctx.fillText(["p5", "p50", "p95"][i3] + " " + fm(qv), x(qv), 10); });
      ctx.fillStyle = ink + "0.7)"; ctx.font = "500 10px " + cssv("--sans"); ctx.textAlign = "center"; ticks(lo, hi, 7).forEach(function (t) { ctx.fillText(fm(t), x(t), H - 18); });
      if (done < order.length || rain.length) raf = requestAnimationFrame(frame);
    }
    if (REDUCED) { mc.samples.forEach(function (v) { bins[Math.min(k - 1, Math.floor((v - lo) / ((hi - lo) || 1) * k))]++; }); done = order.length; frame(); } else frame();
    var rb = document.getElementById("mcReplay"); if (rb) rb.addEventListener("click", function () { cancelAnimationFrame(raf); for (var i4 = 0; i4 < k; i4++) bins[i4] = 0; done = 0; rain = []; frame(); });
  }

  function vReport(c) {
    var k = calc(c), v = k.v, aw = k.aw, mc = k.mc, cov = k.cov, t = A.tornado(c).slice(0, 3);
    return vhead("Standard case report", "Generated from the stored inputs and code at the moment you open it.") + '<div class="banner"><b>Synthetic case.</b> This report follows the project\'s standard structure.</div>' + pane(
      "<h3>1. Economic question and intended use</h3><p>" + esc(c.question) + "</p><p>" + esc(c.intendedUse) + "</p>" +
      "<h3>2. Treatment and comparator</h3><p>" + esc(c.treatment.system) + ", version " + esc(c.treatment.version) + ", deployed " + esc(c.treatment.deployed) + " with " + esc(c.treatment.autonomy.toLowerCase()) + ". Comparator: " + esc(c.comparator.label) + " (rank " + c.comparator.rank + ", " + esc(RANKS[c.comparator.rank].toLowerCase()) + "). " + esc(c.comparator.basis) + "</p>" +
      "<h3>3. Unit of analysis</h3><p>" + esc(c.unit) + ". " + esc(c.unitRationale) + "</p>" +
      "<h3>4. Technical evidence</h3><p>" + esc(v.estimate.method) + " gives an effect of " + fx(v.estimate.effect, c) + " (95% interval " + n(v.estimate.lo, 3) + " to " + n(v.estimate.hi, 3) + "). Identification grade " + esc(c.identification.grade) + ". " + esc(c.identification.preTrends) + "</p>" +
      "<h3>5. Economic translation</h3><p>" + esc(c.model.note || "") + " Horizon " + c.model.horizonYears + " years, discount rate " + pct(c.model.discountRate, 0) + ", head start " + v.headStartYears + " years.</p>" +
      "<h3>6. Results</h3><p>AI-attributable value " + money(v.value) + " (PV profit with AI " + money(v.profitWithPV) + " against " + money(v.profitWithoutPV) + " without; AI-specific investment " + money(v.capital) + "; expected AI-specific losses " + money(-v.expectedLossPV) + "). Contribution share " + (v.contributionShare === null ? "not applicable" : pct(v.contributionShare)) + ". Head-start value " + money(v.headStartValue) + "." + (v.claimed !== null ? " Claim-to-value gap " + money(v.claimGap) + " against a claimed " + money(v.claimed) + "." : "") + "</p>" +
      "<h3>7. Welfare and distribution</h3><p>" + v.welfare.map(function (w) { return esc(w.who) + ": " + esc(w.label.toLowerCase()) + " " + (Math.abs(w.value) >= 1000 ? money(w.value) : n(w.value, 3)); }).join("; ") + ". " + esc((c.distribution && c.distribution.note) || "") + "</p>" +
      "<h3>8. Uncertainty</h3><p>Counterfactual stability range " + money(aw.low) + " to " + money(aw.high) + " across " + aw.worlds.length + " worlds" + (aw.low < 0 && aw.high > 0 ? "; the sign is not determined by the evidence" : "; the sign holds in every world") + ". Monte Carlo 5th to 95th percentile " + money(mc.p05) + " to " + money(mc.p95) + ", probability of negative value " + pct(mc.probNegative, 0) + ". Inputs with the largest swing: " + t.map(function (x) { return esc(x.name) + " (grade " + x.grade + ", " + money(x.swing) + ")"; }).join("; ") + ". Evidence coverage " + pct(cov.share, 0) + ".</p>" +
      "<h3>9. Limitations and external validity</h3><ul class=\"clean\">" + c.limitations.map(function (l) { return "<li>" + esc(l) + "</li>"; }).join("") + "</ul>" +
      "<h3>10. Review</h3><p>Calculation test " + esc(c.review.calcTest) + "; domain review by " + esc(c.review.domainReview) + "; economic review by " + esc(c.review.economicReview) + "; version " + esc(c.review.version) + ". " + esc(c.review.extraction) + ".</p>" +
      '<p><button class="btn" type="button" data-download="' + esc(c.id) + '">Download reproduction package (JSON)</button> <button class="btn ghost" type="button" onclick="window.print()">Print</button></p>');
  }

  function vChecklist(c) {
    var cl = A.checklist(c), pass = cl.filter(function (x) { return x.pass; }).length;
    return vhead("Release checklist", "The twelve items from the release checklist, evaluated from the stored case where that is possible. A case is not released until every item passes.") +
      '<div class="grid2">' + pane(ring(pass / cl.length, "items passing", { value: pass + "/" + cl.length, color: pass === cl.length ? "var(--pos)" : "var(--neg)" })) + pane('<ul class="clean">' + cl.map(function (x) { return '<li class="check"><span class="m ' + (x.pass ? "ok" : "no") + '">' + (x.pass ? "✓" : "!") + "</span>" + esc(x.item) + "</li>"; }).join("") + "</ul>") + "</div>";
  }

  function vMethods(c) {
    return vhead("Methods and code", "What the engine used: the case record, the formulas as written, and the estimator that produced the effect. The engine is a single file served beside this page.") +
      '<p><a class="btn ghost" href="engine.js" target="_blank" rel="noopener">Open engine.js</a> <a class="btn ghost" href="cases.js" target="_blank" rel="noopener">Open cases.js</a> <button class="btn" type="button" data-download="' + esc(c.id) + '">Download reproduction package (JSON)</button></p>' +
      pane('<p class="eyebrow">Channel formulas</p>' + table(["Channel", "Formula"], Object.keys(c.model.channels).map(function (k) { return [esc(k), "<code>" + esc(c.model.channels[k]) + "</code>"]; }))) +
      pane('<p class="eyebrow">Case record</p><pre>' + esc(JSON.stringify(c, function (k, v) { return k === "obs" && Array.isArray(v) && v.length > 20 ? v.length + " observations (see cases.js)" : v; }, 2)) + "</pre>");
  }

  /* ------------------------------------------------------------ portfolio, framework, tests, about */
  function portfolio() {
    var rows = CASES.map(function (c) { var k = calc(c); return { c: c, v: k.v, aw: k.aw, mc: k.mc, cov: k.cov }; });
    var neg = rows.filter(function (r) { return r.v.value <= 0; }).length, signDep = rows.filter(function (r) { return r.aw.low < 0 && r.aw.high > 0; }).length, claims = rows.filter(function (r) { return r.v.claimed !== null; });
    return '<div class="chead"><p class="eyebrow">Portfolio</p><h1>The cases <em>side by side</em></h1><p class="lede">The point of a portfolio is the pattern, not any single number: how often the claimed value exceeds the measured value, how often the sign depends on the comparator, and where the evidence is thin.</p></div>' + synthBanner() +
      '<div class="grid4">' + ro("Cases", String(rows.length), "across " + uniq(CASES.map(function (c) { return c.industry; })).length + " industries") + ro("Negative or zero value", String(neg), "reported as found", neg ? "neg" : "") + ro("Sign depends on a world", String(signDep), "alternative worlds cross zero", signDep ? "amb" : "") + ro("Claim exceeds measured", claims.filter(function (r) { return r.v.claimGap > 0; }).length + " of " + claims.length, "where a claim exists") + "</div>" +
      pane('<p class="eyebrow">Value with alternative-world range</p>' + beams(rows.map(function (r) { return { label: r.c.id + " " + r.c.title, value: r.v.value, lo: r.aw.low, hi: r.aw.high, color: r.v.value < 0 ? "var(--neg)" : r.aw.low < 0 && r.aw.high > 0 ? "var(--amb)" : "var(--pos)" }; }), { labelW: 300, maxLabel: 48, cap: "Dot and bar: preferred estimate. Band: lowest to highest value across alternative comparators and assumption worlds. Amber: the band crosses zero." }), "hi") +
      pane('<p class="eyebrow"><span>Claim against measured value</span><span>Present value over each horizon</span></p>' + beams(claims.reduce(function (acc, r) { return acc.concat([{ label: r.c.id + " claimed", value: r.v.claimed, color: "var(--amb)" }, { label: r.c.id + " measured", value: r.v.value }]); }, []), { rowH: 26, cap: "Claims are grade E evidence and never enter the valuation. The gap is reported, not explained away." })) +
      pane('<p class="eyebrow">Summary table</p>' + table(["Case", "Industry", "Design", "Grade", "#Effect", "#Value", "#Range (worlds)", "#P(value < 0)", "#Claimed", "#Coverage"], rows.map(function (r) {
        return [link("/case/" + r.c.id + "/overview", "<b>" + esc(r.c.id) + "</b> " + esc(r.c.title)), esc(r.c.industry), esc(r.v.estimate.method) + '<span class="small">' + esc(RANKS[r.c.comparator.rank]) + "</span>", grade(r.c.identification.grade), fx(r.v.estimate.effect, r.c), '<span class="' + sgn(r.v.value) + '">' + money(r.v.value) + "</span>", money(r.aw.low) + " to " + money(r.aw.high), pct(r.mc.probNegative, 0), r.v.claimed === null ? "none" : money(r.v.claimed), pct(r.cov.share, 0)];
      })));
  }

  function framework() {
    var idTable = [["Randomised or threshold design", "Randomisation or a decision cutoff separates treated from untreated units", "Average or local treatment effect", "Local to the margin for threshold designs; spillovers", "rct, rdd"],
      ["Staggered or phased rollout", "Units receive AI at different, plausibly unrelated times", "Difference in differences with pre-trend check", "Anticipation; heterogeneous timing effects", "did"],
      ["Pre and post with concurrent control", "A concurrent untreated group under the same conditions", "Difference in differences", "Concurrent changes that hit only one group", "did"],
      ["Matched comparison", "Comparable units matched on observables", "Matched or survival comparison with balance table", "Selection on unobservables", "matched, survival"],
      ["Adopter versus non-adopter", "Only a cross-section of firms", "Reported as a scenario, not an estimate", "Adopters differ before adoption", "scenario"],
      ["Engineering or operational bound", "No field counterfactual, but a calibrated model", "Range from shadow runs or bench tests", "Behavioural response unobserved", "bound"],
      ["Documented scenario range", "Evidence supports alternatives but no causal estimate", "Scenario range with stated basis", "Not causal", "scenario"]];
    return '<div class="chead"><p class="eyebrow">Framework</p><h1>How a case is <em>built</em></h1><p class="lede">One question, stated as an accounting identity, with the counterfactual made explicit and the evidence graded before anything is valued.</p></div>' +
      pane('<p class="eyebrow">The identity</p><p class="mono" style="color:var(--ink)">AI-attributable value = PV(profit with AI) − PV(profit without AI) − AI-specific investment − PV(expected AI-specific losses)</p><p>Profit without AI is the profit of the same unit under the best available no-AI comparator, over the same horizon, with the same prices and the same base. Everything the AI changed enters through five channels: revenue, variable cost, fixed cost, cannibalisation and capital. Expected losses cover the risks the AI introduced: wrong outputs, rights claims, regulatory action, security incidents. Option value is admitted only when it is priced from a documented decision.</p>', "hi") +
      pane('<p class="eyebrow">Comparator hierarchy</p><p>A case takes the highest-ranked comparator the record supports and reports the rank. Lower ranks are not forbidden; they are labelled.</p>' + table(["Rank", "Design", "When it applies", "Estimator", "Main threat", "Engine"], idTable.map(function (r, i) { return [String(i + 1), esc(r[0]), esc(r[1]), esc(r[2]), esc(r[3]), "<code>" + esc(r[4]) + "</code>"]; }))) +
      '<div class="grid2">' + pane('<p class="eyebrow">Evidence grades</p>' + table(["Grade", "Meaning", "Use"], Object.keys(GRADES).map(function (g) { return [grade(g), esc(GRADES[g]), g === "E" ? "Claim-to-value view only; never enters the valuation" : g === "D" ? "Enters with its range; drives the sensitivity view" : "Enters the valuation"]; }))) +
      pane('<p class="eyebrow">Core output metrics</p><ul class="clean"><li><b>Profit with and without AI</b> present values over the horizon.</li><li><b>Incremental value</b> the identity above.</li><li><b>Contribution share</b> value over profit without AI; not applicable to cost centres.</li><li><b>Claim-to-value gap</b> value implied by a recorded claim less the measured value.</li><li><b>Head-start value</b> the operating delta while the no-AI alternative has not caught up.</li><li><b>Expected-loss delta</b> present value of AI-specific expected losses.</li><li><b>Consumer and social welfare</b> beside private profit, never netted.</li><li><b>Counterfactual stability range</b> spread of value across alternative worlds.</li><li><b>Evidence coverage</b> share of material inputs with grade A to D support.</li></ul>') + "</div>" +
      pane('<p class="eyebrow">Governance rules</p><ul class="clean"><li>Assumptions and threats are written before the conclusion.</li><li>A model version change or a change in the human-review threshold is a new treatment.</li><li>Complements that cannot be separated are named and the combined-system effect is reported.</li><li>Private profit and welfare are never summed.</li><li>A negative or undetermined result is published as found.</li><li>Language-model extraction is logged with model, prompt set and date; every numeric input is verified by hand.</li><li>Nothing confidential appears in a public case; every public case is synthetic.</li></ul>') +
      pane('<p class="eyebrow">Sources used for calibration</p>' + table(["Id", "Citation", "Used for"], Object.keys(SRC).map(function (k) { var s = SRC[k]; return [esc(s.id), esc(s.cite) + ' <a href="' + esc(s.url) + '" rel="noopener" target="_blank">link</a>', "“" + esc(s.excerpt) + "”"]; })));
  }

  function testsView() {
    var t = A.runTests(), fails = t.filter(function (x) { return !x.pass; }).length, cl = CASES.map(function (c) { var k = A.checklist(c); return { id: c.id, pass: k.filter(function (x) { return x.pass; }).length, total: k.length }; });
    return '<div class="chead"><p class="eyebrow">Tests</p><h1>Engine <em>self-tests</em></h1><p class="lede">Each estimator and the valuation are checked against closed-form answers every time this page opens. ' + (fails ? fails + " test(s) failed." : "All " + t.length + " pass.") + "</p></div>" +
      '<div class="grid2">' + pane(ring((t.length - fails) / t.length, "tests passing", { value: (t.length - fails) + "/" + t.length, color: fails ? "var(--neg)" : "var(--pos)" }) + '<ul class="clean">' + t.map(function (x) { return '<li class="check"><span class="m ' + (x.pass ? "ok" : "no") + '">' + (x.pass ? "✓" : "!") + "</span>" + esc(x.name) + (x.detail ? ' <span class="small">' + esc(x.detail) + "</span>" : "") + "</li>"; }).join("") + "</ul>") +
      pane('<p class="eyebrow">Release checklist across cases</p>' + table(["Case", "#Items passing"], cl.map(function (x) { return [link("/case/" + x.id + "/checklist", esc(x.id)), x.pass + " of " + x.total]; })) + '<p class="eyebrow" style="margin-top:1rem">Reproduction</p><p>Open the browser console and run <code>AICF.runTests()</code>, or <code>AICF.valuate(AICF_CASES[0])</code> for any case. The engine has no dependencies and no network calls; the same files run under Node.</p>') + "</div>";
  }

  function about() {
    return '<div class="chead"><p class="eyebrow">About</p><h1>The AI Counterfactual</h1><p class="lede">A method and a working system for measuring what AI added to a business, against the same business without it, with every number traced to a source and every assumption written down before the conclusion.</p></div>' +
      pane("<p>Most statements about AI's economic contribution are attributions without a counterfactual: revenue that rose after a deployment, hours that a vendor says were saved, a multiple applied to a headline. This project builds the counterfactual explicitly. Each case defines the no-AI comparator, ranks its strength, estimates the technical effect with a named design, translates the effect through channel formulas into profit, subtracts AI-specific investment and expected losses, and reports the result with its range, its welfare consequences and the tests that tried to break it.</p><p>The system on this page is complete for the public release: twelve synthetic cases across the portfolio's twelve domains, an engine with nine estimators, a valuation identity, sensitivity, Monte Carlo, alternative worlds, adversarial tests, source-to-dollar lineage and a release checklist, all running in the browser from two plain files. The same engine accepts a real case record in the same shape; the public cases exist so that the method can be inspected without disclosing any real record.</p>") +
      '<div class="grid2">' + pane('<p class="eyebrow">What it is for</p><p>Valuation of AI-dependent businesses and products; disputes over vendor claims; regulatory and consumer-protection questions about representations of AI effectiveness; apportionment of value to AI features; procurement and renewal decisions; and public-policy assessment of automated systems where the burden of errors falls on people who are not the buyer.</p>') + pane('<p class="eyebrow">What it is not</p><p>Not a forecast of what AI will do, not a benchmark of models, and not a claim that any real company experienced any result shown here. Where a result is a bound rather than an estimate, the page says so; where the sign depends on a choice the evidence cannot make, the page says that too.</p>') + "</div>" +
      pane('<p class="eyebrow">Navigation</p><p>Press <span class="kbd">/</span> to search cases and views, <span class="kbd">[</span> and <span class="kbd">]</span> to move between cases, <span class="kbd">←</span> <span class="kbd">→</span> to move between views, <span class="kbd">t</span> to switch appearance. In the galaxy, drag to pan and use the wheel to zoom.</p><p>Built by Abhay Chakra Sadineni, September 2026. <a class="btn ghost sm" href="/work/">Back to the work page</a> <a class="btn ghost sm" href="/contact/">Contact</a></p>');
  }

  function addPage(msg) {
    var mine = localCases();
    return '<div class="section" style="margin-top:1rem"><div class="vhead"><h2>Add a <em>case</em></h2><p>A case is one record in the shape the engine reads. Paste it below or load a file; it is valued, run through the checklist and placed in the galaxy. Cases added here stay in this browser only; nothing is uploaded.</p></div>' +
      '<div class="bento">' + pane('<p class="label">Case record (JSON)</p><textarea id="caseJson" placeholder="Paste a case record…"></textarea><div class="controls" style="margin-top:.8rem"><button class="pill sm" type="button" id="addCase">Value and add <i>→</i></button><label class="btn sm" style="cursor:pointer">Load a file<input type="file" id="caseFile" accept="application/json" style="display:none"></label><button class="btn sm" type="button" data-template="KW-01">Download KW-01 as a template</button></div>' + (msg ? '<div class="banner ' + (msg.ok ? "good" : "warn") + '">' + msg.text + "</div>" : ""), "s7") +
      pane('<p class="label">Minimum case record</p><ul class="clean"><li><b>id, title, question, intendedUse</b> the economic question and who will use the answer.</li><li><b>unit, unitRationale, level, industry, appClass</b> where the case sits in the grid.</li><li><b>treatment</b> system, version, deployment date, scope, autonomy, complements.</li><li><b>comparator</b> label, rank 1 to 7, basis, contamination checks.</li><li><b>identification</b> method (did, rct, matched, synth, rdd, event, survival, bound, scenario), data in that method\'s shape, grade, assumptions, threats.</li><li><b>evidence</b> graded A to E with citation and excerpt.</li><li><b>variables</b> id, value, unit, evidence ids, inference, optional low, high, adverse.</li><li><b>model</b> horizonYears, discountRate, headStartYears, rampYears, channels (formulas over variable ids and effect), welfare items, optional claimedValue.</li><li><b>alternatives, assumptionWorlds, distribution, limitations, review</b> the sub-cases and the record of review.</li></ul>', "s5") + "</div>" +
      (mine.length ? '<div class="section"><div class="vhead"><h2>Cases in this browser</h2><p>Stored locally. Remove one and it leaves the galaxy.</p></div>' + table(["Case", "Title", "#Value", ""], mine.map(function (c) { return [esc(c.id), link("/case/" + c.id + "/overview", esc(c.title)), money(calc(c).v.value), '<button class="btn sm" type="button" data-remove="' + esc(c.id) + '">Remove</button>']; })) + "</div>" : "");
  }
  function addCaseFromText(txt) {
    var c; try { c = JSON.parse(txt); } catch (e) { return { ok: false, text: "That is not valid JSON: " + esc(e.message) }; }
    if (!c || !c.id) return { ok: false, text: "The record needs an id." };
    try { A.valuate(c); A.checklist(c); A.alternativeWorlds(c); } catch (e) { return { ok: false, text: "The engine could not value this record: " + esc(e.message) }; }
    c.synthetic = c.synthetic !== false; c.local = true;
    var idx = CASES.map(function (x) { return x.id; }).indexOf(c.id); if (idx >= 0) { if (!CASES[idx].local) return { ok: false, text: "A built-in case already uses the id " + esc(c.id) + "." }; CASES[idx] = c; } else CASES.push(c);
    delete CACHE[c.id]; saveLocal(localCases().map(function (x) { var y = Object.assign({}, x); delete y.local; return y; }));
    var cl = A.checklist(c), pass = cl.filter(function (x) { return x.pass; }).length;
    return { ok: true, text: "Added " + esc(c.id) + ": value " + money(A.valuate(c).value) + ", " + pass + " of " + cl.length + " checklist items pass. " + link("/case/" + c.id + "/overview", "Open it.") + " " + link("/", "See it in the galaxy.") };
  }

  /* ------------------------------------------------------------ router */
  function parse() { var h = location.hash.replace(/^#\/?/, ""), parts = h.split("?"), path = parts[0].split("/").filter(Boolean), q = {}; (parts[1] || "").split("&").forEach(function (kv) { if (!kv) return; var p = kv.split("="); q[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || ""); }); return { path: path, q: q }; }
  var CUR = { c: null, view: null };
  function render() {
    var r = parse(), p = r.path, html, active = p[0] || "", c = null, view = null;
    if (GAL) GAL.stop();
    if (window.AICF_MARKETS && p[0] !== "markets" && window.AICF_MARKETS.stopMap) window.AICF_MARKETS.stopMap();
    try {
      if (!p.length) html = galaxyView(r.q);
      else if (p[0] === "portfolio") html = portfolio();
      else if (p[0] === "framework") html = framework();
      else if (p[0] === "tests") html = testsView();
      else if (p[0] === "about") html = about();
      else if (p[0] === "add") { html = addPage(window.__ADDMSG); window.__ADDMSG = null; }
      else if (p[0] === "markets") { active = "markets"; html = window.AICF_MARKETS ? window.AICF_MARKETS.render(p, r.q, { ro: ro, pane: pane, table: table }, function () { if (parse().path[0] === "markets") render(); }) : "<p>The markets module did not load.</p>"; }
      else if (p[0] === "case") {
        c = byId(CASES, p[1]); active = "";
        if (!c) html = '<div class="chead"><h1>No such case</h1><p>' + link("/", "Back to the galaxy") + "</p></div>";
        else { view = p[2] || "overview"; var fn = { overview: vOverview, withwithout: vWithWithout, bridge: vBridge, evidence: vEvidence, lineage: vLineage, worlds: vWorlds, welfare: vWelfare, claim: vClaim, adversarial: vAdversarial, montecarlo: vMonteCarlo, report: vReport, checklist: vChecklist, methods: vMethods }[view];
          if (!fn) { fn = vOverview; view = "overview"; }
          var idx = CASES.indexOf(c), prev = CASES[(idx + CASES.length - 1) % CASES.length], next = CASES[(idx + 1) % CASES.length];
          html = caseHead(c, view) + fn(c, r.q) + '<div class="pn">' + link("/case/" + prev.id + "/" + view, "← " + esc(prev.id) + " " + esc(prev.title), "btn ghost sm") + link("/case/" + next.id + "/" + view, esc(next.id) + " " + esc(next.title) + " →", "btn ghost sm") + "</div>"; }
      } else html = '<div class="chead"><h1>Not found</h1><p>' + link("/", "Back to the galaxy") + "</p></div>";
    } catch (e) { html = '<div class="chead"><h1>Something failed while rendering</h1><pre>' + esc(e.stack || e.message) + "</pre></div>"; if (window.console) console.error(e); }
    CUR = { c: c, view: view };
    root.innerHTML = shell(active, html, c, view);
    document.title = (c ? c.id + ", " : "") + "The AI Counterfactual";
    window.scrollTo(0, 0);
    wire(r);
    if (!p.length) startGalaxy(r.q);
    if (view === "montecarlo") startMonteCarlo();
  }
  function setHash(h) { location.hash = h; }
  function wire(r) {
    Array.prototype.forEach.call(document.querySelectorAll("[data-theme-btn]"), function (b) { b.addEventListener("click", function (e) { e.preventDefault(); setTheme(theme() === "light" ? "dark" : "light"); render(); }); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-palette]"), function (b) { b.addEventListener("click", function (e) { e.preventDefault(); openPalette(); }); });
    Array.prototype.forEach.call(document.querySelectorAll(".chip[data-f]"), function (b) { b.addEventListener("click", function () { var q = parse().q; if (q[b.dataset.f] === b.dataset.v) delete q[b.dataset.f]; else q[b.dataset.f] = b.dataset.v; var qs = Object.keys(q).map(function (k) { return encodeURIComponent(k) + "=" + encodeURIComponent(q[k]); }).join("&"); setHash("#/" + (qs ? "?" + qs : "")); }); });
    var cl = document.querySelector("[data-clear]"); if (cl) cl.addEventListener("click", function () { setHash("#/"); });
    var cs = document.querySelector("[data-case-switch]"); if (cs) cs.addEventListener("change", function () { setHash("#/case/" + cs.value + "/" + (CUR.view || "overview")); });
    var mf = document.getElementById("mcForm"); if (mf) mf.addEventListener("submit", function (e) { e.preventDefault(); var p = parse().path; setHash("#/" + p.join("/") + "?n=" + encodeURIComponent(mf.n.value) + "&seed=" + encodeURIComponent(mf.seed.value)); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-download]"), function (b) { b.addEventListener("click", function () { downloadPackage(byId(CASES, b.dataset.download)); }); });
    var ab = document.getElementById("addCase"); if (ab) ab.addEventListener("click", function () { window.__ADDMSG = addCaseFromText(document.getElementById("caseJson").value); render(); });
    var cf = document.getElementById("caseFile"); if (cf) cf.addEventListener("change", function () { var f = cf.files[0]; if (!f) return; var rd = new FileReader(); rd.onload = function () { window.__ADDMSG = addCaseFromText(String(rd.result)); render(); }; rd.readAsText(f); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-template]"), function (b) { b.addEventListener("click", function () { var c = Object.assign({}, byId(CASES, b.dataset.template)); delete c.local; var blob = new Blob([JSON.stringify(c, null, 2)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aicf-case-template.json"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); }); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-remove]"), function (b) { b.addEventListener("click", function () { var id = b.dataset.remove, i = CASES.map(function (x) { return x.id; }).indexOf(id); if (i >= 0 && CASES[i].local) { CASES.splice(i, 1); delete CACHE[id]; saveLocal(localCases().map(function (x) { var y = Object.assign({}, x); delete y.local; return y; })); } render(); }); });
    /* lineage hover: highlight one variable's links */
    Array.prototype.forEach.call(document.querySelectorAll("[data-node]"), function (nd) {
      nd.addEventListener("mouseenter", function () { var id = nd.getAttribute("data-node"); Array.prototype.forEach.call(document.querySelectorAll("path[data-v]"), function (p) { p.style.opacity = p.getAttribute("data-v") === id ? "1" : "0.08"; }); });
      nd.addEventListener("mouseleave", function () { Array.prototype.forEach.call(document.querySelectorAll("path[data-v]"), function (p) { p.style.opacity = ""; }); });
    });
  }
  function downloadPackage(c) {
    var v = A.valuate(c), pkg = { project: "The AI Counterfactual", version: "1.0", generated: new Date().toISOString(), synthetic: true, note: "Synthetic case for method demonstration. Reproduce with engine.js: AICF.valuate(case).", case: c, results: { estimate: v.estimate, value: v.value, bridge: v.bridge, rows: v.rows, welfare: v.welfare, alternativeWorlds: A.alternativeWorlds(c), tornado: A.tornado(c), monteCarlo: (function () { var m = A.monteCarlo(c, 2000); delete m.samples; return m; })(), adversarial: A.adversarial(c), checklist: A.checklist(c), evidenceCoverage: A.evidenceCoverage(c) }, tests: A.runTests() };
    var blob = new Blob([JSON.stringify(pkg, null, 2)], { type: "application/json" }), a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "aicf-" + c.id + "-reproduction.json"; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* palette */
  var PAL = { items: [], idx: 0 };
  function palItems(q) {
    q = (q || "").toLowerCase(); var items = [];
    [["/", "Case galaxy", "home"], ["/portfolio", "Portfolio", "page"], ["/framework", "Framework", "page"], ["/markets", "Public markets", "page"], ["/add", "Add a case", "page"], ["/tests", "Tests", "page"], ["/about", "About", "page"]].forEach(function (x) { items.push({ h: x[0], k: x[2], t: x[1] }); });
    CASES.forEach(function (c) { items.push({ h: "/case/" + c.id + "/overview", k: c.id, t: c.title, v: c.industry }); if (CUR.c && CUR.c.id === c.id || q.length > 2) VIEWS.forEach(function (vw) { items.push({ h: "/case/" + c.id + "/" + vw[0], k: c.id, t: vw[1], v: c.title }); }); });
    return items.filter(function (i) { return !q || (i.k + " " + i.t + " " + (i.v || "")).toLowerCase().indexOf(q) >= 0; }).slice(0, 40);
  }
  function openPalette() { var pal = document.getElementById("pal"), inp = document.getElementById("palq"); if (!pal) return; pal.hidden = false; inp.value = ""; renderPal(""); inp.focus(); }
  function closePalette() { var pal = document.getElementById("pal"); if (pal) pal.hidden = true; }
  function renderPal(q) { PAL.items = palItems(q); PAL.idx = 0; var ul = document.getElementById("pall"); ul.innerHTML = PAL.items.map(function (i, ix) { return '<li' + (ix === 0 ? ' class="on"' : "") + '><a href="#' + i.h + '"><span class="k">' + esc(i.k) + "</span>" + esc(i.t) + (i.v ? '<span class="v">' + esc(i.v) + "</span>" : "") + "</a></li>"; }).join(""); Array.prototype.forEach.call(ul.querySelectorAll("a"), function (a) { a.addEventListener("click", closePalette); }); }
  document.addEventListener("input", function (e) { if (e.target && e.target.id === "palq") renderPal(e.target.value); });
  document.addEventListener("click", function (e) { if (e.target && e.target.id === "pal") closePalette(); });
  document.addEventListener("keydown", function (e) {
    var pal = document.getElementById("pal"), inField = /INPUT|SELECT|TEXTAREA/.test((e.target && e.target.tagName) || "");
    if (pal && !pal.hidden) {
      if (e.key === "Escape") { closePalette(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); PAL.idx = (PAL.idx + (e.key === "ArrowDown" ? 1 : PAL.items.length - 1)) % Math.max(1, PAL.items.length); Array.prototype.forEach.call(document.querySelectorAll("#pall li"), function (li, i) { li.classList.toggle("on", i === PAL.idx); }); return; }
      if (e.key === "Enter") { var it = PAL.items[PAL.idx]; if (it) { setHash("#" + it.h); closePalette(); } return; }
      return;
    }
    if (inField) return;
    if (e.key === "/") { e.preventDefault(); openPalette(); return; }
    if (e.key === "t") { setTheme(theme() === "light" ? "dark" : "light"); render(); return; }
    if (e.key === "g") { setHash("#/"); return; }
    if (CUR.c) {
      var vi = VIEWS.map(function (v) { return v[0]; }).indexOf(CUR.view), ci = CASES.indexOf(CUR.c);
      if (e.key === "ArrowRight") setHash("#/case/" + CUR.c.id + "/" + VIEWS[(vi + 1) % VIEWS.length][0]);
      else if (e.key === "ArrowLeft") setHash("#/case/" + CUR.c.id + "/" + VIEWS[(vi + VIEWS.length - 1) % VIEWS.length][0]);
      else if (e.key === "]") setHash("#/case/" + CASES[(ci + 1) % CASES.length].id + "/" + CUR.view);
      else if (e.key === "[") setHash("#/case/" + CASES[(ci + CASES.length - 1) % CASES.length].id + "/" + CUR.view);
      else { var hit = VIEWS.filter(function (v) { return v[2] === e.key; })[0]; if (hit) setHash("#/case/" + CUR.c.id + "/" + hit[0]); }
    }
  });

  function setTheme(t) { document.documentElement.setAttribute("data-theme", t); try { localStorage.setItem("aicf-theme", t); } catch (e) {} }
  (function initTheme() { var t = null; try { t = localStorage.getItem("aicf-theme"); } catch (e) {} setTheme(t === "dark" ? "dark" : "light"); })();
  window.addEventListener("hashchange", render);
  (function () { var bp = function () { return innerWidth < 600 ? "s" : innerWidth < 900 ? "m" : "l"; }, last = bp(), tm; addEventListener("resize", function () { clearTimeout(tm); tm = setTimeout(function () { if (bp() !== last) { last = bp(); render(); } }, 250); }); })();
  render();
})();
