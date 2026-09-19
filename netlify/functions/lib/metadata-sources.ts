/**
 * Metadatos fondos/ETFs — justETF + QueFondos. Nunca inventar TER/NAV.
 */
export interface FundMetadata {
  isin: string;
  name: string | null;
  ter: number | null;
  currency: string | null;
  distribution: 'accumulating' | 'distributing' | null;
  replication: string | null;
  last_nav: number | null;
  last_nav_date: string | null;
  is_etf: boolean | null;
  source: string;
  errors: string[];
  raw_notes: string | null;
}

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function parsePct(s: string): number | null {
  const m = s.replace(',', '.').match(/([\d.]+)/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) ? n : null;
}

function parseEuroNumber(s: string): number | null {
  const t = s.trim();
  if (/\d+\.\d{3},\d+/.test(t)) return parseFloat(t.replace(/\./g, '').replace(',', '.'));
  if (/\d+,\d+/.test(t) && !t.includes('.')) return parseFloat(t.replace(',', '.'));
  const n = parseFloat(t.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

export async function fetchJustEtf(isin: string): Promise<FundMetadata> {
  const base: FundMetadata = {
    isin, name: null, ter: null, currency: null, distribution: null, replication: null,
    last_nav: null, last_nav_date: null, is_etf: true, source: 'justetf', errors: [], raw_notes: null,
  };
  try {
    const url = `https://www.justetf.com/en/etf-profile.html?isin=${encodeURIComponent(isin)}`;
    const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en-US,en;q=0.9' }, redirect: 'follow' });
    if (!res.ok) { base.errors.push(`justETF HTTP ${res.status}`); return base; }
    const html = await res.text();
    if (html.includes('No ETF found') || html.length < 5000) {
      base.errors.push('justETF: ISIN no encontrado o página incompleta');
      base.is_etf = null;
      return base;
    }
    const nameM = html.match(/data-testid="etf-profile-header_etf-name"[^>]*>([^<]+)/i);
    if (nameM) base.name = nameM[1].trim();
    const terM = html.match(/data-testid="etf-profile-header_ter-value"[^>]*>([^<]+)/i)
      || html.match(/data-testid="tl_etf-basics_value_ter"[^>]*>([^<]+)/i);
    if (terM) base.ter = parsePct(terM[1]);
    const curM = html.match(/data-testid="tl_etf-basics_value_fund-currency"[^>]*>([^<]+)/i);
    if (curM) base.currency = curM[1].trim().toUpperCase();
    const distM = html.match(/data-testid="etf-profile-header_distribution-policy-value"[^>]*>([^<]+)/i)
      || html.match(/data-testid="tl_etf-basics_value_distribution-policy"[^>]*>([^<]+)/i);
    if (distM) {
      const d = distM[1].toLowerCase();
      if (d.includes('accum')) base.distribution = 'accumulating';
      else if (d.includes('distrib')) base.distribution = 'distributing';
    }
    const repM = html.match(/data-testid="etf-profile-header_replication-value"[^>]*>([^<]+)/i)
      || html.match(/data-testid="tl_etf-basics_value_replication"[^>]*>([^<]+)/i);
    if (repM) base.replication = repM[1].trim();
    base.raw_notes = `justETF OK · TER=${base.ter ?? 'N/D'} · ${base.currency ?? ''}`;
    return base;
  } catch (e) {
    base.errors.push(`justETF: ${e instanceof Error ? e.message : String(e)}`);
    return base;
  }
}

export async function fetchQueFondos(isin: string): Promise<FundMetadata> {
  const base: FundMetadata = {
    isin, name: null, ter: null, currency: null, distribution: null, replication: null,
    last_nav: null, last_nav_date: null, is_etf: null, source: 'quefondos', errors: [], raw_notes: null,
  };
  try {
    const url = `https://www.quefondos.com/es/fondos/ficha/?isin=${encodeURIComponent(isin)}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, 'Accept-Language': 'es-ES,es;q=0.9' },
      redirect: 'follow',
    });
    if (!res.ok) { base.errors.push(`QueFondos HTTP ${res.status}`); return base; }
    const html = await res.text();
    if (html.includes('No se encuentra disponible')) {
      base.errors.push('QueFondos: fondo no encontrado');
      return base;
    }
    const nameM = html.match(/<h1[^>]*>([^<]+)/i);
    if (nameM) base.name = nameM[1].replace(/\s*\([A-Z0-9]{12}\)\s*$/i, '').trim();
    const navM = html.match(/Valor liquidativo[^0-9]{0,40}([\d.,]+)/i);
    if (navM) base.last_nav = parseEuroNumber(navM[1]);
    const dateM = html.match(/Fecha:\s*(\d{2}\/\d{2}\/\d{4})/i);
    if (dateM) {
      const [dd, mm, yyyy] = dateM[1].split('/');
      base.last_nav_date = `${yyyy}-${mm}-${dd}`;
    }
    const fijaM = html.match(/Fija:\s*([\d.,]+)\s*%/i);
    if (fijaM) base.ter = parsePct(fijaM[1]);
    const eur = html.match(/Divisa:\s*([A-Z]{3})/i);
    if (eur) base.currency = eur[1];
    if (base.name?.toUpperCase().includes('ETF')) base.is_etf = true;
    base.raw_notes = `QueFondos OK · VL=${base.last_nav ?? 'N/D'}`;
    return base;
  } catch (e) {
    base.errors.push(`QueFondos: ${e instanceof Error ? e.message : String(e)}`);
    return base;
  }
}

export async function enrichFundMetadata(isin: string): Promise<{ merged: FundMetadata; sources: FundMetadata[] }> {
  const just = await fetchJustEtf(isin);
  const qf = await fetchQueFondos(isin);
  const sources = [just, qf];
  const merged: FundMetadata = {
    isin,
    name: just.name || qf.name,
    ter: just.ter ?? qf.ter,
    currency: just.currency || qf.currency,
    distribution: just.distribution,
    replication: just.replication,
    last_nav: qf.last_nav,
    last_nav_date: qf.last_nav_date,
    is_etf: just.errors.length === 0 ? true : qf.is_etf,
    source: [just.name ? 'justetf' : null, qf.name ? 'quefondos' : null].filter(Boolean).join('+') || 'none',
    errors: [...just.errors, ...qf.errors],
    raw_notes: [just.raw_notes, qf.raw_notes].filter(Boolean).join(' | '),
  };
  return { merged, sources };
}
