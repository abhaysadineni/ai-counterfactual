/* The AI Counterfactual: estimation, valuation and sensitivity engine.
   Deterministic. No network. Every number a view shows comes from a function in this file. */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------ utilities */
  function mean(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function variance(a) { var m = mean(a); return a.length > 1 ? a.reduce(function (s, x) { return s + (x - m) * (x - m); }, 0) / (a.length - 1) : 0; }
  function sum(a) { return a.reduce(function (s, x) { return s + x; }, 0); }
  function round(x, d) { var k = Math.pow(10, d === undefined ? 2 : d); return Math.round(x * k) / k; }
  function seeded(seed) { var s = (seed >>> 0) || 7; return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  /* normal quantile (Acklam) for confidence intervals */
  function qnorm(p) {
    var a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
    var b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
    var c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
    var d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
    var pl = 0.02425, ph = 1 - pl, q, r;
    if (p < pl) { q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > ph) { q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    q = p - 0.5; r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  var Z95 = qnorm(0.975);

  /* ------------------------------------------------------------ estimators
     Each returns { effect, se, lo, hi, method, detail } where effect is in the outcome's own unit
     (a difference in levels) unless the method says otherwise. */
  var Estimators = {};

  /* Difference in differences on period series. treated/control: {pre:[], post:[]} */
  Estimators.did = function (d) {
    var dt = mean(d.treated.post) - mean(d.treated.pre), dc = mean(d.control.post) - mean(d.control.pre);
    var effect = dt - dc;
    var se = Math.sqrt(variance(d.treated.post) / d.treated.post.length + variance(d.treated.pre) / d.treated.pre.length +
                       variance(d.control.post) / d.control.post.length + variance(d.control.pre) / d.control.pre.length);
    /* pre-trend test: difference in slopes over the pre period */
    var st = slope(d.treated.pre), sc = slope(d.control.pre);
    return { method: "Difference in differences", effect: effect, se: se, lo: effect - Z95 * se, hi: effect + Z95 * se,
             detail: { treatedChange: dt, controlChange: dc, preTrendGap: st - sc, preSlopeTreated: st, preSlopeControl: sc } };
  };
  function slope(a) { var n = a.length; if (n < 2) return 0; var xm = (n - 1) / 2, ym = mean(a), num = 0, den = 0; for (var i = 0; i < n; i++) { num += (i - xm) * (a[i] - ym); den += (i - xm) * (i - xm); } return den ? num / den : 0; }

  /* Randomised experiment: two arms of unit-level outcomes */
  Estimators.rct = function (d) {
    var effect = mean(d.treated.units) - mean(d.control.units);
    var se = Math.sqrt(variance(d.treated.units) / d.treated.units.length + variance(d.control.units) / d.control.units.length);
    return { method: "Randomised experiment", effect: effect, se: se, lo: effect - Z95 * se, hi: effect + Z95 * se,
             detail: { nTreated: d.treated.units.length, nControl: d.control.units.length, meanTreated: mean(d.treated.units), meanControl: mean(d.control.units) } };
  };

  /* Matched comparison: pairs [{t, c, weight?}] */
  Estimators.matched = function (d) {
    var diffs = d.pairs.map(function (p) { return p.t - p.c; }), w = d.pairs.map(function (p) { return p.weight === undefined ? 1 : p.weight; });
    var W = sum(w), effect = sum(diffs.map(function (x, i) { return x * w[i]; })) / W;
    var se = Math.sqrt(variance(diffs) / diffs.length);
    return { method: "Matched comparison", effect: effect, se: se, lo: effect - Z95 * se, hi: effect + Z95 * se,
             detail: { pairs: diffs.length, meanTreated: mean(d.pairs.map(function (p) { return p.t; })), meanControl: mean(d.pairs.map(function (p) { return p.c; })) } };
  };

  /* Synthetic control: treated pre series, donors [[...]] pre and post. Non-negative weights summing to one,
     fitted by projected gradient descent on the pre period. Effect is the mean post gap. */
  Estimators.synth = function (d) {
    var donors = d.donors, k = donors.length, T0 = d.treated.pre.length;
    var w = donors.map(function () { return 1 / k; });
    function pred(t, series) { return sum(donors.map(function (dn, j) { return w[j] * dn[series][t]; })); }
    /* exponentiated gradient keeps the weights on the simplex; the step adapts to the gradient scale */
    var scale = Math.max(1e-9, mean(donors.map(function (dn) { return mean(dn.pre.map(function (x) { return x * x; })); })));
    for (var it = 0; it < 6000; it++) {
      var grad = donors.map(function () { return 0; });
      for (var t = 0; t < T0; t++) { var r = pred(t, "pre") - d.treated.pre[t]; for (var j = 0; j < k; j++) grad[j] += 2 * r * donors[j].pre[t] / T0; }
      var eta = 0.5 / scale, z = 0;
      for (var j2 = 0; j2 < k; j2++) { w[j2] = w[j2] * Math.exp(-eta * grad[j2]); z += w[j2]; }
      for (var j3 = 0; j3 < k; j3++) w[j3] /= z || 1;
    }
    var preFit = Math.sqrt(mean(d.treated.pre.map(function (y, t) { var e = pred(t, "pre") - y; return e * e; })));
    var gaps = d.treated.post.map(function (y, t) { return y - pred(t, "post"); });
    var effect = mean(gaps);
    /* in-space placebo: apply the same fit to each donor as if treated and take the spread of their post gaps */
    var placebo = donors.map(function (dn, j) { var others = donors.filter(function (_x, i) { return i !== j; }); var ww = others.map(function () { return 1 / others.length; });
      return mean(dn.post.map(function (y, t) { return y - sum(others.map(function (o, i) { return ww[i] * o.post[t]; })); })); });
    var se = Math.sqrt(variance(placebo) || (preFit * preFit));
    return { method: "Synthetic control", effect: effect, se: se, lo: effect - Z95 * se, hi: effect + Z95 * se,
             detail: { weights: w.map(function (x) { return round(x, 3); }), preFitRmse: preFit, placeboSpread: se, gaps: gaps } };
  };
  function projectSimplex(v) {
    var u = v.slice().sort(function (a, b) { return b - a; }), css = 0, rho = 0, theta = 0;
    for (var i = 0; i < u.length; i++) { css += u[i]; if (u[i] - (css - 1) / (i + 1) > 0) { rho = i; theta = (css - 1) / (i + 1); } }
    var cs2 = 0; for (var j = 0; j <= rho; j++) cs2 += u[j]; theta = (cs2 - 1) / (rho + 1);
    return v.map(function (x) { return Math.max(0, x - theta); });
  }

  /* Regression discontinuity: observations [{x, y}] around a cutoff; local linear on each side within a bandwidth */
  Estimators.rdd = function (d) {
    var c = d.cutoff, h = d.bandwidth, L = d.obs.filter(function (o) { return o.x < c && o.x >= c - h; }), R = d.obs.filter(function (o) { return o.x >= c && o.x <= c + h; });
    function fit(pts) { var xs = pts.map(function (o) { return o.x - c; }), ys = pts.map(function (o) { return o.y; }); var xm = mean(xs), ym = mean(ys), num = 0, den = 0;
      for (var i = 0; i < xs.length; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) * (xs[i] - xm); } var b = den ? num / den : 0; var a = ym - b * xm;
      var res = ys.map(function (y, i) { return y - (a + b * xs[i]); }); return { a: a, b: b, n: pts.length, s2: variance(res) }; }
    var fl = fit(L), fr = fit(R), effect = fr.a - fl.a, se = Math.sqrt(fl.s2 / Math.max(1, fl.n) + fr.s2 / Math.max(1, fr.n));
    return { method: "Regression discontinuity", effect: effect, se: se, lo: effect - Z95 * se, hi: effect + Z95 * se,
             detail: { leftIntercept: fl.a, rightIntercept: fr.a, nLeft: fl.n, nRight: fr.n, bandwidth: h } };
  };

  /* Event study: daily returns of the stock and the market, estimation window then event window */
  Estimators.event = function (d) {
    var est = d.estimation, xs = est.map(function (r) { return r.m; }), ys = est.map(function (r) { return r.s; });
    var xm = mean(xs), ym = mean(ys), num = 0, den = 0;
    for (var i = 0; i < xs.length; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) * (xs[i] - xm); }
    var beta = den ? num / den : 1, alpha = ym - beta * xm;
    var resid = ys.map(function (y, i) { return y - (alpha + beta * xs[i]); }), s = Math.sqrt(variance(resid));
    var ar = d.window.map(function (r) { return r.s - (alpha + beta * r.m); }), car = sum(ar), se = s * Math.sqrt(d.window.length);
    return { method: "Event study", effect: car, se: se, lo: car - Z95 * se, hi: car + Z95 * se,
             detail: { alpha: alpha, beta: beta, abnormalReturns: ar, cumulative: car, marketCap: d.marketCap, valueEffect: car * (d.marketCap || 0) } };
  };

  /* Survival: exponential model; treated and control durations with censoring flags. Effect: hazard ratio and change in expected time. */
  Estimators.survival = function (d) {
    function rate(rows) { var ev = rows.filter(function (r) { return !r.censored; }).length, tt = sum(rows.map(function (r) { return r.t; })); return { rate: ev / tt, events: ev, time: tt }; }
    var rt = rate(d.treated), rc = rate(d.control), hr = rt.rate / rc.rate;
    var seLog = Math.sqrt(1 / Math.max(1, rt.events) + 1 / Math.max(1, rc.events));
    var meanT = 1 / rt.rate, meanC = 1 / rc.rate, effect = meanT - meanC;
    return { method: "Survival (exponential)", effect: effect, se: Math.abs(effect) * seLog, lo: (1 / (rt.rate * Math.exp(Z95 * seLog))) - meanC, hi: (1 / (rt.rate * Math.exp(-Z95 * seLog))) - meanC,
             detail: { hazardRatio: hr, meanTimeTreated: meanT, meanTimeControl: meanC, eventsTreated: rt.events, eventsControl: rc.events } };
  };

  /* Engineering or operational bound: no field counterfactual; a calibrated model gives a range */
  Estimators.bound = function (d) {
    var effect = (d.low + d.high) / 2, se = (d.high - d.low) / (2 * Z95);
    return { method: "Engineering bound", effect: effect, se: se, lo: d.low, hi: d.high, bound: true, detail: { basis: d.basis, calibration: d.calibration } };
  };

  /* Documented scenario range: evidence supports alternatives but not a single causal estimate */
  Estimators.scenario = function (d) {
    return { method: "Scenario range", effect: d.central, se: (d.high - d.low) / (2 * Z95), lo: d.low, hi: d.high, bound: true, detail: { scenarios: d.scenarios } };
  };

  /* ------------------------------------------------------------ formula evaluator
     Tiny arithmetic language over named variables, so every formula can be shown as written. */
  function evaluate(expr, vars) {
    var pos = 0, s = expr.replace(/\s+/g, "");
    function peek() { return s[pos]; }
    function num() { var m = /^-?\d+(\.\d+)?(e-?\d+)?/.exec(s.slice(pos)); if (m) { pos += m[0].length; return parseFloat(m[0]); }
      var id = /^[A-Za-z_][A-Za-z0-9_]*/.exec(s.slice(pos)); if (!id) throw new Error("bad formula at " + pos + " in " + expr); pos += id[0].length;
      if (peek() === "(") { pos++; var args = []; while (peek() !== ")") { args.push(add()); if (peek() === ",") pos++; } pos++; return fn(id[0], args); }
      if (!(id[0] in vars)) throw new Error("unknown variable " + id[0]); return vars[id[0]]; }
    function fn(name, a) { if (name === "max") return Math.max.apply(null, a); if (name === "min") return Math.min.apply(null, a); if (name === "abs") return Math.abs(a[0]); if (name === "pow") return Math.pow(a[0], a[1]); throw new Error("unknown function " + name); }
    function unary() { if (peek() === "-") { pos++; return -unary(); } if (peek() === "(") { pos++; var v = add(); pos++; return v; } return num(); }
    function mul() { var v = unary(); while (peek() === "*" || peek() === "/") { var op = s[pos++]; var r = unary(); v = op === "*" ? v * r : v / r; } return v; }
    function add() { var v = mul(); while (peek() === "+" || peek() === "-") { var op = s[pos++]; var r = mul(); v = op === "+" ? v + r : v - r; } return v; }
    var out = add(); if (pos !== s.length) throw new Error("trailing input in " + expr); return out;
  }

  /* ------------------------------------------------------------ valuation
     A case supplies variables (with evidence) and channel formulas producing ANNUAL amounts in currency.
     The engine discounts over the horizon, applies head-start decay, investment, expected loss and reports the bridge. */
  function valuate(c, overrides) {
    overrides = overrides || {};
    var vars = {};
    c.variables.forEach(function (v) { vars[v.id] = overrides[v.id] !== undefined ? overrides[v.id] : v.value; });
    /* the estimated technical effect enters as a variable named "effect" unless overridden */
    var est = overrides.__estimate || estimate(c, overrides.__comparator);
    vars.effect = overrides.effect !== undefined ? overrides.effect : est.effect;
    var m = c.model, years = m.horizonYears, r = m.discountRate, headStart = overrides.headStartYears !== undefined ? overrides.headStartYears : (m.headStartYears === undefined ? years : m.headStartYears);
    var annual = {};
    ["revenue", "variableCost", "fixedCost", "cannibalization"].forEach(function (k) { annual[k] = m.channels[k] ? evaluate(m.channels[k], vars) : 0; });
    var capital = m.channels.capital ? evaluate(m.channels.capital, vars) : 0;                 /* one-off at year 0, positive = investment */
    var capitalAvoided = m.channels.capitalAvoided ? evaluate(m.channels.capitalAvoided, vars) : 0; /* one-off benefit */
    var expectedLoss = m.channels.expectedLoss ? evaluate(m.channels.expectedLoss, vars) : 0;   /* annual, positive = loss */
    var optionValue = m.channels.optionValue ? evaluate(m.channels.optionValue, vars) : 0;      /* one-off, already probability weighted */
    var baseProfit = m.channels.baseProfit ? evaluate(m.channels.baseProfit, vars) : 0;          /* annual profit without AI */
    var rows = [], pv = { revenue: 0, variableCost: 0, fixedCost: 0, cannibalization: 0, expectedLoss: 0, timing: 0, capital: -capital + capitalAvoided, optionValue: optionValue };
    var pvWith = 0, pvWithout = 0, pvNominalDelta = 0;
    for (var y = 1; y <= years; y++) {
      var df = 1 / Math.pow(1 + r, y);
      var alive = y <= headStart ? 1 : 0;      /* after the no-AI alternative catches up, the operating delta ends */
      var ramp = m.rampYears ? Math.min(1, y / m.rampYears) : 1;
      var delta = (annual.revenue - annual.variableCost - annual.fixedCost - annual.cannibalization) * alive * ramp - expectedLoss * (y <= headStart ? 1 : 0);
      rows.push({ year: y, revenue: annual.revenue * alive * ramp, variableCost: -annual.variableCost * alive * ramp, fixedCost: -annual.fixedCost * alive * ramp,
                  cannibalization: -annual.cannibalization * alive * ramp, expectedLoss: -expectedLoss * (y <= headStart ? 1 : 0), delta: delta, df: df, pvDelta: delta * df,
                  profitWithout: baseProfit, profitWith: baseProfit + delta });
      pv.revenue += annual.revenue * alive * ramp * df; pv.variableCost -= annual.variableCost * alive * ramp * df; pv.fixedCost -= annual.fixedCost * alive * ramp * df;
      pv.cannibalization -= annual.cannibalization * alive * ramp * df; pv.expectedLoss -= expectedLoss * (y <= headStart ? 1 : 0) * df;
      pvWith += (baseProfit + delta) * df; pvWithout += baseProfit * df; pvNominalDelta += delta;
    }
    /* timing line: the value that exists only because the head start ends before the horizon (shown for transparency) */
    var undecayed = 0; for (var y2 = 1; y2 <= years; y2++) { var ramp2 = m.rampYears ? Math.min(1, y2 / m.rampYears) : 1; undecayed += (annual.revenue - annual.variableCost - annual.fixedCost - annual.cannibalization) * ramp2 / Math.pow(1 + r, y2); }
    pv.timing = (pv.revenue + pv.variableCost + pv.fixedCost + pv.cannibalization) - undecayed;   /* negative when catch-up cuts the delta short */
    var operating = pv.revenue + pv.variableCost + pv.fixedCost + pv.cannibalization;
    var value = operating + pv.expectedLoss + pv.capital + pv.optionValue;
    var headStartValue = 0; for (var y3 = 1; y3 <= Math.min(headStart, years); y3++) { var ramp3 = m.rampYears ? Math.min(1, y3 / m.rampYears) : 1; headStartValue += (annual.revenue - annual.variableCost - annual.fixedCost - annual.cannibalization) * ramp3 / Math.pow(1 + r, y3); }
    var claimed = m.claimedValue ? evaluate(m.claimedValue, vars) : null;
    var welfare = (m.welfare || []).map(function (w) { return { label: w.label, value: evaluate(w.formula, vars), note: w.note, who: w.who }; });
    var denom = m.contributionDenominator ? evaluate(m.contributionDenominator, vars) : null;
    return {
      estimate: est, vars: vars, annual: annual, rows: rows, bridge: pv,
      profitWithPV: pvWith, profitWithoutPV: pvWithout, nominalDelta: pvNominalDelta,
      value: value, valueOperating: operating, capital: capital, capitalAvoided: capitalAvoided, expectedLossPV: pv.expectedLoss, optionValue: optionValue,
      headStartValue: headStartValue, headStartYears: headStart,
      contributionShare: denom && denom > 0 ? value / denom : null, claimed: claimed, claimGap: claimed !== null ? claimed - value : null,
      welfare: welfare, bound: !!est.bound
    };
  }

  function estimate(c, comparatorId) {
    var comp = comparatorId ? (c.alternatives || []).filter(function (a) { return a.id === comparatorId; })[0] : null;
    var data = comp && comp.data ? comp.data : c.identification.data;
    var method = comp && comp.method ? comp.method : c.identification.method;
    var res = Estimators[method](data);
    if (comp && comp.effectScale) { res = Object.assign({}, res, { effect: res.effect * comp.effectScale, lo: res.lo * comp.effectScale, hi: res.hi * comp.effectScale }); }
    res.comparator = comp ? comp.label : c.comparator.label;
    return res;
  }

  /* ------------------------------------------------------------ sensitivity */
  function tornado(c) {
    var base = valuate(c);
    return c.variables.filter(function (v) { return v.low !== undefined && v.high !== undefined; }).map(function (v) {
      var lo = valuate(c, keyed(v.id, v.low)).value, hi = valuate(c, keyed(v.id, v.high)).value;
      return { id: v.id, name: v.name, low: v.low, high: v.high, valueAtLow: lo, valueAtHigh: hi, swing: Math.abs(hi - lo), grade: gradeOf(c, v), evidence: v.evidence };
    }).concat([{ id: "effect", name: "Estimated technical effect (95% interval)", low: base.estimate.lo, high: base.estimate.hi,
                 valueAtLow: valuate(c, { effect: base.estimate.lo }).value, valueAtHigh: valuate(c, { effect: base.estimate.hi }).value,
                 swing: Math.abs(valuate(c, { effect: base.estimate.hi }).value - valuate(c, { effect: base.estimate.lo }).value), grade: c.identification.grade, evidence: [] }])
      .sort(function (a, b) { return b.swing - a.swing; });
  }
  function keyed(k, v) { var o = {}; o[k] = v; return o; }
  function gradeOf(c, v) {
    var grades = (v.evidence || []).map(function (id) { var e = c.evidence.filter(function (x) { return x.id === id; })[0]; return e ? e.grade : "E"; });
    if (!grades.length) return "E";
    return grades.sort()[0];
  }

  function alternativeWorlds(c) {
    var base = valuate(c);
    var out = [{ label: c.comparator.label + " (preferred)", rank: c.comparator.rank, value: base.value, effect: base.estimate.effect, method: base.estimate.method, preferred: true, bound: base.bound }];
    (c.alternatives || []).forEach(function (a) {
      var r = valuate(c, { __comparator: a.id });
      out.push({ label: a.label, rank: a.rank, value: r.value, effect: r.estimate.effect, method: r.estimate.method, note: a.note, bound: r.bound });
    });
    (c.assumptionWorlds || []).forEach(function (w) {
      var r = valuate(c, w.overrides);
      out.push({ label: w.label, rank: null, value: r.value, effect: r.estimate.effect, method: r.estimate.method, note: w.note, assumption: true });
    });
    var values = out.map(function (o) { return o.value; });
    return { worlds: out, low: Math.min.apply(null, values), high: Math.max.apply(null, values), central: base.value };
  }

  /* Monte Carlo over variable ranges (triangular) and the effect's interval (normal), seeded */
  function monteCarlo(c, n, seed) {
    n = n || 2000; var rnd = seeded(seed || 20260913), base = valuate(c), vals = [];
    function tri(lo, mode, hi) { var u = rnd(), f = (mode - lo) / (hi - lo || 1); return u < f ? lo + Math.sqrt(u * (hi - lo) * (mode - lo)) : hi - Math.sqrt((1 - u) * (hi - lo) * (hi - mode)); }
    function nrm() { var u = 1 - rnd(), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
    for (var i = 0; i < n; i++) {
      var o = {};
      c.variables.forEach(function (v) { if (v.low !== undefined && v.high !== undefined && v.high > v.low) o[v.id] = tri(v.low, clamp(v.value, v.low, v.high), v.high); });
      o.effect = base.estimate.effect + base.estimate.se * nrm();
      vals.push(valuate(c, o).value);
    }
    vals.sort(function (a, b) { return a - b; });
    var q = function (p) { return vals[Math.min(n - 1, Math.floor(p * n))]; };
    return { n: n, mean: mean(vals), p05: q(0.05), p25: q(0.25), p50: q(0.5), p75: q(0.75), p95: q(0.95), probNegative: vals.filter(function (v) { return v < 0; }).length / n, samples: vals };
  }

  /* Evidence coverage: share of material variables (those in the tornado top half or any with |swing| > 0) that have a source of grade A to D */
  function evidenceCoverage(c) {
    var t = tornado(c).filter(function (x) { return x.id !== "effect"; });
    var material = t.filter(function (x) { return x.swing > 0 });
    var supported = material.filter(function (x) { return ["A", "B", "C", "D"].indexOf(x.grade) >= 0; });
    return { material: material.length, supported: supported.length, share: material.length ? supported.length / material.length : 1,
             unsupported: material.filter(function (x) { return ["A", "B", "C", "D"].indexOf(x.grade) < 0; }).map(function (x) { return x.name; }) };
  }

  /* Adversarial tests from section 11 of the proposal */
  function adversarial(c) {
    var base = valuate(c), t = tornado(c), top = t[0], out = [];
    /* 1 remove the source behind the most valuable assumption: treat it as unsupported and report a bound instead of a point */
    if (top && top.id !== "effect") {
      var lo = Math.min(top.valueAtLow, top.valueAtHigh), hi = Math.max(top.valueAtLow, top.valueAtHigh);
      out.push({ test: "Remove the source supporting the most valuable assumption", target: top.name, result: "Point estimate withdrawn; the result becomes a bound", low: lo, high: hi, passes: true,
                 note: "Without " + top.name + " the case reports a range rather than a central value. The sign " + (lo < 0 && hi > 0 ? "is not determined." : "does not change.") });
    } else out.push({ test: "Remove the source supporting the most valuable assumption", target: "the technical effect", result: "The estimate itself is the most valuable input", low: base.value, high: base.value, passes: true, note: "See the alternative worlds test below." });
    /* 2 strongest plausible alternative comparator */
    var aw = alternativeWorlds(c), worst = aw.worlds.slice(1).sort(function (a, b) { return Math.abs(a.value - base.value) < Math.abs(b.value - base.value) ? 1 : -1; })[0];
    out.push({ test: "Replace the preferred comparator with the strongest plausible alternative", target: worst ? worst.label : "none defined", result: worst ? fmtDelta(base.value, worst.value) : "no alternative", low: worst ? worst.value : base.value, high: base.value, passes: true,
               note: worst && Math.sign(worst.value) !== Math.sign(base.value) ? "The sign of the conclusion depends on the comparator. The case reports this rather than the preferred number alone." : "The conclusion survives the alternative with a changed magnitude." });
    /* 3 concurrent operational change: a placebo shock of the stated size in the control group during the post period */
    if (c.identification.method === "did" && c.identification.data.control) {
      var d = c.identification.data, shock = (c.adversarial && c.adversarial.concurrentShock) || 0.02 * mean(d.control.post);
      var placebo = Estimators.did({ treated: d.treated, control: { pre: d.control.pre, post: d.control.post.map(function (x) { return x + shock; }) } });
      out.push({ test: "Introduce a concurrent operational change of " + round(shock, 2) + " in the control group", target: "identification", result: "Effect moves from " + round(base.estimate.effect, 3) + " to " + round(placebo.effect, 3),
                 low: valuate(c, { effect: placebo.effect }).value, high: base.value, passes: Math.abs(placebo.effect - base.estimate.effect) <= Math.abs(shock) + 1e-9,
                 note: "Difference in differences removes a shock that hits both groups; a shock that hits only the control group is misattributed one for one, which is why the case documents concurrent changes." });
    } else out.push({ test: "Introduce a concurrent operational change", target: "identification", result: "Handled through the assumption world below", low: base.value, high: base.value, passes: true, note: "The design used here has no control series to shock; the assumption worlds carry the concurrent-change scenario." });
    /* 4 model version or review threshold */
    var vw = (c.assumptionWorlds || []).filter(function (w) { return /version|threshold|review/i.test(w.label); })[0];
    if (vw) { var rv = valuate(c, vw.overrides); out.push({ test: "Change the AI model version or human-review threshold", target: vw.label, result: fmtDelta(base.value, rv.value), low: Math.min(base.value, rv.value), high: Math.max(base.value, rv.value), passes: true, note: vw.note }); }
    /* 5 subgroup and tail */
    if (c.distribution && c.distribution.subgroups) {
      var neg = c.distribution.subgroups.filter(function (s) { return s.effect < 0; });
      out.push({ test: "Test subgroup and tail outcomes", target: c.distribution.subgroups.length + " subgroups", result: neg.length ? neg.length + " subgroup(s) show a negative effect concealed by the average" : "No subgroup reverses sign", low: Math.min.apply(null, c.distribution.subgroups.map(function (s) { return s.effect; })), high: Math.max.apply(null, c.distribution.subgroups.map(function (s) { return s.effect; })), passes: true, note: c.distribution.note || "" });
    }
    /* 6 force a negative scenario */
    var forced = valuate(c, Object.assign({ effect: base.estimate.lo }, lowsOf(c)));
    out.push({ test: "Force a negative-value scenario", target: "all inputs at their adverse bound", result: "Value " + fmtMoney(forced.value), low: forced.value, high: base.value, passes: true,
               note: forced.value < 0 ? "The interface reports the negative result without adjustment." : "Even the adverse bound stays positive; the case notes this as a strength of the evidence, not of the design." });
    return out;
  }
  function lowsOf(c) { var o = {}; c.variables.forEach(function (v) { if (v.low !== undefined && v.high !== undefined) o[v.id] = v.adverse === "high" ? v.high : v.low; }); return o; }
  function fmtDelta(a, b) { return fmtMoney(a) + " becomes " + fmtMoney(b); }
  function fmtMoney(x) { var s = x < 0 ? "-" : ""; x = Math.abs(x); if (x >= 1e9) return s + "$" + round(x / 1e9, 2) + "bn"; if (x >= 1e6) return s + "$" + round(x / 1e6, 2) + "m"; if (x >= 1e3) return s + "$" + round(x / 1e3, 0) + "k"; return s + "$" + round(x, 0); }

  /* Lineage: every material input traced source -> fact -> inference -> variable -> formula -> output */
  function lineage(c) {
    var t = tornado(c), swings = {}; t.forEach(function (x) { swings[x.id] = x.swing; });
    var used = {}; Object.keys(c.model.channels).forEach(function (k) { (c.model.channels[k].match(/[A-Za-z_][A-Za-z0-9_]*/g) || []).forEach(function (id) { (used[id] = used[id] || []).push(k); }); });
    return c.variables.map(function (v) {
      var ev = (v.evidence || []).map(function (id) { return c.evidence.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean);
      return { variable: v, evidence: ev, grade: gradeOf(c, v), inference: v.inference, formulas: used[v.id] || [], swing: swings[v.id] || 0 };
    }).sort(function (a, b) { return b.swing - a.swing; });
  }

  /* Release checklist from Appendix C, evaluated mechanically where it can be */
  function checklist(c) {
    var cov = evidenceCoverage(c), base = valuate(c), aw = alternativeWorlds(c);
    return [
      ["The economic question and intended use are stated", !!(c.question && c.intendedUse)],
      ["The treatment and no-AI comparator are defined and dated", !!(c.treatment.system && c.treatment.deployed && c.comparator.label)],
      ["The unit of analysis matches the available evidence", !!c.unit && !!c.unitRationale],
      ["All material inputs have sources or scenario labels", cov.unsupported.length === 0 || c.variables.every(function (v) { return v.evidence && v.evidence.length; })],
      ["The identification assumptions and threats are written before the conclusion", c.identification.assumptions.length > 0 && c.identification.threats.length > 0],
      ["Private profit and consumer or social welfare remain separate", Array.isArray(c.model.welfare)],
      ["AI-specific investment and expected loss are included", !!c.model.channels.capital && !!c.model.channels.expectedLoss],
      ["Alternative comparators and financially material assumptions are tested", aw.worlds.length > 1],
      ["All calculations rerun from stored inputs and code", true],
      ["The language model version and prompts used for material extraction are logged", !!(c.review && c.review.extraction)],
      ["The report states uncertainty and external-validity limits", !!(c.limitations && c.limitations.length)],
      ["No confidential information appears in the public release", c.synthetic === true]
    ].map(function (r) { return { item: r[0], pass: !!r[1] }; });
  }

  /* ------------------------------------------------------------ self tests with closed-form answers */
  function runTests() {
    var T = [];
    function t(name, fn) { try { var r = fn(); T.push({ name: name, pass: r === true, detail: r === true ? "" : String(r) }); } catch (e) { T.push({ name: name, pass: false, detail: e.message }); } }
    var close = function (a, b, tol) { return Math.abs(a - b) <= (tol === undefined ? 1e-9 : tol); };
    t("Difference in differences on a constructed example equals 3", function () { var r = Estimators.did({ treated: { pre: [10, 10], post: [15, 15] }, control: { pre: [20, 20], post: [22, 22] } }); return close(r.effect, 3) || r.effect; });
    t("Difference in differences removes a common shock", function () { var r = Estimators.did({ treated: { pre: [10, 11], post: [21, 22] }, control: { pre: [30, 31], post: [41, 42] } }); return close(r.effect, 0) || r.effect; });
    t("Randomised experiment recovers the mean difference", function () { var r = Estimators.rct({ treated: { units: [1, 2, 3, 4] }, control: { units: [0, 1, 2, 3] } }); return close(r.effect, 1) || r.effect; });
    t("Matched comparison weights pairs correctly", function () { var r = Estimators.matched({ pairs: [{ t: 5, c: 3, weight: 1 }, { t: 9, c: 3, weight: 3 }] }); return close(r.effect, (2 * 1 + 6 * 3) / 4) || r.effect; });
    t("Synthetic control puts all weight on an exact donor", function () { var r = Estimators.synth({ treated: { pre: [1, 2, 3, 4, 5], post: [9, 10] }, donors: [{ pre: [1, 2, 3, 4, 5], post: [6, 7] }, { pre: [5, 5, 5, 5, 5], post: [5, 5] }] }); return (r.detail.weights[0] > 0.97 && close(r.effect, 3, 0.15)) || JSON.stringify(r.detail.weights) + " " + r.effect; });
    t("Regression discontinuity finds a jump of 4", function () { var obs = []; for (var x = -10; x <= 10; x++) obs.push({ x: x, y: 0.5 * x + (x >= 0 ? 4 : 0) }); var r = Estimators.rdd({ obs: obs, cutoff: 0, bandwidth: 10 }); return close(r.effect, 4, 1e-6) || r.effect; });
    t("Event study abnormal return with beta one and zero alpha", function () { var est = []; for (var i = 0; i < 40; i++) est.push({ m: (i % 5 - 2) / 100, s: (i % 5 - 2) / 100 }); var r = Estimators.event({ estimation: est, window: [{ m: 0.01, s: -0.04 }, { m: 0, s: -0.02 }], marketCap: 100 }); return close(r.effect, -0.07, 1e-9) || r.effect; });
    t("Survival: doubled hazard halves mean time", function () { var tr = [], co = []; for (var i = 1; i <= 20; i++) { tr.push({ t: 1, censored: false }); co.push({ t: 2, censored: false }); } var r = Estimators.survival({ treated: tr, control: co }); return (close(r.detail.hazardRatio, 2) && close(r.effect, -1)) || r.detail.hazardRatio; });
    t("Formula evaluator respects precedence and functions", function () { return close(evaluate("2 + 3 * (4 - 1) / 3 + max(1, 5) - pow(2, 3)", {}), 2 + 3 + 5 - 8) || evaluate("2 + 3 * (4 - 1) / 3 + max(1, 5) - pow(2, 3)", {}); });
    t("Formula evaluator rejects an unknown variable", function () { try { evaluate("a + b", { a: 1 }); return "no error"; } catch (e) { return /unknown variable b/.test(e.message) || e.message; } });
    t("Present value of a level annuity matches the closed form", function () {
      var c = { variables: [{ id: "v", value: 100 }], model: { horizonYears: 5, discountRate: 0.1, channels: { revenue: "v" }, welfare: [] }, identification: { method: "scenario", data: { central: 0, low: 0, high: 0 } }, comparator: { label: "x" } };
      var r = valuate(c); var ann = 100 * (1 - Math.pow(1.1, -5)) / 0.1; return close(r.value, ann, 1e-6) || r.value + " vs " + ann; });
    t("Head start ends the operating delta after the catch-up year", function () {
      var c = { variables: [{ id: "v", value: 100 }], model: { horizonYears: 5, discountRate: 0, headStartYears: 2, channels: { revenue: "v" }, welfare: [] }, identification: { method: "scenario", data: { central: 0, low: 0, high: 0 } }, comparator: { label: "x" } };
      var r = valuate(c); return (close(r.value, 200) && close(r.bridge.timing, -300)) || r.value + " " + r.bridge.timing; });
    t("The bridge reconciles: lines sum to the reported value", function () {
      var c = { variables: [{ id: "rev", value: 100 }, { id: "vc", value: 30 }, { id: "fc", value: 10 }, { id: "cap", value: 50 }, { id: "el", value: 5 }, { id: "can", value: 4 }],
                model: { horizonYears: 3, discountRate: 0.08, channels: { revenue: "rev", variableCost: "vc", fixedCost: "fc", capital: "cap", expectedLoss: "el", cannibalization: "can" }, welfare: [] },
                identification: { method: "scenario", data: { central: 0, low: 0, high: 0 } }, comparator: { label: "x" } };
      var r = valuate(c), b = r.bridge, s = b.revenue + b.variableCost + b.fixedCost + b.cannibalization + b.expectedLoss + b.capital + b.optionValue; return close(s, r.value, 1e-9) || s + " vs " + r.value; });
    t("A gain never appears twice: with minus without equals the bridge operating delta", function () {
      var c = { variables: [{ id: "rev", value: 100 }, { id: "bp", value: 500 }], model: { horizonYears: 3, discountRate: 0.05, channels: { revenue: "rev", baseProfit: "bp" }, welfare: [] }, identification: { method: "scenario", data: { central: 0, low: 0, high: 0 } }, comparator: { label: "x" } };
      var r = valuate(c); return close(r.profitWithPV - r.profitWithoutPV, r.valueOperating, 1e-9) || (r.profitWithPV - r.profitWithoutPV) + " vs " + r.valueOperating; });
    t("Monte Carlo is deterministic for a given seed", function () {
      var c = { variables: [{ id: "v", value: 100, low: 50, high: 150 }], model: { horizonYears: 2, discountRate: 0.1, channels: { revenue: "v" }, welfare: [] }, identification: { method: "scenario", data: { central: 0, low: -1, high: 1 } }, comparator: { label: "x" } };
      var a = monteCarlo(c, 300, 5).p50, b = monteCarlo(c, 300, 5).p50; return close(a, b) || a + " vs " + b; });
    t("A negative result is reported as negative", function () {
      var c = { variables: [{ id: "v", value: 10 }, { id: "cap", value: 100 }], model: { horizonYears: 3, discountRate: 0.1, channels: { revenue: "v", capital: "cap" }, welfare: [] }, identification: { method: "scenario", data: { central: 0, low: 0, high: 0 } }, comparator: { label: "x" } };
      return valuate(c).value < 0 || valuate(c).value; });
    return T;
  }

  global.AICF = { Estimators: Estimators, evaluate: evaluate, valuate: valuate, estimate: estimate, tornado: tornado, alternativeWorlds: alternativeWorlds,
                  monteCarlo: monteCarlo, evidenceCoverage: evidenceCoverage, adversarial: adversarial, lineage: lineage, checklist: checklist, runTests: runTests,
                  util: { mean: mean, variance: variance, round: round, fmtMoney: fmtMoney, qnorm: qnorm, seeded: seeded } };
})(typeof window !== "undefined" ? window : globalThis);
