# Fuentes de datos — máxima fiabilidad

## Principio rector

Si un dato no se puede obtener de una fuente fiable → **"N/D"** + motivo.  
Nunca estimar. Nunca inventar. Nunca rellenar con proxy silencioso.

## Matriz de fuentes

| Fuente              | Uso                          | Auth     | Limitación conocida              | Fallback          |
|---------------------|------------------------------|----------|----------------------------------|-------------------|
| Yahoo Finance       | Precios históricos           | Ninguna  | Rate-limits, cambios de esquema  | Stooq             |
| Stooq               | Precios históricos           | Ninguna  | Cobertura ETFs EU limitada       | N/D explícito     |
| OpenFIGI            | Resolución ISIN → FIGI       | Opcional | 25 req/min sin API key           | N/D explícito     |
| CNMV                | Registro oficial IIC         | Scraping | Parser frágil                    | N/D explícito     |
| Morningstar         | Metadata TER, categoría      | Scraping | Endpoint no documentado          | N/D explícito     |
| QueFondos           | Traspasabilidad fiscal IIC   | Scraping | Sin API, HTML frágil             | N/D explícito     |
| FT (markets.ft.com) | Metadata fondo               | Scraping | Cambios de maquetación           | N/D explícito     |

## Flujo de validación de ISIN (máxima precisión)

1. Usuario introduce ISIN (multilínea o CSV).
2. `POST /api/isin/validate` → OpenFIGI (FIGI, ticker, exchange).
3. Si es fondo europeo → CNMV (registro + traspasabilidad).
4. Morningstar / QueFondos / FT → TER, categoría, divisa, acumulación/distribución.
5. Si **cualquier** fuente falla → el campo correspondiente queda `NULL` y `verified = false`.
6. UI muestra:
   - ✅ **VERIFICADO** si al menos OpenFIGI + (CNMV o Morningstar) confirman.
   - ⚠️ **NO VERIFICADO** + detalle exacto de qué falló.
7. El usuario puede forzar "aceptar como manual" (se registra `verification_source = 'manual'`).

## Reglas de precios

- Cada fila de `prices` lleva `source` obligatorio.
- Si Yahoo falla → se intenta Stooq.
- Si ambas fallan → no se inserta fila; se registra error en `jobs`.
- Backtest exige mínimo de observaciones por ventana; si no se cumple → ISIN excluido + aviso en `data_quality`.

## Cash

El cash **no** es una serie externa.  
Es un ISIN que el usuario introduce en el universo (normalmente un monetario UCITS EUR).  
Si el ISIN de cash no tiene datos suficientes → el backtest falla con error explícito.
