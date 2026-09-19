'use client';

/**
 * Vista Configuración — ISINs, cash, pesos Modelo H.
 * Persistencia localStorage. Supabase/Netlify más adelante.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dm_config_v1';

type IsinRow = {
  isin: string;
  status: 'pending' | 'format_ok' | 'format_error';
  note: string;
};

type ConfigState = {
  isinsText: string;
  cashIsin: string;
  w12: number;
  w6: number;
  w3: number;
  rotationThresholdPct: number;
  rows: IsinRow[];
};

const DEFAULTS: ConfigState = {
  isinsText: '',
  cashIsin: '',
  w12: 0.5,
  w6: 0.3,
  w3: 0.2,
  rotationThresholdPct: 0.5,
  rows: [],
};

function isValidIsinFormat(isin: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
}

function parseIsins(text: string): string[] {
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim().toUpperCase())
    .filter((s) => s.length > 0);
}

export default function ConfigPage() {
  const [cfg, setCfg] = useState<ConfigState>(DEFAULTS);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ConfigState;
        setCfg({ ...DEFAULTS, ...parsed });
        setSavedAt('cargado de localStorage');
      }
    } catch {
      /* ignore */
    }
  }, []);

  const validate = useCallback((text: string): IsinRow[] => {
    const list = parseIsins(text);
    const seen = new Set<string>();
    const rows: IsinRow[] = [];
    for (const isin of list) {
      if (seen.has(isin)) continue;
      seen.add(isin);
      if (isin.length !== 12 || !isValidIsinFormat(isin)) {
        rows.push({
          isin,
          status: 'format_error',
          note: 'Formato inválido (12 chars)',
        });
      } else {
        rows.push({
          isin,
          status: 'format_ok',
          note: 'Formato OK · OpenFIGI al conectar API',
        });
      }
    }
    return rows;
  }, []);

  const onValidate = () => {
    const rows = validate(cfg.isinsText);
    setCfg((c) => ({ ...c, rows }));
    setMsg(
      rows.length === 0
        ? 'No hay ISINs'
        : `${rows.filter((r) => r.status === 'format_ok').length} OK · ${rows.filter((r) => r.status === 'format_error').length} error`
    );
  };

  const onSave = () => {
    const rows = validate(cfg.isinsText);
    const next = { ...cfg, rows };
    const sum = next.w12 + next.w6 + next.w3;
    if (Math.abs(sum - 1) > 1e-6) {
      setMsg(`Pesos deben sumar 1.0 (ahora ${sum.toFixed(4)})`);
      return;
    }
    if (next.cashIsin && !isValidIsinFormat(next.cashIsin.toUpperCase())) {
      setMsg('Cash ISIN: formato inválido');
      return;
    }
    const cash = next.cashIsin.trim().toUpperCase();
    if (cash && !rows.some((r) => r.isin === cash && r.status === 'format_ok')) {
      setMsg('Cash debe estar en el universo (formato OK)');
      return;
    }
    next.cashIsin = cash;
    setCfg(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedAt(new Date().toLocaleString());
    setMsg('Guardado en localStorage');
  };

  const weightSum = cfg.w12 + cfg.w6 + cfg.w3;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Introduce <strong>tus ISINs</strong>. Persistencia local. Supabase más adelante.
        </p>
      </div>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Universo de ISINs</h2>
        <textarea
          className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm font-mono"
          placeholder={'IE00B4L5Y983\nIE00BDBRDM35\nIE00B4ND3602'}
          value={cfg.isinsText}
          onChange={(e) => setCfg((c) => ({ ...c, isinsText: e.target.value }))}
        />
        <div className="flex gap-2 flex-wrap">
          <button type="button" onClick={onValidate} className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
            Validar formato
          </button>
          <button type="button" onClick={onSave} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">
            Guardar
          </button>
        </div>
        {cfg.rows.length > 0 && (
          <ul className="text-sm space-y-1 mt-2 font-mono">
            {cfg.rows.map((r) => (
              <li key={r.isin} className="flex gap-2">
                <span className={r.status === 'format_ok' ? 'text-green-700' : 'text-red-600'}>
                  {r.status === 'format_ok' ? 'OK' : 'ERR'}
                </span>
                <span>{r.isin}</span>
                <span className="text-muted-foreground font-sans text-xs">{r.note}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border p-4 space-y-2">
        <h2 className="font-medium">Cash (puerto seguro)</h2>
        <input
          type="text"
          className="w-full max-w-sm rounded-md border px-3 py-2 text-sm font-mono"
          placeholder="ISIN cash"
          value={cfg.cashIsin}
          onChange={(e) => setCfg((c) => ({ ...c, cashIsin: e.target.value }))}
        />
      </section>

      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Modelo H — parámetros</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg">
          {([['w12', cfg.w12], ['w6', cfg.w6], ['w3', cfg.w3], ['rotationThresholdPct', cfg.rotationThresholdPct]] as const).map(
            ([key, val]) => (
              <label key={key} className="text-sm">
                {key === 'rotationThresholdPct' ? 'Umbral %' : key}
                <input
                  type="number"
                  step={key === 'rotationThresholdPct' ? 0.1 : 0.01}
                  className="w-full mt-1 rounded border px-2 py-1"
                  value={val}
                  onChange={(e) => setCfg((c) => ({ ...c, [key]: parseFloat(e.target.value) || 0 }))}
                />
              </label>
            )
          )}
        </div>
        <p className={`text-xs ${Math.abs(weightSum - 1) < 1e-6 ? 'text-muted-foreground' : 'text-red-600'}`}>
          Suma pesos: {weightSum.toFixed(4)} {Math.abs(weightSum - 1) < 1e-6 ? '✓' : '(debe ser 1.0)'} · Top-1 · mensual
        </p>
      </section>

      {(msg || savedAt) && (
        <p className="text-sm text-muted-foreground">{msg}{savedAt ? ` · ${savedAt}` : ''}</p>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm">
        <strong>Backtest:</strong> CLI Python (docs/cli_local.md). Supabase/Netlify después.
        <br />
        <strong>Disclaimer:</strong> uso educativo. No es asesoramiento financiero ni fiscal.
      </div>
    </div>
  );
}
