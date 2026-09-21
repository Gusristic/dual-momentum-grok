      date: DATES[i], pick, pickScore, picks, reason, rows: ordered, eligCount: elig.length, rotatedMeta,
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
    let holdingPicks = null, eq = 1.0;
    const equity = [];
    const useTopK = (state.topK || 1) >= 2;
    for (let i = start; i <= end; i++) {
      const rk = rankAt(modelId, filterMode, i);
      let targetPicks = rk.picks.map((p) => ({ isin: p.isin, score: p.score, w: p.w }));
      let reason = rk.reason, rotated = false;
      if (holdingPicks == null) {
        rotated = true;
        reason = 'primera asignación · ' + reason;
        holdingPicks = targetPicks;
      } else if (useTopK) {
        const same =
          holdingPicks.length === targetPicks.length &&
          holdingPicks.every((h, idx) => h.isin === targetPicks[idx].isin);
        if (same) {
          rotated = false;
          reason = 'mantener top-' + targetPicks.length;
        } else {
          rotated = true;
          reason = 'rebalance top-' + targetPicks.length + ' · ' + reason;
          holdingPicks = targetPicks;
        }
      } else {
        let target = targetPicks[0].isin;
        const holding = holdingPicks[0].isin;
        if (target === holding) {
          rotated = false;
          reason = 'mantener (mismo top-1)';
        } else {
          const mNew = scoreAt(modelId, target, i), mOld = scoreAt(modelId, holding, i);
          if (mOld == null || mNew == null) {
            rotated = true;
            reason = 'rotar (dato ausente)';
            holdingPicks = targetPicks;
          } else if (mNew - mOld > META.rotationThreshold) {
            rotated = true;
            reason = 'rotar · Δ ' + (mNew - mOld).toFixed(4) + ' > umbral';
            holdingPicks = targetPicks;
          } else {
            rotated = false;
            reason = 'mantener · Δ ' + (mNew - mOld).toFixed(4) + ' ≤ umbral';
            targetPicks = holdingPicks;
          }
        }
      }
      if (i > start) {
        const prev = signals[signals.length - 1].picks;
        let portRet = 0, wSum = 0;
        for (const p of prev) {
          const a = SERIES[p.isin][i - 1], b = SERIES[p.isin][i];
          if (a != null && b != null && a !== 0) {
            portRet += p.w * (b / a - 1);
            wSum += p.w;
          }
        }
        if (wSum > 0) eq *= 1 + portRet;
        equity.push({ d: DATES[i], v: eq });
      } else equity.push({ d: DATES[i], v: 1.0 });
      const label = targetPicks.map((p) => short(p.isin) + (targetPicks.length > 1 ? ' ' + Math.round(p.w * 100) + '%' : '')).join(' + ');
      signals.push({
        date: DATES[i],
        asset_isin: targetPicks[0].isin,
        picks: targetPicks,
        label,
        score: targetPicks[0].score,
        rotated,
        reason,
        r12: retAt(targetPicks[0].isin, i, 12),
        r6: retAt(targetPicks[0].isin, i, 6),
        r3: retAt(targetPicks[0].isin, i, 3),
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
