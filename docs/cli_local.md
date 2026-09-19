# CLI local (sin Supabase / Netlify)

Backtest y señal del **Modelo H** con precios Yahoo reales.

## Setup

```bash
cd packages/quant
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Backtest

Mapea **tú** cada ISIN a un ticker Yahoo. No se inventa el ticker.

```bash
python -m dual_momentum.cli backtest \
  --isins IE00B4L5Y983,IE00BK5BQT80,IE00B4ND3602 \
  --tickers IWDA.L,VWCE.DE,IGLN.L \
  --cash-isin IE00B4ND3602 \
  --cash-ticker IGLN.L \
  --start 2016-01-01 \
  --w12 0.5 --w6 0.3 --w3 0.2 \
  --threshold 0.5 \
  --out-json /tmp/bt_h.json
```

Salida: métricas, últimas señales, **señal actual**.

## UI

`/config` guarda ISINs y pesos en localStorage.
