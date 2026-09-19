/**
 * Netlify Background Function (hasta 15 min).
 * Yahoo → Stooq → upsert prices. Si 0 barras → failed + error explícito.
 */
import type { Handler, HandlerEvent } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { fetchPricesPipeline } from './lib/price-sources';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

const handler: Handler = async (event: HandlerEvent) => {
  let payload: {
    isin?: string; ticker_yahoo?: string; ticker_stooq?: string;
    start?: string; end?: string; job_id?: string;
  } = {};
  try { payload = JSON.parse(event.body || '{}'); } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'JSON inválido' }) };
  }
  const isin = typeof payload.isin === 'string' ? payload.isin.trim().toUpperCase() : '';
  if (!isin || isin.length !== 12) {
    return { statusCode: 400, body: JSON.stringify({ error: 'ISIN inválido' }) };
  }
  const tickerYahoo = typeof payload.ticker_yahoo === 'string' ? payload.ticker_yahoo.trim() : null;
  const tickerStooq = typeof payload.ticker_stooq === 'string' ? payload.ticker_stooq.trim() : null;
  if (!tickerYahoo && !tickerStooq) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Se requiere ticker_yahoo y/o ticker_stooq' }) };
  }
  const jobId = typeof payload.job_id === 'string' ? payload.job_id : null;
  let supabase;
  try { supabase = getServiceClient(); } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e instanceof Error ? e.message : 'Supabase no configurado' }) };
  }
  if (jobId) {
    await supabase.from('jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId);
  }
  try {
    const { data: inst, error: instErr } = await supabase.from('instruments').select('isin').eq('isin', isin).maybeSingle();
    if (instErr) throw new Error(`instruments select: ${instErr.message}`);
    if (!inst) {
      const { error: insErr } = await supabase.from('instruments').insert({
        isin, name: null, verified: false,
        verification_notes: 'Insertado por prices-process-background; pendiente OpenFIGI',
      });
      if (insErr) throw new Error(`instruments insert: ${insErr.message}`);
    }
    const result = await fetchPricesPipeline({
      ticker_yahoo: tickerYahoo, ticker_stooq: tickerStooq,
      start: payload.start ?? null, end: payload.end ?? null,
    });
    if (result.bars.length === 0) {
      const errMsg = result.errors.join(' | ') || 'Sin barras de precio';
      if (jobId) {
        await supabase.from('jobs').update({
          status: 'failed', error: errMsg, completed_at: new Date().toISOString(),
          result: { n_obs: 0, errors: result.errors },
        }).eq('id', jobId);
      }
      return {
        statusCode: 422,
        body: JSON.stringify({ status: 'failed', isin, n_obs: 0, errors: result.errors, rule: 'N/D — no se inventan precios' }),
      };
    }
    const chunkSize = 500;
    let upserted = 0;
    for (let i = 0; i < result.bars.length; i += chunkSize) {
      const chunk = result.bars.slice(i, i + chunkSize).map((b) => ({
        isin, date: b.date, close: b.close, nav: null, dividend: b.dividend ?? null,
        source: b.source, ingested_at: new Date().toISOString(),
      }));
      const { error: upErr } = await supabase.from('prices').upsert(chunk, { onConflict: 'isin,date,source', ignoreDuplicates: false });
      if (upErr) throw new Error(`prices upsert: ${upErr.message}`);
      upserted += chunk.length;
    }
    const summary = {
      status: 'completed', isin, source_used: result.source_used,
      n_obs: result.bars.length, upserted,
      from: result.bars[0]?.date, to: result.bars[result.bars.length - 1]?.date,
      errors: result.errors,
    };
    if (jobId) {
      await supabase.from('jobs').update({
        status: 'completed', result: summary, completed_at: new Date().toISOString(), error: null,
      }).eq('id', jobId);
    }
    return { statusCode: 200, body: JSON.stringify(summary) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (jobId) {
      await supabase.from('jobs').update({
        status: 'failed', error: msg, completed_at: new Date().toISOString(),
      }).eq('id', jobId);
    }
    return { statusCode: 500, body: JSON.stringify({ status: 'failed', error: msg }) };
  }
};

export { handler };
