import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import EditorHorariosSemanales from "@/components/editor-horarios-semanales";
import GuiaWhatsapp from "@/components/guia-whatsapp";
import LogoNegocioUploader from "@/components/logo-negocio-uploader";
import ActionForm from "@/components/ui/action-form";
import SeccionConfig from "@/components/seccion-config";
import ZonaPeligroEliminar from "@/components/zona-peligro-eliminar";
import { actualizarDescripcionNegocio, actualizarGoogleMapsUrl, actualizarGooglePlaceId, actualizarHorariosNegocio,
  actualizarLogoNegocio, actualizarNombreNegocio,
  actualizarPlantillaMensaje, actualizarPoliticaListaNegra, actualizarPoliticaRemarketing,
  actualizarPoliticaResenas, actualizarPoliticaRecordatorios, actualizarPoliticaSena,
  actualizarTimezoneNegocio, actualizarWhatsappNegocio, desconectarGoogleCalendar,
  desconectarMercadoPago } from "./actions";
import type { PenalidadListaNegra } from "./actions";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { readEnv } from "@/lib/env/env";
import { getDashboardData } from "@/lib/dashboard/queries";
import type { TipoPlantillaConfigurable } from "@/lib/notifications/custom-templates";
import { guiaWhatsapp } from "@/lib/notifications/guia-whatsapp";
import { stripTrailingSlashes } from "@/lib/urls/stripTrailingSlashes";
import { destinoDesconexionMp } from "@/lib/dashboard/conexion-mp";
import
{
  ejemploFaltas,
  ejemploSena,
  etiquetaPenalidad,
  etiquetaZonaHoraria,
  PLANTILLAS_AMIGABLES,
} from "@/lib/config/etiquetas";
import { VARIABLES_PLANTILLA } from "@/lib/notifications/custom-templates";
import { maskMpToken } from "@/lib/payments/mp-token";
import { DAY_ORDER } from "@/lib/staff/schedule";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio, TIMEZONES_SOPORTADAS } from "@/lib/timezone/timezone";

async function guardarPolitica(formData: FormData): Promise<void>
{
  "use server";

  const umbral = Number(formData.get("umbral"));
  const penalidadCruda = formData.get("penalidad");
  const penalidad = (typeof penalidadCruda === "string" ? penalidadCruda : "fullDeposit") as PenalidadListaNegra;

  await actualizarPoliticaListaNegra(umbral, penalidad);
}

async function guardarSena(formData: FormData): Promise<void>
{
  "use server";

  await actualizarPoliticaSena(Number(formData.get("retencionHs")));
}

async function guardarRecordatorios(formData: FormData): Promise<void>
{
  "use server";

  await actualizarPoliticaRecordatorios(
    formData.get("recordatorioActivo") === "on", Number(formData.get("recordatorioHs")));
}

async function guardarResenas(formData: FormData): Promise<void>
{
  "use server";

  await actualizarPoliticaResenas(
    formData.get("resenaActiva") === "on", Number(formData.get("resenaHs")));
}

async function guardarRemarketing(formData: FormData): Promise<void>
{
  "use server";

  await actualizarPoliticaRemarketing(
    formData.get("remarketingActivo") === "on", Number(formData.get("remarketingDias")));
}

async function guardarPlantilla(tipo: TipoPlantillaConfigurable, formData: FormData): Promise<void>
{
  "use server";

  const subject = formData.get("subject");
  const cuerpo = formData.get("cuerpo");

  await actualizarPlantillaMensaje(tipo,
    typeof subject === "string" ? subject : null,
    typeof cuerpo === "string" ? cuerpo : null);
}

async function guardarMaps(formData: FormData): Promise<void>
{
  "use server";

  const url = formData.get("mapsUrl");

  await actualizarGoogleMapsUrl(typeof url === "string" ? url : null);
}

async function guardarPlaceId(formData: FormData): Promise<void>
{
  "use server";

  const placeId = formData.get("placeId");

  await actualizarGooglePlaceId(typeof placeId === "string" ? placeId : null);
}

async function guardarDescripcion(formData: FormData): Promise<void>
{
  "use server";

  const descripcion = formData.get("descripcion");

  await actualizarDescripcionNegocio(typeof descripcion === "string" ? descripcion : null);
}

async function guardarLogo(url: string | null): Promise<void>
{
  "use server";

  await actualizarLogoNegocio(url);
}

async function guardarWhatsapp(formData: FormData): Promise<void>
{
  "use server";

  const crudo = formData.get("whatsapp");

  await actualizarWhatsappNegocio(typeof crudo === "string" ? crudo : null);
}

async function quitarTokenMp(): Promise<void>
{
  "use server";

  try
  {
    await desconectarMercadoPago();
  }
  catch (error)
  {
    // Guarda esperado: avisa en vez de 500. El resto se propaga (500).
    const destino = destinoDesconexionMp(error);

    if (destino !== null)
    {
      redirect(destino);
    }

    throw error;
  }
}

async function quitarGoogle(): Promise<void>
{
  "use server";

  await desconectarGoogleCalendar();
}

async function guardarNombre(formData: FormData): Promise<void>
{
  "use server";

  const nombreCrudo = formData.get("nombre");

  await actualizarNombreNegocio(typeof nombreCrudo === "string" ? nombreCrudo : "");
}

async function guardarTimezone(formData: FormData): Promise<void>
{
  "use server";

  const timezoneCruda = formData.get("timezone");

  await actualizarTimezoneNegocio(typeof timezoneCruda === "string" ? timezoneCruda : "");
}

async function guardarHorariosNegocio(formData: FormData): Promise<void>
{
  "use server";

  const horarios: Record<string, unknown> = {};

  for (const day of DAY_ORDER)
  {
    const valorCrudo = formData.get(day);

    horarios[day] = typeof valorCrudo === "string" ? valorCrudo : "";
  }

  await actualizarHorariosNegocio(horarios);
}

interface NegocioConfigRow
{
  readonly blacklist_umbral?: number;
  readonly blacklist_penalidad?: PenalidadListaNegra;
  readonly sena_retencion_hs?: number;
  readonly recordatorio_activo?: boolean;
  readonly recordatorio_hs?: number;
  readonly resena_activa?: boolean;
  readonly resena_hs?: number;
  readonly remarketing_activo?: boolean;
  readonly remarketing_dias?: number;
  readonly timezone?: unknown;
  readonly pais?: string;
}

/**
 * Normaliza la configuración del negocio con valores por defecto.
 *
 * @param negocio Fila cruda del dashboard.
 * @return Configuración normalizada para el formulario.
 */
function normalizarConfigNegocio(negocio: NegocioConfigRow): {
  readonly umbral: number;
  readonly penalidad: PenalidadListaNegra;
  readonly retencionHs: number;
  readonly recordatorioActivo: boolean;
  readonly recordatorioHs: number;
  readonly resenaActiva: boolean;
  readonly resenaHs: number;
  readonly remarketingActivo: boolean;
  readonly remarketingDias: number;
  readonly timezoneActual: string;
}
{
  return {
    umbral: typeof negocio.blacklist_umbral === "number" ? negocio.blacklist_umbral : 2,
    penalidad: negocio.blacklist_penalidad ?? "fullDeposit",
    retencionHs: typeof negocio.sena_retencion_hs === "number" ? negocio.sena_retencion_hs : 72,
    recordatorioActivo: negocio.recordatorio_activo !== false,
    recordatorioHs: typeof negocio.recordatorio_hs === "number" ? negocio.recordatorio_hs : 24,
    resenaActiva: negocio.resena_activa !== false,
    resenaHs: typeof negocio.resena_hs === "number" ? negocio.resena_hs : 2,
    remarketingActivo: negocio.remarketing_activo !== false,
    remarketingDias: typeof negocio.remarketing_dias === "number" ? negocio.remarketing_dias : 30,
    timezoneActual: resolverTimezoneNegocio({ timezone: negocio.timezone, pais: negocio.pais }),
  };
}

/**
 * Carga las conexiones externas del negocio (MercadoPago y Google).
 *
 * @param negocioId ID crudo del negocio.
 * @return Tokens de conexión normalizados.
 */
async function cargarConexiones(negocioId: unknown): Promise<{
  readonly mpToken: string | null;
  readonly mpConectadoAt: string | null;
  readonly gcalConectado: boolean;
}>
{
  if (typeof negocioId !== "string")
  {
    return { mpToken: null, mpConectadoAt: null, gcalConectado: false };
  }

  try
  {
    const { data: secretos } = await getSupabaseAdmin().from("negocio_secretos")
      .select("mercadopago_access_token, mp_conectado_at, google_refresh_token")
      .eq("negocio_id", negocioId).single();

    const raw = (secretos as { mercadopago_access_token?: unknown } | null)
      ?.mercadopago_access_token;
    const conectadoRaw = (secretos as { mp_conectado_at?: unknown } | null)?.mp_conectado_at;
    const gcalRaw = (secretos as { google_refresh_token?: unknown } | null)?.google_refresh_token;

    return {
      mpToken: typeof raw === "string" && raw.length > 0 ? raw : null,
      mpConectadoAt: typeof conectadoRaw === "string" ? conectadoRaw : null,
      gcalConectado: typeof gcalRaw === "string" && gcalRaw.length > 0,
    };
  }
  catch
  {
    return { mpToken: null, mpConectadoAt: null, gcalConectado: false };
  }
}

/** Indica si el lector es el dueño demo (sin cuentas reales). */
async function esDuenoDemo(): Promise<boolean>
{
  try
  {
    const supabase = await getSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();

    return user !== null && isDemoOwner({ userId: user.id, email: user.email ?? null });
  }
  catch
  {
    return false;
  }
}

/** Mensaje del resultado OAuth de MercadoPago (?mp=...). */
function mensajeMp(mp: string | undefined): { readonly texto: string; readonly clase: string } | null
{
  if (mp === "ok")
  {
    return {
      texto: "MercadoPago conectado. Las señas se cobran directo en tu cuenta.",
      clase: "ui-alert-success",
    };
  }

  if (mp === "cancelado")
  {
    return {
      texto: "Cancelaste la conexión con MercadoPago. Podés intentarlo de nuevo.",
      clase: "ui-alert-warning",
    };
  }

  if (mp === "demo")
  {
    return {
      texto: "La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas.",
      clase: "ui-alert-danger",
    };
  }

  if (mp === "error")
  {
    return {
      texto: "No pudimos conectar MercadoPago. Probá de nuevo.",
      clase: "ui-alert-danger",
    };
  }

  if (mp === "sena-activa")
  {
    return {
      texto: "Tenés servicios con seña activa. Desactivalas en Servicios y volvé a desconectar.",
      clase: "ui-alert-warning",
    };
  }

  return null;
}

interface ContextoConfig
{
  readonly negocioIdTexto: string;
  readonly mpToken: string | null;
  readonly mpConectadoAt: string | null;
  readonly gcalConectado: boolean;
  readonly demo: boolean;
  readonly avisoMp: ReturnType<typeof mensajeMp>;
  readonly mpConectado: boolean;
  readonly portalUrl: string;
  readonly whatsappGuia: ReturnType<typeof guiaWhatsapp>;
}

/**
 * Reúne el contexto de configuración (conexiones, portal y guía de WhatsApp).
 *
 * @param negocioIdCrudo ID crudo del negocio del dashboard.
 * @param negocio Fila del negocio con sus datos públicos.
 * @param searchParams Params de la URL con el aviso de MercadoPago.
 * @return Contexto normalizado para el render de la página.
 */
async function cargarContextoConfig(
  negocioIdCrudo: unknown,
  negocio: { readonly pais?: unknown; readonly slug?: unknown; readonly nombre?: unknown },
  searchParams: Promise<{ mp?: string }> | undefined,
): Promise<ContextoConfig>
{
  const negocioIdTexto = typeof negocioIdCrudo === "string" ? negocioIdCrudo : "";
  const { mpToken, mpConectadoAt, gcalConectado } = await cargarConexiones(negocioIdCrudo);
  const demo = await esDuenoDemo();
  const avisoMp = mensajeMp(searchParams === undefined ? undefined : (await searchParams)?.mp);
  const mpConectado = mpToken !== null;

  const rutaPortal = typeof negocio.pais === "string" && typeof negocio.slug === "string"
    ? `/${negocio.pais}/${negocio.slug}`
    : "/";
  const basePublica = readEnv("NEXT_PUBLIC_APP_URL")
    ?? (readEnv("VERCEL_URL") !== null ? `https://${readEnv("VERCEL_URL") as string}` : "");
  const portalUrl = basePublica.length > 0 ? `${stripTrailingSlashes(basePublica)}${rutaPortal}` : rutaPortal;
  const whatsappGuia = guiaWhatsapp({
    negocioNombre: typeof negocio.nombre === "string" ? negocio.nombre : "",
    portalUrl,
  });

  return {
    negocioIdTexto,
    mpToken,
    mpConectadoAt,
    gcalConectado,
    demo,
    avisoMp,
    mpConectado,
    portalUrl,
    whatsappGuia,
  };
}

/**
 * Renderiza la tarjeta de conexión de MercadoPago según su estado.
 *
 * @param demo Indica si el lector es el dueño demo.
 * @param mpConectado Indica si ya hay un token de MercadoPago.
 * @param desconectar Acción de servidor para desconectar la cuenta.
 * @return Panel de conexión correspondiente al estado.
 */
function panelMercadoPago(
  demo: boolean,
  mpConectado: boolean,
  desconectar: () => Promise<void>,
): ReactNode
{
  if (demo)
  {
    return (
      <p className="ui-input">
        La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas
        con tu MercadoPago.
      </p>
    );
  }

  if (mpConectado)
  {
    return (
      <ActionForm action={desconectar} successMessage="Cambios guardados.">
        <button
          type="submit"
          className="ui-btn ui-btn-outline ui-btn-sm"
        >
          Desconectar
        </button>
      </ActionForm>
    );
  }

  return (
    <Link
      href="/api/integrations/mercadopago/authorize"
      className="ui-btn ui-btn-primary"
    >
      Conectar MercadoPago
    </Link>
  );
}

export default async function ConfigPage(
  props?: { readonly searchParams?: Promise<{ mp?: string }> },
)
{
  const { data: dashboard } = await getDashboardData();
  const negocio = dashboard.negocio as NegocioConfigRow & {
    nombre?: string; pais?: string; slug?: string; horarios?: unknown;
    msg_confirmacion_subject?: string | null; msg_confirmacion_cuerpo?: string | null;
    msg_recordatorio_subject?: string | null; msg_recordatorio_cuerpo?: string | null;
    msg_resena_subject?: string | null; msg_resena_cuerpo?: string | null;
    msg_remarketing_subject?: string | null; msg_remarketing_cuerpo?: string | null;
    google_maps_url?: string | null;
    google_place_id?: string | null;
    descripcion?: string | null;
    logo_url?: string | null;
    whatsapp?: string | null;
  };
  const {
    umbral,
    penalidad,
    retencionHs,
    recordatorioActivo,
    recordatorioHs,
    resenaActiva,
    resenaHs,
    remarketingActivo,
    remarketingDias,
    timezoneActual,
  } = normalizarConfigNegocio(negocio);

  const negocioId = (dashboard.negocio as { id?: unknown }).id;
  const {
    negocioIdTexto,
    mpToken,
    mpConectadoAt,
    gcalConectado,
    demo,
    avisoMp,
    mpConectado,
    whatsappGuia,
  } = await cargarContextoConfig(negocioId, negocio, props?.searchParams);

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="ui-page-title">Configuración</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Dejá tu negocio listo en 3 pasos: datos, horarios y cobros. El resto ya viene preparado y es opcional.
        </p>
        <ol className="mt-3 grid sm:grid-cols-3 gap-2 text-xs">
          <li className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <span className="font-bold text-ink">1.</span> Contanos de tu negocio
          </li>
          <li className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <span className="font-bold text-ink">2.</span> Elegí tus horarios
          </li>
          <li className="rounded-lg border border-line bg-surface px-3 py-2 text-ink">
            <span className="font-bold text-ink">3.</span> Conectá cómo cobrás
          </li>
        </ol>
      </div>
      <SeccionConfig
        icono="tienda"
        titulo="Tu negocio"
        ayuda="Cómo se llama, en qué ciudad mostramos tus turnos y tu link para compartir."
      >
        <ActionForm action={guardarNombre} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"¿Cómo se llama tu negocio?"}
            <input
              type="text"
              name="nombre"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ej: Barbería Diego"
              defaultValue={negocio.nombre ?? ""}
              className="ui-input"
            />
          </label>
          <p className="text-xs text-muted-foreground">Tu link para compartir no cambia cuando cambiás el nombre.</p>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar nombre
          </button>
        </ActionForm>
        <LogoNegocioUploader
          negocioId={negocioIdTexto}
          nombre={negocio.nombre ?? ""}
          logoUrl={negocio.logo_url ?? null}
          action={guardarLogo}
        />
        <ActionForm action={guardarDescripcion} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"Descripción breve de tu negocio"}
            <span className="block text-xs font-normal text-muted-foreground">
              Se muestra debajo del nombre en tu página de reservas.
            </span>
            <textarea
              name="descripcion"
              rows={2}
              maxLength={300}
              defaultValue={negocio.descripcion ?? ""}
              placeholder="Ej: Barbería de barrio con turnos sin esperas."
              className="ui-textarea"
            />
          </label>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar descripción
          </button>
        </ActionForm>
        <ActionForm action={guardarTimezone} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"¿En qué ciudad mostramos tus turnos?"}
            <select
              name="timezone"
              defaultValue={timezoneActual}
              className="ui-select"
            >
              {TIMEZONES_SOPORTADAS.map((zona) => (
                <option key={zona} value={zona} className="bg-white text-ink">
                  {etiquetaZonaHoraria(zona)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-muted-foreground">
            Si elegís mal la ciudad, los turnos se ven corridos. La mayoría ya viene bien.
          </p>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar ciudad
          </button>
        </ActionForm>
        <ActionForm action={guardarMaps} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"Link de Google Maps de tu negocio"}
            <span className="block text-xs font-normal text-muted-foreground">
              Si lo cargamos, mostramos un pequeño mapa del local en tu página de reservas.
            </span>
            <input
              type="url"
              name="mapsUrl"
              defaultValue={negocio.google_maps_url ?? ""}
              placeholder="https://maps.app.goo.gl/..."
              className="ui-input"
            />
          </label>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar ubicación
          </button>
        </ActionForm>
        {typeof negocio.pais === "string" && typeof negocio.slug === "string" ? (
          <p className="text-sm text-muted-foreground">
            {"Tu link para compartir: "}
            <Link
              href={"/" + negocio.pais + "/" + negocio.slug}
              className="font-mono font-semibold text-primary hover:underline"
            >
              {"/" + negocio.pais + "/" + negocio.slug}
            </Link>
          </p>
        ) : null}
      </SeccionConfig>
      <SeccionConfig
        icono="reloj"
        titulo="Tus horarios"
        ayuda="Tocá cada día para abrir o cerrar. Si atendés siempre igual, usá los botones rápidos."
      >
        <EditorHorariosSemanales inicial={negocio.horarios} action={guardarHorariosNegocio} />
      </SeccionConfig>
      <SeccionConfig
        icono="escudo"
        titulo="Si un cliente falta"
        ayuda="Elegí qué pasa cuando alguien no viene. Ya viene listo con 2 faltas."
      >
        <ActionForm action={guardarPolitica} successMessage="Cambios guardados." className="space-y-3">
          <p
            className="ui-alert ui-alert-info text-xs"
            aria-live="polite"
          >
            {ejemploFaltas(umbral, penalidad)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 text-sm font-semibold text-ink">
            {"¿Después de cuántas faltas?"}
            <input
              type="number"
              name="umbral"
              min={1}
              max={10}
              defaultValue={umbral}
              className="ui-input"
            />
          </label>
          <label className="flex-1 text-sm font-semibold text-ink">
            {"¿Qué hacemos?"}
            <select
              name="penalidad"
              defaultValue={penalidad}
              className="ui-select"
            >
                <option value="blocked" className="bg-white text-ink">
                  {etiquetaPenalidad("blocked")}
                </option>
                <option value="fullDeposit" className="bg-white text-ink">
                  {etiquetaPenalidad("fullDeposit")}
                </option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar
          </button>
        </ActionForm>
      </SeccionConfig>
      <SeccionConfig
        icono="alcancia"
        titulo="Cómo cuidás la seña"
        ayuda="Si cancela con tiempo, se la devolvemos. Si avisa tarde, la pierde."
      >
        <p className="ui-alert ui-alert-info text-xs" aria-live="polite">
          {ejemploSena(retencionHs)}
        </p>
        <ActionForm action={guardarSena} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"¿Hasta cuántas horas antes devolvemos la seña?"}
            <input
              type="number"
              name="retencionHs"
              min={1}
              max={720}
              defaultValue={retencionHs}
              className="ui-input"
            />
          </label>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar
          </button>
        </ActionForm>
      </SeccionConfig>
      <SeccionConfig
        icono="campana"
        titulo="Avisos antes del turno"
        ayuda="Les recordamos por vos para que nadie se olvide. Recomendado: 24 hs antes."
      >
        <ActionForm action={guardarRecordatorios} successMessage="Cambios guardados." className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-ink min-h-[48px]">
            <input
              type="checkbox"
              name="recordatorioActivo"
              defaultChecked={recordatorioActivo}
              className="w-5 h-5"
            />
            {"Avisar antes del turno"}
          </label>
          <label className="block text-sm font-semibold text-ink">
            {"¿Cuántas horas antes avisamos?"}
            <input
              type="number"
              name="recordatorioHs"
              min={1}
              max={72}
              defaultValue={recordatorioHs}
              className="ui-input"
            />
          </label>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar
          </button>
        </ActionForm>
      </SeccionConfig>
      <SeccionConfig
        icono="estrella"
        titulo="Pedir opiniones"
        ayuda="Pedimos una opinión cuando termina el turno. Solo a quienes dejaron email."
      >
        <ActionForm action={guardarResenas} successMessage="Cambios guardados." className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-ink min-h-[48px]">
            <input
              type="checkbox"
              name="resenaActiva"
              defaultChecked={resenaActiva}
              className="w-5 h-5"
            />
            {"Pedir opinión cuando termina"}
          </label>
          <label className="block text-sm font-semibold text-ink">
            {"¿Cuántas horas después pedimos la opinión?"}
            <input
              type="number"
              name="resenaHs"
              min={1}
              max={72}
              defaultValue={resenaHs}
              className="ui-input"
            />
          </label>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar
          </button>
        </ActionForm>
        {resenaActiva ? (
          <ActionForm action={guardarPlaceId} successMessage="Cambios guardados." className="space-y-3">
            <label className="block text-sm font-semibold text-ink">
              {"Place ID de Google (link directo de reseña)"}
              <span className="block text-xs font-normal text-muted-foreground">
                Con esto el botón lleva directo a “escribir reseña”
              </span>
              <input
                type="text"
                name="placeId"
                defaultValue={negocio.google_place_id ?? ""}
                placeholder="ChIJ..."
                className="ui-input"
              />
            </label>
            <button
              type="submit"
              className="ui-btn ui-btn-primary"
            >
              Guardar place ID
            </button>
          </ActionForm>
        ) : null}
      </SeccionConfig>
      <SeccionConfig
        icono="repetir"
        titulo="Remarketing"
        ayuda="Te mostramos a quién ya le toca volver, para que le escribas por WhatsApp. No se envía nada automático."
        avanzada={true}
      >
        <ActionForm action={guardarRemarketing} successMessage="Cambios guardados." className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-ink min-h-[48px]">
            <input
              type="checkbox"
              name="remarketingActivo"
              defaultChecked={remarketingActivo}
              className="w-5 h-5"
            />
            {"Mostrar candidatos de remarketing"}
          </label>
          <label className="block text-sm font-semibold text-ink">
            {"¿A los cuántos días les escribimos?"}
            <input
              type="number"
              name="remarketingDias"
              min={1}
              max={90}
              defaultValue={remarketingDias}
              className="ui-input"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            {"Cada servicio puede tener su propio ritmo; esto es el valor por defecto."}
          </p>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar
          </button>
        </ActionForm>
      </SeccionConfig>
      <SeccionConfig
        icono="carta"
        titulo="Tus mensajes"
        ayuda="Ya escribimos por vos. Solo cambiá esto si querés usar tus palabras."
        avanzada={true}
      >
        <p className="text-xs text-muted-foreground">
          Podés usar estos comodines: {VARIABLES_PLANTILLA.map((v) => `{${v}}`).join(" ")}.
          Si lo dejás vacío, usamos nuestro texto.
        </p>
        {PLANTILLAS_AMIGABLES.map(({ tipo, titulo, ayuda }) =>
        {
          const key = `msg_${tipo}` as const;
          const subject = negocio[`${key}_subject` as keyof typeof negocio] as string | null | undefined;
          const cuerpo = negocio[`${key}_cuerpo` as keyof typeof negocio] as string | null | undefined;

          return (
            <ActionForm
              key={tipo}
              action={guardarPlantilla.bind(null, tipo as TipoPlantillaConfigurable)} successMessage="Cambios guardados."
              className="space-y-3 p-4 border border-line rounded-lg bg-surface"
            >
              <h3 className="text-sm font-semibold text-ink">{titulo}</h3>
              <p className="text-xs text-muted-foreground">{ayuda}</p>
              <label className="block text-sm font-semibold text-ink">
                {"Título del mensaje"}
                <input
                  type="text"
                  name="subject"
                  maxLength={120}
                  defaultValue={subject ?? ""}
                  placeholder="Vacío = usamos el nuestro"
                  className="ui-input"
                />
              </label>
              <label className="block text-sm font-semibold text-ink">
                {"Texto del mensaje"}
                <textarea
                  name="cuerpo"
                  rows={4}
                  maxLength={2000}
                  defaultValue={cuerpo ?? ""}
                  placeholder="Vacío = usamos el nuestro. Ej: Hola {negocio}, te esperamos {fecha}."
                  className="ui-textarea"
                />
              </label>
              <button
                type="submit"
                className="ui-btn ui-btn-primary"
              >
                Guardar
              </button>
            </ActionForm>
          );
        })}
      </SeccionConfig>
      <SeccionConfig
        icono="billetera"
        titulo="Cómo cobrás"
        ayuda="Conectá tu cuenta para cobrar señas directo en tu billetera."
      >
        {avisoMp !== null && (
          <p className={`ui-alert text-xs font-semibold ${avisoMp.clase}`}>
            {avisoMp.texto}
          </p>
        )}
        <div className="p-4 border border-line rounded-lg bg-surface space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-ink">MercadoPago</div>
              <div className="text-xs text-muted-foreground">Para cobrar señas en tu cuenta</div>
            </div>
            <span className={`ui-badge ${mpConectado ? "ui-badge-success" : "ui-badge-neutral"}`}>
              {mpConectado ? `Listo ${maskMpToken(mpToken)}` : "Falta conectar"}
            </span>
          </div>
          {panelMercadoPago(demo, mpConectado, quitarTokenMp)}
          <p className="text-xs text-muted-foreground">
            {mpConectado && mpConectadoAt !== null
              ? "Listo: cuando te pagan, el turno se confirma solo."
              : "Sin conectar, las reservas con seña quedan esperando el pago."}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 p-4 border border-line rounded-lg bg-surface">
            <div>
              <div className="text-sm font-semibold text-ink">Google Calendar</div>
              <div className="text-xs text-muted-foreground">Ver tus turnos en tu calendario</div>
            </div>
            <span className={`ui-badge ${gcalConectado ? "ui-badge-success" : "ui-badge-neutral"}`}>
              {gcalConectado ? "Listo" : "Falta conectar"}
            </span>
          </div>
          {gcalConectado ? (
            <ActionForm action={quitarGoogle} successMessage="Cambios guardados.">
              <button
                type="submit"
                className="ui-btn ui-btn-outline ui-btn-sm"
              >
                Desconectar Google
              </button>
            </ActionForm>
          ) : (
            <Link
              href="/api/integrations/google/authorize"
              className="ui-btn ui-btn-soft"
            >
              Conectar Google
            </Link>
          )}
        </div>
      </SeccionConfig>
      <SeccionConfig
        icono="whatsapp"
        titulo="Tu WhatsApp"
        ayuda="Poné tu número y copiá los mensajes listos para pegar en tu app."
        avanzada={true}
      >
        <ActionForm action={guardarWhatsapp} successMessage="Cambios guardados." className="space-y-3">
          <label className="block text-sm font-semibold text-ink">
            {"Tu número de WhatsApp"}
            <input
              type="tel"
              name="whatsapp"
              maxLength={25}
              placeholder="Ej: +54 9 11 1234-5678"
              defaultValue={typeof negocio.whatsapp === "string" ? negocio.whatsapp : ""}
              className="ui-input"
            />
          </label>
          <p className="text-xs text-muted-foreground">
            Lo usamos para mostrar tu contacto. Seguís respondiendo con tu propia app de WhatsApp.
          </p>
          <button
            type="submit"
            className="ui-btn ui-btn-primary"
          >
            Guardar WhatsApp
          </button>
        </ActionForm>
        <p className="text-xs text-muted-foreground">
          Copiá estos mensajes y pegalos en tu app (Mensajes rápidos). Así respondés en segundos.
        </p>
        <GuiaWhatsapp items={whatsappGuia} />
      </SeccionConfig>
      <SeccionConfig
        icono="peligro"
        titulo="Borrar todo"
        ayuda="Ojo: esto borra turnos, clientes y tu cuenta. No se puede deshacer."
        avanzada={true}
      >
        <ZonaPeligroEliminar />
      </SeccionConfig>
    </div>
  );
}
