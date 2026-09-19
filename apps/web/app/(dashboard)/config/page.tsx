/**
 * Vista 1 — Configuración
 * El usuario introduce sus propios ISINs.
 * Máxima fiabilidad: cada ISIN se valida; si no se verifica → NO VERIFICADO.
 */

export default function ConfigPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground mt-1">
          Introduce tus ISINs. El sistema los valida contra fuentes oficiales.
          Si no se pueden verificar, se marcan como <strong>NO VERIFICADO</strong>.
        </p>
      </div>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Universo de ISINs</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Pega uno o varios ISINs (uno por línea o separados por coma).
          Tú controlas qué instrumentos entran en el modelo.
        </p>
        <textarea
          className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm font-mono"
          placeholder={"IE00B4L5Y983\nIE00BDBRDM35\nIE00B4ND3602"}
          disabled
        />
        <p className="text-xs text-muted-foreground mt-2">
          La validación en tiempo real (OpenFIGI + CNMV + Morningstar/QueFondos)
          se implementa en Fase 1. Por ahora es esqueleto.
        </p>
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Cash (puerto seguro)</h2>
        <p className="text-sm text-muted-foreground mb-2">
          ISIN del instrumento que actúa como cash. No compite en el ranking.
          Se usa como benchmark del filtro absoluto. Si no tiene datos suficientes,
          el backtest falla con error explícito (no se inventa proxy).
        </p>
        <input
          type="text"
          className="w-full max-w-xs rounded-md border bg-background px-3 py-2 text-sm font-mono"
          placeholder="ISIN de cash (ej. monetario UCITS EUR)"
          disabled
        />
      </section>

      <section className="rounded-lg border p-4">
        <h2 className="font-medium mb-3">Modelo H — parámetros</h2>
        <div className="grid grid-cols-3 gap-4 max-w-md">
          <label className="text-sm">
            w12
            <input type="number" step="0.01" defaultValue={0.5} className="w-full mt-1 rounded border px-2 py-1" disabled />
          </label>
          <label className="text-sm">
            w6
            <input type="number" step="0.01" defaultValue={0.3} className="w-full mt-1 rounded border px-2 py-1" disabled />
          </label>
          <label className="text-sm">
            w3
            <input type="number" step="0.01" defaultValue={0.2} className="w-full mt-1 rounded border px-2 py-1" disabled />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          Defaults confirmados: 0.5 / 0.3 / 0.2 · Filtro estricto · Top-1 · Umbral 0.5% · Rebalanceo mensual.
          Editables en UI cuando se active la lógica.
        </p>
      </section>

      <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-sm">
        <strong>Disclaimer:</strong> Uso educativo. No constituye asesoramiento
        financiero ni fiscal. Los cálculos son orientativos.
      </div>
    </div>
  );
}
