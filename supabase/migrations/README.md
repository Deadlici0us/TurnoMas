# Inicializar TurnoMas con una base Supabase vacía

Esta carpeta contiene `0000_init.sql`, el único archivo necesario para crear
el esquema completo de TurnoMas en un proyecto Supabase vacío.

> `0000_init.sql` está pensado para bases nuevas. **No es un script de
> upgrade** y no actualiza bases existentes. Para bases ya creadas, ver
> [Actualizar una base existente](#actualizar-una-base-existente).

## Qué crea `0000_init.sql`

- 12 tablas: negocios, secretos, staff, servicios, clientes, turnos,
  reembolsos, eventos de turno, pagos de suscripción, reseñas, servicios por
  profesional y promociones.
- Claves foráneas, checks, índices y triggers de `updated_at`.
- RLS con acceso del dueño y lectura anónima mínima del portal público.
- 4 vistas públicas: `portal_negocios`, `portal_staff`, `portal_servicios`
  y `portal_staff_servicios`.
- La función `reclamar_reembolso`, usada por el flujo de devoluciones.
- Los buckets de Storage `logos` y `galeria`, con sus policies.

## Requisitos

- Un proyecto Supabase vacío.
- Node.js y las dependencias del proyecto instaladas.
- Las variables de entorno de `.env.example`.

## 1. Crear el proyecto en Supabase

1. Entrar a <https://supabase.com/dashboard>.
2. Crear un proyecto nuevo y esperar a que termine la provisión.
3. Guardar la URL del proyecto, la publishable key y la secret key.

## 2. Ejecutar el esquema

1. Abrir el proyecto en Supabase.
2. Ir a **SQL Editor**.
3. Pegar el contenido completo de `0000_init.sql`.
4. Ejecutar con **Run**.

El script es idempotente para reintentos, pero debe correrse sobre una base
vacía. Si falla a mitad de camino, se puede volver a ejecutar.

## 3. Verificar que el esquema quedó creado

En el SQL Editor se pueden correr estas consultas:

```sql
-- Deben ser 12 tablas.
select count(*) as tablas
from pg_tables
where schemaname = 'public';

-- Deben ser 4 vistas.
select table_name
from information_schema.views
where table_schema = 'public'
order by table_name;

-- Deben ser 14 policies públicas.
select count(*) as policies
from pg_policies
where schemaname = 'public';

-- Deben existir los dos buckets.
select id, name, public
from storage.buckets
where id in ('logos', 'galeria');

-- Deben existir las funciones del esquema.
select proname
from pg_proc
join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
where nspname = 'public'
  and proname in ('set_updated_at', 'reclamar_reembolso');
```

## 4. Configurar Supabase Auth

En **Authentication**:

1. Habilitar el proveedor **Email** con email y contraseña.
2. En **URL Configuration**, configurar:
   - **Site URL**: la URL pública de la app, por ejemplo
     `https://turnomas.com`.
   - **Redirect URLs**: agregar `<url-de-la-app>/auth/callback`.
3. Para desarrollo local, agregar también
   `http://localhost:3000/auth/callback`.
4. Si no querés depender de emails de confirmación en desarrollo, desactivar
   temporalmente **Confirm email**.

Sin un usuario real en `auth.users` no se puede crear un negocio: la tabla
`negocios` tiene una clave foránea contra `auth.users`.

## 5. Configurar variables de entorno

Copiar `.env.example` a `.env.local` y completar los valores:

```bash
cp .env.example .env.local
```

### Obligatorias

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto Supabase. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Clave pública para el cliente. |
| `SUPABASE_SECRET_KEY` | Clave de servicio, solo servidor. Nunca exponerla. |

### Recomendadas

| Variable | Uso |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL pública para links, callbacks y QStash. |
| `CANCELACION_SECRET` | Firma de links de cancelación; mínimo 32 caracteres. |
| `ADMIN_EMAIL` | Email habilitado para `/admin/promociones`. |
| `DEMO_DUENIO_ID` | UID legado del dueño demo; solo para compatibilidad. |

### Integraciones opcionales

| Variables | Integración |
| --- | --- |
| `RESEND_API_KEY`, `EMAIL_FROM` | Emails transaccionales. |
| `QSTASH_URL`, `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` | Crons y tareas en background. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Calendar. |
| `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET` | Suscripción SaaS de MercadoPago. |
| `MP_CLIENT_ID`, `MP_CLIENT_SECRET` | OAuth de MercadoPago para señas. |
| `MP_PLAN_ARS`, `MP_PLAN_USD`, `MP_MARGEN_RENOVACION_HORAS` | Precio y margen del plan. |
| `DEMO_EMAIL`, `DEMO_PASSWORD` | Credenciales demo opcionales. |

La app tiene valores por defecto para la demo, pero no para las integraciones
externas.

## 6. Levantar la aplicación

```bash
npm install
npm run dev
```

Abrir `http://localhost:3000`.

## 7. Crear el primer negocio

1. Ir a `/register` y crear una cuenta.
2. Completar el onboarding: nombre del negocio, país y horarios.
3. El onboarding crea la fila en `negocios` y genera el slug público.
4. Cargar profesionales, servicios y horarios desde el dashboard.
5. Abrir el portal en `/<pais>/<slug>`.

La base nueva **no necesita datos iniciales**. El dashboard y el portal
estarán vacíos hasta completar estos pasos.

## 8. Probar la demo

La cuenta demo actual se sirve en memoria desde `lib/seed/demo-rows.ts`:

- Portal: `/ar/negocio-demo`.
- Login demo: las credenciales públicas configuradas en la app.
- No escribe en Supabase.
- No necesita `seed-demo.sql`.

`cleanup-demo.sql` (en `supabase/`) solo se usa en bases existentes que
tengan datos de la demo legada. **No ejecutarlo en una base nueva.**

## 9. Integraciones externas

### MercadoPago

- Webhook de la suscripción SaaS: `<app>/api/webhooks`.
- Topics: `subscription_preapproval`, `subscription_authorized_payment` y
  `payment`.
- Callback OAuth de señas:
  `<app>/api/integrations/mercadopago/callback`.

### Google Calendar

- Callback OAuth: `<app>/api/integrations/google/callback`.

### Crons con QStash

Programar llamadas `POST` a:

- `<app>/api/cron/recordatorios`
- `<app>/api/cron/antifantasma`
- `<app>/api/cron/resenas`
- `<app>/api/cron/suscripciones`

Los endpoints usan la firma de QStash y `CANCELACION_SECRET` según
corresponda.

### Emails

Configurar el dominio y la casilla verificada en Resend, y usar esa casilla
en `EMAIL_FROM`.

## Actualizar una base existente

`supabase/hardening-email.sql` endurece el check `clientes_email_check` en
bases creadas antes de este cambio. Rechaza llaves, espacios, puntos
consecutivos y dominios/TLD inválidos que antes pasaban y hacían fallar el
envío con Resend.

1. Abrir **SQL Editor** en Supabase.
2. Ejecutar el contenido de `supabase/hardening-email.sql`.
3. Revisar las filas inválidas con la consulta de diagnóstico comentada.
4. Corregir esos emails y ejecutar el `validate constraint` comentado.

El script agrega el constraint como `NOT VALID`: las filas nuevas y editadas
se validan desde el primer momento, pero la migración no falla si quedan
datos viejos inválidos.

## 10. Troubleshooting

### Error de clave foránea al crear el negocio

La tabla `negocios.duenio_id` referencia `auth.users`. Primero hay que
registrarse o crear el usuario desde Authentication; no insertar el negocio
manualmente sin usuario.

### El dashboard aparece vacío

Falta completar el onboarding o el usuario no tiene una fila en `negocios`.

### El portal devuelve 404

No existe el negocio, el slug no coincide o el negocio no tiene los datos
públicos necesarios.

### No se puede subir el logo o la foto del profesional

- La request debe tener sesión autenticada.
- Los buckets `logos` y `galeria` deben existir.
- Las policies de Storage se crean con `0000_init.sql`; verificar que el
  script se haya ejecutado completo.

### Error de permisos en reembolsos

La función `reclamar_reembolso` está reservada a `service_role`. La app debe
usar `SUPABASE_SECRET_KEY` en el servidor; no se puede llamar con la clave
anónima.

### No se envían emails o no se crean pagos

Faltan las variables de Resend, QStash o MercadoPago, o las credenciales no
son válidas. El esquema de la base no reemplaza esas integraciones.

### Supabase Auth redirige a localhost

Revisar **Site URL** y **Redirect URLs** en Authentication. En producción la
URL debe ser la del dominio público; en desarrollo, la de `localhost`.

## 11. Checklist

- [ ] Proyecto Supabase creado.
- [ ] `0000_init.sql` ejecutado completo.
- [ ] 12 tablas, 4 vistas y 14 policies verificadas.
- [ ] Buckets `logos` y `galeria` creados.
- [ ] Auth con Email/Password habilitado.
- [ ] Site URL y Redirect URLs configuradas.
- [ ] `.env.local` completo.
- [ ] App levantada.
- [ ] Primer usuario registrado.
- [ ] Onboarding completado.
- [ ] Portal y dashboard accesibles.

## Notas de seguridad

- `SUPABASE_SECRET_KEY` es solo para el servidor. No debe llegar al cliente,
  a un repositorio ni a logs.
- No commitear `.env.local` ni valores reales de integraciones.
- `0000_init.sql` no actualiza bases existentes.
- Antes de ejecutar cambios destructivos en una base con datos, hacer backup.
- La demo es de solo lectura y no debe persistir datos en Supabase.
