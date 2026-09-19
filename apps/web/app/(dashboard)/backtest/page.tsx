export default function BacktestPage() {
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Backtest</h1>
      <p className="text-sm text-muted-foreground">
        Motor Modelo H vía CLI local. UI de resultados cuando actives Supabase/Netlify.
      </p>
      <pre className="rounded-lg border bg-muted/40 p-4 text-xs overflow-x-auto font-mono whitespace-pre-wrap">{
`cd packages/quant
pip install -r requirements.txt
python -m dual_momentum.cli backtest \\
  --isins IE00B4L5Y983,IE00BK5BQT80,IE00B4ND3602 \\
  --tickers IWDA.L,VWCE.DE,IGLN.L \\
  --cash-isin IE00B4ND3602 --cash-ticker IGLN.L \\
  --start 2016-01-01 --out-json /tmp/bt_h.json`
      }</pre>
      <p className="text-sm">Docs: <code className="text-xs">docs/cli_local.md</code></p>
    </div>
  );
}
