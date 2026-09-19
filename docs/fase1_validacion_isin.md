# Fase 1 — Validación de ISINs e ingesta de precios

## Objetivo

Que el usuario pegue **sus propios ISINs** y el sistema:

1. Los valide contra fuentes reales (OpenFIGI).
2. Marque `VERIFIED` / `NO_VERIFICADO` sin inventar metadata.
3. Obtenga tickers para descargar precios (Yahoo → Stooq).

## OpenFIGI (implementado)

| Campo | Valor |
|-------|--------|
| Endpoint | `POST https://api.openfigi.com/v3/mapping` |
| idType | `ID_ISIN` |
| Sin API key | 25 req/min, máx 10 jobs/request |
| Con `OPENFIGI_API_KEY` | 250 req/min, máx 100 jobs |

**Netlify Function:** `netlify/functions/isin-validate.ts`  
**Ruta:** `POST /api/isin/validate`  
**Body:** `{ "isins": ["IE00B4L5Y983", ...] }` o `{ "isin": "..." }`

### Respuesta por ISIN

```json
{
  "isin": "IE00B4L5Y983",
  "status": "VERIFIED",
  "name": "...",
  "figi": "BBG00...",
  "ticker": "IWDA",
  "exch_code": "LN",
  "is_etf": true,
  "cn_cmv_traspassable": null,
  "verification_source": "openfigi",
  "verification_notes": "OpenFIGI OK. UCITS/traspasabilidad/TER pendientes...",
  "errors": [],
  "sources_tried": ["openfigi"]
}
```

Si OpenFIGI no encuentra el ISIN o hay rate-limit → `status: "NO_VERIFICADO"` + `errors` explícitos.

## Pendiente Fase 1b (sin inventar)

| Dato | Fuente prevista | Estado |
|------|-----------------|--------|
| UCITS | Morningstar / justETF | No implementado → `null` |
| TER | Morningstar / justETF | No implementado → `null` |
| Traspasable art. 94 | CNMV / QueFondos | No implementado → `null` |
| Acumulación/distribución | Morningstar | No implementado → `null` |

## Precios (pipeline)

**Python:** `packages/quant/dual_momentum/data_service.py`

```
fetch_prices(isin, ticker_yahoo, ticker_stooq)
  → Yahoo (yfinance)
  → si falla → Stooq
  → si falla → rows=[], errors=[...]
```

**Netlify:** `POST /api/prices/fetch` (contrato 202; background job en Fase 1c).

## Variables de entorno nuevas

```
OPENFIGI_API_KEY=   # opcional; sin ella límite 25 req/min
```

## Regla de rigor

- Nunca se inventa nombre, FIGI, ticker ni precio.
- `verified = true` solo si OpenFIGI devuelve `data` no vacío.
- Traspasabilidad fiscal **no** se marca `true` hasta confirmar CNMV/QueFondos.
