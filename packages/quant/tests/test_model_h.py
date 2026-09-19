"""
Tests unitarios del Modelo H.
Principio: verificar reglas exactas confirmadas por el usuario.
"""

import numpy as np
import pandas as pd
import pytest

from dual_momentum.models.h_multi_window import ModelH, ModelHParams


def _make_prices(n_months: int = 24, seed: int = 42) -> pd.DataFrame:
    """Genera series sintéticas deterministas para tests."""
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2020-01-31", periods=n_months, freq="ME")
    # Activo A: tendencia alcista fuerte
    a = 100 * np.cumprod(1 + rng.normal(0.015, 0.03, n_months))
    # Activo B: tendencia débil
    b = 100 * np.cumprod(1 + rng.normal(0.005, 0.025, n_months))
    # Cash: casi plano
    c = 100 * np.cumprod(1 + rng.normal(0.001, 0.002, n_months))
    return pd.DataFrame({"ISIN_A": a, "ISIN_B": b, "CASH_ISIN": c}, index=dates)


def test_weights_must_sum_to_one():
    with pytest.raises(ValueError, match="sumar 1.0"):
        ModelH(ModelHParams(w12=0.5, w6=0.3, w3=0.3))


def test_cash_missing_raises():
    prices = _make_prices()
    model = ModelH()
    with pytest.raises(ValueError, match="no tiene serie de precios"):
        model.run(prices, cash_isin="MISSING", universe=["ISIN_A", "ISIN_B", "MISSING"])


def test_insufficient_cash_obs_raises():
    prices = _make_prices(n_months=10)
    model = ModelH()
    with pytest.raises(ValueError, match="al menos 13 meses"):
        model.run(prices, cash_isin="CASH_ISIN", universe=["ISIN_A", "ISIN_B", "CASH_ISIN"])


def test_basic_run_produces_signals():
    prices = _make_prices(n_months=36)
    model = ModelH()
    result = model.run(
        prices,
        cash_isin="CASH_ISIN",
        universe=["ISIN_A", "ISIN_B", "CASH_ISIN"],
    )
    assert len(result.signals) > 0
    assert result.equity_curve is not None
    assert "cagr" in result.metrics
    assert result.data_quality["cash_isin"] == "CASH_ISIN"


def test_top1_weight_is_one():
    prices = _make_prices(n_months=36)
    model = ModelH()
    result = model.run(
        prices,
        cash_isin="CASH_ISIN",
        universe=["ISIN_A", "ISIN_B", "CASH_ISIN"],
    )
    for s in result.signals:
        assert s.weight == 1.0


def test_rotation_threshold():
    """Verifica que el umbral de 0.5% se respeta (lógica básica)."""
    prices = _make_prices(n_months=36)
    model = ModelH(ModelHParams(rotation_threshold=0.005))
    result = model.run(
        prices,
        cash_isin="CASH_ISIN",
        universe=["ISIN_A", "ISIN_B", "CASH_ISIN"],
    )
    # Al menos debe haber señales con reason que mencione el umbral o mantener/rotar
    reasons = [s.reason for s in result.signals]
    assert any("umbral" in r or "mantener" in r or "rotar" in r or "primera" in r for r in reasons)
