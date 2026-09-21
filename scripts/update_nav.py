#!/usr/bin/env python3
"""Fetch monthly NAV from Yahoo chart API and write site/nav/*.json.
No invented prices. Fails loudly if a series is missing."""
from __future__ import annotations

import json
import sys
import time
import urllib.request
from calendar import monthrange
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NAV_DIR = ROOT / "site" / "nav"

YAHOO = {
    "IE00BYX5MX67": "0P0001CLDM.F",
    "IE00BYX5MD61": "0P0001CJGN.F",
    "IE00BDRK7R97": "0P0001AN9J.F",
    "IE00BYWYCC39": "0P0001AINL.F",
    "IE00B42W3S00": "0P00012I66.F",
    "LU1278917452": "0P000172KL.F",
    "ES0165265002": "0P0001MRGW.F",
    "FR0000989626": "0P00000LRT.F",
    "IE00BYX5N771": "0P0001CLDI.F",
    "IE0007472990": "0P00000RQE.F",
    "IE0007471927": "0P00000RNB",
    "LU1578889864": "0P0001A2G4.F",
}
BENCHMARK = {"IWDA": "IWDA.AS"}

UA = "Mozilla/5.0 (compatible; DualMomentumBot/1.0; +https://github.com/Gusristic/dual-momentum-grok)"


def fetch_monthly(symbol: str, retries: int = 3) -> list[dict]:
    url = (
        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        f"?interval=1mo&range=max"
    )
    last_err = None
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=45) as resp:
                data = json.loads(resp.read().decode())
            result = (data.get("chart") or {}).get("result")
            if not result:
                raise RuntimeError(
                    f"Yahoo sin result para {symbol}: {data.get('chart', {}).get('error')}"
                )
            ts = result[0]["timestamp"]
            closes = result[0]["indicators"]["quote"][0]["close"]
            by_m: dict[str, float] = {}
            for t, c in zip(ts, closes):
                if c is None:
                    continue
                dt = datetime.fromtimestamp(t, tz=timezone.utc)
                ym = dt.strftime("%Y-%m")
                by_m[ym] = float(c)
            out = []
            for ym in sorted(by_m):
                y, m = map(int, ym.split("-"))
                last = monthrange(y, m)[1]
                out.append({"d": f"{ym}-{last:02d}", "c": round(by_m[ym], 4)})
            if len(out) < 24:
                raise RuntimeError(f"{symbol}: solo {len(out)} meses (mín. 24)")
            return out
        except Exception as e:
            last_err = e
            time.sleep(2 + attempt * 2)
    raise RuntimeError(f"Fallo {symbol}: {last_err}")


def main() -> int:
    NAV_DIR.mkdir(parents=True, exist_ok=True)
    isins = list(YAHOO.keys())
    errors = []
    for isin, sym in YAHOO.items():
        try:
            series = fetch_monthly(sym)
            path = NAV_DIR / f"{isin}.json"
            path.write_text(json.dumps(series, separators=(",", ":")), encoding="utf-8")
            print(f"OK {isin} ({sym}) pts={len(series)} last={series[-1]}")
            time.sleep(0.6)
        except Exception as e:
            errors.append(str(e))
            print(f"ERR {isin}: {e}", file=sys.stderr)
    try:
        series = fetch_monthly(BENCHMARK["IWDA"])
        (NAV_DIR / "IWDA.json").write_text(
            json.dumps(series, separators=(",", ":")), encoding="utf-8"
        )
        print(f"OK IWDA (IWDA.AS) pts={len(series)} last={series[-1]}")
    except Exception as e:
        errors.append(str(e))
        print(f"ERR IWDA: {e}", file=sys.stderr)

    (NAV_DIR / "manifest.json").write_text(
        json.dumps(isins, separators=(",", ":")), encoding="utf-8"
    )
    stamp = {
        "updated_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source": "Yahoo Finance chart v8 interval=1mo",
        "isins": len(isins),
        "errors": errors,
    }
    (NAV_DIR / "last_update.json").write_text(
        json.dumps(stamp, indent=2), encoding="utf-8"
    )
    print(json.dumps(stamp, indent=2))
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
