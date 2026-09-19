"""Mapa ISIN → Yahoo MUTUALFUND (0P000….F). Verificado 2026-09-19."""
from __future__ import annotations

ISIN_TO_YAHOO: dict[str, str] = {
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

CASH_ISIN = "FR0000989626"
USD_ISINS: set[str] = {"IE0007471927"}


def yahoo_for(isin: str) -> str | None:
    return ISIN_TO_YAHOO.get(isin.upper())


def resolve_universe(isins: list[str] | None = None) -> dict[str, str]:
    keys = isins or list(ISIN_TO_YAHOO.keys())
    return {i.upper(): yahoo_for(i.upper()) for i in keys if yahoo_for(i.upper())}
