"""Tests del data service — sin red en unitarios de formato."""

from dual_momentum.data_service import FetchResult, PriceRow, to_monthly_last
import pandas as pd


def test_fetch_result_empty_on_no_ticker():
    from dual_momentum.data_service import fetch_prices_yahoo

    r = fetch_prices_yahoo("IE00B4L5Y983", ticker=None)
    assert r.n_obs == 0
    assert r.source_used is None
    assert any("ticker" in e.lower() for e in r.errors)


def test_to_monthly_last():
    idx = pd.date_range("2020-01-01", periods=60, freq="D")
    df = pd.DataFrame({"A": range(60)}, index=idx)
    monthly = to_monthly_last(df)
    assert len(monthly) >= 1
    assert monthly.index.freq is not None or len(monthly) <= 3


def test_price_row_source_required():
    row = PriceRow(
        isin="IE00B4L5Y983",
        date=__import__("datetime").date(2024, 1, 15),
        close=100.0,
        nav=None,
        dividend=None,
        source="yahoo",
    )
    assert row.source == "yahoo"
