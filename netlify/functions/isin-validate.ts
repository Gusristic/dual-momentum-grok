/**
 * Netlify Function: POST /api/isin/validate
 * Valida ISINs. Si falla fuente → NO_VERIFICADO, nunca inventa metadata.
 * Fase 1: OpenFIGI + CNMV + Morningstar/QueFondos.
 */
import type { Handler, HandlerEvent } from '@netlify/functions';

interface ValidationResult {
  isin: string;
  status: 'VERIFIED' | 'NO_VERIFICADO' | 'ERROR';
  name: string | null;
  figi: string | null;
  is_etf: boolean | null;
  is_ucits: boolean | null;
  cn_cmv_traspassable: boolean | null;
  currency: string | null;
  ter: number | null;
  verification_source: string | null;
  verification_notes: string | null;
  errors: string[];
  sources_tried: string[];
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const isins: string[] = Array.isArray(body.isins)
      ? body.isins
      : typeof body.isin === 'string'
        ? [body.isin]
        : [];
    if (isins.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere al menos un ISIN' }) };
    }
    const normalized = isins.map((s) => String(s).trim().toUpperCase()).filter((s) => s.length === 12);
    if (normalized.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Ningún ISIN válido (12 caracteres)' }) };
    }
    const results: ValidationResult[] = normalized.map((isin) => ({
      isin,
      status: 'NO_VERIFICADO',
      name: null,
      figi: null,
      is_etf: null,
      is_ucits: null,
      cn_cmv_traspassable: null,
      currency: null,
      ter: null,
      verification_source: null,
      verification_notes: 'Validación real pendiente de Fase 1. No se inventa metadata.',
      errors: ['Validación externa aún no implementada'],
      sources_tried: [],
    }));
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ results }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error interno', detail: err instanceof Error ? err.message : 'unknown' }) };
  }
};

export { handler };
