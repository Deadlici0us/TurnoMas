import Link from "next/link";
import { redirect } from "next/navigation";

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
import { VARIABLES_PLANTILLA } from "@/lib/notifications/custom-templates";
import { maskMpToken } from "@/lib/payments/mp-token";
import { DAY_ORDER, dayLabel, type DayKey } from "@/lib/staff/schedule";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolverTimezoneNegocio, TIMEZONES_SOPORTADAS } from "@/lib/timezone/timezone";

function franjasDeDia(horarios: unknown, day: DayKey): string
{
  if (typeof horarios !== "object" || horarios === null || Array.isArray(horarios))
  {
    return "";
  }

  const raw = (horarios as Record<string, unknown>)[day];

  if (typeof raw === "string")
  {
    return raw;
  }

  if (Array.isArray(raw))
  {
    return raw.filter((item): item is string => typeof item === "string").join(", ");
  }

  return "";
}

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
      clase: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (mp === "cancelado")
  {
    return {
      texto: "Cancelaste la conexión con MercadoPago. Podés intentarlo de nuevo.",
      clase: "bg-amber-50 text-amber-700 border-amber-200",
    };
  }

  if (mp === "demo")
  {
    return {
      texto: "La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas.",
      clase: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (mp === "error")
  {
    return {
      texto: "No pudimos conectar MercadoPago. Probá de nuevo.",
      clase: "bg-red-50 text-red-700 border-red-200",
    };
  }

  if (mp === "sena-activa")
  {
    return {
      texto: "Tenés servicios con seña activa. Desactivalas en Servicios y volvé a desconectar.",
      clase: "bg-amber-50 text-amber-700 border-amber-200",
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Configuración</h1>
        <p className="text-sm text-slate-600">Parámetros del negocio y lista negra</p>
      </div>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Negocio</h2>
        <form action={guardarNombre} className="space-y-3">
          <label className="block text-sm text-slate-600">
            {"Nombre del negocio"}
            <input
              type="text"
              name="nombre"
              required
              minLength={2}
              maxLength={80}
              defaultValue={negocio.nombre ?? ""}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <p className="text-xs text-slate-500">País: {negocio.pais ?? "—"} · El link público no cambia.</p>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar nombre
          </button>
        </form>
        <form action={guardarTimezone} className="space-y-3">
          <label className="block text-sm text-slate-600">
            {"Zona horaria del negocio"}
            <select
              name="timezone"
              defaultValue={timezoneActual}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {TIMEZONES_SOPORTADAS.map((zona) => (
                <option key={zona} value={zona}>{zona}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-slate-500">
            La agenda (lista y calendario) muestra los turnos en esta zona. Importante en países
            con varios husos (MX, BR, ES, US).
          </p>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar zona horaria
          </button>
        </form>
        {typeof negocio.pais === "string" && typeof negocio.slug === "string" ? (
          <p className="text-sm text-slate-600">
            {"Tu página pública: "}
            <Link
              href={"/" + negocio.pais + "/" + negocio.slug}
              className="font-mono font-semibold text-blue-600 hover:underline"
            >
              {"/" + negocio.pais + "/" + negocio.slug}
            </Link>
          </p>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Horarios del negocio</h2>
        <p className="text-xs text-slate-500">
          Rango más amplio en el que aceptás reservas (ej: lun a sáb 08:00-22:00).
          Cada profesional ajusta su turno dentro de este marco. Vacío = cerrado.
        </p>
        <form action={guardarHorariosNegocio} className="space-y-2">
          {DAY_ORDER.map((day) => (
            <label key={day} className="flex items-center gap-2 text-sm text-slate-600">
              <span className="w-20 shrink-0 font-medium">{dayLabel(day)}</span>
              <input
                type="text"
                name={day}
                defaultValue={franjasDeDia(negocio.horarios, day)}
                placeholder="Cerrado"
                className="flex-1 px-3 py-1.5 text-sm border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
          ))}
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar horarios
          </button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Lista negra automática</h2>
        <form action={guardarPolitica} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <label className="flex-1 text-sm text-slate-600">
              {"Ausencias que disparan la penalidad"}
              <input
                type="number"
                name="umbral"
                min={1}
                max={10}
                defaultValue={umbral}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <label className="flex-1 text-sm text-slate-600">
              {"Penalidad"}
              <select
                name="penalidad"
                defaultValue={penalidad}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="blocked">Bloqueo total</option>
                <option value="fullDeposit">Exigir seña del 100%</option>
              </select>
            </label>
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Política de seña</h2>
        <p className="text-xs text-slate-500">
          Si se cancela con más anticipación que este umbral, se devuelve la seña.
          Dentro del umbral, el cliente la pierde.
        </p>
        <form action={guardarSena} className="space-y-3">
          <label className="block text-sm text-slate-600">
            {"Horas de retención antes del turno"}
            <input
              type="number"
              name="retencionHs"
              min={1}
              max={720}
              defaultValue={retencionHs}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Recordatorios automáticos</h2>
        <form action={guardarRecordatorios} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="recordatorioActivo"
              defaultChecked={recordatorioActivo}
              className="w-4 h-4"
            />
            {"Enviar recordatorio antes del turno"}
          </label>
          <label className="block text-sm text-slate-600">
            {"Horas antes del turno"}
            <input
              type="number"
              name="recordatorioHs"
              min={1}
              max={72}
              defaultValue={recordatorioHs}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Reseñas</h2>
        <p className="text-xs text-slate-500">Solo llega a clientes con email. El email sigue opcional en la reserva.</p>
        <form action={guardarResenas} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="resenaActiva"
              defaultChecked={resenaActiva}
              className="w-4 h-4"
            />
            {"Pedir reseña después del turno"}
          </label>
          <label className="block text-sm text-slate-600">
            {"Horas después del fin"}
            <input
              type="number"
              name="resenaHs"
              min={1}
              max={72}
              defaultValue={resenaHs}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
        {resenaActiva ? (
          <form action={guardarMaps} className="space-y-3">
            <label className="block text-sm text-slate-600">
              {"Link de Google Maps (4-5 estrellas derivan acá)"}
              <input
                type="url"
                name="mapsUrl"
                defaultValue={negocio.google_maps_url ?? ""}
                placeholder="https://maps.app.goo.gl/..."
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </label>
            <button
              type="submit"
              className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              Guardar link
            </button>
          </form>
        ) : null}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Remarketing</h2>
        <p className="text-xs text-slate-500">
          Solo llega a clientes con email. Cada servicio puede tener sus propios días.
        </p>
        <form action={guardarRemarketing} className="space-y-3">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              name="remarketingActivo"
              defaultChecked={remarketingActivo}
              className="w-4 h-4"
            />
            {"Invitar a renovar después del turno"}
          </label>
          <label className="block text-sm text-slate-600">
            {"Días por defecto (cada servicio puede overridear)"}
            <input
              type="number"
              name="remarketingDias"
              min={1}
              max={90}
              defaultValue={remarketingDias}
              className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </label>
          <button
            type="submit"
            className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
              hover:bg-blue-700 transition-colors"
          >
            Guardar
          </button>
        </form>
      </section>
      <section className="space-y-4">
        <div>
          <h2 className="font-semibold text-slate-900">Mensajes</h2>
          <p className="text-xs text-slate-500">
            Personalizá subject y cuerpo. Variables: {VARIABLES_PLANTILLA.map((v) => `{${v}}`).join(" ")}.
            Vacío = mensaje default. Recomendá el refuerzo por WhatsApp desde Agenda y Clientes.
          </p>
        </div>
        {([
          { tipo: "confirmacion", titulo: "Confirmación de reserva" },
          { tipo: "recordatorio", titulo: "Recordatorio" },
          { tipo: "resena", titulo: "Pedido de reseña" },
          { tipo: "remarketing", titulo: "Remarketing" },
        ] as const).map(({ tipo, titulo }) =>
        {
          const key = `msg_${tipo}` as const;
          const subject = negocio[`${key}_subject` as keyof typeof negocio] as string | null | undefined;
          const cuerpo = negocio[`${key}_cuerpo` as keyof typeof negocio] as string | null | undefined;

          return (
            <form key={tipo} action={guardarPlantilla.bind(null, tipo as TipoPlantillaConfigurable)} className="space-y-3
              p-4 border border-slate-200 rounded-lg">
              <h3 className="text-sm font-semibold text-slate-900">{titulo}</h3>
              <label className="block text-sm text-slate-600">
                {"Asunto"}
                <input
                  type="text"
                  name="subject"
                  maxLength={120}
                  defaultValue={subject ?? ""}
                  placeholder="Vacío = default"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <label className="block text-sm text-slate-600">
                {"Cuerpo"}
                <textarea
                  name="cuerpo"
                  rows={4}
                  maxLength={2000}
                  defaultValue={cuerpo ?? ""}
                  placeholder="Vacío = default"
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                  hover:bg-blue-700 transition-colors"
              >
                Guardar
              </button>
            </form>
          );
        })}
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Conexiones</h2>
        {avisoMp !== null && (
          <p className={`text-xs font-semibold px-3 py-2 rounded-lg border ${avisoMp.clase}`}>
            {avisoMp.texto}
          </p>
        )}
        <div className="p-3 border border-slate-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900">MercadoPago</div>
              <div className="text-xs text-slate-500">Cobro de señas directo en tu billetera</div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${mpConectado
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {mpConectado ? `Conectado ${maskMpToken(mpToken)}` : "Sin conectar"}
            </span>
          </div>
          {demo ? (
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-3">
              La demo no conecta cuentas reales. Creá tu cuenta gratis para cobrar señas
              con tu MercadoPago.
            </p>
          ) : mpConectado ? (
            <form action={quitarTokenMp}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                  text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Desconectar
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/mercadopago/authorize"
              className="inline-block bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                hover:bg-blue-700 transition-colors"
            >
              Conectar con MercadoPago
            </Link>
          )}
          <p className="text-xs text-slate-400">
            {mpConectado && mpConectadoAt !== null
              ? "Notificaciones automáticas activas: los pagos confirman solos tu agenda."
              : "Al conectar autorizás a TurnoMas a cobrar señas en tu cuenta. Sin tu conexión, las reservas con seña quedan pendientes sin link de pago."}
          </p>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
            <div>
              <div className="text-sm font-semibold text-slate-900">Google Calendar</div>
              <div className="text-xs text-slate-500">Tus turnos inyectados en tu calendario</div>
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${gcalConectado
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-slate-100 text-slate-500 border-slate-200"}`}>
              {gcalConectado ? "Conectado" : "Sin conectar"}
            </span>
          </div>
          {gcalConectado ? (
            <form action={quitarGoogle}>
              <button
                type="submit"
                className="text-xs font-semibold px-4 py-2 rounded-lg border border-slate-300
                  text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Desconectar Google
              </button>
            </form>
          ) : (
            <Link
              href="/api/integrations/google/authorize"
              className="inline-block bg-white text-slate-900 text-sm font-semibold px-6 py-2 rounded-lg
                border border-slate-300 hover:bg-slate-50 transition-colors"
            >
              Conectar con Google
            </Link>
          )}
          <p className="text-xs text-slate-400">
            Si conectaste antes del bloqueo por eventos, desconectá y conectá de nuevo
            para otorgar el permiso de lectura.
          </p>
          <div
            className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
          >
            <div>
              <div className="text-sm font-semibold text-slate-900">WhatsApp</div>
              <div className="text-xs text-slate-500">Recordatorios 24hs antes por WhatsApp</div>
            </div>
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100
              text-slate-500 border border-slate-200">
              Manual en esta versión
            </span>
          </div>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold text-slate-900">Zona de peligro</h2>
        <ZonaPeligroEliminar />
      </section>
    </div>
  );
}
