      if (elig.length > 1) rotatedMeta = { delta: elig[0].score - elig[1].score, second: elig[1].isin };
    }
    return {
      date: DATES[i], pick, pickScore, reason, rows: ordered, eligCount: elig.length, rotatedMeta,
      cashScore: scoreAt(modelId, cash, i), cashR12: retAt(cash, i, 12),
    };
  }

  function computeMetrics(equity) {
    if (!equity || equity.length < 2) return null;
    const vals = equity.map((e) => e.v), n = vals.length;
    const total = vals[n - 1] / vals[0] - 1, years = (n - 1) / 12;
    const cagr = years > 0 ? Math.pow(vals[n - 1] / vals[0], 1 / years) - 1 : null;
    const rets = [];
    for (let i = 1; i < n; i++) rets.push(vals[i] / vals[i - 1] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, rets.length - 1);
    const vol = Math.sqrt(variance) * Math.sqrt(12);
    const sharpe = vol > 0 ? (cagr ?? mean * 12) / vol : null;
    let peak = vals[0], maxDd = 0;
    for (const v of vals) {
      if (v > peak) peak = v;
      const dd = v / peak - 1;
      if (dd < maxDd) maxDd = dd;
    }
    return { cagr, vol, sharpe, max_dd: maxDd, total_return: total, n_obs: n };
  }

  function runBacktest(modelId, filterMode) {
    const start = 12, end = lastValidIndex();
    if (end < start) return { equity: [], signals: [], metrics: null };
    const signals = [];
    let holding = null, eq = 1.0;
    const equity = [];
    for (let i = start; i <= end; i++) {
      const rk = rankAt(modelId, filterMode, i);
      let target = rk.pick, reason = rk.reason, rotated = false;
      if (holding == null) {
        rotated = true; reason = 'primera asignación · ' + reason; holding = target;
      } else if (target === holding) {
        rotated = false; reason = 'mantener (mismo top-1)';
      } else {
        const mNew = scoreAt(modelId, target, i), mOld = scoreAt(modelId, holding, i);
        if (mOld == null || mNew == null) {
          rotated = true; reason = 'rotar (dato ausente)'; holding = target;
        } else if (mNew - mOld > META.rotationThreshold) {
          rotated = true;
          reason = 'rotar · Δ ' + (mNew - mOld).toFixed(4) + ' > umbral';
          holding = target;
        } else {
          rotated = false;
          reason = 'mantener · Δ ' + (mNew - mOld).toFixed(4) + ' ≤ umbral';
          target = holding;
        }
      }
      if (i > start) {
        const prev = signals[signals.length - 1].asset_isin;
        const a = SERIES[prev][i - 1], b = SERIES[prev][i];
        if (a != null && b != null && a !== 0) eq *= b / a;
        equity.push({ d: DATES[i], v: eq });
      } else equity.push({ d: DATES[i], v: 1.0 });
      signals.push({
        date: DATES[i], asset_isin: target, score: scoreAt(modelId, target, i),
        rotated, reason, r12: retAt(target, i, 12), r6: retAt(target, i, 6), r3: retAt(target, i, 3),
      });
    }
    return { equity, signals, metrics: computeMetrics(equity) };
  }

  function correlationMatrix() {
    const isins = activeRiskIsins().concat([META.cashIsin]).filter((i) => SERIES[i]);
    const rets = {};
    for (const isin of isins) {
      const s = SERIES[isin], r = [];
      for (let i = 1; i < s.length; i++) {
        if (s[i] != null && s[i - 1] != null && s[i - 1] !== 0) r.push({ i, v: s[i] / s[i - 1] - 1 });
      }
      rets[isin] = r;
    }
    function corr(a, b) {
      const mapB = new Map(b.map((x) => [x.i, x.v]));
      const xs = [], ys = [];
      for (const x of a) if (mapB.has(x.i)) { xs.push(x.v); ys.push(mapB.get(x.i)); }
      if (xs.length < 24) return null;
      const n = xs.length;
      const mx = xs.reduce((p, c) => p + c, 0) / n, my = ys.reduce((p, c) => p + c, 0) / n;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < n; i++) {
        const ax = xs[i] - mx, ay = ys[i] - my;
        num += ax * ay; dx += ax * ax; dy += ay * ay;
      }
      return dx === 0 || dy === 0 ? null : num / Math.sqrt(dx * dy);
    }
    const matrix = {};
    for (const a of isins) {
      matrix[a] = {};
      for (const b of isins) matrix[a][b] = a === b ? 1 : corr(rets[a], rets[b]);
    }
    return { isins, matrix };
  }

  function loadSlots() {
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (e) {}
