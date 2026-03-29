# pesito.ar

App argentina para controlar gastos, cuentas, deudas, cuotas y rendimientos.

## Vercel + Supabase + Galio

### Variables de entorno

Frontend / Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GALIO_CLIENT_ID`
- `GALIO_API_KEY`
- `APP_BASE_URL`
- `GALIO_SANDBOX`
- `GALIO_NOTIFICATION_URL` (opcional, idealmente `https://tu-dominio/api/galio-webhook`)

### Qué falta configurar manualmente

1. Crear proyecto en Supabase
2. Activar Email/Password en Auth
3. Ejecutar `supabase.sql` en el SQL editor
4. Cargar las env vars en Vercel
5. Configurar `APP_BASE_URL` con tu dominio real
6. Si querés reconciliar pagos automáticamente, configurar `GALIO_NOTIFICATION_URL`

### Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
