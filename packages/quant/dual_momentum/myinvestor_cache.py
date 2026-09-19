"""
Caché de fichas MyInvestor (opción A).

El conector MyInvestor (get_funds) no es API pública del CLI: solo Grok/Automations.
Este módulo carga el último snapshot JSON (NAV, TER, rentabilidades).
NO inventa price_series.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional

DEFAULT_ISINS: list[str] = [
    "IE00BYX5MX67",
    "IE00BYX5MD61",
    "IE00BDRK7R97",
    "IE00BYWYCC39",
    "IE00B42W3S00",
    "LU1278917452",
    "ES0165265002",
    "FR0000989626",
    "IE00BYX5N771",
    "IE0007472990",
    "IE0007471927",
    "LU1578889864",
]

CASH_ISIN = "FR0000989626"

_CANDIDATE_PATHS = [
    Path(__file__).resolve().parents[3] / "docs" / "samples" / "myinvestor_universe_snapshot.json",
    Path(__file__).resolve().parents[1] / "data" / "myinvestor_universe_snapshot.json",
    Path.cwd() / "docs" / "samples" / "myinvestor_universe_snapshot.json",
    Path.cwd() / "myinvestor_universe_snapshot.json",
]


def find_snapshot_path() -> Optional[Path]:
    for p in _CANDIDATE_PATHS:
        if p.is_file():
            return p
    return None


def load_snapshot(path: Optional[Path] = None) -> dict[str, Any]:
    p = path or find_snapshot_path()
    if p is None:
        raise FileNotFoundError(
            "No hay snapshot MyInvestor. Pide a Grok: refresca fichas MyInvestor"
        )
    data = json.loads(p.read_text(encoding="utf-8"))
    data["_path"] = str(p)
    return data


def funds_by_isin(snapshot: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {f["isin"]: f for f in snapshot.get("funds", []) if f.get("isin")}


def format_table(snapshot: dict[str, Any]) -> str:
    lines = [
        f"Fuente: {snapshot.get('source', '?')}",
        f"Fetched: {snapshot.get('fetched_at', '?')}",
        f"Archivo: {snapshot.get('_path', '?')}",
        f"Cash: {snapshot.get('cash_isin', CASH_ISIN)}",
        "",
        f"{'ISIN':<14} {'NAV':>12} {'TER%':>6} {'1A%':>7} {'3A%':>7} {'SRRI':>4}  Nombre",
        "-" * 90,
    ]
    for f in snapshot.get("funds", []):
        isin = f.get("isin", "")
        nav = f.get("nav")
        ter = f.get("ter")
        r1 = f.get("return_1y")
        r3 = f.get("return_3y")
        srri = f.get("risk_indicator")
        name = (f.get("name") or "")[:36]
        mark = " *" if isin == snapshot.get("cash_isin") else ""
        nav_s = f"{nav:,.4f}" if isinstance(nav, (int, float)) else "—"
        ter_s = f"{ter:.2f}" if isinstance(ter, (int, float)) else "—"
        r1_s = f"{r1:+.1f}" if isinstance(r1, (int, float)) else "—"
        r3_s = f"{r3:+.1f}" if isinstance(r3, (int, float)) else "—"
        srri_s = str(srri) if srri is not None else "—"
        lines.append(f"{isin:<14} {nav_s:>12} {ter_s:>6} {r1_s:>7} {r3_s:>7} {srri_s:>4}  {name}{mark}")
    lines.append("")
    lines.append("* = cash (puerto seguro)")
    lines.append("Nota: price_series no disponible vía conector → backtest H necesita otra fuente.")
    return "\n".join(lines)


def missing_isins(snapshot: dict[str, Any], universe: Optional[list[str]] = None) -> list[str]:
    want = universe or DEFAULT_ISINS
    have = set(funds_by_isin(snapshot))
    return [i for i in want if i not in have]
