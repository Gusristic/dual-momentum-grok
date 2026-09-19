# Web local (sin Netlify / Supabase)

```bash
cd apps/web
npm install
npm run dev
```

http://localhost:3000 → /signal

| Ruta | Contenido |
|------|-----------|
| /signal | Señal actual + rotaciones |
| /backtest | Métricas + CLI |
| /config | Universo 12 ISINs (localStorage) |

Motor H = CLI Python. UI muestra último resultado en `lib/local-data.ts`.
