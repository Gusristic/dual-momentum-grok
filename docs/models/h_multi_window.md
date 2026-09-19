# Modelo H — Equilibrado Multi-Ventana 12M / 6M / 3M

## Parámetros confirmados por el usuario

| Parámetro            | Valor                                              |
|----------------------|----------------------------------------------------|
| Pesos w12 / w6 / w3  | 0.5 / 0.3 / 0.2 (editables en UI)                 |
| Filtro absoluto      | Estricto: TODAS las ventanas > cash                |
| Ranking relativo     | Momentum compuesto ponderado                       |
| Concentración        | Top-1 (100 % al activo #1)                         |
| Rebalanceo           | Mensual                                            |
| Umbral de rotación   | 0.5 % diferencial de momentum compuesto            |
| Cash                 | ISIN definido por el usuario (puerto seguro)       |
| Universo             | ISINs introducidos por el usuario                  |

## Definiciones formales

Sea t el último día hábil del mes de rebalanceo.
Sea P(i, t) el precio ajustado del activo i en t.
Sea c el ISIN de cash definido por el usuario.

### 1. Momentum por ventana
R_w(i, t) = P(i, t) / P(i, t − w) − 1,  w ∈ {12, 6, 3} meses

### 2. Momentum compuesto
M(i, t) = w12·R12 + w6·R6 + w3·R3
Defaults: 0.5 / 0.3 / 0.2

### 3. Filtro absoluto (ESTRICTO)
pass_abs(i,t) = (R12(i)>R12(c)) AND (R6(i)>R6(c)) AND (R3(i)>R3(c))
Cash se excluye de su propia comparación.

### 4. Universo elegible
U(t) = { i ∈ universo \ {c} : pass_abs(i,t) = true }

### 5. Ranking Top-1
Si U(t) ≠ ∅: top1 = argmax M(i,t), weight = 1.0
Si U(t) = ∅: target = cash, weight = 1.0

### 6. Rotación (umbral 0.5%)
Si top1 ≠ actual y M(top1) − M(actual) > 0.005 → rotar; si no → mantener.

### 7. Requisitos de datos
- Mínimo 13 meses para ventana 12M
- Cash sin datos → backtest falla (no proxy)
- Correlaciones solo si n_obs ≥ 250

## Referencias
- Antonacci (2014). Dual Momentum Investing.
- Keller & Keuning (2017). VAA. SSRN.

Nota: Modelo H no es un modelo publicado; parámetros confirmados por el usuario.
