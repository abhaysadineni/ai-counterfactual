/* The AI Counterfactual: public markets module.
   Data: /assets/data/markets.json, refreshed daily by a scheduled function that reads the SEC EDGAR
   company-facts API and FRED. Everything here is real, dated and sourced; the only computed layer is the
   counterfactual trend, whose method and window are shown and adjustable. */
(function (global) {
  "use strict";
  var M = { data: null, loading: null, error: null };
  var GROUPS = ["Hyperscalers", "Chips", "Equipment", "Infrastructure", "Software", "Power"];
  var GHEX = { Hyperscalers: "#5B3FE6", Chips: "#12B98F", Equipment: "#22B8D8", Infrastructure: "#D946EF", Software: "#3D6DFF", Power: "#F4A11D" };
  var GCOL = GHEX;
  var SERIES = { revenue: "Revenue", opinc: "Operating income", rnd: "Research and development", capex: "Capital expenditure", netinc: "Net income", ocf: "Operating cash flow" };
  var DEFAULT = { from: "2017Q1", to: "2022Q4", kind: "linear" };

  function esc(s) { return String(s === undefined || s === null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(x) { if (x === null || x === undefined || isNaN(x)) return "n/a"; var s = x < 0 ? "-" : "", a = Math.abs(x); if (a >= 1e6) return s + "$" + (a / 1e6).toFixed(2) + "tn"; if (a >= 1e3) return s + "$" + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + "bn"; return s + "$" + a.toFixed(0) + "m"; }
  function pct(x, d) { return x === null || x === undefined || isNaN(x) ? "n/a" : (x * 100).toFixed(d === undefined ? 1 : d) + "%"; }
  function qnum(q) { var m = /^(\d{4})Q([1-4])$/.exec(q); return m ? (+m[1]) * 4 + (+m[2]) - 1 : null; }
  function qlab(n) { return Math.floor(n / 4) + "Q" + ((n % 4) + 1); }
  function load() {
    if (M.data) return Promise.resolve(M.data);
    if (M.loading) return M.loading;
    M.loading = (/(^|\.)abhaychakra\.com$/.test(location.hostname) ? fetch("/assets/data/markets.json", { cache: "no-cache" }) : fetch("data/markets.json", { cache: "no-cache" })).then(function (r) { if (!r.ok) throw new Error("feed " + r.status); return r.json(); }).then(function (d) { M.data = d; return d; }).catch(function (e) { M.error = e.message; M.loading = null; throw e; });
    return M.loading;
  }

  /* ---------------------------------------------------------- counterfactual trend
     Fit the pre-period (from..to) and extrapolate. kind "log": least squares on log(value) (a constant growth
     rate); kind "linear": least squares on value. Returns per-quarter {q, actual, trend, excess} and totals. */
  function trend(series, opt) {
    opt = Object.assign({}, DEFAULT, opt || {});
    var pts = series.map(function (r) { return { q: r[0], n: qnum(r[0]), end: r[1], v: r[2] }; }).filter(function (p) { return p.n !== null; });
    var a = qnum(opt.from), b = qnum(opt.to), pre = pts.filter(function (p) { return p.n >= a && p.n <= b && (opt.kind !== "log" || p.v > 0); });
    if (pre.length < 6) return { ok: false, reason: "fewer than six quarters in the pre-period", points: pts.map(function (p) { return { q: p.q, actual: p.v, trend: null, excess: null }; }), pre: pre.length };
    var xs = pre.map(function (p) { return p.n; }), ys = pre.map(function (p) { return opt.kind === "log" ? Math.log(p.v) : p.v; });
    var xm = xs.reduce(function (s, x) { return s + x; }, 0) / xs.length, ym = ys.reduce(function (s, y) { return s + y; }, 0) / ys.length, num = 0, den = 0;
    for (var i = 0; i < xs.length; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) * (xs[i] - xm); }
    var slope = den ? num / den : 0, icpt = ym - slope * xm;
    var out = pts.map(function (p) { var t = slope * p.n + icpt; if (opt.kind === "log") t = Math.exp(t); return { q: p.q, n: p.n, actual: p.v, trend: t, excess: p.n > b ? p.v - t : null }; });
    var post = out.filter(function (p) { return p.n > b; }), cum = post.reduce(function (s, p) { return s + p.excess; }, 0), cumAct = post.reduce(function (s, p) { return s + p.actual; }, 0), cumTr = post.reduce(function (s, p) { return s + p.trend; }, 0);
    var resid = pre.map(function (p, i) { var fit = slope * p.n + icpt; return (opt.kind === "log" ? Math.log(p.v) : p.v) - fit; }), rmse = Math.sqrt(resid.reduce(function (s, r) { return s + r * r; }, 0) / Math.max(1, resid.length - 2));
    return { ok: true, points: out, slope: slope, growthPerQuarter: opt.kind === "log" ? Math.exp(slope) - 1 : null, cumExcess: cum, cumActual: cumAct, cumTrend: cumTr, pre: pre.length, post: post.length, rmse: rmse, opt: opt, last: post.length ? post[post.length - 1] : null };
  }
  function ttm(series) { var s = series.slice(-4); return s.length === 4 ? s.reduce(function (a, r) { return a + r[2]; }, 0) : null; }
  function byTicker(t) { return M.data.companies.filter(function (c) { return c.ticker === t; })[0]; }
  function CW() { return innerWidth < 600 ? 400 : innerWidth < 1000 ? 600 : 760; }
  function optFrom(q) { return { from: (q && q.from) || DEFAULT.from, to: (q && q.to) || DEFAULT.to, kind: (q && q.kind) || DEFAULT.kind }; }

  /* ---------------------------------------------------------- SVG helpers (self-contained) */
  function T(x, y, txt, cls, anchor) { return '<text x="' + x + '" y="' + y + '"' + (cls ? ' class="' + cls + '"' : "") + (anchor ? ' text-anchor="' + anchor + '"' : "") + ">" + esc(txt) + "</text>"; }
  function scale(dom, range) { var d0 = dom[0], d1 = dom[1]; if (d1 === d0) d1 = d0 + 1; return function (x) { return range[0] + (x - d0) / (d1 - d0) * (range[1] - range[0]); }; }
  function ticks(lo, hi, k) { var span = hi - lo || 1, step = Math.pow(10, Math.floor(Math.log10(span / (k || 5)))), err = span / (k || 5) / step; step *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1; var out = []; for (var v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }

  /* actual vs trend, gap shaded */
  function trendChart(tr, o) {
    o = o || {}; var W = o.w || CW(), H = o.height || Math.round(W * 0.42), m = { t: 22, r: 12, b: 32, l: W < 500 ? 52 : 66 }, pts = tr.points.filter(function (p) { return !o.since || p.n >= qnum(o.since); });
    if (!pts.length) return "";
    var ys = []; pts.forEach(function (p) { ys.push(p.actual); if (p.trend !== null && p.trend !== undefined) ys.push(p.trend); });
    var ylo = Math.min(0, Math.min.apply(null, ys)), yhi = Math.max.apply(null, ys) * 1.08 || 1, x = scale([pts[0].n, pts[pts.length - 1].n], [m.l, W - m.r]), y = scale([ylo, yhi], [H - m.b, m.t]), b = "";
    ticks(ylo, yhi, H < 170 ? 3 : 5).forEach(function (t) { b += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(m.l - 8, y(t) + 4, o.money === false ? t : fmt(t), "", "end"); });
    if (tr.ok) {
      var cut = qnum(tr.opt.to) + 0.5; if (cut > pts[0].n) b += '<line x1="' + x(cut) + '" x2="' + x(cut) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="var(--amb)" stroke-dasharray="3 5"/>' + T(x(cut) + 5, m.t - 6, "trend fitted before this point");
      var post = pts.filter(function (p) { return p.excess !== null; });
      if (post.length) { var d = ""; post.forEach(function (p, i) { d += (i ? "L" : "M") + x(p.n) + "," + y(p.actual); }); for (var i = post.length - 1; i >= 0; i--) d += "L" + x(post[i].n) + "," + y(post[i].trend); b += '<path d="' + d + 'Z" fill="' + (tr.cumExcess >= 0 ? "var(--pos)" : "var(--neg)") + '" opacity=".16"/>'; }
      b += '<path d="' + pts.map(function (p, i) { return (i ? "L" : "M") + x(p.n) + "," + y(p.trend); }).join("") + '" fill="none" stroke="var(--amb)" stroke-width="2" stroke-dasharray="5 6"/>';
    }
    b += '<path d="' + pts.map(function (p, i) { return (i ? "L" : "M") + x(p.n) + "," + y(p.actual); }).join("") + '" fill="none" stroke="' + (o.color || "var(--navy)") + '" stroke-width="2.4" class="draw"/>';
    pts.forEach(function (p) { b += '<circle cx="' + x(p.n) + '" cy="' + y(p.actual) + '" r="2.4" fill="' + (o.color || "var(--navy)") + '"><title>' + esc(p.q + ": " + fmt(p.actual) + (p.trend !== null && p.trend !== undefined ? ", trend " + fmt(p.trend) : "")) + "</title></circle>"; });
    var step = Math.max(1, Math.round(pts.length / (W < 500 ? 4 : 8))); pts.forEach(function (p, i) { if (i % step === 0 && i <= pts.length - 1 - step / 2 || i === pts.length - 1) b += T(x(p.n), H - 10, p.q, "", "middle"); });
    return '<div class="chart" data-fit><svg viewBox="0 0 ' + W + " " + H + '" role="img">' + b + "</svg>" + (o.cap ? '<p class="cap">' + o.cap + "</p>" : "") + "</div>";
  }

  /* stacked streams: rows [{label,color,points:[[n,v]]}] on shared quarters */
  function streams(rows, o) {
    o = o || {}; var W = o.w || CW(), H = o.height || Math.round(W * 0.42), m = { t: 22, r: 12, b: 32, l: W < 500 ? 52 : 66 }, qs = {};
    rows.forEach(function (r) { r.points.forEach(function (p) { qs[p[0]] = 1; }); }); var ns = Object.keys(qs).map(Number).sort(function (a, b) { return a - b; }).filter(function (n) { return !o.since || n >= qnum(o.since); });
    var stack = ns.map(function (n) { var acc = 0, layers = []; rows.forEach(function (r) { var v = (r.points.filter(function (p) { return p[0] === n; })[0] || [n, 0])[1]; layers.push([acc, acc + v]); acc += v; }); return { n: n, layers: layers, total: acc }; });
    var yhi = Math.max.apply(null, stack.map(function (s) { return s.total; })) * 1.08 || 1, x = scale([ns[0], ns[ns.length - 1]], [m.l, W - m.r]), y = scale([0, yhi], [H - m.b, m.t]), b = "";
    ticks(0, yhi, 5).forEach(function (t) { b += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(m.l - 8, y(t) + 4, fmt(t), "", "end"); });
    rows.forEach(function (r, ri) { var d = ""; stack.forEach(function (s, i) { d += (i ? "L" : "M") + x(s.n) + "," + y(s.layers[ri][1]); }); for (var i = stack.length - 1; i >= 0; i--) d += "L" + x(stack[i].n) + "," + y(stack[i].layers[ri][0]); b += '<path d="' + d + 'Z" fill="' + r.color + '" opacity=".78"><title>' + esc(r.label) + "</title></path>"; });
    if (o.trend) { var tp = o.trend.filter(function (p) { return p.n >= ns[0]; }); b += '<path d="' + tp.map(function (p, i) { return (i ? "L" : "M") + x(p.n) + "," + y(p.trend); }).join("") + '" fill="none" stroke="var(--ink)" stroke-width="2" stroke-dasharray="5 6"/>'; }
    var step = Math.max(1, Math.round(ns.length / (W < 500 ? 4 : 8))); ns.forEach(function (n, i) { if (i % step === 0 && i <= ns.length - 1 - step / 2 || i === ns.length - 1) b += T(x(n), H - 10, qlab(n), "", "middle"); });
    return '<div class="chart" data-fit><svg viewBox="0 0 ' + W + " " + H + '" role="img">' + b + "</svg>" + (o.cap ? '<p class="cap">' + o.cap + "</p>" : "") + '</div><div class="legend">' + rows.map(function (r) { return "<span><i style=\"background:" + r.color + '"></i>' + esc(r.label) + "</span>"; }).join("") + "</div>";
  }

  /* macro line with trend */
  function macroChart(ser, o) {
    o = o || {}; var pts = ser.points.filter(function (p) { return p[0] >= (o.since || "2015-01-01"); }).map(function (p) { return { d: p[0], t: Date.parse(p[0]), v: p[1] }; }); if (pts.length < 4) return "";
    var W = o.w || CW(), H = o.height || Math.round(W * 0.34), m = { t: 22, r: 12, b: 32, l: W < 500 ? 52 : 66 }, x = scale([pts[0].t, pts[pts.length - 1].t], [m.l, W - m.r]), ylo = Math.min.apply(null, pts.map(function (p) { return p.v; })), yhi = Math.max.apply(null, pts.map(function (p) { return p.v; })); var pad = (yhi - ylo) * 0.1 || 1; ylo -= pad; yhi += pad;
    var y = scale([ylo, yhi], [H - m.b, m.t]), b = "";
    ticks(ylo, yhi, H < 170 ? 3 : 5).forEach(function (t) { b += '<line class="grid" x1="' + m.l + '" x2="' + (W - m.r) + '" y1="' + y(t) + '" y2="' + y(t) + '"/>' + T(m.l - 8, y(t) + 4, o.fmt ? o.fmt(t) : t.toLocaleString("en-US", { maximumFractionDigits: 1 }), "", "end"); });
    if (o.trendTo) { var cut = Date.parse(o.trendTo), pre = pts.filter(function (p) { return p.t <= cut && p.t >= Date.parse(o.trendFrom || "2015-01-01"); }); if (pre.length >= 6) { var xs = pre.map(function (p) { return p.t / 3.15e10; }), ys = pre.map(function (p) { return o.log ? Math.log(p.v) : p.v; }), xm = xs.reduce(function (s, v) { return s + v; }, 0) / xs.length, ym = ys.reduce(function (s, v) { return s + v; }, 0) / ys.length, num = 0, den = 0; for (var i = 0; i < xs.length; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) * (xs[i] - xm); } var sl = den ? num / den : 0, ic = ym - sl * xm; var tl = pts.map(function (p) { var v = sl * p.t / 3.15e10 + ic; return [p.t, o.log ? Math.exp(v) : v]; }); var post = pts.filter(function (p) { return p.t > cut; }); if (post.length) { var d = ""; post.forEach(function (p, i) { d += (i ? "L" : "M") + x(p.t) + "," + y(p.v); }); for (var j = post.length - 1; j >= 0; j--) { var tv = tl.filter(function (q) { return q[0] === post[j].t; })[0][1]; d += "L" + x(post[j].t) + "," + y(tv); } b += '<path d="' + d + 'Z" fill="var(--pos)" opacity=".16"/>'; } b += '<path d="' + tl.map(function (p, i) { return (i ? "L" : "M") + x(p[0]) + "," + y(p[1]); }).join("") + '" fill="none" stroke="var(--amb)" stroke-width="2" stroke-dasharray="5 6"/><line x1="' + x(cut) + '" x2="' + x(cut) + '" y1="' + m.t + '" y2="' + (H - m.b) + '" stroke="var(--amb)" stroke-dasharray="3 5"/>'; } }
    b += '<path d="' + pts.map(function (p, i) { return (i ? "L" : "M") + x(p.t) + "," + y(p.v); }).join("") + '" fill="none" stroke="' + (o.color || "var(--navy)") + '" stroke-width="2.2" class="draw"/>';
    var yrs = {}; pts.forEach(function (p) { var yr = p.d.slice(0, 4); if (!yrs[yr]) yrs[yr] = p.t; }); Object.keys(yrs).forEach(function (yr, i, arr) { var every = W < 500 ? 3 : arr.length > 8 ? 2 : 1; if (i % every) return; b += T(x(yrs[yr]), H - 10, yr, "", "middle"); });
    return '<div class="chart" data-fit><svg viewBox="0 0 ' + W + " " + H + '" role="img">' + b + "</svg>" + (o.cap ? '<p class="cap">' + o.cap + "</p>" : "") + "</div>";
  }

  /* ---------------------------------------------------------- views */
  function controls(opt, base) {
    var qs = []; for (var y2 = 2012; y2 <= 2024; y2++) for (var q = 1; q <= 4; q++) qs.push(y2 + "Q" + q);
    function sel(name, cur, list, labels) { return '<label>' + name + '<select data-mk="' + name.toLowerCase().replace(/ /g, "") + '">' + list.map(function (v, i) { return '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + (labels ? labels[i] : v) + "</option>"; }).join("") + "</select></label>"; }
    return '<form class="controls" id="mkForm" data-base="' + esc(base) + '">' + sel("From", opt.from, qs) + sel("To", opt.to, qs) + sel("Kind", opt.kind, ["log", "linear"], ["constant growth (log-linear)", "straight line (linear)"]) + '<button class="btn sm" type="submit">Refit</button><span class="small">Trend fitted on the pre-period, extrapolated after it. The gap is the counterfactual.</span></form>';
  }
  function status() { var d = M.data; var latest = d.companies.map(function (c) { return c.latestFiling && c.latestFiling.filed; }).filter(Boolean).sort().slice(-1)[0]; return '<div class="chips" style="margin:.2rem 0 1rem"><span class="tag">Feed generated ' + esc(d.generated.replace("T", " ").replace("Z", " UTC")) + '</span><span class="tag">Latest filing in the set ' + esc(latest) + '</span><span class="tag">' + d.companies.length + " filers</span><span class=\"tag\">" + Object.keys(d.macro).length + " macro series</span>" + (d.failures && d.failures.length ? '<span class="tag">missing: ' + esc(d.failures.join(", ")) + "</span>" : "") + "</div>"; }

  function hyperRows(opt) {
    var d = M.data, hs = d.companies.filter(function (c) { return c.group === "Hyperscalers" && c.series.capex; });
    var rows = hs.map(function (c) { return { c: c, tr: trend(c.series.capex, opt), ttm: ttm(c.series.capex) }; });
    var latestQ = rows.map(function (r) { return r.c.series.capex[r.c.series.capex.length - 1][0]; }).sort()[0];
    var lastQSum = rows.reduce(function (s, r) { var p = r.c.series.capex.filter(function (x) { return x[0] === latestQ; })[0]; return s + (p ? p[2] : 0); }, 0);
    var ttmSum = rows.reduce(function (s, r) { return s + (r.ttm || 0); }, 0), excess = 0, trendSum = 0, qmap = {};
    rows.forEach(function (r) { if (!r.tr.ok) return; r.tr.points.forEach(function (p) { if (p.n <= qnum(latestQ)) { if (p.excess !== null) { excess += p.excess; trendSum += p.trend; } if (p.n >= qnum(opt.from)) { qmap[p.n] = qmap[p.n] || { a: 0, t: 0 }; qmap[p.n].a += p.actual; qmap[p.n].t += p.trend; } } }); });
    var totalTrend = Object.keys(qmap).map(Number).sort(function (a, b) { return a - b; }).map(function (n) { return { n: n, trend: qmap[n].t }; });
    return { hs: hs, rows: rows, latestQ: latestQ, lastQSum: lastQSum, ttmSum: ttmSum, excess: excess, trendSum: trendSum, totalTrend: totalTrend };
  }
  var HCOL = ["#5B3FE6", "#3D6DFF", "#22B8D8", "#D946EF", "#F4A11D"];
  function stackedPane(h, opt) {
    return pane(streams(h.rows.map(function (r, i) { return { label: r.c.name, color: HCOL[i % 5], points: r.c.series.capex.filter(function (p) { return qnum(p[0]) <= qnum(h.latestQ); }).map(function (p) { return [qnum(p[0]), p[2]]; }) }; }), { since: "2016Q1", trend: h.totalTrend, cap: "Quarterly capital expenditure of the five, stacked, in millions of dollars. The dashed line is the sum of their five pre-period trends. Source: SEC EDGAR company facts." }), "hi");
  }
  function mapBox() {
    return '<div class="mkmap" id="mkmap"><canvas id="mkcv"></canvas><div class="tip" id="mktip" hidden></div></div><div class="legend mklegend">' + GROUPS.map(function (g) { return '<span><i style="background:' + GCOL[g] + '"></i>' + g + "</span>"; }).join("") + "<span>sphere: trailing four quarters of capital expenditure. Arc: share of that above trend. Hover for detail, click for the company.</span></div>";
  }
  /* the section embedded on the project home page */
  function section(q, helpers, done) {
    ro = helpers.ro; pane = helpers.pane; table = helpers.table;
    if (!M.data) { load().then(done).catch(done); return '<div class="section"><div class="vhead"><h2>The AI build-out, <em>as filed</em></h2><p>' + (M.error ? "The filings feed could not be loaded (" + esc(M.error) + ")." : "Loading the filings feed…") + "</p></div></div>"; }
    var opt = optFrom(q), h = hyperRows(opt);
    setTimeout(function () { startMap(q); }, 0);
    return '<div class="section"><div class="mkhead"><div><div class="vhead" style="display:block;margin:0"><h2>The AI build-out, <em>as filed</em></h2><p>Beside the synthetic cases, one live feed of real numbers: what 29 listed companies reported to the SEC, refreshed daily, with the same counterfactual question asked of their capital spending. Each sphere is a company sized by its last four quarters of capital expenditure; the arc is the share of that spending above the company\'s pre-2023 trend.</p></div></div>' +
      '<div class="ro navy big"><div class="l">Five hyperscalers, capital spent above trend, ' + esc(qlab(qnum(opt.to) + 1)) + " to " + esc(h.latestQ) + '</div><div class="v">' + fmt(h.excess) + '</div><div class="s">Actual ' + fmt(h.excess + h.trendSum) + " against a straight-line trend of " + fmt(h.trendSum) + " fitted on " + esc(opt.from) + " to " + esc(opt.to) + ". Microsoft, Alphabet, Amazon, Meta, Oracle.</div></div></div>" + mapBox() +
      '<div class="gstats" style="position:static;display:grid;margin-bottom:1.1rem">' + ro("Latest quarter, five hyperscalers", fmt(h.lastQSum), esc(h.latestQ) + ", the last quarter all five have reported") + ro("Trailing four quarters", fmt(h.ttmSum), "same five") + ro("Companies in the feed", String(M.data.companies.length), "SEC EDGAR, quarterly") + ro("Feed generated", esc(M.data.generated.slice(0, 10)), "refreshed daily at 10:30 UTC") + "</div>" +
      stackedPane(h, opt) + '<div class="linkrow"><a class="pill" href="#/markets">Every company, the macro backdrop and the method <i>→</i></a></div></div>';
  }
  /* the full markets page */
  function overview(q) {
    var d = M.data, opt = optFrom(q), h = hyperRows(opt);
    var allRows = d.companies.filter(function (c) { return c.series.capex; }).map(function (c) { return { c: c, tr: trend(c.series.capex, opt), ttm: ttm(c.series.capex) }; });
    return '<div class="chead"><div><div class="id"><b>Public markets</b><span>SEC EDGAR and FRED, refreshed daily</span></div><h1>The AI build-out, <em>as filed</em></h1><p class="lede">Every number here is what a company reported to the SEC or what a statistical agency published. The one computed layer is a counterfactual: what capital spending would have been had each company stayed on its pre-2023 trend. The gap is what has been spent beyond that path, in the companies\' own filings.</p></div>' +
      '<div class="ro navy big"><div class="l">Capital spent above trend, five hyperscalers, ' + esc(qlab(qnum(opt.to) + 1)) + " to " + esc(h.latestQ) + '</div><div class="v">' + fmt(h.excess) + '</div><div class="s">Actual ' + fmt(h.excess + h.trendSum) + " against a trend of " + fmt(h.trendSum) + ". Trend: " + (opt.kind === "log" ? "constant growth" : "straight line") + " fitted on " + esc(opt.from) + " to " + esc(opt.to) + ".</div></div></div>" +
      status() + controls(opt, "#/markets") + mapBox() +
      '<div class="section"><div class="vhead"><h2>Five hyperscalers, stacked</h2><p>Quarterly capital expenditure by company. The dashed line is the sum of the five pre-period trends, extrapolated. The space between the stack and the line is the build-out above trend.</p></div>' + stackedPane(h, opt) + "</div>" +
      '<div class="section"><div class="vhead"><h2>Every company against its own trend</h2><p>Cumulative capital expenditure above the pre-period trend since ' + esc(qlab(qnum(opt.to) + 1)) + ", and the same as a share of what the trend would have been. Companies without six pre-period quarters show no trend.</p></div>" + pane(table(["Company", "Group", "#Latest quarter", "#Trailing 4Q", "#Above trend since " + qlab(qnum(opt.to) + 1), "#Versus trend", "Latest filing"], allRows.sort(function (a, b) { return (b.tr.ok ? b.tr.cumExcess : -1e12) - (a.tr.ok ? a.tr.cumExcess : -1e12); }).map(function (r) {
        var lastp = r.c.series.capex[r.c.series.capex.length - 1];
        return ['<a href="#/markets/' + esc(r.c.ticker) + '"><b>' + esc(r.c.ticker) + "</b> " + esc(r.c.name) + "</a>", esc(r.c.group), fmt(lastp[2]) + '<span class="small">' + esc(lastp[0]) + "</span>", fmt(r.ttm), r.tr.ok ? '<span class="' + (r.tr.cumExcess < 0 ? "neg" : "pos") + '">' + fmt(r.tr.cumExcess) + "</span>" : '<span class="small">no pre-period</span>', r.tr.ok ? pct(r.tr.cumExcess / r.tr.cumTrend, 0) : "", r.c.latestFiling ? esc(r.c.latestFiling.form + " " + r.c.latestFiling.filed) : ""];
      }))) + "</div>" + macroSection(q) + methodSection();
  }

  function company(t, q) {
    var c = byTicker(t); if (!c) return '<div class="chead"><h1>No such company in the feed</h1><p><a href="#/markets">Back to markets</a></p></div>';
    var opt = optFrom(q), out = '<div class="chead"><div><div class="id"><b>' + esc(c.ticker) + "</b><span>" + esc(c.group) + "</span><span>CIK " + c.cik + "</span></div><h1>" + esc(c.name) + '</h1><p class="lede">' + esc(c.entity) + ". Quarterly figures derived from the company's 10-Q and 10-K filings; the dashed line on each chart is the pre-period trend extrapolated, the shading the gap.</p><div class=\"meta\">" + (c.latestFiling ? "<span>Latest " + esc(c.latestFiling.form) + " filed " + esc(c.latestFiling.filed) + "</span>" : "") + '<span><a href="' + esc(c.filingsUrl) + '" target="_blank" rel="noopener">Filings at EDGAR</a></span><span><a href="' + esc(c.factsUrl) + '" target="_blank" rel="noopener">Company facts JSON</a></span></div></div>';
    var cx = c.series.capex ? trend(c.series.capex, opt) : null;
    out += '<div class="ro navy big"><div class="l">Capital expenditure above the pre-period trend</div><div class="v">' + (cx && cx.ok ? fmt(cx.cumExcess) : "n/a") + '</div><div class="s">' + (cx && cx.ok ? "Since " + esc(qlab(qnum(opt.to) + 1)) + ": actual " + fmt(cx.cumActual) + " against a trend of " + fmt(cx.cumTrend) + ", " + pct(cx.cumExcess / cx.cumTrend, 0) + " above. Pre-period growth " + pct(cx.growthPerQuarter, 1) + " per quarter." : "No trend: " + (cx ? cx.reason : "no capital expenditure series")) + "</div></div></div>" + status() + controls(opt, "#/markets/" + c.ticker);
    var keys = ["capex", "revenue", "opinc", "rnd", "netinc", "ocf"].filter(function (k) { return c.series[k]; });
    out += '<div class="grid2">' + keys.map(function (k) { var tr = trend(c.series[k], opt), lastp = c.series[k][c.series[k].length - 1]; return pane('<p class="label">' + SERIES[k] + ", " + esc(lastp[0]) + ": " + fmt(lastp[2]) + (tr.ok ? ", above trend since " + esc(qlab(qnum(opt.to) + 1)) + " " + fmt(tr.cumExcess) : "") + "</p>" + trendChart(tr, { since: "2016Q1", w: innerWidth < 720 ? 400 : 560, color: GCOL[c.group], cap: "Tags used: " + esc((c.tags[k] || []).join(", ")) + ". Millions of dollars per quarter." })); }).join("") + "</div>";
    if (c.series.capex && c.series.revenue) { var ratio = c.series.capex.map(function (p) { var r = c.series.revenue.filter(function (x) { return x[0] === p[0]; })[0]; return r && r[2] ? [p[0], p[1], p[2] / r[2] * 100] : null; }).filter(Boolean); var rt = trend(ratio, Object.assign({}, opt, { kind: "linear" })); out += pane('<p class="label">Capital expenditure as a share of revenue, percent</p>' + trendChart(rt, { since: "2016Q1", money: false, w: CW(), color: GCOL[c.group], cap: "Percent of the same quarter's revenue. Straight-line trend on the pre-period." })); }
    out += '<div class="pn"><a class="btn sm" href="#/markets">← All companies</a>' + M.data.companies.filter(function (x) { return x.group === c.group && x.ticker !== c.ticker; }).map(function (x) { return '<a class="btn sm" href="#/markets/' + esc(x.ticker) + '">' + esc(x.ticker) + "</a>"; }).join("") + "</div>";
    return out;
  }

  function macroSection(q) {
    var d = M.data, mk = d.macro, out = '<div class="section"><div class="vhead"><h2>The macro backdrop, <em>same method</em></h2><p>If the build-out is real it should show in the national accounts. Business investment in information-processing equipment and in intellectual property products, total nonresidential investment, and labour productivity, each against its own trend fitted to 2015 through 2022.</p></div><div class="grid2">';
    [["B009RC1Q027SBEA", true], ["Y001RC1Q027SBEA", true], ["PNFI", true], ["OPHNFB", false]].forEach(function (k) { var s = mk[k[0]]; if (!s) return; var last = s.points[s.points.length - 1]; out += pane('<p class="label">' + esc(s.title) + ", " + esc(last[0]) + ": " + (k[1] ? "$" + last[1].toFixed(0) + "bn" : last[1].toFixed(1)) + "</p>" + macroChart(s, { since: "2012-01-01", w: innerWidth < 720 ? 400 : 560, trendFrom: "2015-01-01", trendTo: "2022-12-31", log: k[1], fmt: k[1] ? function (v) { return "$" + v.toFixed(0) + "bn"; } : null, cap: esc(s.units) + ". Source: " + esc(s.source) + ', <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(k[0]) + "</a>." })); });
    out += "</div><div class=\"grid3\">";
    [["FEDFUNDS", "%"], ["DGS10", "%"], ["UNRATE", "%"]].forEach(function (k) { var s = mk[k[0]]; if (!s) return; var last = s.points[s.points.length - 1]; out += pane('<p class="label">' + esc(s.title) + ", " + esc(last[0]) + ": " + last[1].toFixed(2) + "%</p>" + macroChart(s, { since: "2015-01-01", w: innerWidth < 720 ? 400 : 400, color: "var(--ink3)", fmt: function (v) { return v.toFixed(1) + "%"; }, cap: esc(s.units) + ". " + esc(s.source) + "." })); });
    return out + "</div></div>";
  }

  function methodSection() {
    var d = M.data;
    return '<div class="section"><div class="vhead"><h2>Method and <em>lineage</em></h2><p>What is measured, what is computed, and where each number comes from.</p></div><div class="bento">' +
      pane('<p class="label">Sources</p><ul class="clean">' + d.sources.map(function (s) { return "<li><b>" + esc(s.name) + '</b> <a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.url.replace(/^https?:\/\//, "")) + "</a><span class=\"small\">" + esc(s.licence) + ". " + esc(s.note) + "</span></li>"; }).join("") + "</ul>", "s6") +
      pane('<p class="label">How the quarterly values are derived</p><ul class="clean"><li>Income-statement items are reported for three-month periods and used as filed; the latest amendment wins.</li><li>Cash-flow items such as capital expenditure are reported year to date; each quarter is the year-to-date figure less the preceding one with the same start date.</li><li>Fiscal quarters are labelled by the calendar quarter containing their midpoint (Microsoft\'s quarter ending 30 June is 2026Q2; NVIDIA\'s quarter ending late January is the previous year\'s Q4).</li><li>Where a company changed its accounting tag, series are merged with the standard tag taking precedence; the tags used are listed on each chart.</li><li>Capital expenditure excludes finance leases and acquisitions; companies differ in what they classify, and the comparison across companies is therefore indicative, the comparison within a company over time exact.</li></ul>', "s6") +
      pane('<p class="label">The counterfactual trend</p><p>For each series a trend is fitted by least squares on the pre-period (default 2017Q1 to 2022Q4, the six calendar years before the generative-AI build-out began) and extrapolated. The default fit is a straight line; a constant-growth alternative (least squares on the logarithm) is offered. The two disagree most for companies whose spending accelerated inside the pre-period, Amazon during 2020 and 2021 above all, where the constant-growth trend extrapolates that surge and can exceed actual spending. Both are shown as what they are: a choice of window and shape, not a measurement. The gap between the reported figure and the trend is reported as "above trend". It is a descriptive counterfactual: it says what spending would have been had the earlier growth simply continued, and nothing about what caused the departure. Move the window and the fit and watch the number move; that sensitivity is the point.</p>', "s6") +
      pane('<p class="label">What this module does not do</p><ul class="clean"><li>No prices, valuations, insider or congressional trades: no free source permits republishing them, so they are not here.</li><li>No attribution of revenue to AI: the filings do not separate it, so no number here claims to.</li><li>No forecasts. The trend line after the cut is a counterfactual for the past, not a projection of the future.</li><li>The feed refreshes once a day at 10:30 UTC; quarterly figures change only when a filing lands.</li></ul>', "s6") + "</div></div>";
  }

  /* ---------------------------------------------------------- capital map (canvas) */
  var MAP = null;
  function startMap(q) {
    var box = document.getElementById("mkmap"), cv = document.getElementById("mkcv"); if (!box || !cv) return; var ctx = cv.getContext("2d"), tip = document.getElementById("mktip"), opt = optFrom(q), d = M.data, dpr = Math.min(2, devicePixelRatio || 1), W, H, nodes = [], hover = null, raf, t0 = performance.now(), parts = [];
    var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    function size() { W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + "px"; cv.style.height = H + "px"; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); layout(); }
    function layout() {
      var hudH = 0, hudW = 0;
      var cs = d.companies.filter(function (c) { return c.series.capex && ttm(c.series.capex) !== null; }), maxT = Math.max.apply(null, cs.map(function (c) { return ttm(c.series.capex); })), sz = Math.max(0.42, Math.min(1, Math.min(W, H) / 700));
      var centres = { Hyperscalers: [0.55, 0.5], Chips: [0.25, 0.74], Equipment: [0.18, 0.4], Infrastructure: [0.86, 0.3], Software: [0.4, 0.24], Power: [0.86, 0.78] };
      nodes = cs.map(function (c, i) { var tr = trend(c.series.capex, opt), tt = ttm(c.series.capex), r = (7 + 42 * Math.sqrt(tt / maxT)) * sz, cc = centres[c.group] || [0.5, 0.5], k = cs.filter(function (x) { return x.group === c.group; }).indexOf(c), n = cs.filter(function (x) { return x.group === c.group; }).length, ang = (k / n) * Math.PI * 2; return { c: c, tr: tr, ttm: tt, r: r, x: W * cc[0] + Math.cos(ang) * (60 + n * 8), y: H * cc[1] + Math.sin(ang) * (50 + n * 6), vx: 0, vy: 0, share: tr.ok && tr.cumActual > 0 ? Math.max(0, tr.cumExcess / tr.cumActual) : 0, rate: c.series.capex[c.series.capex.length - 1][2], ph: i }; });
      for (var it = 0; it < 240; it++) { nodes.forEach(function (a) { var fx = 0, fy = 0; nodes.forEach(function (b) { if (a === b) return; var dx = a.x - b.x, dy = a.y - b.y, dd = Math.sqrt(dx * dx + dy * dy * 0.55) + 1, min = a.r + b.r + (W < 600 ? 40 : 48); if (dd < min) { fx += dx / dd * (min - dd) * 0.1; fy += dy / dd * (min - dd) * 0.1; } }); if (a.x < hudW && a.y < hudH + 40) fy += 3; a.vx = (a.vx + fx) * 0.6; a.vy = (a.vy + fy) * 0.6; }); nodes.forEach(function (a) { a.x = Math.max(a.r + 24, Math.min(W - a.r - 24, a.x + a.vx)); a.y = Math.max(a.r + 22, Math.min(H - a.r - 46, a.y + a.vy)); }); }
    }
    function sphere(x, y, r, hex, alpha) { var g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r * 1.05); g.addColorStop(0, "rgba(255,255,255," + 0.95 * alpha + ")"); g.addColorStop(0.3, hexa(hex, 0.85 * alpha)); g.addColorStop(1, hexa(hex, alpha)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.29); ctx.fill(); }
    function hexa(h, a) { h = h.replace("#", ""); return "rgba(" + parseInt(h.slice(0, 2), 16) + "," + parseInt(h.slice(2, 4), 16) + "," + parseInt(h.slice(4, 6), 16) + "," + a + ")"; }
    var maxRate = 1;
    function draw(ts) {
      var t = (ts - t0) / 1000, dark = document.documentElement.getAttribute("data-theme") === "dark", ink = getComputedStyle(document.documentElement).getPropertyValue("--ink-rgb").trim() || (dark ? "241,238,255" : "23,18,46");
      ctx.clearRect(0, 0, W, H); maxRate = Math.max.apply(null, nodes.map(function (n) { return n.rate; }));
      nodes.forEach(function (n) { if (!reduced && Math.random() < 0.9 * n.rate / maxRate) { var a = Math.random() * 6.29; parts.push({ x: n.x + Math.cos(a) * n.r, y: n.y + Math.sin(a) * n.r, vx: Math.cos(a) * 0.6, vy: Math.sin(a) * 0.6 - 0.5, life: 1, hex: GHEX[n.c.group] }); } });
      for (var i = parts.length - 1; i >= 0; i--) { var p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy -= 0.01; p.life -= 0.014; if (p.life <= 0) { parts.splice(i, 1); continue; } ctx.fillStyle = hexa(p.hex, 0.7 * p.life); ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 6.29); ctx.fill(); }
      if (parts.length > 900) parts.splice(0, parts.length - 900);
      nodes.forEach(function (n) {
        var hl = n === hover, hex = GHEX[n.c.group], sh = ctx.createRadialGradient(n.x, n.y + n.r * 0.6, 0, n.x, n.y + n.r * 0.6, n.r * 2); sh.addColorStop(0, "rgba(" + ink + ",.14)"); sh.addColorStop(1, "rgba(" + ink + ",0)"); ctx.fillStyle = sh; ctx.beginPath(); ctx.arc(n.x, n.y + n.r * 0.6, n.r * 2, 0, 6.29); ctx.fill();
        sphere(n.x, n.y, n.r * (hl ? 1.06 : 1), hex, 1);
        if (n.share > 0) { ctx.strokeStyle = hexa(hex, 0.9); ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 7, -Math.PI / 2, -Math.PI / 2 + n.share * 6.283); ctx.stroke(); ctx.strokeStyle = "rgba(" + ink + ",.12)"; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 7, 0, 6.29); ctx.stroke(); }
        ctx.fillStyle = "rgba(" + ink + "," + (hl ? 1 : 0.85) + ")"; ctx.font = (hl ? "600 12px " : "600 11px ") + "Manrope, sans-serif"; ctx.textAlign = "center"; ctx.fillText(n.c.ticker, n.x, n.y + n.r + 21);
        if (W >= 600 || n.r > 22) { ctx.fillStyle = "rgba(" + ink + ",.7)"; ctx.font = "500 10.5px Manrope, sans-serif"; ctx.fillText(fmt(n.ttm), n.x, n.y + n.r + 34); }
      });
      if (!reduced) raf = requestAnimationFrame(draw);
    }
    function hit(ev) { var r = cv.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top, best = null, bd = 1e9; nodes.forEach(function (n) { var dx = n.x - x, dy = n.y - y, dd = dx * dx + dy * dy; if (dd < (n.r + 10) * (n.r + 10) && dd < bd) { bd = dd; best = n; } }); return best; }
    function showTip() { if (!hover) { tip.hidden = true; return; } var n = hover, lastp = n.c.series.capex[n.c.series.capex.length - 1]; tip.innerHTML = '<span class="tag">' + esc(n.c.ticker) + '</span><span class="tag">' + esc(n.c.group) + "</span><b>" + esc(n.c.name) + '</b><div class="kv"><span>latest quarter ' + fmt(lastp[2]) + " (" + esc(lastp[0]) + ")</span><span>trailing 4Q " + fmt(n.ttm) + "</span>" + (n.tr.ok ? "<span>above trend " + fmt(n.tr.cumExcess) + " (" + pct(n.tr.cumExcess / n.tr.cumTrend, 0) + ")</span>" : "<span>no pre-period trend</span>") + "</div>"; tip.hidden = false; var tw = tip.offsetWidth, th = tip.offsetHeight, lx = n.x + n.r + 16, ly = n.y - th / 2; if (lx + tw > W - 8) lx = n.x - n.r - 16 - tw; tip.style.left = Math.max(8, lx) + "px"; tip.style.top = Math.max(8, Math.min(H - th - 8, ly)) + "px"; }
    cv.addEventListener("mousemove", function (ev) { var h = hit(ev); if (h !== hover) { hover = h; cv.style.cursor = h ? "pointer" : ""; showTip(); if (reduced) draw(1e9); } });
    cv.addEventListener("mouseleave", function () { hover = null; showTip(); });
    cv.addEventListener("click", function (ev) { var h = hit(ev); if (h) location.hash = "#/markets/" + h.c.ticker; });
    size(); addEventListener("resize", size);
    function vis() { if (document.hidden) cancelAnimationFrame(raf); else if (!reduced && MAP) raf = requestAnimationFrame(draw); }
    document.addEventListener("visibilitychange", vis);
    MAP = { stop: function () { cancelAnimationFrame(raf); removeEventListener("resize", size); document.removeEventListener("visibilitychange", vis); MAP = null; } };
    if (reduced) draw(1e9); else raf = requestAnimationFrame(draw);
  }

  /* shared helpers injected by app.js */
  var ro, pane, table;
  function render(path, q, helpers, done) {
    ro = helpers.ro; pane = helpers.pane; table = helpers.table;
    if (MAP) MAP.stop();
    if (!M.data) {
      load().then(function () { done(); }).catch(function () { done(); });
      return '<div class="chead"><div><div class="id"><b>Public markets</b></div><h1>Loading the <em>filings</em> feed</h1><p class="lede">' + (M.error ? "The feed could not be loaded: " + esc(M.error) + ". It is written once a day to /assets/data/markets.json; if this persists the scheduled function has stopped." : "Reading /assets/data/markets.json…") + "</p></div></div>";
    }
    var html = path[1] ? company(path[1], q) : overview(q);
    setTimeout(function () {
      if (!path[1]) startMap(q);
      var f = document.getElementById("mkForm"); if (f) f.addEventListener("submit", function (e) { e.preventDefault(); var from = f.querySelector('[data-mk="from"]').value, to = f.querySelector('[data-mk="to"]').value, kind = f.querySelector('[data-mk="kind"]').value; location.hash = f.dataset.base + "?from=" + from + "&to=" + to + "&kind=" + kind; });
    }, 0);
    return html;
  }
  global.AICF_MARKETS = { render: render, section: section, trend: trend, load: load, state: M, stopMap: function () { if (MAP) MAP.stop(); } };
})(typeof window !== "undefined" ? window : globalThis);
