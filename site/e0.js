(function () {
  const META = window.DM_META;
  const STORAGE = 'dm_v2_slots';
  const STORAGE_UI = 'dm_v2_ui';
  let NAV = {}, DATES = [], SERIES = {}, BENCH = null;
  const state = { model: 'equilibrado', filter: 'score', topK: 1, active: {} };

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
    try {
      const br = await fetch('nav/IWDA.json', { cache: 'no-store' });
      if (br.ok) {
        const arr = await br.json();
        const bm = {};
        for (const p of arr) bm[p.d.slice(0, 7)] = p.c;
        BENCH = DATES.map((ym) => (bm[ym] != null ? bm[ym] : null));
      }
    } catch (e) { BENCH = null; }
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
    if (!cash || !cash.length) return -1;
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
    const picks = [];
    if (elig.length) {
      const k = Math.min(state.topK || 1, elig.length);
      for (let t = 0; t < k; t++) {
        picks.push({ isin: elig[t].isin, score: elig[t].score, w: 1 / k });
      }
      pick = picks[0].isin;
      pickScore = picks[0].score;
      if (k === 1) {
        reason = 'top-1 por score entre elegibles';
        if (elig.length > 1) rotatedMeta = { delta: elig[0].score - elig[1].score, second: elig[1].isin };
      } else {
        reason = 'top-' + k + ' equal weight (' + picks.map((p) => short(p.isin)).join(' + ') + ')';
        if (elig.length > k) rotatedMeta = { delta: elig[k - 1].score - elig[k].score, second: elig[k].isin };
      }
    } else {
      picks.push({ isin: cash, score: pickScore, w: 1 });
    }
    return {
