# Estado de fuentes de datos (verificado 2026-09-19)

Principio: **RIGOR ABSOLUTO — CERO INVENTOS**. Si la fuente falla → `null` + error explícito.

## Precios históricos (series)

| Fuente | Estado | Uso en app | Notas |
|--------|--------|------------|-------|
| **Yahoo Finance** chart API | ✅ Operativo | Primario | Probado IWDA.L |
| **Stooq** CSV | ⚠️ Frágil | Fallback | A veces HTML anti-bot |
| Morningstar Direct API | ❌ De pago | No | API institucional |
| Investing.com | ❌ 403 | No | Bloquea bots |
| Financial Times markets | ⚠️ Solo búsqueda | No series | Links; sin serie libre fiable |

### Muestra real Yahoo (IWDA.L, USD, LSE)

| Fecha | Adj Close |
|-------|-----------|
| 2024-09-24 | 107.13 |
| 2024-09-25 | 107.18 |
| 2024-09-26 | 107.68 |
| 2024-09-27 | 107.90 |
| 2024-09-30 | 107.42 |

## Metadatos

| Fuente | Estado | Campos |
|--------|--------|--------|
| **OpenFIGI** | ✅ | FIGI, name, ticker |
| **justETF** | ✅ | TER, currency, distribution, replication |
| **QueFondos** | ✅ parcial | name, VL, comisión fija |
| Morningstar web | ⚠️ | No implementado (HTML/login) |
| FT.com / Investing | ❌/⚠️ | 403 o sin serie |

### justETF real — IE00B4L5Y983

| Campo | Valor |
|-------|--------|
| Name | iShares Core MSCI World UCITS ETF USD (Acc) |
| TER | **0.20%** p.a. |
| Currency | USD |
| Distribution | Accumulating |
| Replication | Physical |

## Pipeline

```
ISIN → OpenFIGI → justETF → QueFondos → Yahoo → Stooq fallback
```

Código: `lib/price-sources.ts`, `lib/metadata-sources.ts`, `metadata-enrich.ts`
