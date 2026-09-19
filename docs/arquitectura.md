# Arquitectura Netlify + Supabase

## Topología

```
Cliente (Next.js 14 · Netlify CDN)
        │
        ├── Netlify Functions (sync < 26s)
        │     /api/isin/validate
        │     /api/signal/today
        │     /api/correlations
        │     /api/tax/report
        │
        ├── Netlify Background Functions (hasta 15 min)
        │     backtest-process-background
        │
        └── Supabase
              · Postgres + RLS
              · Auth (email + OAuth)
              · Storage (informes PDF/CSV)
              · Edge Functions (Deno) — validación cercana a BD
```

## Reglas de arquitectura

1. El cliente **nunca** llama APIs externas de pago directamente.
2. Escrituras sensibles siempre con RLS (`auth.uid() = user_id`).
3. Cálculo pesado nunca en Edge/SSR → Background Functions o cola `jobs`.
4. `SUPABASE_SERVICE_ROLE_KEY` y API keys **nunca** se exponen al cliente.
5. Si una fuente de datos falla → error explícito / `N/D`, nunca proxy silencioso.

## Flujo de ISINs (máxima fiabilidad)

1. Usuario pega ISINs en la UI.
2. `POST /api/isin/validate` → OpenFIGI → CNMV → Morningstar/QueFondos.
3. Resultado: `VERIFIED` | `NO_VERIFICADO` + detalle exacto.
4. Upsert en `instruments` con `verified` y `verification_notes`.
5. El usuario decide si aceptar un ISIN no verificado (marca `manual`).

## Flujo de backtest

1. Usuario configura modelo + universo + cash ISIN + rango.
2. Frontend → `POST /api/backtest` → se crea job en `jobs`.
3. Background Function consume el job, descarga precios faltantes, ejecuta motor Python.
4. Resultados en `backtests` + señales en `signals`.
5. Cliente hace polling o escucha Realtime.

## Cash

El cash es un **ISIN del universo** definido por el usuario.
- No compite en ranking relativo.
- Sus retornos 12M/6M/3M son el benchmark del filtro absoluto.
- Destino cuando ningún activo de riesgo pasa el filtro.
- Si no tiene ≥ 13 meses de datos → el backtest falla con error explícito.
