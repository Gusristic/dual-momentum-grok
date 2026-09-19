"""Data Service — precios con máxima fiabilidad. Yahoo → Stooq. Nunca proxy silencioso."""
from __future__ import annotations
from dataclasses import dataclass
from datetime import date
from typing import Optional
import pandas as pd

@dataclass
class PriceRow:
    isin: str
    date: date
    close: Optional[float]
    nav: Optional[float]
    dividend: Optional[float]
    source: str  # yahoo | stooq | manual

@dataclass
class FetchResult:
    isin: str
    rows: list
    source_used: Optional[str]
    errors: list
    n_obs: int

def fetch_prices_yahoo(isin: str, ticker: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None) -> FetchResult:
    if not ticker:
        return FetchResult(isin, [], None, ["Yahoo: falta ticker (OpenFIGI)"], 0)
    try:
        import yfinance as yf
    except ImportError:
        return FetchResult(isin, [], None, ["Yahoo: yfinance no instalado"], 0)
    try:
        t = yf.Ticker(ticker)
        kwargs = {}
        if start: kwargs["start"] = start
        if end: kwargs["end"] = end
        hist = t.history(auto_adjust=True, **kwargs) if kwargs else t.history(period="max", auto_adjust=True)
        if hist is None or hist.empty:
            return FetchResult(isin, [], None, [f"Yahoo: sin datos ticker={ticker}"], 0)
        rows = []
        for idx, row in hist.iterrows():
            d = idx.date() if hasattr(idx, "date") else pd.Timestamp(idx).date()
            close = float(row["Close"]) if "Close" in row and pd.notna(row["Close"]) else None
            div = float(row["Dividends"]) if "Dividends" in row and pd.notna(row.get("Dividends", float("nan"))) else None
            if close is None: continue
            rows.append(PriceRow(isin, d, close, None, div, "yahoo"))
        return FetchResult(isin, rows, "yahoo", [], len(rows))
    except Exception as e:
        return FetchResult(isin, [], None, [f"Yahoo: {type(e).__name__}: {e}"], 0)

def fetch_prices_stooq(isin: str, ticker: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None) -> FetchResult:
    if not ticker:
        return FetchResult(isin, [], None, ["Stooq: falta ticker mapeado"], 0)
    try:
        symbol = ticker.lower()
        url = f"https://stooq.com/q/d/l/?s={symbol}&i=d"
        df = pd.read_csv(url)
        if df is None or df.empty:
            return FetchResult(isin, [], None, [f"Stooq: sin datos {symbol}"], 0)
        if "Date" not in df.columns or "Close" not in df.columns:
            return FetchResult(isin, [], None, [f"Stooq: esquema inesperado {list(df.columns)}"], 0)
        df["Date"] = pd.to_datetime(df["Date"])
        if start: df = df[df["Date"] >= pd.Timestamp(start)]
        if end: df = df[df["Date"] <= pd.Timestamp(end)]
        rows = []
        for _, row in df.iterrows():
            close = float(row["Close"]) if pd.notna(row["Close"]) else None
            if close is None: continue
            rows.append(PriceRow(isin, row["Date"].date(), close, None, None, "stooq"))
        if not rows:
            return FetchResult(isin, [], None, [f"Stooq: 0 filas para {symbol}"], 0)
        return FetchResult(isin, rows, "stooq", [], len(rows))
    except Exception as e:
        return FetchResult(isin, [], None, [f"Stooq: {type(e).__name__}: {e}"], 0)

def fetch_prices(isin: str, ticker_yahoo: Optional[str] = None, ticker_stooq: Optional[str] = None, start: Optional[str] = None, end: Optional[str] = None) -> FetchResult:
    yahoo = fetch_prices_yahoo(isin, ticker=ticker_yahoo, start=start, end=end)
    if yahoo.n_obs > 0: return yahoo
    stooq = fetch_prices_stooq(isin, ticker=ticker_stooq or ticker_yahoo, start=start, end=end)
    if stooq.n_obs > 0:
        stooq.errors = yahoo.errors + stooq.errors
        return stooq
    return FetchResult(isin, [], None, yahoo.errors + stooq.errors, 0)

def to_monthly_last(prices: pd.DataFrame) -> pd.DataFrame:
    if prices.empty: return prices
    s = prices.copy()
    s.index = pd.to_datetime(s.index)
    return s.resample("ME").last().dropna(how="all")
