export default function SignalPage() {
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Señal hoy</h1>
      <p className="text-sm text-muted-foreground">
        Sale al final de <code className="text-xs">python -m dual_momentum.cli backtest</code> (bloque SEÑAL ACTUAL).
      </p>
      <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
        <li>Filtro: 12/6/3 &gt; cash</li>
        <li>Ranking: 0.5·R12 + 0.3·R6 + 0.2·R3</li>
        <li>Top-1 o 100% cash · umbral rotación 0.5%</li>
      </ul>
    </div>
  );
}
