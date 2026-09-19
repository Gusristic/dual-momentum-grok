/**
 * POST /api/prices/fetch — crea job + dispara Background Function
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  try {
    const body = JSON.parse(event.body || '{}');
    const isin = typeof body.isin === 'string' ? body.isin.trim().toUpperCase() : '';
    const tickerYahoo = typeof body.ticker_yahoo === 'string' ? body.ticker_yahoo.trim() : null;
    const tickerStooq = typeof body.ticker_stooq === 'string' ? body.ticker_stooq.trim() : null;
    const start = typeof body.start === 'string' ? body.start : null;
    const end = typeof body.end === 'string' ? body.end : null;
    const userId = typeof body.user_id === 'string' ? body.user_id : null;

    if (!isin || isin.length !== 12) {
      return { statusCode: 400, body: JSON.stringify({ error: 'ISIN inválido (12 caracteres)' }) };
    }
    if (!tickerYahoo && !tickerStooq) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Se requiere ticker_yahoo y/o ticker_stooq (vía /api/isin/validate).' }),
      };
    }

    const payload = { isin, ticker_yahoo: tickerYahoo, ticker_stooq: tickerStooq, start, end };
    let jobId: string | null = null;
    const supabase = getServiceClient();

    if (supabase) {
      const { data: job, error: jobErr } = await supabase
        .from('jobs')
        .insert({ user_id: userId, type: 'price_download', status: 'pending', payload })
        .select('id')
        .single();
      if (jobErr) {
        return { statusCode: 500, body: JSON.stringify({ error: 'No se pudo crear job', detail: jobErr.message }) };
      }
      jobId = job.id;
    }

    const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || process.env.NEXT_PUBLIC_SITE_URL || '';
    const bgBody = JSON.stringify({ ...payload, job_id: jobId });
    if (siteUrl) {
      const bgUrl = `${siteUrl.replace(/\/$/, '')}/.netlify/functions/prices-process-background`;
      fetch(bgUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: bgBody }).catch(() => {});
    }

    return {
      statusCode: 202,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'accepted',
        job_id: jobId,
        message: jobId
          ? 'Job creado. Polling: jobs por id hasta status=completed|failed'
          : 'Sin Supabase service role: invoca prices-process-background manualmente',
        isin,
        ticker_yahoo: tickerYahoo,
        ticker_stooq: tickerStooq,
        pipeline: ['yahoo', 'stooq'],
        rule: 'Si ambas fuentes fallan → N/D, nunca proxy silencioso',
        background_function: 'prices-process-background',
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
