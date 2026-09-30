import Link from "next/link";

import ZonaPeligroEliminar from "@/components/zona-peligro-eliminar";
import { actualizarHorariosNegocio, actualizarNombreNegocio, actualizarPoliticaListaNegra,
  conectarMercadoPago, desconectarGoogleCalendar,
  desconectarMercadoPago } from "./actions";
import type { PenalidadListaNegra } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";
import { maskMpToken } from "@/lib/payments/mp-token";
import { DAY_ORDER, dayLabel, type DayKey } from "@/lib/staff/schedule";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const penalidad = String(formData.get("penalidad") ?? "fullDeposit") as PenalidadListaNegra;

  await actualizarPoliticaListaNegra(umbral, penalidad);
}

async function guardarTokenMp(formData: FormData): Promise<void>
{
  "use server";

  await conectarMercadoPago(String(formData.get("mpToken") ?? ""));
}

async function quitarTokenMp(): Promise<void>
{
  "use server";

  await desconectarMercadoPago();
}

async function quitarGoogle(): Promise<void>
{
  "use server";

  await desconectarGoogleCalendar();
}

async function guardarNombre(formData: FormData): Promise<void>
{
  "use server";

  await actualizarNombreNegocio(String(formData.get("nombre") ?? ""));
}

async function guardarHorariosNegocio(formData: FormData): Promise<void>
{
  "use server";

  const horarios: Record<string, unknown> = {};

  for (const day of DAY_ORDER)
  {
    horarios[day] = String(formData.get(day) ?? "");
  }

  await actualizarHorariosNegocio(horarios);
}

export default async function ConfigPage()
{
  const { data: dashboard } = await getDashboardData();
  const negocio = dashboard.negocio as {
    nombre?: string; pais?: string; slug?: string; horarios?: unknown;
    blacklist_umbral?: number; blacklist_penalidad?: PenalidadListaNegra;
  };
  const umbral = typeof negocio.blacklist_umbral === "number" ? negocio.blacklist_umbral : 2;
  const penalidad: PenalidadListaNegra = negocio.blacklist_penalidad ?? "fullDeposit";

  let mpToken: string | null = null;
  let gcalConectado = false;

  try
  {
    const negocioId = (dashboard.negocio as { id?: unknown }).id;

    if (typeof negocioId === "string")
    {
      const { data: secretos } = await getSupabaseAdmin().from("negocio_secretos")
        .select("mercadopago_access_token, google_refresh_token").eq("negocio_id", negocioId).single();

      const raw = (secretos as { mercadopago_access_token?: unknown } | null)
        ?.mercadopago_access_token;

      mpToken = typeof raw === "string" && raw.length > 0 ? raw : null;

      const gcalRaw = (secretos as { google_refresh_token?: unknown } | null)?.google_refresh_token;

      gcalConectado = typeof gcalRaw === "string" && gcalRaw.length > 0;
    }
  }
  catch
  {
    mpToken = null;
    gcalConectado = false;
  }

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
            Nombre del negocio
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
              Ausencias que disparan la penalidad
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
              Penalidad
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
        <h2 className="font-semibold text-slate-900">Conexiones</h2>
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
          {mpConectado ? (
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
            <form action={guardarTokenMp} className="flex flex-col sm:flex-row gap-2">
              <input
                type="password"
                name="mpToken"
                required
                minLength={8}
                autoComplete="off"
                placeholder="Pegá tu access token (APP_USR-...)"
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none
                  focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg
                  hover:bg-blue-700 transition-colors"
              >
                Conectar
              </button>
            </form>
          )}
          <p className="text-xs text-slate-400">
            Encontralo en tu panel de MercadoPago → Credenciales de producción.
            Nunca lo compartas: queda guardado solo en tu negocio.
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
