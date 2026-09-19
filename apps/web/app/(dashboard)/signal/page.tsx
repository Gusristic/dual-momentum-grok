'use client';

import Link from 'next/link';
import { FUND_NAMES, LAST_BACKTEST } from '@/lib/local-data';

export default function SignalPage() {
  const s = LAST_BACKTEST.signal;
  const fullName = FUND_NAMES[s.asset_isin] ?? s.name;

  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Señal hoy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modelo H · local · sin Netlify/Supabase
        </p>
      </div>

      <section className="rounded-xl border p-5 space-y-3 bg-muted/20">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Rebalance {s.date}
        </div>
        <div className="text-3xl font-semibold tracking-tight">{fullName}</div>
        <div className="font-mono text-sm text-muted-foreground">{s.asset_isin}</div>
        <div className="flex flex-wrap gap-3 text-sm pt-1">
          <span className="rounded-full border px-3 py-1">100% top-1</span>
          <span className="rounded-full border px-3 py-1 font-mono">
            M_comp {s.m_composite.toFixed(3)}
          </span>
          <span className="rounded-full border px-3 py-1">Abs ✓ 12/6/3</span>
        </div>
        <p className="text-sm text-muted-foreground pt-2">{s.reason}</p>
      </section>

      <section className="grid grid-cols-3 gap-3">
        {([['R12', s.r12], ['R6', s.r6], ['R3', s.r3]] as const).map(([label, v]) => (
          <div key={label} className="rounded-lg border p-3 text-center">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="text-lg font-mono font-medium">{(v * 100).toFixed(1)}%</div>
          </div>
        ))}
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-medium text-sm">Últimas rotaciones</h2>
        <ul className="text-sm font-mono space-y-1">
          {LAST_BACKTEST.recent_signals.map((r) => (
            <li key={r.date} className="flex gap-2 flex-wrap">
              <span className="text-muted-foreground w-24">{r.date}</span>
              <span>{r.rotated ? '↻' : '·'} {r.name}</span>
              <span className="text-muted-foreground">M={r.m.toFixed(3)}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-muted-foreground">
        Recalcular: <code>python -m dual_momentum.cli universe</code>
        {' · '}
        <Link href="/backtest" className="underline">Métricas</Link>
        {' · '}
        <Link href="/config" className="underline">Config</Link>
      </p>
      <p className="text-xs text-muted-foreground">Uso educativo. No es asesoramiento.</p>
    </div>
  );
}
