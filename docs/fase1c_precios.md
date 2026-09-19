# Fase 1c — Descarga de precios + escritura en Supabase

## Flujo

```
Cliente / UI
    │
    ▼
POST /api/prices/fetch          (sync, < 10s)
    │  valida ISIN + tickers
    │  inserta jobs (pending)
    │  dispara Background Function
    ▼
prices-process-background       (hasta 15 min)
    │  Yahoo chart API → si falla Stooq CSV
    │  upsert public.prices (source obligatorio)
    │  jobs.status = completed | failed
    ▼
Cliente hace polling de jobs por job_id
```

## Endpoints

### `POST /.netlify/functions/prices-fetch`

```json
{
  "isin": "IE00B4L5Y983",
  "ticker_yahoo": "IWDA.L",
  "ticker_stooq": "iwda.uk",
  "start": "2015-01-01",
  "end": null,
  "user_id": null
}
```

Respuesta `202`:

```json
{
  "status": "accepted",
  "job_id": "uuid...",
  "pipeline": ["yahoo", "stooq"],
  "rule": "Si ambas fuentes fallan → N/D, nunca proxy silencioso"
}
```

### Background: `prices-process-background`

- Descarga barras diarias
- Upsert en `prices` con `onConflict: isin,date,source`
- Si 0 barras → `jobs.status = failed` + `errors[]` explícitos

## Env requeridas (server)

```
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
URL=   # o DEPLOY_PRIME_URL (Netlify lo inyecta en deploy)
```

## Tickers

OpenFIGI devuelve `ticker` + `exch_code`. El usuario/UI debe pasar el ticker concreto.
No se inventa el sufijo de exchange.

## Regla de rigor

- Cada fila de `prices` lleva `source` = `yahoo` | `stooq`
- Sin datos → no se inserta ninguna fila inventada
- Instrumento inexistente → stub `verified=false` para respetar FK
