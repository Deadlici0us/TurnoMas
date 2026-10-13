import Link from "next/link";
import { redirect } from "next/navigation";

import EditorHorariosSemanales from "@/components/editor-horarios-semanales";
import SeccionConfig from "@/components/seccion-config";
import ZonaPeligroEliminar from "@/components/zona-peligro-eliminar";
import { actualizarGoogleMapsUrl, actualizarHorariosNegocio, actualizarNombreNegocio,
  actualizarPlantillaMensaje, actualizarPoliticaListaNegra, actualizarPoliticaRemarketing,
  actualizarPoliticaResenas, actualizarPoliticaRecordatorios, actualizarPoliticaSena,
  actualizarTimezoneNegocio, desconectarGoogleCalendar,
  desconectarMercadoPago } from "./actions";
import type { PenalidadListaNegra } from "./actions";
import { isDemoOwner } from "@/lib/auth/demo-guard";
import { getDashboardData } from "@/lib/dashboard/queries";
import type { TipoPlantillaConfigurable } from "@/lib/notifications/custom-templates";
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
      clase: "bg-green-500/10 text-green-300 border-green-500/30",
    };
  }

  if (mp === "cancelado")
  {
    return {
      texto: "Cancelaste la conexión con MercadoPago. Podés intentarlo de nuevo.",
      clase: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    };
  }

  if (mp === "demo")
  {
    return {
      texto: "La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas.",
      clase: "bg-red-500/10 text-red-300 border-red-500/30",
    };
  }

  if (mp === "error")
  {
    return {
      texto: "No pudimos conectar MercadoPago. Probá de nuevo.",
      clase: "bg-red-500/10 text-red-300 border-red-500/30",
    };
  }

  if (mp === "sena-activa")
  {
    return {
      texto: "Tenés servicios con seña activa. Desactivalas en Servicios y volvé a desconectar.",
      clase: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    };
  }

  return null;
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
  const { mpToken, mpConectadoAt, gcalConectado } = await cargarConexiones(negocioId);
  const demo = await esDuenoDemo();
  const avisoMp = mensajeMp(props?.searchParams === undefined
    ? undefined
    : (await props.searchParams)?.mp);

  const mpConectado = mpToken !== null;

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Configuración</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Dejá tu negocio listo en 3 pasos: datos, horarios y cobros. El resto ya viene preparado y es opcional.
        </p>
        <ol className="mt-3 grid sm:grid-cols-3 gap-2 text-xs">
          <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
            <span className="font-bold text-slate-100">1.</span> Contanos de tu negocio
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
            <span className="font-bold text-slate-100">2.</span> Elegí tus horarios
          </li>
          <li className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-slate-300">
            <span className="font-bold text-slate-100">3.</span> Conectá cómo cobrás
          </li>
        </ol>
      </div>
      <SeccionConfig
        icono="tienda"
        titulo="Tu negocio"
        ayuda="Cómo se llama, en qué ciudad mostramos tus turnos y tu link para compartir."
      >
        <form action={guardarNombre} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            {"¿Cómo se llama tu negocio?"}
            <input
              type="text"
              name="nombre"
              required
              minLength={2}
              maxLength={80}
              placeholder="Ej: Barbería Diego"
              defaultValue={negocio.nombre ?? ""}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none placeholder:text-slate-500 [color-scheme:dark]
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <p className="text-xs text-slate-400">Tu link para compartir no cambia cuando cambiás el nombre.</p>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar nombre
          </button>
        </form>
        <form action={guardarTimezone} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            {"¿En qué ciudad mostramos tus turnos?"}
            <select
              name="timezone"
              defaultValue={timezoneActual}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TIMEZONES_SOPORTADAS.map((zona) => (
                <option key={zona} value={zona} className="bg-slate-900 text-slate-100">
                  {etiquetaZonaHoraria(zona)}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-400">
            Si elegís mal la ciudad, los turnos se ven corridos. La mayoría ya viene bien.
          </p>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar ciudad
          </button>
        </form>
        {typeof negocio.pais === "string" && typeof negocio.slug === "string" ? (
          <p className="text-sm text-slate-400">
            {"Tu link para compartir: "}
            <Link
              href={"/" + negocio.pais + "/" + negocio.slug}
              className="font-mono font-semibold text-blue-400 hover:underline"
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
        <form action={guardarPolitica} className="space-y-3">
          <p
            className="text-xs rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-blue-200"
            aria-live="polite"
          >
            {ejemploFaltas(umbral, penalidad)}
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
          <label className="flex-1 text-sm font-semibold text-slate-200">
            {"¿Después de cuántas faltas?"}
            <input
              type="number"
              name="umbral"
              min={1}
              max={10}
              defaultValue={umbral}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100
                rounded-xl outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500
                focus:border-blue-500"
            />
          </label>
          <label className="flex-1 text-sm font-semibold text-slate-200">
            {"¿Qué hacemos?"}
            <select
              name="penalidad"
              defaultValue={penalidad}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100
                rounded-xl outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500
                focus:border-blue-500"
            >
                <option value="blocked" className="bg-slate-900 text-slate-100">
                  {etiquetaPenalidad("blocked")}
                </option>
                <option value="fullDeposit" className="bg-slate-900 text-slate-100">
                  {etiquetaPenalidad("fullDeposit")}
                </option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </SeccionConfig>
      <SeccionConfig
        icono="alcancia"
        titulo="Cómo cuidás la seña"
        ayuda="Si cancela con tiempo, se la devolvemos. Si avisa tarde, la pierde."
      >
        <p className="text-xs rounded-xl border border-blue-500/25 bg-blue-500/10 p-3 text-blue-200" aria-live="polite">
          {ejemploSena(retencionHs)}
        </p>
        <form action={guardarSena} className="space-y-3">
          <label className="block text-sm font-semibold text-slate-200">
            {"¿Hasta cuántas horas antes devolvemos la seña?"}
            <input
              type="number"
              name="retencionHs"
              min={1}
              max={720}
              defaultValue={retencionHs}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </SeccionConfig>
      <SeccionConfig
        icono="campana"
        titulo="Avisos antes del turno"
        ayuda="Les recordamos por vos para que nadie se olvide. Recomendado: 24 hs antes."
      >
        <form action={guardarRecordatorios} className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200 min-h-[48px]">
            <input
              type="checkbox"
              name="recordatorioActivo"
              defaultChecked={recordatorioActivo}
              className="w-5 h-5"
            />
            {"Avisar antes del turno"}
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            {"¿Cuántas horas antes avisamos?"}
            <input
              type="number"
              name="recordatorioHs"
              min={1}
              max={72}
              defaultValue={recordatorioHs}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </SeccionConfig>
      <SeccionConfig
        icono="estrella"
        titulo="Pedir opiniones"
        ayuda="Pedimos una opinión cuando termina el turno. Solo a quienes dejaron email."
      >
        <form action={guardarResenas} className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200 min-h-[48px]">
            <input
              type="checkbox"
              name="resenaActiva"
              defaultChecked={resenaActiva}
              className="w-5 h-5"
            />
            {"Pedir opinión cuando termina"}
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            {"¿Cuántas horas después pedimos la opinión?"}
            <input
              type="number"
              name="resenaHs"
              min={1}
              max={72}
              defaultValue={resenaHs}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
        {resenaActiva ? (
          <form action={guardarMaps} className="space-y-3">
            <label className="block text-sm font-semibold text-slate-200">
              {"¿A dónde van las buenas opiniones?"}
              <span className="block text-xs font-normal text-slate-400">Pegá tu link de Google</span>
              <input
                type="url"
                name="mapsUrl"
                defaultValue={negocio.google_maps_url ?? ""}
                placeholder="https://maps.app.goo.gl/..."
                className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15
                  text-slate-100 rounded-xl outline-none placeholder:text-slate-500 [color-scheme:dark]
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
                hover:bg-blue-700 transition-colors"
            >
              Guardar link
            </button>
          </form>
        ) : null}
      </SeccionConfig>
      <SeccionConfig
        icono="repetir"
        titulo="Invitar a volver"
        ayuda="Les escribimos para que vuelvan. Solo a quienes dejaron email."
        avanzada={true}
      >
        <form action={guardarRemarketing} className="space-y-3">
          <label className="flex items-center gap-3 text-sm font-semibold text-slate-200 min-h-[48px]">
            <input
              type="checkbox"
              name="remarketingActivo"
              defaultChecked={remarketingActivo}
              className="w-5 h-5"
            />
            {"Invitar a volver después de un tiempo"}
          </label>
          <label className="block text-sm font-semibold text-slate-200">
            {"¿A los cuántos días les escribimos?"}
            <input
              type="number"
              name="remarketingDias"
              min={1}
              max={90}
              defaultValue={remarketingDias}
              className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                outline-none [color-scheme:dark] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </SeccionConfig>
      <SeccionConfig
        icono="carta"
        titulo="Tus mensajes"
        ayuda="Ya escribimos por vos. Solo cambiá esto si querés usar tus palabras."
        avanzada={true}
      >
        <p className="text-xs text-slate-400">
          Podés usar estos comodines: {VARIABLES_PLANTILLA.map((v) => `{${v}}`).join(" ")}.
          Si lo dejás vacío, usamos nuestro texto.
        </p>
        {PLANTILLAS_AMIGABLES.map(({ tipo, titulo, ayuda }) =>
        {
          const key = `msg_${tipo}` as const;
          const subject = negocio[`${key}_subject` as keyof typeof negocio] as string | null | undefined;
          const cuerpo = negocio[`${key}_cuerpo` as keyof typeof negocio] as string | null | undefined;

          return (
            <form
              key={tipo}
              action={guardarPlantilla.bind(null, tipo as TipoPlantillaConfigurable)}
              className="space-y-3 p-4 border border-white/10 rounded-xl bg-white/5"
            >
              <h3 className="text-sm font-semibold text-slate-100">{titulo}</h3>
              <p className="text-xs text-slate-400">{ayuda}</p>
              <label className="block text-sm font-semibold text-slate-200">
                {"Título del mensaje"}
                <input
                  type="text"
                  name="subject"
                  maxLength={120}
                  defaultValue={subject ?? ""}
                  placeholder="Vacío = usamos el nuestro"
                  className="mt-1 w-full min-h-[48px] px-4 py-3 bg-white/5 border border-white/15
                    text-slate-100 rounded-xl outline-none placeholder:text-slate-500 [color-scheme:dark]
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <label className="block text-sm font-semibold text-slate-200">
                {"Texto del mensaje"}
                <textarea
                  name="cuerpo"
                  rows={4}
                  maxLength={2000}
                  defaultValue={cuerpo ?? ""}
                  placeholder="Vacío = usamos el nuestro. Ej: Hola {negocio}, te esperamos {fecha}."
                  className="mt-1 w-full px-4 py-3 bg-white/5 border border-white/15 text-slate-100 rounded-xl
                    outline-none placeholder:text-slate-500 [color-scheme:dark]
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
                  hover:bg-blue-700 transition-colors"
              >
                Guardar
              </button>
            </form>
          );
        })}
      </SeccionConfig>
      <SeccionConfig
        icono="billetera"
        titulo="Cómo cobrás"
        ayuda="Conectá tu cuenta para cobrar señas directo en tu billetera."
      >
        {avisoMp !== null && (
          <p className={`text-xs font-semibold px-3 py-2 rounded-lg border ${avisoMp.clase}`}>
            {avisoMp.texto}
          </p>
        )}
        <div className="p-4 border border-white/10 rounded-xl bg-white/5 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-100">MercadoPago</div>
              <div className="text-xs text-slate-400">Para cobrar señas en tu cuenta</div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${mpConectado
              ? "bg-green-500/10 text-green-300 border-green-500/30"
              : "bg-white/10 text-slate-400 border-white/10"}`}>
              {mpConectado ? `Listo ${maskMpToken(mpToken)}` : "Falta conectar"}
            </span>
          </div>
          {demo ? (
            <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-lg p-3">
              La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas
              con tu MercadoPago.
            </p>
          ) : mpConectado ? (
            <form action={quitarTokenMp}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                  text-slate-400 hover:bg-white/10 transition-colors min-h-[44px]"
              >
                Desconectar
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/mercadopago/authorize"
              className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-3 rounded-xl min-h-[48px]
                hover:bg-blue-700 transition-colors"
            >
              Conectar MercadoPago
            </Link>
          )}
          <p className="text-xs text-slate-400">
            {mpConectado && mpConectadoAt !== null
              ? "Listo: cuando te pagan, el turno se confirma solo."
              : "Sin conectar, las reservas con seña quedan esperando el pago."}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3 p-4 border border-white/10 rounded-xl bg-white/5">
            <div>
              <div className="text-sm font-semibold text-slate-100">Google Calendar</div>
              <div className="text-xs text-slate-400">Ver tus turnos en tu calendario</div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${gcalConectado
              ? "bg-green-500/10 text-green-300 border-green-500/30"
              : "bg-white/10 text-slate-400 border-white/10"}`}>
              {gcalConectado ? "Listo" : "Falta conectar"}
            </span>
          </div>
          {gcalConectado ? (
            <form action={quitarGoogle}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-white/15
                  text-slate-400 hover:bg-white/10 transition-colors min-h-[44px]"
              >
                Desconectar Google
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/google/authorize"
              className="inline-block bg-white/10 text-slate-100 text-sm font-semibold px-6 py-3 rounded-xl
                border border-white/15 hover:bg-white/10 transition-colors min-h-[48px]"
            >
              Conectar Google
            </Link>
          )}
          <div
            className="flex items-center justify-between gap-3 p-4 border border-white/10 rounded-xl bg-white/5"
          >
            <div>
              <div className="text-sm font-semibold text-slate-100">WhatsApp</div>
              <div className="text-xs text-slate-400">Te avisamos cómo mandarlo desde Agenda</div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10
              text-slate-400 border border-white/10">
              Lo hacés vos
            </span>
          </div>
        </div>
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
