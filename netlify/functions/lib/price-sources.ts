/**
 * Fuentes de precios (Node): Yahoo → Stooq. Nunca proxy silencioso.
 */
export interface PriceBar {
  date: string;
  close: number;
  dividend?: number | null;
  source: 'yahoo' | 'stooq';
}
export interface FetchPricesResult {
  bars: PriceBar[];
  source_used: 'yahoo' | 'stooq' | null;
  errors: string[];
}

export async function fetchYahoo(ticker: string, start?: string, end?: string): Promise<FetchPricesResult> {
  try {
    const period1 = start ? Math.floor(new Date(start).getTime() / 1000) : Math.floor(new Date('2000-01-01').getTime() / 1000);
    const period2 = end ? Math.floor(new Date(end).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const url =
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}` +
      `?period1=${period1}&period2=${period2}&interval=1d&events=div`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'dual-momentum-grok/1.0 (educational)', Accept: 'application/json' },
    });
    if (!res.ok) return { bars: [], source_used: null, errors: [`Yahoo HTTP ${res.status} ticker=${ticker}`] };
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: { quote?: Array<{ close?: (number | null)[] }>; adjclose?: Array<{ adjclose?: (number | null)[] }> };
        }>;
        error?: { description?: string };
      };
    };
    if (json.chart?.error) {
      return { bars: [], source_used: null, errors: [`Yahoo: ${json.chart.error.description ?? 'error'}`] };
    }
    const result = json.chart?.result?.[0];
    const ts = result?.timestamp;
    const closes = result?.indicators?.adjclose?.[0]?.adjclose ?? result?.indicators?.quote?.[0]?.close;
    if (!ts || !closes || ts.length === 0) {
      return { bars: [], source_used: null, errors: [`Yahoo: sin datos ticker=${ticker}`] };
    }
    const bars: PriceBar[] = [];
    for (let i = 0; i < ts.length; i++) {
      const c = closes[i];
      if (c == null || Number.isNaN(c)) continue;
      bars.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), close: Number(c), dividend: null, source: 'yahoo' });
    }
    if (bars.length === 0) return { bars: [], source_used: null, errors: [`Yahoo: 0 barras ticker=${ticker}`] };
    return { bars, source_used: 'yahoo', errors: [] };
  } catch (e) {
    return { bars: [], source_used: null, errors: [`Yahoo: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

export async function fetchStooq(ticker: string, start?: string, end?: string): Promise<FetchPricesResult> {
  try {
    const symbol = ticker.toLowerCase();
    const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&i=d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'dual-momentum-grok/1.0 (educational)' } });
    if (!res.ok) return { bars: [], source_used: null, errors: [`Stooq HTTP ${res.status} symbol=${symbol}`] };
    const text = await res.text();
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { bars: [], source_used: null, errors: [`Stooq: sin filas symbol=${symbol}`] };
    const header = lines[0].split(',');
    const dateIdx = header.findIndex((h) => h.toLowerCase() === 'date');
    const closeIdx = header.findIndex((h) => h.toLowerCase() === 'close');
    if (dateIdx < 0 || closeIdx < 0) {
      return { bars: [], source_used: null, errors: [`Stooq: esquema inesperado: ${header.join(',')}`] };
    }
    const bars: PriceBar[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const d = cols[dateIdx]?.trim();
      const c = parseFloat(cols[closeIdx]);
      if (!d || Number.isNaN(c)) continue;
      if (start && d < start) continue;
      if (end && d > end) continue;
      bars.push({ date: d, close: c, dividend: null, source: 'stooq' });
    }
    if (bars.length === 0) return { bars: [], source_used: null, errors: [`Stooq: 0 barras symbol=${symbol}`] };
    return { bars, source_used: 'stooq', errors: [] };
  } catch (e) {
    return { bars: [], source_used: null, errors: [`Stooq: ${e instanceof Error ? e.message : String(e)}`] };
  }
}

export async function fetchPricesPipeline(opts: {
  ticker_yahoo?: string | null;
  ticker_stooq?: string | null;
  start?: string | null;
  end?: string | null;
}): Promise<FetchPricesResult> {
  const start = opts.start ?? undefined;
  const end = opts.end ?? undefined;
  const errors: string[] = [];
  if (opts.ticker_yahoo) {
    const y = await fetchYahoo(opts.ticker_yahoo, start, end);
    if (y.bars.length > 0) return y;
    errors.push(...y.errors);
  } else {
    errors.push('Yahoo: sin ticker_yahoo');
  }
  const stooqTicker = opts.ticker_stooq || opts.ticker_yahoo;
  if (stooqTicker) {
    const s = await fetchStooq(stooqTicker, start, end);
    if (s.bars.length > 0) return { bars: s.bars, source_used: 'stooq', errors: [...errors, ...s.errors] };
    errors.push(...s.errors);
  } else {
    errors.push('Stooq: sin ticker');
  }
  return { bars: [], source_used: null, errors };
}
