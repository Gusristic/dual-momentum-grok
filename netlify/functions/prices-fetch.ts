/**
 * Netlify Function: POST /api/prices/fetch
 * Body: { isin, ticker_yahoo?, ticker_stooq?, start?, end? }
 * Si faltan tickers → 400. Pipeline Yahoo→Stooq en quant data_service.
 */
import type { Handler, HandlerEvent } from '@netlify/functions';

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const isin = typeof body.isin === 'string' ? body.isin.trim().toUpperCase() : '';
    const tickerYahoo = typeof body.ticker_yahoo === 'string' ? body.ticker_yahoo.trim() : null;
    const tickerStooq = typeof body.ticker_stooq === 'string' ? body.ticker_stooq.trim() : null;
    if (!isin || isin.length !== 12) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ISIN inválido (12 caracteres)' }) };
    }
    if (!tickerYahoo && !tickerStooq) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: 'Se requiere ticker_yahoo y/o ticker_stooq (vía /api/isin/validate OpenFIGI).',
        }),
      };
    }
    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'accepted',
        message: 'Usar packages/quant data_service.fetch_prices. Background Function en Fase 1c.',
        isin,
        ticker_yahoo: tickerYahoo,
        ticker_stooq: tickerStooq,
        pipeline: ['yahoo', 'stooq'],
        rule: 'Si ambas fallan → N/D, nunca proxy silencioso',
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error interno', detail: err instanceof Error ? err.message : 'unknown' }),
    };
  }
};

export { handler };
