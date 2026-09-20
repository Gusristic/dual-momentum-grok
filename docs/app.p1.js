(function () {
  const META = window.DM_META;
  const STORAGE = 'dm_v2_slots';
  const STORAGE_UI = 'dm_v2_ui';

  let NAV = {};
  let DATES = [];
  let SERIES = {};

  const state = {
    model: 'equilibrado',
    filter: 'score',
    active: {},
  };

  function pct(x) {
    if (x == null || Number.isNaN(x)) return '—';
    return (x * 100).toFixed(1) + '%';
  }
  function pctClass(x) {
    if (x == null || Number.isNaN(x)) return '';
    return x >= 0 ? 'pos' : 'neg';
  }
  function name(isin) {
    return META.names[isin] || isin;
  }
  function short(isin) {
    return META.short[isin] || META.names[isin] || isin;
  }

  async function loadNav() {
    const res = await fetch('nav_monthly.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('No se pudo cargar nav_monthly.json');
    NAV = await res.json();
    const monthMaps = {};
    const monthSet = new Set();
    for (const isin of Object.keys(NAV)) {
      const m = {};
      for (const p of NAV[isin]) {
        const ym = p.d.slice(0, 7);
        m[ym] = p.c;
        monthSet.add(ym);
      }
      monthMaps[isin] = m;
    }
    DATES = Array.from(monthSet).sort();
    SERIES = {};
    for (const isin of Object.keys(monthMaps)) {
      SERIES[isin] = DATES.map((ym) =>
        monthMaps[isin][ym] != null ? monthMaps[isin][ym] : null
      );
    }
  }

  function retAt(isin, i, window) {
    const s = SERIES[isin];
    if (!s || i < window) return null;
    const a = s[i - window];
    const b = s[i];
    if (a == null || b == null || a === 0) return null;
    return b / a - 1;
  }

  function ret12_1(isin, i) {
    const s = SERIES[isin];
    if (!s || i < 12) return null;
    const a = s[i - 12];
    const b = s[i - 1];
    if (a == null || b == null || a === 0) return null;
    return b / a - 1;
  }

  function scoreAt(modelId, isin, i) {
    const m = META.models[modelId];
    if (m.kind === 'r12') return retAt(isin, i, 12);
    if (m.kind === 'r12_1') return ret12_1(isin, i);
    const r12 = retAt(isin, i, 12);
    const r6 = retAt(isin, i, 6);
    const r3 = retAt(isin, i, 3);
    if (r12 == null || r6 == null || r3 == null) return null;
    return m.w12 * r12 + m.w6 * r6 + m.w3 * r3;
  }

  function eligible(modelId, filterMode, isin, cashIsin, i) {
    if (filterMode === 'r12') {
      const ra = retAt(isin, i, 12);
      const rc = retAt(cashIsin, i, 12);
      if (ra == null || rc == null) return false;
      return ra > rc;
    }
    const sa = scoreAt(modelId, isin, i);
    const sc = scoreAt(modelId, cashIsin, i);
    if (sa == null || sc == null) return false;
    return sa > sc;
  }

  function activeRiskIsins() {
    return META.defaultIsins.filter(
      (i) => i !== META.cashIsin && state.active[i] !== false && SERIES[i]
    );
  }

  function lastValidIndex() {
    const cash = SERIES[META.cashIsin];
    for (let i = cash.length - 1; i >= 0; i--) {
      if (cash[i] != null) return i;
    }
    return -1;
  }

  function rankAt(modelId, filterMode, i) {
    const cash = META.cashIsin;
    const rows = [];
    for (const isin of activeRiskIsins()) {
      const r12 = retAt(isin, i, 12);
      const r6 = retAt(isin, i, 6);
      const r3 = retAt(isin, i, 3);
      const sc = scoreAt(modelId, isin, i);
      const ok = eligible(modelId, filterMode, isin, cash, i);
      rows.push({ isin, score: sc, r12, r6, r3, eligible: ok });
    }
    const elig = rows.filter((r) => r.eligible && r.score != null);
    const rest = rows.filter((r) => !r.eligible || r.score == null);
    elig.sort((a, b) => b.score - a.score);
    rest.sort((a, b) => (b.score ?? -999) - (a.score ?? -999));
    const ordered = elig.concat(rest);
    ordered.forEach((r, idx) => { r.rank = idx + 1; });

    let pick = cash;
    let reason = 'ningún activo pasó filtro → cash';
    let pickScore = scoreAt(modelId, cash, i);
    let rotatedMeta = null;

    if (elig.length) {
      pick = elig[0].isin;
      pickScore = elig[0].score;
      reason = 'top-1 por score entre elegibles';
      if (elig.length > 1) {
        rotatedMeta = { delta: elig[0].score - elig[1].score, second: elig[1].isin };
      }
    }

    return {
      date: DATES[i],
      pick,
      pickScore,
      reason,
      rows: ordered,
      eligCount: elig.length,
      rotatedMeta,
      cashScore: scoreAt(modelId, cash, i),
      cashR12: retAt(cash, i, 12),
    };
  }

  function runBacktest(modelId, filterMode) {
    const cash = META.cashIsin;
    const start = 12;
    const end = lastValidIndex();
    if (end < start) return { equity: [], signals: [], metrics: null };

    const signals = [];
    let holding = null;
    const equity = [];
    let eq = 1.0;

    for (let i = start; i <= end; i++) {
      const rk = rankAt(modelId, filterMode, i);
      let target = rk.pick;
      let reason = rk.reason;
      let rotated = false;

      if (holding == null) {
        rotated = true;
        reason = 'primera asignación · ' + reason;
        holding = target;
      } else if (target === holding) {
        rotated = false;
        reason = 'mantener (mismo top-1)';
      } else {
        const mNew = scoreAt(modelId, target, i);
        const mOld = scoreAt(modelId, holding, i);
        if (mOld == null || mNew == null) {
          rotated = true;
          reason = 'rotar (dato ausente en holding actual)';
          holding = target;
        } else if (mNew - mOld > META.rotationThreshold) {
          rotated = true;
          reason = 'rotar · Δ score ' + (mNew - mOld).toFixed(4) + ' > umbral ' + META.rotationThreshold;
          holding = target;
        } else {
          rotated = false;
          reason = 'mantener · Δ score ' + (mNew - mOld).toFixed(4) + ' ≤ umbral';
          target = holding;
        }
      }

      if (i > start) {
        const prevHold = signals[signals.length - 1].asset_isin;
        const s = SERIES[prevHold];
        const a = s[i - 1];
        const b = s[i];
        if (a != null && b != null && a !== 0) eq *= b / a;
        equity.push({ d: DATES[i], v: eq });
      } else {
        equity.push({ d: DATES[i], v: 1.0 });
      }

      signals.push({
        date: DATES[i],
        asset_isin: target,
        score: scoreAt(modelId, target, i),
        rotated,
        reason,
        r12: retAt(target, i, 12),
        r6: retAt(target, i, 6),
        r3: retAt(target, i, 3),
      });
    }

    return { equity, signals, metrics: computeMetrics(equity) };
  }

  function computeMetrics(equity) {
    if (!equity || equity.length < 2) return null;
    const vals = equity.map((e) => e.v);
    const n = vals.length;
    const total = vals[n - 1] / vals[0] - 1;
    const years = (n - 1) / 12;
    const cagr = years > 0 ? Math.pow(vals[n - 1] / vals[0], 1 / years) - 1 : null;
    const rets = [];
    for (let i = 1; i < n; i++) rets.push(vals[i] / vals[i - 1] - 1);
    const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
    const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / Math.max(1, rets.length - 1);
    const vol = Math.sqrt(variance) * Math.sqrt(12);
    const sharpe = vol > 0 ? (cagr ?? mean * 12) / vol : null;
    let peak = vals[0];
    let maxDd = 0;
    for (const v of vals) {
      if (v > peak) peak = v;
      const dd = v / peak - 1;
      if (dd < maxDd) maxDd = dd;
    }
    return { cagr, vol, sharpe, max_dd: maxDd, total_return: total, n_obs: n };
  }

  function correlationMatrix() {
    const isins = activeRiskIsins().concat([META.cashIsin]).filter((i) => SERIES[i]);
    const rets = {};
    for (const isin of isins) {
      const s = SERIES[isin];
      const r = [];
      for (let i = 1; i < s.length; i++) {
        if (s[i] != null && s[i - 1] != null && s[i - 1] !== 0) {
          r.push({ i, v: s[i] / s[i - 1] - 1 });
        }
      }
      rets[isin] = r;
    }
    function corr(a, b) {
      const mapB = new Map(b.map((x) => [x.i, x.v]));
      const xs = [], ys = [];
      for (const x of a) {
        if (mapB.has(x.i)) { xs.push(x.v); ys.push(mapB.get(x.i)); }
      }
      if (xs.length < 24) return null;
      const n = xs.length;
      const mx = xs.reduce((p, c) => p + c, 0) / n;
      const my = ys.reduce((p, c) => p + c, 0) / n;
      let num = 0, dx = 0, dy = 0;
      for (let i = 0; i < n; i++) {
        const ax = xs[i] - mx, ay = ys[i] - my;
        num += ax * ay; dx += ax * ax; dy += ay * ay;
      }
      if (dx === 0 || dy === 0) return null;
      return num / Math.sqrt(dx * dy);
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
    try { saved = JSON.parse(localStorage.getItem(STORAGE) || 'null'); } catch (e) { saved = null; }
    state.active = {};
    for (const isin of META.defaultIsins) {
      if (isin === META.cashIsin) state.active[isin] = true;
      else if (saved && typeof saved[isin] === 'boolean') state.active[isin] = saved[isin];
      else state.active[isin] = true;
    }
  }
  function saveSlots() { localStorage.setItem(STORAGE, JSON.stringify(state.active)); }
  function loadUi() {
    try {
      const u = JSON.parse(localStorage.getItem(STORAGE_UI) || 'null');
      if (u) {
        if (u.model && META.models[u.model]) state.model = u.model;
        if (u.filter === 'score' || u.filter === 'r12') state.filter = u.filter;
      }
    } catch (e) {}
  }
  function saveUi() {
    localStorage.setItem(STORAGE_UI, JSON.stringify({ model: state.model, filter: state.filter }));
  }

  window.__DM_PART1 = {
    state, META, loadNav, rankAt, runBacktest, correlationMatrix,
    retAt, scoreAt, lastValidIndex, activeRiskIsins,
    loadSlots, saveSlots, loadUi, saveUi,
    name, short, pct, pctClass, SERIES, DATES, NAV
  };
  // continued in app.p2.js
