# PRD: Micro-SaaS de Reservas Inteligentes (Modelo 1-a-1)

vercel url: https://turnofijo-roan.vercel.app/

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
GOOGLE_CLIENT_SECRET
MP_ACCESS_TOKEN
NEXT_MP_PUBLIC_KEY
MP_WEBHOOK_SECRET
DEMO_DUENIO_ID


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
- `staff`: Profesionales del negocio, horarios disponibles (JSONB), token de Google Calendar (`google_calendar_token`).
- `servicios`: Duración personalizada, precio_base, precio_promocional (precio tachado), seña requerida, tiempos ocultos de limpieza.
- `clientes`: CRM local, acumulación de ausencias, lista negra.
- `turnos`: Estados (pendiente, pagado, completado, cancelado, ausente), tracking financiero, rastreador de Google Calendar (`google_calendar_event_id`), tracking de notificaciones (`notificacion_enviada`, `remarketing_enviado`), y galería de fotos (JSONB opcional).
- **Seed Data (Población de datos):** Script SQL automatizado para inyectar datos ficticios (turnos, ingresos, clientes, staff) asignados a una cuenta "Demo" permanente.

## 4. Módulos del Sistema

### Módulo 1: Landing y Onboarding B2B (es-AR default; abierto a es-MX / en-US / en-UK)
- **Locale:** Todo contenido en `es-AR` (voseo, formato `$ 15.000`, `DD/MM/YYYY`). Base i18n con `es-AR.json`; archivos de contenido vacíos/stubs para `es-MX`, `en-US`, `en-UK` reservados en el repositorio para facilitar expansión sin refactorizar UI.
- **Landing Page (`/`):** Presentación del software, planes y calculadora de pérdidas por inasistencias. Copy completo en `es-AR`. Metadata SEO `lang="es-AR"`.
- **Demo Interactivo (Sandbox):** Botón en la landing ("Probar Demo") que loguea automáticamente al usuario en una cuenta B2B pre-poblada con datos ficticios. Permite navegar el dashboard, ver la agenda llena y simular configuraciones. Todo en `es-AR`.
- **Onboarding Progresivo:** 
  1. Registro de usuario (Supabase Auth).
  2. Creación del perfil del negocio (Generación de URL dinámica `/:pais/:slug`).
  3. Conexión de MercadoPago (OAuth) para cobro de señas.
  4. Conexión de Meta WhatsApp (Opcional - Embedded Signup).
- **Paywall / Suscripción:** Bloqueo de la cuenta a los 14 días de prueba si no hay un plan de $15/mes activo en MercadoPago (verificable vía `suscripcion_mp_id`).

### Módulo 2: Portal Público de Reservas (Client-Facing)
- **URL Dinámica:** `/:pais/:slug` (Ej: `/ar/barberia-diego`). Diseño mobile-first estilo Link-in-bio.
- **Flujo de Reserva:** 
  1. Selección de Staff.
  2. Selección de Servicio. (UI Activa: Muestra nombre, duración estimada del servicio para el cliente, y si tiene `precio_promocional`, muestra el `precio_base` tachado).
  3. **Calendario Inteligente:** El motor de disponibilidad bloquea la agenda sumando matemáticamente `duración del servicio + tiempo oculto de limpieza`. Este bloque total determina exactamente a qué hora el profesional vuelve a estar disponible.
- **Checkout Flexible:** Captura de Nombre y WhatsApp. Si exige seña, redirección a MercadoPago. Si no, confirmación instantánea.

### Módulo 3: Panel de Control B2B (Dashboard)
- **Agenda Multicalendario:** Vista interactiva de turnos por profesional, con código de colores según estado (pagado, pendiente).
- **Sincronización Google Calendar:** Integración OAuth para que el dueño conecte su cuenta y el sistema inyecte sus turnos allí (Sincronización unidireccional: App -> GCal, usando `google_calendar_event_id` para actualizar/borrar).
- **Gestión de Servicios:** CRUD de servicios. Configuración individual de **duración estimada** y **tiempo oculto de limpieza (buffer)**. Toggles para cobro de seña, reembolsos automáticos y remarketing.
- **Ofertas Flash:** Campo opcional para `precio_promocional` (Precio Tachado).
- **Turnos Recurrentes:** Capacidad del administrador de agendar turnos manualmente y clonarlos hacia el futuro.

### Módulo 4: CRM y Lista Negra (Motor de Protección)
- **Ficha de Cliente:** Historial de turnos, cantidad acumulada de ausencias, notas clínicas. 
- **Galería "Antes y Después" (Opcional):** Posibilidad de adjuntar imágenes al turno finalizado para llevar un registro visual del progreso o trabajo realizado.
- **Lista Negra Automatizada:** Si un cliente (identificado por su WhatsApp) supera el umbral de ausencias configurado por el dueño (ej. 2), el sistema le aplica una penalidad automática al intentar reservar de nuevo: "Bloqueo Total" o "Exigir seña del 100%".

### Módulo 5: Automatizaciones y Notificaciones (Serverless Backend)
*Lógica de Notificaciones en Cascada: El sistema usa Email por defecto; si el dueño conectó Meta API, suprime el email y envía por WhatsApp.*
- **Emails (Resend):** Confirmación de reserva que incluye botón dinámico "Agregar a Google Calendar" (link format) y archivo `.ics` adjunto.
- **Escudo Anti-Fantasmas:** Endpoint llamado por QStash que elimina el turno y libera la agenda si una reserva con seña no registra pago en 15 minutos.
- **Gestor de Reembolsos:** Si el cliente cancela dentro de la ventana permitida, el backend consume la API de MercadoPago para devolver el dinero automáticamente.
- **Recordatorios (24hs antes):** Envío vía WhatsApp (Plantilla con botones SI/NO) o Email.
- **El Boomerang (Remarketing):** Disparador programado (QStash) que envía un mensaje a los `X` días invitando a renovar el servicio (marcando `remarketing_enviado` en `true`).
- **Recolector de Reseñas:** 2 horas post-turno, solicita calificación. 4-5 estrellas derivan a Google Maps; 1-3 estrellas generan feedback interno.
- **Alerta de Fallo en Meta:** Si la cuenta de WhatsApp del dueño se queda sin fondos, el backend captura el error y muestra una alerta roja en el Dashboard B2B.
