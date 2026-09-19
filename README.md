# Dual Momentum App

Aplicación web profesional para estrategias de Dual Momentum (Absolute + Relative)  
con fiscalidad española, datos reales y stack **Netlify + Supabase**.

**Principio rector**: máxima fiabilidad y precisión.  
Si un dato no se puede verificar → `N/D` + motivo. Nunca se inventa.

---

## Características

- Tú introduces **tus propios ISINs** (multilínea o CSV)
- Validación real contra OpenFIGI + CNMV + Morningstar / QueFondos
- Modelo H multi-ventana (12M / 6M / 3M) con parámetros confirmados
- Cash = ISIN que tú defines (puerto seguro)
- Backtest bruto (neto de impuestos en fases posteriores)
- Auth obligatoria (Supabase)
- RLS en todas las tablas de usuario

---

## Stack

| Capa        | Tecnología                          |
|-------------|-------------------------------------|
| Frontend    | Next.js 14 (App Router) + TypeScript + Tailwind |
| Deploy      | Netlify (`@netlify/plugin-nextjs`)  |
| Backend     | Netlify Functions + Background Functions |
| DB / Auth   | Supabase (Postgres + Auth + RLS + Storage) |
| Quant       | Python (pandas / numpy)             |

---

## Setup local

### 1. Clonar y dependencias

```bash
pnpm install
```

### 2. Supabase

```bash
# Instalar CLI si no la tienes
npm i -g supabase

# Arrancar local
supabase start

# Aplicar migraciones
supabase db push

# Generar tipos TypeScript
pnpm supabase:types
```

### 3. Variables de entorno

Copia `.env.example` → `apps/web/.env.local` y rellena:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # solo server
CRON_SECRET=...                 # string aleatorio
```

### 4. Desarrollo

```bash
pnpm dev
```

### 5. Tests del motor quant

```bash
cd packages/quant
pip install -r requirements.txt
pytest tests/ -v
```

---

## Estructura

```
dual-momentum-app/
├── apps/web/                  # Next.js 14
├── packages/
│   ├── quant/                 # Motor Python (Modelo H + futuros)
│   └── shared/                # Tipos TypeScript compartidos
├── supabase/
│   └── migrations/            # SQL + RLS
├── netlify/functions/         # Endpoints
└── docs/
    ├── models/                # Fórmulas explícitas
    └── fiscalidad/            # IRPF 2026
```

---

## Modelo H — resumen de reglas

| Parámetro         | Valor                                      |
|-------------------|--------------------------------------------|
| Pesos             | 0.5 / 0.3 / 0.2 (editables)               |
| Filtro absoluto   | Estricto (las 3 ventanas > cash)           |
| Ranking           | Momentum compuesto                         |
| Concentración     | Top-1                                      |
| Rebalanceo        | Mensual                                    |
| Umbral rotación   | 0.5 % diferencial                          |
| Cash              | ISIN que defines tú                        |
| Universo          | ISINs que introduces tú                    |

Documentación completa: `docs/models/h_multi_window.md`

---

## Disclaimer

Uso educativo. No constituye asesoramiento financiero ni fiscal.  
Los cálculos de IRPF son orientativos y no sustituyen al asesor ni al borrador de la AEAT.
