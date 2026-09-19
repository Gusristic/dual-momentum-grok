# Opción A — Refresh fichas MyInvestor

## Qué hace

Actualiza fichas de los 12 ISINs: TER, NAV, rentabilidades, SRRI.
**No** incluye serie histórica (`price_series` = null).

## Refresh

El conector `get_funds` solo está en Grok/Automations.

Prompt: «Refresca las fichas MyInvestor de mi universo dual-momentum y actualiza el snapshot»

## CLI

```bash
cd packages/quant
python -m dual_momentum.cli snapshot
```

## Límites

| Capacidad | Estado |
|-----------|--------|
| Ficha + NAV actual | ✅ |
| Backtest H mes a mes | ❌ sin serie |
