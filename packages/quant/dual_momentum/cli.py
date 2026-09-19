"""CLI local — backtest Modelo H + snapshot MyInvestor."""
from __future__ import annotations
import argparse, json, sys
from pathlib import Path
from typing import Optional
import pandas as pd

def _fetch_yahoo_monthly(ticker: str, start: Optional[str], end: Optional[str]) -> pd.Series:
    import yfinance as yf
    t = yf.Ticker(ticker)
    kwargs = {}
    if start: kwargs["start"] = start
    if end: kwargs["end"] = end
    hist = t.history(auto_adjust=True, **kwargs) if kwargs else t.history(period="max", auto_adjust=True)
    if hist is None or hist.empty:
        raise RuntimeError(f"Yahoo: sin datos para {ticker}")
    s = hist["Close"].copy()
    s.index = pd.to_datetime(s.index).tz_localize(None)
    monthly = s.resample("ME").last().dropna()
    monthly.name = ticker
    return monthly

def cmd_backtest(args: argparse.Namespace) -> int:
    from dual_momentum.models.h_multi_window import ModelH, ModelHParams
    tickers = [x.strip() for x in args.tickers.split(",") if x.strip()]
    isins = [x.strip().upper() for x in args.isins.split(",") if x.strip()]
    if len(tickers) != len(isins):
        print("ERROR: --tickers y --isins misma longitud", file=sys.stderr)
        return 1
    cash_isin = args.cash_isin.strip().upper()
    if cash_isin not in isins:
        print("ERROR: cash-isin debe estar en isins", file=sys.stderr)
        return 1
    mapping = dict(zip(isins, tickers))
    if args.cash_ticker:
        mapping[cash_isin] = args.cash_ticker.strip()
    series, errors = {}, []
    for isin, ticker in mapping.items():
        try:
            s = _fetch_yahoo_monthly(ticker, args.start, args.end)
            s.name = isin
            series[isin] = s
            print(f"OK {isin} ← {ticker}  n={len(s)}")
        except Exception as e:
            errors.append(f"{isin}/{ticker}: {e}")
            print(f"FAIL {isin}: {e}", file=sys.stderr)
    if not series:
        print("ERROR: ningún activo con precios", file=sys.stderr)
        return 1
    prices = pd.DataFrame(series).sort_index().dropna(how="all")
    model = ModelH(ModelHParams(w12=args.w12, w6=args.w6, w3=args.w3, rotation_threshold=args.threshold / 100.0))
    try:
        result = model.run(prices, cash_isin=cash_isin, universe=isins)
    except ValueError as e:
        print(f"ERROR backtest: {e}", file=sys.stderr)
        return 1
    print("\n=== MÉTRICAS ===")
    for k, v in result.metrics.items():
        print(f"  {k}: {v:.4f}" if isinstance(v, float) else f"  {k}: {v}")
    print("\n=== ÚLTIMAS 6 SEÑALES ===")
    for s in result.signals[-6:]:
        print(f"  {s.date.date()}  {s.asset_isin}  M={s.m_composite:.4f}  {s.reason}")
    if result.signals:
        last = result.signals[-1]
        print("\n=== SEÑAL ACTUAL ===")
        print(f"  {last.date.date()} → {last.asset_isin}  M={last.m_composite:.4f}  {last.reason}")
    if args.out_json:
        payload = {
            "metrics": result.metrics,
            "data_quality": result.data_quality,
            "signals": [{"date": s.date.isoformat(), "asset_isin": s.asset_isin, "weight": s.weight,
                "m_composite": s.m_composite, "reason": s.reason, "rotated": s.rotated} for s in result.signals],
            "errors": errors,
        }
        open(args.out_json, "w").write(json.dumps(payload, indent=2))
        print(f"JSON → {args.out_json}")
    return 0

def cmd_snapshot(args: argparse.Namespace) -> int:
    from dual_momentum.myinvestor_cache import DEFAULT_ISINS, format_table, load_snapshot, missing_isins
    try:
        snap = load_snapshot(Path(args.path) if args.path else None)
    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    print(format_table(snap))
    miss = missing_isins(snap, DEFAULT_ISINS)
    if miss:
        print(f"\nFaltan ({len(miss)}): {', '.join(miss)}")
        return 2
    print(f"\nUniverso completo: {len(DEFAULT_ISINS)} ISINs OK")
    if args.out_json:
        slim = {k: v for k, v in snap.items() if not k.startswith("_")}
        open(args.out_json, "w", encoding="utf-8").write(json.dumps(slim, indent=2, ensure_ascii=False))
        print(f"Copia → {args.out_json}")
    return 0

def main(argv=None) -> int:
    p = argparse.ArgumentParser(prog="dual_momentum")
    sub = p.add_subparsers(dest="cmd", required=True)
    b = sub.add_parser("backtest", help="Backtest Modelo H (Yahoo)")
    b.add_argument("--tickers", required=True)
    b.add_argument("--isins", required=True)
    b.add_argument("--cash-isin", required=True)
    b.add_argument("--cash-ticker", default=None)
    b.add_argument("--start", default="2015-01-01")
    b.add_argument("--end", default=None)
    b.add_argument("--w12", type=float, default=0.5)
    b.add_argument("--w6", type=float, default=0.3)
    b.add_argument("--w3", type=float, default=0.2)
    b.add_argument("--threshold", type=float, default=0.5)
    b.add_argument("--out-json", default=None)
    b.set_defaults(func=cmd_backtest)
    s = sub.add_parser("snapshot", help="Fichas MyInvestor en caché local")
    s.add_argument("--path", default=None)
    s.add_argument("--out-json", default=None)
    s.set_defaults(func=cmd_snapshot)
    args = p.parse_args(argv)
    return args.func(args)

if __name__ == "__main__":
    sys.exit(main())
