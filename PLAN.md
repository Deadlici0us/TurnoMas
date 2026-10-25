# PRD: Micro-SaaS de Reservas Inteligentes (Modelo 1-a-1)

produccion: https://turnomas.com/
preview: https://turno-mas.vercel.app/

Vercel secrets: 
RESEND_API_KEY
EMAIL_FROM
QSTASH_URL
QSTASH_TOKEN
QSTASH_CURRENT_SIGNING_KEY
QSTASH_NEXT_SIGNING_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY 
GOOGLE_CLIENT_ID
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
MP_CLIENT_ID
MP_CLIENT_SECRET


## 1. Visión General
Sistema B2B de reservas para profesionales independientes (estéticas, barberías, etc.). El objetivo es eliminar inasistencias mediante el cobro de señas y notificaciones automatizadas. 
**Regla principal de arquitectura:** Costo operativo inicial de $0. Arquitectura 100% Serverless.

## 2. Stack Tecnológico
- **Framework:** Next.js (App Router) + TypeScript. Monorepo para Frontend y Backend.
- **Styling & UI:** Tailwind CSS + shadcn/ui.
- **Hosting:** Vercel (Serverless functions para webhooks y APIs).
- **Base de Datos & Auth:** Supabase (PostgreSQL, Supabase Auth con Email/Pass, Storage para logos/avatares/galería).
- **Pagos:** MercadoPago API (Suscripción del SaaS vía Preapproval + Señas delegadas vía OAuth).
- **Notificaciones Base:** Resend (Emails transaccionales gratuitos).
- **Notificaciones Premium:** Meta WhatsApp Cloud API (Embedded Signup, costo delegado al usuario final).
- **Cron Jobs / Background Tasks:** Upstash (QStash) para disparar tareas programadas en Next.js.

## 2.1. Arquitectura de Abstracciones (Agnóstica de Proveedores)
Para mantener el código flexible y preparado para escalar a otros países o cambiar de infraestructura sin reescribir la lógica de negocio, el sistema implementará un patrón de Puertos y Adaptadores (Arquitectura Hexagonal). Todo servicio externo se definirá mediante interfaces (contratos) en TypeScript:

IEmailProvider: Implementación inicial con ResendAdapter. Preparado para migrar fácilmente a AmazonSESAdapter o SendGridAdapter.

IPaymentGateway: Implementación inicial con MercadoPagoAdapter (Argentina/Latam). Abstrae la lógica de pagos, suscripciones y reembolsos para facilitar la futura integración de un StripeAdapter (Expansión internacional).

IBackgroundJobs: Contrato para la programación de tareas. Implementación inicial QStashAdapter, migrable a SQS, Cloud Tasks o In-house workers.

IDatabaseClient / Repositorios: Capa de abstracción sobre las consultas a la base de datos para no acoplar fuertemente el modelo de dominio al SDK de Supabase, facilitando la migración a Prisma, Drizzle u otro ORM/BaaS.

IStorageProvider: Interfaz para el manejo de archivos (logos, galerías). Implementado con SupabaseStorageAdapter, migrable a AWS S3 o Cloudflare R2.

IHostingEnvironment: Abstracción de variables y utilidades del entorno, manteniendo independencia estricta de Vercel en caso de migrar a AWS Amplify o un VPS nativo.

## 2.2. Configuración regional e idioma (i18n)

Todo el producto es 100% en español (es-AR, voseo donde aplique).
Incluye: Landing, Portal `/:pais/:slug`, Dashboard B2B, Onboarding, Emails Resend, plantillas WhatsApp, errores/validaciones, metadata SEO `lang="es"`.
No se shippea ningún texto en inglés visible al usuario. Solo se permite inglés en código/comentarios/APIs externas.

Se implementará una capa de i18n basada en diccionarios (`.json`) por default `es-AR`. Estricto hard-block para inglés visible en UI. Footer/link de idiomas reservado para futuros lanzamientos de `es-MX`, `en-US`, `en-UK`, etc., cuando se incorporen.

## 3. Entidades de Base de Datos (Supabase SQL)
- `negocios`: Suscripciones B2B (`suscripcion_estado`, `suscripcion_mp_id`), Tokens de Meta (`meta_access_token`, `whatsapp_phone_number_id`, `waba_id`), Token de MP (`mercadopago_access_token`), config de lista negra.
- `staff`: Profesionales del negocio y horarios disponibles (JSONB).
- `servicios`: Duración, precio_base, precio_promocional (precio tachado), seña requerida.
- `clientes`: CRM local, acumulación de ausencias, lista negra.
- `turnos`: Estados (pendiente, confirmado, pagado, completado, cancelado, ausente) — `confirmado`=sin seña $0 cobrado, `pagado`=seña cobrada — tracking financiero, tracking de notificaciones (`notificacion_enviada`, `remarketing_enviado`), y galería de fotos (JSONB opcional).

## 4. Módulos del Sistema

### Módulo 1: Landing y Onboarding B2B (es-AR default; abierto a es-MX / en-US / en-UK)
- **Locale:** Todo contenido en `es-AR` (voseo, formato `$ 15.000`, `DD/MM/YYYY`). Base i18n con `es-AR.json`; archivos de contenido vacíos/stubs para `es-MX`, `en-US`, `en-UK` reservados en el repositorio para facilitar expansión sin refactorizar UI.
- **Landing Page (`/`):** Presentación del software, planes y calculadora de pérdidas por inasistencias. Copy completo en `es-AR`. Metadata SEO `lang="es-AR"`.
- **Onboarding Progresivo:** 
  1. Registro de usuario (Supabase Auth).
  2. Creación del perfil del negocio (Generación de URL dinámica `/:pais/:slug`).
  3. Conexión de MercadoPago (OAuth) para cobro de señas.
  4. Conexión de Meta WhatsApp (Opcional - Embedded Signup).
- **Paywall / Suscripción:** Bloqueo de la cuenta a los 14 días de prueba si no hay un plan de $15/mes activo en MercadoPago (verificable vía `suscripcion_mp_id`). El pago se inicia desde el cliente (`SuscripcionForm` → `POST /api/suscripcion/crear`), que crea un Preapproval sin plan en `pending` con `external_reference` = negocio, `notification_url` = `/api/webhooks` y devuelve `init_point` (el pagador elige saldo en cuenta o tarjeta).
  - **Activación:** el webhook `subscription_preapproval` activa la suscripción por `external_reference`. Como respaldo (webhook no configurado, `MP_WEBHOOK_SECRET` ausente/incoherente o notificación perdida), al volver del checkout (`?suscripcion=ok`) y con el botón "Ya pagué, verificar ahora" (`VerificarPago` → `POST /api/suscripcion/verificar`) se reconcilia contra MP: si hay un Preapproval `authorized` se activa el plan y se cancelan los duplicados; si sólo hay `pending` se reutiliza su `init_point`.
  - **Config MP:** en "Tus integraciones" → Webhooks, cargar `https://<host>/api/webhooks` con los topics `subscription_preapproval`, `subscription_authorized_payment` y `payment`, usando como secret el valor de `MP_WEBHOOK_SECRET`.

### Módulo 2: Portal Público de Reservas (Client-Facing)
- **URL Dinámica:** `/:pais/:slug` (Ej: `/ar/barberia-diego`). Diseño mobile-first estilo Link-in-bio.
- **Flujo de Reserva:** 
  1. Selección de Staff.
  2. Selección de Servicio. (UI Activa: Muestra nombre, duración estimada del servicio para el cliente, y si tiene `precio_promocional`, muestra el `precio_base` tachado).
  3. **Calendario Inteligente:** El motor de disponibilidad bloquea la agenda según la `duración del servicio`. Este bloque determina exactamente a qué hora el profesional vuelve a estar disponible.
- **Checkout Flexible:** Captura de Nombre y WhatsApp. Si exige seña, redirección a MercadoPago. Si no, confirmación instantánea.

### Módulo 3: Panel de Control B2B (Dashboard)
- **Agenda Multicalendario:** Vista semanal por profesional con código de colores según estado (confirmado, pagado, pendiente).
- **Gestión de Servicios:** CRUD de servicios. Configuración individual de **duración estimada**. Toggles para cobro de seña, reembolsos automáticos y remarketing.
- **Ofertas Flash:** Campo opcional para `precio_promocional` (Precio Tachado).
- **Turnos Recurrentes:** Capacidad del administrador de agendar turnos manualmente y clonarlos hacia el futuro.

### Módulo 4: CRM y Lista Negra (Motor de Protección)
- **Ficha de Cliente:** Historial de turnos, cantidad acumulada de ausencias, notas clínicas. 
- **Galería "Antes y Después" (Opcional):** Posibilidad de adjuntar imágenes al turno finalizado para llevar un registro visual del progreso o trabajo realizado.
- **Lista Negra Automatizada:** Si un cliente (identificado por su WhatsApp) supera el umbral de ausencias configurado por el dueño (ej. 2), el sistema le aplica una penalidad automática al intentar reservar de nuevo: "Bloqueo Total" o "Exigir seña del 100%".

### Módulo 5: Automatizaciones y Notificaciones (Serverless Backend)
*Lógica de Notificaciones en Cascada: El sistema usa Email por defecto; si el dueño conectó Meta API, suprime el email y envía por WhatsApp.*
- **Emails (Resend):** Confirmación de reserva por email.
- **Escudo Anti-Fantasmas:** Endpoint llamado por QStash que elimina el turno y libera la agenda si una reserva con seña no registra pago en 15 minutos.
- **Gestor de Reembolsos:** Si el cliente cancela dentro de la ventana permitida, el backend consume la API de MercadoPago para devolver el dinero automáticamente.
- **Recordatorios (24hs antes):** Envío vía WhatsApp (Plantilla con botones SI/NO) o Email.
- **El Boomerang (Remarketing):** Disparador programado (QStash) que envía un mensaje a los `X` días invitando a renovar el servicio (marcando `remarketing_enviado` en `true`).
- **Recolector de Reseñas:** 2 horas post-turno, solicita calificación. 4-5 estrellas derivan a Google Maps; 1-3 estrellas generan feedback interno.
- **Alerta de Fallo en Meta:** Si la cuenta de WhatsApp del dueño se queda sin fondos, el backend captura el error y muestra una alerta roja en el Dashboard B2B.

---

## Revisión de código con Repomix

Para revisar y documentar cambios de código sin exponer archivos grandes ni perder contexto, se configura Repomix (`repomix`) como herramienta de empaquetado de código para IA.

### Configuración del repo (`repomix.config.json`)
- Ignora `node_modules`, `.next`, `.env*`, `repomix-output.*`, `coverage`, tests (`*.test.*`, `*.spec.*`) y archivos de configuración (README, PLAN, AGENTS, CLAUDE).
- Salida por defecto: `repomix-output.xml` (formato XML, ordenado por cambios git, sin archivos vacíos).
- Scripts de npm disponibles (`package.json`):
  - `npm run repomix` → genera `repomix-output.xml`.
  - `npm run repomix:md` → genera `repomix-output.md`.
  - `npm run repomix:stdout` → salida directa a stdout.

### Uso recomendado para revisión
1. Antes de revisar un módulo (ej. `lib/availability/`, `app/api/webhooks/`, `lib/adapters/`):
   ```bash
   repomix lib/availability/ -o repomix-availability.xml --quiet
   ```
2. Si hay muchos archivos, usar el archivo generado (`repomix-output.xml`) para alimentar al asistente sin enviar cada archivo individual.
3. El archivo generado está en `.gitignore` implícito (`repomix-output.*`) — no commitear; reconstruir según necesidad.

### Regla de flujo
- No modificar `repomix-output.xml` a mano (es read-only por diseño).
- Al hacer PR o revisión: regenerar el archivo para el módulo afectado y incluir referencia al archivo generado en el comentario del PR.
- No exponer credenciales (`.env*`) en el output: excluir con `repomix.config.json`.
