-- ============================================================
-- 0003 · TRAMOS IRPF 2026 (territorio común)
-- Fuente: BOE · Ley 35/2006 LIRPF art. 66 bis (redacción 2026)
-- Verificación: múltiples fuentes secundarias que replican BOE.
-- AEAT no publica API oficial → parametrización con fecha vigencia.
-- ============================================================

insert into public.irpf_tramos
    (year, ccaa, desde, hasta, tipo, vigencia_desde, vigencia_hasta, fuente)
values
    (2026, 'comun',      0.00,   6000.00, 0.1900, '2026-01-01', '2026-12-31',
     'BOE LIRPF art.66.bis redacción 2026'),
    (2026, 'comun',   6000.01,  50000.00, 0.2100, '2026-01-01', '2026-12-31',
     'BOE LIRPF art.66.bis redacción 2026'),
    (2026, 'comun',  50000.01, 200000.00, 0.2300, '2026-01-01', '2026-12-31',
     'BOE LIRPF art.66.bis redacción 2026'),
    (2026, 'comun', 200000.01, 300000.00, 0.2700, '2026-01-01', '2026-12-31',
     'BOE LIRPF art.66.bis redacción 2026'),
    (2026, 'comun', 300000.01,      null, 0.3000, '2026-01-01', '2026-12-31',
     'BOE LIRPF art.66.bis redacción 2026');

-- NOTA: revisar anualmente cuando se publique nueva normativa en BOE.
-- Si cambian los tramos → nueva fila con vigencia actualizada, no sobrescribir.
