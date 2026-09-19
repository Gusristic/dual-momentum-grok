-- ============================================================
-- 0004 · FUNCIONES SQL AUXILIARES
-- ============================================================

-- Última fecha con precio para un ISIN
create or replace function public.last_price_date(p_isin text)
returns date
language sql
stable
security invoker
as $$
    select max(date) from public.prices where isin = p_isin;
$$;

-- Número de observaciones de precio para un ISIN en un rango
create or replace function public.price_obs_count(
    p_isin text,
    p_from date,
    p_to   date
)
returns integer
language sql
stable
security invoker
as $$
    select count(*)::integer
    from public.prices
    where isin = p_isin
      and date between p_from and p_to;
$$;

-- Tramos IRPF vigentes para un año
create or replace function public.irpf_tramos_vigentes(
    p_year integer,
    p_ccaa text default 'comun'
)
returns setof public.irpf_tramos
language sql
stable
security invoker
as $$
    select *
    from public.irpf_tramos
    where year = p_year
      and ccaa = p_ccaa
      and vigencia_desde <= make_date(p_year, 12, 31)
      and (vigencia_hasta is null or vigencia_hasta >= make_date(p_year, 1, 1))
    order by desde;
$$;

-- Trigger updated_at
create or replace function public.tg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger trg_instruments_updated_at
    before update on public.instruments
    for each row execute function public.tg_set_updated_at();

create trigger trg_models_updated_at
    before update on public.models
    for each row execute function public.tg_set_updated_at();
