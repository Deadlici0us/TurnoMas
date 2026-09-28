import Link from "next/link";

import { actualizarPoliticaListaNegra } from "./actions";
import type { PenalidadListaNegra } from "./actions";
import { getDashboardData } from "@/lib/dashboard/queries";

async function guardarPolitica(formData: FormData): Promise<void>
{
  "use server";

  const umbral = Number(formData.get("umbral"));
  const penalidad = String(formData.get("penalidad") ?? "fullDeposit") as PenalidadListaNegra;

  await actualizarPoliticaListaNegra(umbral, penalidad);
}

export default async function ConfigPage()
{
  const { data: dashboard } = await getDashboardData();
  const negocio = dashboard.negocio as {
    nombre?: string; pais?: string; slug?: string;
    blacklist_umbral?: number; blacklist_penalidad?: PenalidadListaNegra;
  };
  const umbral = typeof negocio.blacklist_umbral === "number" ? negocio.blacklist_umbral : 2;
  const penalidad: PenalidadListaNegra = negocio.blacklist_penalidad ?? "fullDeposit";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl w-full mx-auto px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8 space-y-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">Configuración</h1>
            <p className="text-sm text-slate-600">Parámetros del negocio y lista negra</p>
          </div>
          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">Nombre</div>
                <div className="font-semibold text-slate-900">{negocio.nombre ?? "—"}</div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">País</div>
                <div className="font-semibold text-slate-900">{negocio.pais ?? "—"}</div>
              </div>
            </div>
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
            <div className="space-y-2">
              {[
                { nombre: "MercadoPago", desc: "Cobro de señas directo en tu billetera" },
                { nombre: "WhatsApp", desc: "Recordatorios 24hs antes por WhatsApp" },
                { nombre: "Google Calendar", desc: "Tus turnos inyectados en tu calendario" },
              ].map((conexion) => (
                <div
                  key={conexion.nombre}
                  className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{conexion.nombre}</div>
                    <div className="text-xs text-slate-500">{conexion.desc}</div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100
                    text-slate-500 border border-slate-200">
                    Manual en esta versión
                  </span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
