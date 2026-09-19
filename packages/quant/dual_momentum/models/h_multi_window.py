"""Modelo H — Equilibrado Multi-Ventana 12M/6M/3M.
Pesos 0.5/0.3/0.2, filtro estricto, top-1, umbral 0.5%, cash=ISIN usuario.
Máxima fiabilidad: sin datos → error explícito, nunca inventar.
"""
from __future__ import annotations
from dataclasses import dataclass, field
from typing import Optional
import numpy as np
import pandas as pd

@dataclass
class ModelHParams:
    w12: float = 0.5
    w6: float = 0.3
    w3: float = 0.2
    rotation_threshold: float = 0.005

@dataclass
class SignalResult:
    date: pd.Timestamp
    asset_isin: str
    weight: float
    absolute_signal: bool
    relative_rank: int
    m_composite: float
    r12: float
    r6: float
    r3: float
    pass_12: bool
    pass_6: bool
    pass_3: bool
    rotated: bool
    reason: str

@dataclass
class BacktestResult:
    equity_curve: pd.Series
    signals: list
    metrics: dict
    data_quality: dict
    window_analysis: dict = field(default_factory=dict)

class ModelH:
    def __init__(self, params: Optional[ModelHParams] = None):
        self.params = params or ModelHParams()
        total = self.params.w12 + self.params.w6 + self.params.w3
        if not np.isclose(total, 1.0, atol=1e-6):
            raise ValueError(f"Pesos deben sumar 1.0 (actual: {total:.6f})")

    def _monthly_returns(self, prices: pd.DataFrame, window: int) -> pd.DataFrame:
        return prices / prices.shift(window) - 1.0

    def _composite(self, r12, r6, r3) -> pd.DataFrame:
        return self.params.w12 * r12 + self.params.w6 * r6 + self.params.w3 * r3

    def run(self, prices: pd.DataFrame, cash_isin: str, universe: list, rebalance_dates=None) -> BacktestResult:
        if cash_isin not in prices.columns:
            raise ValueError(f"Cash ISIN '{cash_isin}' sin precios. No se inventa proxy.")
        risk = [i for i in universe if i != cash_isin and i in prices.columns]
        missing = [i for i in universe if i not in prices.columns and i != cash_isin]
        dq = {"missing_isins": missing, "n_risk": len(risk), "cash_isin": cash_isin,
              "n_obs_cash": int(prices[cash_isin].notna().sum()),
              "obs_per_isin": {i: int(prices[i].notna().sum()) for i in risk + [cash_isin]}}
        if dq["n_obs_cash"] < 13:
            raise ValueError(f"Cash '{cash_isin}' tiene {dq['n_obs_cash']} obs; se requieren >=13.")
        if not risk:
            raise ValueError("Ningún activo de riesgo con precios.")
        r12 = self._monthly_returns(prices, 12)
        r6 = self._monthly_returns(prices, 6)
        r3 = self._monthly_returns(prices, 3)
        m = self._composite(r12, r6, r3)
        if rebalance_dates is None:
            rebalance_dates = prices.index[12:]
        signals, holdings = [], []
        current = None
        for t in rebalance_dates:
            if t not in m.index:
                continue
            eligible = []
            for isin in risk:
                vals = [r12.loc[t, isin], r6.loc[t, isin], r3.loc[t, isin],
                        r12.loc[t, cash_isin], r6.loc[t, cash_isin], r3.loc[t, cash_isin]]
                if any(pd.isna(x) for x in vals):
                    continue
                p12, p6, p3 = vals[0] > vals[3], vals[1] > vals[4], vals[2] > vals[5]
                if p12 and p6 and p3:
                    eligible.append({"isin": isin, "m": m.loc[t, isin], "r12": vals[0], "r6": vals[1], "r3": vals[2],
                                    "pass_12": p12, "pass_6": p6, "pass_3": p3})
            rotated, reason = False, ""
            if not eligible:
                target, weight, abs_s, rank = cash_isin, 1.0, False, 0
                m_val = float(m.loc[t, cash_isin]) if not pd.isna(m.loc[t, cash_isin]) else 0.0
                r12v = r6v = r3v = 0.0
                p12 = p6 = p3 = False
                reason = "ningún activo pasó filtro → cash"
            else:
                eligible.sort(key=lambda x: x["m"], reverse=True)
                top = eligible[0]
                target, weight, abs_s, rank = top["isin"], 1.0, True, 1
                m_val, r12v, r6v, r3v = top["m"], top["r12"], top["r6"], top["r3"]
                p12, p6, p3 = top["pass_12"], top["pass_6"], top["pass_3"]
                if current is None:
                    rotated, reason = True, "primera asignación"
                elif target == current:
                    reason = "mantener (mismo top-1)"
                else:
                    m_cur = m.loc[t, current] if current in m.columns else np.nan
                    if pd.isna(m_cur):
                        rotated, reason = True, "activo actual sin dato → rotar"
                    elif m_val - m_cur > self.params.rotation_threshold:
                        rotated, reason = True, f"rotar: diff {m_val-m_cur:.4f} > umbral"
                    else:
                        target = current
                        reason = f"mantener: diff {m_val-m_cur:.4f} <= umbral"
                        if current in r12.columns:
                            r12v, r6v, r3v = r12.loc[t, current], r6.loc[t, current], r3.loc[t, current]
                            m_val = m.loc[t, current]
                            p12 = r12v > r12.loc[t, cash_isin] if not pd.isna(r12v) else False
                            p6 = r6v > r6.loc[t, cash_isin] if not pd.isna(r6v) else False
                            p3 = r3v > r3.loc[t, cash_isin] if not pd.isna(r3v) else False
            current = target
            holdings.append((t, target, weight))
            signals.append(SignalResult(t, target, weight, abs_s, rank, float(m_val) if not pd.isna(m_val) else 0.0,
                float(r12v) if not pd.isna(r12v) else 0.0, float(r6v) if not pd.isna(r6v) else 0.0,
                float(r3v) if not pd.isna(r3v) else 0.0, bool(p12), bool(p6), bool(p3), rotated, reason))
        equity = self._equity(prices, holdings)
        return BacktestResult(equity, signals, self._metrics(equity), dq)

    def _equity(self, prices, holdings):
        if not holdings:
            return pd.Series(dtype=float)
        holdings = sorted(holdings, key=lambda x: x[0])
        dates = prices.index
        equity = pd.Series(index=dates, dtype=float)
        equity.iloc[0] = 1.0
        hi, cur = 0, holdings[0][1]
        for i in range(1, len(dates)):
            t = dates[i]
            while hi + 1 < len(holdings) and holdings[hi+1][0] <= t:
                hi += 1
                cur = holdings[hi][1]
            prev = dates[i-1]
            pp, pc = prices.loc[prev, cur], prices.loc[t, cur]
            if pd.isna(pp) or pd.isna(pc) or pp == 0:
                equity.iloc[i] = equity.iloc[i-1]
            else:
                equity.iloc[i] = equity.iloc[i-1] * (pc / pp)
        return equity.dropna()

    def _metrics(self, equity):
        if len(equity) < 2:
            return {"cagr": None, "vol": None, "sharpe": None, "max_dd": None, "n_obs": len(equity),
                    "note": "insuficientes datos"}
        tot = equity.iloc[-1] / equity.iloc[0] - 1.0
        ny = len(equity) / 12.0
        cagr = (1.0 + tot) ** (1.0 / ny) - 1.0 if ny > 0 else None
        rets = equity.pct_change().dropna()
        vol = rets.std() * np.sqrt(12) if len(rets) > 1 else None
        sharpe = (cagr / vol) if cagr is not None and vol and vol > 0 else None
        dd = (equity - equity.cummax()) / equity.cummax()
        return {"cagr": float(cagr) if cagr is not None else None,
                "vol": float(vol) if vol is not None else None,
                "sharpe": float(sharpe) if sharpe is not None else None,
                "max_dd": float(dd.min()) if len(dd) else None,
                "n_obs": len(equity), "total_return": float(tot)}
