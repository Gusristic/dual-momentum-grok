/**
 * POST /api/isin/validate — OpenFIGI v3
 * Si falla → NO_VERIFICADO. Nunca inventa metadata.
 * OPENFIGI_API_KEY opcional (sin key: 25 req/min).
 */
import type { Handler, HandlerEvent } from '@netlify/functions';

interface OpenFigiData {
  figi?: string; name?: string; ticker?: string; exchCode?: string;
  securityType?: string; marketSector?: string; securityType2?: string;
  securityDescription?: string;
}
interface OpenFigiResult { data?: OpenFigiData[]; error?: string; }
interface ValidationResult {
  isin: string; status: 'VERIFIED' | 'NO_VERIFICADO' | 'ERROR';
  name: string | null; figi: string | null; ticker: string | null;
  exch_code: string | null; security_type: string | null; market_sector: string | null;
  is_etf: boolean | null; is_ucits: boolean | null; cn_cmv_traspassable: boolean | null;
  currency: string | null; ter: number | null;
  verification_source: string | null; verification_notes: string | null;
  errors: string[]; sources_tried: string[];
}

const OPENFIGI_URL = 'https://api.openfigi.com/v3/mapping';

function isValidIsinFormat(isin: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
}
function inferIsEtf(d: OpenFigiData): boolean | null {
  const t = `${d.securityType ?? ''} ${d.securityType2 ?? ''} ${d.name ?? ''}`.toLowerCase();
  if (t.includes('etf') || t.includes('etc') || t.includes('etn')) return true;
  if (t.includes('mutual') || t.includes('open-end') || t.includes('fund')) return false;
  return null;
}

async function mapOpenFigi(isins: string[]): Promise<OpenFigiResult[]> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (process.env.OPENFIGI_API_KEY) headers['X-OPENFIGI-APIKEY'] = process.env.OPENFIGI_API_KEY;
  const batch = isins.slice(0, 10).map((isin) => ({ idType: 'ID_ISIN', idValue: isin }));
  const res = await fetch(OPENFIGI_URL, { method: 'POST', headers, body: JSON.stringify(batch) });
  if (res.status === 429) throw new Error('OpenFIGI rate limit (429). Reintenta o configura OPENFIGI_API_KEY.');
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenFIGI HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as OpenFigiResult[];
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const raw: string[] = Array.isArray(body.isins) ? body.isins : typeof body.isin === 'string' ? [body.isin] : [];
    if (raw.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere al menos un ISIN' }) };
    }
    const normalized = raw.map((s) => String(s).trim().toUpperCase()).filter((s) => s.length > 0);
    const results: ValidationResult[] = [];
    const toMap: string[] = [];
    for (const isin of normalized) {
      if (isin.length !== 12 || !isValidIsinFormat(isin)) {
        results.push({
          isin, status: 'ERROR', name: null, figi: null, ticker: null, exch_code: null,
          security_type: null, market_sector: null, is_etf: null, is_ucits: null,
          cn_cmv_traspassable: null, currency: null, ter: null, verification_source: null,
          verification_notes: 'Formato ISIN inválido (12 caracteres)', errors: ['Formato ISIN inválido'], sources_tried: [],
        });
      } else toMap.push(isin);
    }
    if (toMap.length === 0) {
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) };
    }
    let figiResults: OpenFigiResult[];
    try {
      figiResults = await mapOpenFigi(toMap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'OpenFIGI error';
      for (const isin of toMap) {
        results.push({
          isin, status: 'NO_VERIFICADO', name: null, figi: null, ticker: null, exch_code: null,
          security_type: null, market_sector: null, is_etf: null, is_ucits: null,
          cn_cmv_traspassable: null, currency: null, ter: null, verification_source: null,
          verification_notes: msg, errors: [msg], sources_tried: ['openfigi'],
        });
      }
      return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) };
    }
    for (let i = 0; i < toMap.length; i++) {
      const isin = toMap[i];
      const fr = figiResults[i];
      if (!fr || fr.error || !fr.data || fr.data.length === 0) {
        results.push({
          isin, status: 'NO_VERIFICADO', name: null, figi: null, ticker: null, exch_code: null,
          security_type: null, market_sector: null, is_etf: null, is_ucits: null,
          cn_cmv_traspassable: null, currency: null, ter: null, verification_source: null,
          verification_notes: fr?.error ?? 'OpenFIGI: ISIN no encontrado',
          errors: [fr?.error ?? 'ISIN no encontrado en OpenFIGI'], sources_tried: ['openfigi'],
        });
        continue;
      }
      const p = fr.data[0];
      const multi = fr.data.length > 1 ? ` · ${fr.data.length} mappings; se usa el primero` : '';
      results.push({
        isin, status: 'VERIFIED',
        name: p.name ?? p.securityDescription ?? null,
        figi: p.figi ?? null, ticker: p.ticker ?? null, exch_code: p.exchCode ?? null,
        security_type: p.securityType ?? p.securityType2 ?? null, market_sector: p.marketSector ?? null,
        is_etf: inferIsEtf(p), is_ucits: null, cn_cmv_traspassable: null, currency: null, ter: null,
        verification_source: 'openfigi',
        verification_notes: `OpenFIGI OK${multi}. UCITS/traspasabilidad/TER pendientes (Fase 1b).`,
        errors: [], sources_tried: ['openfigi'],
      });
    }
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno', detail: err instanceof Error ? err.message : 'unknown' }) };
  }
};

export { handler };
