"use client";

import { useState } from "react";
import Link from "next/link";

import { getDemoBusiness } from "@/lib/portal/demo-business";

export default function ConfigPage()
{
  const demo = getDemoBusiness("ar", "barberia-diego");
  const [umbral, setUmbral] = useState(2);
  const [penalidad, setPenalidad] = useState<"bloqueo" | "sena100">("bloqueo");
  const [guardado, setGuardado] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
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
                <div className="font-semibold text-slate-900">{demo?.nombre ?? "—"}</div>
              </div>
              <div className="p-3 border border-slate-200 rounded-lg">
                <div className="text-xs text-slate-500">País</div>
                <div className="font-semibold text-slate-900">{demo?.pais ?? "—"}</div>
              </div>
            </div>
            {demo ? (
              <p className="text-sm text-slate-600">
                Tu página pública:{" "}
                <Link href={`/${demo.pais}/${demo.slug}`} className="font-mono font-semibold text-blue-600 hover:underline">
                  /{demo.pais}/{demo.slug}
                </Link>
              </p>
            ) : null}
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Lista negra automática</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <label className="flex-1 text-sm text-slate-600">
                Ausencias que disparan la penalidad
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={umbral}
                  onChange={(event) => { setGuardado(false); setUmbral(Number(event.target.value)); }}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </label>
              <label className="flex-1 text-sm text-slate-600">
                Penalidad
                <select
                  value={penalidad}
                  onChange={(event) => { setGuardado(false); setPenalidad(event.target.value as "bloqueo" | "sena100"); }}
                  className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg outline-none
                    focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="bloqueo">Bloqueo total</option>
                  <option value="sena100">Exigir seña del 100%</option>
                </select>
              </label>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setGuardado(true)}
                className="bg-blue-600 text-white text-sm font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Guardar
              </button>
              {guardado ? <span className="text-sm text-green-700">✓ Configuración guardada en esta demo.</span> : null}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-semibold text-slate-900">Conexiones</h2>
            <div className="space-y-2">
              {[
                { nombre: "MercadoPago", desc: "Cobro de señas directo en tu billetera" },
                { nombre: "WhatsApp", desc: "Recordatorios 24hs antes por WhatsApp" },
                { nombre: "Google Calendar", desc: "Tus turnos inyectados en tu calendario" },
              ].map((conexion) => (
                <div key={conexion.nombre} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">{conexion.nombre}</div>
                    <div className="text-xs text-slate-500">{conexion.desc}</div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    Próximamente en demo
                  </span>
                </div>
              ))}
            </div>
          </section>

          <p className="text-xs text-slate-400">Datos de demostración de Barbería Diego.</p>
        </div>
      </div>
    </div>
  );
}
