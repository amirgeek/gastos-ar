# pesito.ar

App argentina para controlar gastos, cuentas, deudas, cuotas, tarjetas y rendimientos.

## Qué cambió en esta versión

- Persistencia base en Supabase para:
  - cuentas
  - movimientos
  - deudas
  - cuotas
  - tarjetas
  - compras con tarjeta
- Carga/guardado por usuario autenticado
- Seed automático la primera vez que entra un usuario autenticado
- Módulo de tarjetas con:
  - próximo cierre
  - próximo vencimiento
  - resumen próximo por tarjeta
  - total comprometido por tarjeta

## Variables de entorno

Frontend / Vercel:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GALIO_CLIENT_ID`
- `GALIO_API_KEY`
- `APP_BASE_URL`
- `GALIO_SANDBOX`
- `GALIO_NOTIFICATION_URL` (opcional, idealmente `https://tu-dominio/api/galio-webhook`)

## Qué falta configurar manualmente

1. Crear proyecto en Supabase
2. Activar Email/Password en Auth
3. Ejecutar `supabase.sql` en el SQL editor
4. Cargar las env vars en Vercel o en tu `.env`
5. Configurar `APP_BASE_URL` con tu dominio real
6. Si querés reconciliar pagos automáticamente, configurar `GALIO_NOTIFICATION_URL`
7. Si querés que el backend actualice suscripciones/perfiles, asegurar `SUPABASE_SERVICE_ROLE_KEY`

## Notas pragmáticas

- Si no configurás `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app sigue funcionando en modo local.
- Con Supabase activo, cada usuario ve su propia data.
- La primera carga de un usuario nuevo inserta el seed inicial en sus tablas para dejar la app usable.
- Hoy la app persiste altas e impactos básicos sobre saldos/disponible. No hay edición ni borrado todavía.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
