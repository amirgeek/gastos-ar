# pesito.ar

App argentina para controlar gastos, cuentas, deudas, cuotas, tarjetas y rendimientos.

## Qué cambió en esta versión

- Módulo de rendimientos rehecho tomando como referencia la estructura de `rendimientos-ar`:
  - catálogo curado/normalizado de billeteras, cuentas remuneradas, FCIs money market y plazo fijo
  - seed más realista para cuentas e instrumentos en ARS
  - sugerencia de mover plata conectada al flujo mensual libre estimado
  - formularios de cuenta con opción de elegir una entidad conocida o usar `Otra / personalizada`
- Persistencia base en Supabase para:
  - cuentas
  - movimientos
  - deudas
  - cuotas
  - tarjetas
  - compras con tarjeta
  - presupuestos
  - rendimientos / yields
- CRUD básico en UI para cuentas, movimientos, deudas, cuotas, tarjetas, compras con tarjeta, presupuestos y rendimientos
- Carga/guardado por usuario autenticado
- Seed automático la primera vez que entra un usuario autenticado
- Módulo de tarjetas con:
  - próximo cierre
  - próximo vencimiento
  - resumen a vencer
  - ciclo siguiente
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

- **Real/referencial:** la lista curada de billeteras/cuentas remuneradas/FCIs se armó reutilizando la taxonomía y nombres de `rendimientos-ar-tmp` (`public/config.json` + CAFCI proxy). En la UI se marca qué tasas vienen de referencia y cuáles siguen siendo mock curado.
- **Mock curado:** algunos providers no estaban completos en la referencia original o no tenían una salida simple para pesito.ar. En esos casos quedó una tasa plausible y etiquetada como mock curado para no venderlo como dato vivo.
- **Plazo fijo:** quedó modelado como instrumento/inversión con estructura útil para el producto, pero sus tasas siguen mock curado inspirado en la estructura de BCRA/rendimientos-ar; no está conectado todavía a fetch en vivo.
- Si no configurás `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app sigue funcionando en modo local.
- Con Supabase activo, cada usuario ve su propia data.
- La primera carga de un usuario nuevo inserta el seed inicial en sus tablas para dejar la app usable.
- La app ya permite altas, edición y borrado básico con persistencia Supabase en los módulos principales.
- Si agregás las tablas nuevas `budgets` y `yield_rates`, también queda persistida la capa de planificación.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
