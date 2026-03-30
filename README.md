# pesito.ar

App argentina para ordenar cuentas, movimientos, deudas, cuotas, tarjetas y comparar rendimientos de referencia en ARS.

## Estado actual del producto

Listo para uso público en su núcleo manual:

- cuentas y billeteras
- movimientos
- deudas
- compras en cuotas
- tarjetas de crédito y consumos
- presupuestos
- comparador orientativo de rendimientos en ARS
- autenticación y persistencia por usuario con Supabase opcional

## Limpieza de producción aplicada

- se removió el seed financiero demo para usuarios nuevos
- se reemplazó copy placeholder o demasiado interna por lenguaje público
- se ocultó la suscripción pública porque la activación automática todavía no estaba cerrada de punta a punta
- se deshabilitó el webhook de pagos hasta validar payload, seguridad y reconciliación real
- se simplificó el módulo de rendimientos para dejarlo explícitamente como referencia manual, no como dato en vivo

## Variables de entorno

Frontend:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend opcional:

- `SUPABASE_SERVICE_ROLE_KEY` solo si más adelante se vuelve a habilitar automatización server-side
- `APP_BASE_URL`

## Configuración mínima

1. Crear proyecto en Supabase
2. Activar Email/Password en Auth
3. Ejecutar `supabase.sql` en el SQL editor
4. Cargar las env vars del frontend en Vercel o en `.env`
5. Configurar `APP_BASE_URL` con tu dominio real

## Notas reales

- Si no configurás `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, la app funciona en modo local en el navegador.
- Si configurás Supabase, cada usuario ve y guarda su propia data.
- El comparador de rendimientos usa valores de referencia curados. No promete tasas en vivo ni ejecución automática.
- La parte de cobros/suscripciones quedó intencionalmente fuera de producción pública hasta cerrar validación real del flujo.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run preview`
