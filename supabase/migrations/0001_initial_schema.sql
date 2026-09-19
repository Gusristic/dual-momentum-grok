-- ============================================================
-- 0001 · ESQUEMA INICIAL
-- Principio: máxima fiabilidad. Ningún dato inventado.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

create table public.instruments (
    isin                text primary key check (length(isin) = 12),
    name                text,
    issuer              text,
    ter                 numeric(6,4) check (ter is null or (ter >= 0 and ter < 1)),
    category            text,
    currency            text check (currency is null or length(currency) = 3),
    is_ucits            boolean,
    is_etf              boolean,
    is_accumulating     boolean,
    cn_cmv_traspassable boolean,
    figi                text,
    verified            boolean not null default false,
    verified_at         timestamptz,
    verification_source text check (
        verification_source is null
        or verification_source in ('openfigi','cnmv','morningstar','quefondos','ft','yahoo','manual')
    ),
    verification_notes  text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);
create index idx_instruments_verified on public.instruments (verified) where verified = true;

create table public.prices (
    id           bigint generated always as identity primary key,
    isin         text not null references public.instruments(isin) on delete cascade,
    date         date not null,
    close        numeric(18,6),
    nav          numeric(18,6),
    dividend     numeric(18,6),
    source       text not null check (source in ('yahoo','stooq','ft','morningstar','quefondos','manual')),
    ingested_at  timestamptz not null default now(),
    constraint prices_has_value check (close is not null or nav is not null),
    unique (isin, date, source)
);
create index idx_prices_isin_date on public.prices (isin, date desc);

create table public.models (
    id          uuid primary key default uuid_generate_v4(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    type        text not null check (type in ('A','B','C','D','E','F','G','H')),
    params      jsonb not null default '{}'::jsonb,
    universe    text[] not null default '{}',
    cash_isin   text references public.instruments(isin),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    constraint model_h_params_valid check (
        type <> 'H' or (
            params ? 'w12' and params ? 'w6' and params ? 'w3'
            and params ? 'abs_filter' and params ? 'ranking_basis'
            and params ? 'rotation_threshold'
        )
    )
);
create index idx_models_user on public.models (user_id);

create table public.backtests (
    id                uuid primary key default uuid_generate_v4(),
    model_id          uuid not null references public.models(id) on delete cascade,
    user_id           uuid not null references auth.users(id) on delete cascade,
    from_date         date not null,
    to_date           date not null,
    gross             boolean not null default true,
    metrics           jsonb not null default '{}'::jsonb,
    equity_curve      jsonb not null default '[]'::jsonb,
    signals           jsonb not null default '[]'::jsonb,
    window_analysis   jsonb,
    data_quality      jsonb,
    created_at        timestamptz not null default now(),
    constraint backtest_dates_valid check (from_date < to_date)
);
create index idx_backtests_user on public.backtests (user_id, created_at desc);

create table public.signals (
    id                bigint generated always as identity primary key,
    model_id          uuid not null references public.models(id) on delete cascade,
    user_id           uuid not null references auth.users(id) on delete cascade,
    date              date not null,
    asset_isin        text not null references public.instruments(isin),
    weight            numeric(8,6) not null default 0 check (weight >= 0 and weight <= 1),
    absolute_signal   boolean not null default false,
    relative_rank     integer check (relative_rank is null or relative_rank >= 1),
    fiscal_event      boolean not null default false,
    window_breakdown  jsonb,
    created_at        timestamptz not null default now()
);
create index idx_signals_model_date on public.signals (model_id, date desc);

create table public.allocations (
    id          bigint generated always as identity primary key,
    model_id    uuid not null references public.models(id) on delete cascade,
    user_id     uuid not null references auth.users(id) on delete cascade,
    date        date not null,
    asset_isin  text not null references public.instruments(isin),
    weight      numeric(8,6) not null check (weight >= 0 and weight <= 1),
    created_at  timestamptz not null default now(),
    unique (model_id, date, asset_isin)
);

create table public.correlations (
    id            bigint generated always as identity primary key,
    user_id       uuid not null references auth.users(id) on delete cascade,
    isin_a        text not null references public.instruments(isin),
    isin_b        text not null references public.instruments(isin),
    window_label  text not null check (window_label in ('1Y','3Y','5Y','10Y','custom')),
    method        text not null check (method in ('pearson','spearman')),
    frequency     text not null check (frequency in ('daily','weekly','monthly')),
    value         numeric(10,6) check (value is null or (value >= -1 and value <= 1)),
    n_obs         integer not null check (n_obs >= 0),
    computed_at   timestamptz not null default now(),
    constraint correlations_ab_ordered check (isin_a < isin_b),
    unique (user_id, isin_a, isin_b, window_label, method, frequency)
);

create table public.portfolios (
    id          uuid primary key default uuid_generate_v4(),
    user_id     uuid not null references auth.users(id) on delete cascade,
    name        text not null,
    is_real     boolean not null default false,
    created_at  timestamptz not null default now()
);

create table public.portfolio_positions (
    id             bigint generated always as identity primary key,
    portfolio_id   uuid not null references public.portfolios(id) on delete cascade,
    user_id        uuid not null references auth.users(id) on delete cascade,
    isin           text not null references public.instruments(isin),
    weight         numeric(8,6) check (weight is null or (weight >= 0 and weight <= 1)),
    avg_cost       numeric(18,6) check (avg_cost is null or avg_cost >= 0),
    acquired_at    date,
    created_at     timestamptz not null default now()
);

create table public.tax_events (
    id                uuid primary key default uuid_generate_v4(),
    user_id           uuid not null references auth.users(id) on delete cascade,
    date              date not null,
    isin              text not null references public.instruments(isin),
    type              text not null check (type in ('sale','transfer','dividend')),
    gain_loss         numeric(18,6),
    tax_due_estimate  numeric(18,6),
    is_tax_deferred   boolean not null default false,
    notes             text,
    created_at        timestamptz not null default now()
);

create table public.jobs (
    id            uuid primary key default uuid_generate_v4(),
    user_id       uuid references auth.users(id) on delete set null,
    type          text not null check (type in ('backtest','price_download','correlation_batch','report_generation','isin_validate')),
    status        text not null default 'pending' check (status in ('pending','running','completed','failed','cancelled')),
    payload       jsonb not null default '{}'::jsonb,
    result        jsonb,
    error         text,
    created_at    timestamptz not null default now(),
    started_at    timestamptz,
    completed_at  timestamptz
);
create index idx_jobs_status on public.jobs (status, created_at) where status in ('pending','running');

create table public.reports (
    id            uuid primary key default uuid_generate_v4(),
    user_id       uuid not null references auth.users(id) on delete cascade,
    month         text not null check (month ~ '^\d{4}-\d{2}$'),
    storage_path  text not null,
    generated_at  timestamptz not null default now(),
    unique (user_id, month)
);

create table public.irpf_tramos (
    id             bigint generated always as identity primary key,
    year           integer not null,
    ccaa           text not null default 'comun',
    desde          numeric(18,2) not null,
    hasta          numeric(18,2),
    tipo           numeric(6,4) not null,
    vigencia_desde date not null,
    vigencia_hasta date,
    fuente         text not null,
    created_at     timestamptz not null default now(),
    unique (year, ccaa, desde)
);
