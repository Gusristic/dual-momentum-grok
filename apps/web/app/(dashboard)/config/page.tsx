'use client';

/** Config — universo default usuario. localStorage. */
import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'dm_config_v1';

type IsinRow = { isin: string; status: 'pending' | 'format_ok' | 'format_error'; note: string };
type ConfigState = {
  isinsText: string; cashIsin: string; w12: number; w6: number; w3: number;
  rotationThresholdPct: number; rows: IsinRow[];
};

const DEFAULT_ISINS = [
  'IE00BYX5MX67', 'IE00BYX5MD61', 'IE00BDRK7R97', 'IE00BYWYCC39',
  'IE00B42W3S00', 'LU1278917452', 'ES0165265002', 'FR0000989626',
  'IE00BYX5N771', 'IE0007472990', 'IE0007471927', 'LU1578889864',
];

const DEFAULTS: ConfigState = {
  isinsText: DEFAULT_ISINS.join('\n'),
  cashIsin: 'FR0000989626',
  w12: 0.5, w6: 0.3, w3: 0.2, rotationThresholdPct: 0.5, rows: [],
};

function isValidIsinFormat(isin: string): boolean {
  return /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin);
}
function parseIsins(text: string): string[] {
  return text.split(/[\s,;]+/).map((s) => s.trim().toUpperCase()).filter((s) => s.length > 0);
}

export default function ConfigPage() {
  const [cfg, setCfg] = useState<ConfigState>(DEFAULTS);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setCfg({ ...DEFAULTS, ...(JSON.parse(raw) as ConfigState) });
        setSavedAt('cargado de localStorage');
      }
    } catch { /* ignore */ }
  }, []);

  const validate = useCallback((text: string): IsinRow[] => {
    const seen = new Set<string>();
    const rows: IsinRow[] = [];
    for (const isin of parseIsins(text)) {
      if (seen.has(isin)) continue;
      seen.add(isin);
      if (isin.length !== 12 || !isValidIsinFormat(isin)) {
        rows.push({ isin, status: 'format_error', note: 'Formato inválido' });
      } else {
        rows.push({ isin, status: 'format_ok', note: 'Formato OK' });
      }
    }
    return rows;
  }, []);

  const onValidate = () => {
    const rows = validate(cfg.isinsText);
    setCfg((c) => ({ ...c, rows }));
    setMsg(`${rows.filter((r) => r.status === 'format_ok').length} OK · ${rows.filter((r) => r.status === 'format_error').length} error`);
  };

  const onSave = () => {
    const rows = validate(cfg.isinsText);
    const next = { ...cfg, rows };
    const sum = next.w12 + next.w6 + next.w3;
    if (Math.abs(sum - 1) > 1e-6) { setMsg(`Pesos deben sumar 1.0 (${sum.toFixed(4)})`); return; }
    const cash = next.cashIsin.trim().toUpperCase();
    if (cash && !isValidIsinFormat(cash)) { setMsg('Cash ISIN inválido'); return; }
    if (cash && !rows.some((r) => r.isin === cash && r.status === 'format_ok')) {
      setMsg('Cash debe estar en el universo'); return;
    }
    next.cashIsin = cash;
    setCfg(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSavedAt(new Date().toLocaleString());
    setMsg('Guardado');
  };

  const weightSum = cfg.w12 + cfg.w6 + cfg.w3;

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Universo por defecto: 12 fondos (MyInvestor). Cash: Groupama Trésorerie.
        </p>
      </div>
      <section className="rounded-lg border p-4 space-y-3">
        <h2 className="font-medium">Universo de ISINs</h2>
        <textarea className="w-full min-h-[160px] rounded-md border px-3 py-2 text-sm font-mono"
          value={cfg.isinsText}
          onChange={(e) => setCfg((c) => ({ ...c, isinsText: e.target.value }))} />
        <div className="flex gap-2">
          <button type="button" onClick={onValidate} className="rounded-md border px-3 py-1.5 text-sm">Validar</button>
          <button type="button" onClick={onSave} className="rounded-md bg-primary text-primary-foreground px-3 py-1.5 text-sm">Guardar</button>
        </div>
        {cfg.rows.length > 0 && (
          <ul className="text-sm font-mono space-y-1">
            {cfg.rows.map((r) => (
              <li key={r.isin}><span className={r.status === 'format_ok' ? 'text-green-700' : 'text-red-600'}>{r.status === 'format_ok' ? 'OK' : 'ERR'}</span> {r.isin}</li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-2">Cash (puerto seguro)</h2>
        <input type="text" className="w-full max-w-sm rounded-md border px-3 py-2 text-sm font-mono"
          value={cfg.cashIsin} onChange={(e) => setCfg((c) => ({ ...c, cashIsin: e.target.value }))} />
        <p className="text-xs text-muted-foreground mt-1">Default: FR0000989626 Groupama Trésorerie IC</p>
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-2">Modelo H</h2>
        <div className="grid grid-cols-4 gap-2 max-w-md">
          {([['w12', cfg.w12], ['w6', cfg.w6], ['w3', cfg.w3], ['rotationThresholdPct', cfg.rotationThresholdPct]] as const).map(([k, v]) => (
            <label key={k} className="text-sm">{k === 'rotationThresholdPct' ? 'Umbral%' : k}
              <input type="number" step={0.01} className="w-full mt-1 border rounded px-2 py-1"
                value={v} onChange={(e) => setCfg((c) => ({ ...c, [k]: parseFloat(e.target.value) || 0 }))} />
            </label>
          ))}
        </div>
        <p className="text-xs mt-2">Suma pesos: {weightSum.toFixed(4)}</p>
      </section>
      {(msg || savedAt) && <p className="text-sm text-muted-foreground">{msg} {savedAt}</p>}
      <p className="text-xs text-muted-foreground">Precios: estos fondos no tienen serie Yahoo fiable → NAV MyInvestor. docs/universe_default.md</p>
    </div>
  );
}
