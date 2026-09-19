-- ============================================================
-- 0002 · ROW LEVEL SECURITY
-- Regla: datos de usuario → auth.uid() = user_id
-- Datos de mercado (instruments, prices, irpf_tramos) → lectura auth, escritura service_role
-- ============================================================

alter table public.instruments enable row level security;
create policy "instruments_select_authenticated" on public.instruments for select to authenticated using (true);
create policy "instruments_insert_service" on public.instruments for insert to service_role with check (true);
create policy "instruments_update_service" on public.instruments for update to service_role using (true) with check (true);

alter table public.prices enable row level security;
create policy "prices_select_authenticated" on public.prices for select to authenticated using (true);
create policy "prices_insert_service" on public.prices for insert to service_role with check (true);

alter table public.models enable row level security;
create policy "models_select_own" on public.models for select to authenticated using (auth.uid() = user_id);
create policy "models_insert_own" on public.models for insert to authenticated with check (auth.uid() = user_id);
create policy "models_update_own" on public.models for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "models_delete_own" on public.models for delete to authenticated using (auth.uid() = user_id);

alter table public.backtests enable row level security;
create policy "backtests_select_own" on public.backtests for select to authenticated using (auth.uid() = user_id);
create policy "backtests_insert_service" on public.backtests for insert to service_role with check (true);
create policy "backtests_delete_own" on public.backtests for delete to authenticated using (auth.uid() = user_id);

alter table public.signals enable row level security;
create policy "signals_select_own" on public.signals for select to authenticated using (auth.uid() = user_id);
create policy "signals_insert_service" on public.signals for insert to service_role with check (true);

alter table public.allocations enable row level security;
create policy "allocations_select_own" on public.allocations for select to authenticated using (auth.uid() = user_id);
create policy "allocations_insert_service" on public.allocations for insert to service_role with check (true);

alter table public.correlations enable row level security;
create policy "correlations_select_own" on public.correlations for select to authenticated using (auth.uid() = user_id);
create policy "correlations_insert_service" on public.correlations for insert to service_role with check (true);

alter table public.portfolios enable row level security;
create policy "portfolios_select_own" on public.portfolios for select to authenticated using (auth.uid() = user_id);
create policy "portfolios_insert_own" on public.portfolios for insert to authenticated with check (auth.uid() = user_id);
create policy "portfolios_update_own" on public.portfolios for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "portfolios_delete_own" on public.portfolios for delete to authenticated using (auth.uid() = user_id);

alter table public.portfolio_positions enable row level security;
create policy "positions_select_own" on public.portfolio_positions for select to authenticated using (auth.uid() = user_id);
create policy "positions_insert_own" on public.portfolio_positions for insert to authenticated with check (auth.uid() = user_id);
create policy "positions_update_own" on public.portfolio_positions for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "positions_delete_own" on public.portfolio_positions for delete to authenticated using (auth.uid() = user_id);

alter table public.tax_events enable row level security;
create policy "tax_events_select_own" on public.tax_events for select to authenticated using (auth.uid() = user_id);
create policy "tax_events_insert_own" on public.tax_events for insert to authenticated with check (auth.uid() = user_id);
create policy "tax_events_delete_own" on public.tax_events for delete to authenticated using (auth.uid() = user_id);

alter table public.jobs enable row level security;
create policy "jobs_select_own" on public.jobs for select to authenticated using (auth.uid() = user_id);
create policy "jobs_insert_service" on public.jobs for insert to service_role with check (true);
create policy "jobs_update_service" on public.jobs for update to service_role using (true) with check (true);

alter table public.reports enable row level security;
create policy "reports_select_own" on public.reports for select to authenticated using (auth.uid() = user_id);
create policy "reports_insert_service" on public.reports for insert to service_role with check (true);

alter table public.irpf_tramos enable row level security;
create policy "irpf_tramos_select_authenticated" on public.irpf_tramos for select to authenticated using (true);
create policy "irpf_tramos_insert_service" on public.irpf_tramos for insert to service_role with check (true);
