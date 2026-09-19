/**
 * POST metadata-enrich — justETF + QueFondos. Máx 5 ISINs/request.
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { enrichFundMetadata } from './lib/metadata-sources';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const raw: string[] = Array.isArray(body.isins)
      ? body.isins
      : typeof body.isin === 'string'
        ? [body.isin]
        : [];
    if (raw.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere isin o isins' }) };
    }
    const isins = raw.map((s) => String(s).trim().toUpperCase()).filter((s) => s.length === 12);
    const results = [];
    for (const isin of isins.slice(0, 5)) {
      const { merged, sources } = await enrichFundMetadata(isin);
      results.push({ merged, sources_detail: sources });
    }
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Error interno',
        detail: err instanceof Error ? err.message : 'unknown',
      }),
    };
  }
};

export { handler };
