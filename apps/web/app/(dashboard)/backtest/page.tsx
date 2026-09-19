'use client';

import Link from 'next/link';
import { LAST_BACKTEST, YAHOO_MAP } from '@/lib/local-data';

export default function BacktestPage() {
  const m = LAST_BACKTEST.metrics;
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Último run local ({LAST_BACKTEST.run_at.slice(0, 10)}). Sin Supabase.
        </p>
      </div>
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ['CAGR', `${(m.cagr * 100).toFixed(1)}%`],
          ['Vol', `${(m.vol * 100).toFixed(1)}%`],
          ['Sharpe', m.sharpe.toFixed(2)],
          ['Max DD', `${(m.max_dd * 100).toFixed(1)}%`],
          ['Meses', String(m.n_obs)],
          ['Ret. total', `${(m.total_return * 100).toFixed(0)}%`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="text-xl font-semibold font-mono">{v}</div>
          </div>
        ))}
      </section>
      <div className="rounded-md border border-amber-300/60 bg-amber-50 p-3 text-sm">
        <strong>Aviso:</strong> CAGR orientativo (oro + series cortas).
      </div>
      <pre className="rounded-lg border bg-muted/40 p-3 text-xs font-mono whitespace-pre-wrap">
{`cd packages/quant
pip install -r requirements.txt
python -m dual_momentum.cli universe`}
      </pre>
      <section className="rounded-lg border p-4">
        <h2 className="font-medium text-sm mb-2">Mapa Yahoo</h2>
        <ul className="text-xs font-mono space-y-0.5 max-h-40 overflow-y-auto">
          {Object.entries(YAHOO_MAP).map(([isin, y]) => (
            <li key={isin}>{isin} → {y}</li>
          ))}
        </ul>
      </section>
      <Link href="/signal" className="text-sm underline">← Señal</Link>
    </div>
  );
}
