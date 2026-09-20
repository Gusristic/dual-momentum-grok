(function () {
  const META = window.DM_META;
  const STORAGE = 'dm_v2_slots';
  const STORAGE_UI = 'dm_v2_ui';
  let NAV = {}, DATES = [], SERIES = {};
  const state = { model: 'equilibrado', filter: 'score', active: {} };

  const pct = (x) => (x == null || Number.isNaN(x) ? '—' : (x * 100).toFixed(1) + '%');
  const pctClass = (x) => (x == null || Number.isNaN(x) ? '' : x >= 0 ? 'pos' : 'neg');
  const name = (isin) => META.names[isin] || isin;
  const short = (isin) => META.short[isin] || META.names[isin] || isin;

  async function loadNav() {
    const manRes = await fetch('nav/manifest.json', { cache: 'no-store' });
    if (!manRes.ok) throw new Error('No se pudo cargar nav/manifest.json');
    const isins = await manRes.json();
    NAV = {};
    await Promise.all(isins.map(async (isin) => {
      const r = await fetch('nav/' + isin + '.json', { cache: 'no-store' });
      if (!r.ok) throw new Error('Falta serie NAV: ' + isin);
      NAV[isin] = await r.json();
    }));
    const monthMaps = {}, monthSet = new Set();
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
      SERIES[isin] = DATES.map((ym) => (monthMaps[isin][ym] != null ? monthMaps[isin][ym] : null));
    }
  }

  function retAt(isin, i, w) {
    const s = SERIES[isin];
    if (!s || i < w) return null;
    const a = s[i - w], b = s[i];
    if (a == null || b == null || a === 0) return null;
    return b / a - 1;
  }
  function ret12_1(isin, i) {
    const s = SERIES[isin];
    if (!s || i < 12) return null;
    const a = s[i - 12], b = s[i - 1];
    if (a == null || b == null || a === 0) return null;
    return b / a - 1;
  }
  function scoreAt(modelId, isin, i) {
    const m = META.models[modelId];
    if (m.kind === 'r12') return retAt(isin, i, 12);
    if (m.kind === 'r12_1') return ret12_1(isin, i);
    const r12 = retAt(isin, i, 12), r6 = retAt(isin, i, 6), r3 = retAt(isin, i, 3);
    if (r12 == null || r6 == null || r3 == null) return null;
    return m.w12 * r12 + m.w6 * r6 + m.w3 * r3;
  }
  function eligible(modelId, filterMode, isin, cashIsin, i) {
    if (filterMode === 'r12') {
      const ra = retAt(isin, i, 12), rc = retAt(cashIsin, i, 12);
      return ra != null && rc != null && ra > rc;
    }
    const sa = scoreAt(modelId, isin, i), sc = scoreAt(modelId, cashIsin, i);
    return sa != null && sc != null && sa > sc;
  }
  function activeRiskIsins() {
    return META.defaultIsins.filter((i) => i !== META.cashIsin && state.active[i] !== false && SERIES[i]);
  }
  function lastValidIndex() {
    const cash = SERIES[META.cashIsin];
    for (let i = cash.length - 1; i >= 0; i--) if (cash[i] != null) return i;
    return -1;
  }

  function rankAt(modelId, filterMode, i) {
    const cash = META.cashIsin;
    const rows = [];
    for (const isin of activeRiskIsins()) {
      rows.push({
        isin,
        score: scoreAt(modelId, isin, i),
        r12: retAt(isin, i, 12),
        r6: retAt(isin, i, 6),
        r3: retAt(isin, i, 3),
        eligible: eligible(modelId, filterMode, isin, cash, i),
      });
    }
    const elig = rows.filter((r) => r.eligible && r.score != null);
    const rest = rows.filter((r) => !r.eligible || r.score == null);
    elig.sort((a, b) => b.score - a.score);
    rest.sort((a, b) => (b.score ?? -999) - (a.score ?? -999));
    const ordered = elig.concat(rest);
    ordered.forEach((r, idx) => { r.rank = idx + 1; });
    let pick = cash, reason = 'ningún activo pasó filtro → cash';
    let pickScore = scoreAt(modelId, cash, i), rotatedMeta = null;
    if (elig.length) {
      pick = elig[0].isin;
      pickScore = elig[0].score;
      reason = 'top-1 por score entre elegibles';
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
