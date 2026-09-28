"use client";

import { useState } from "react";
import Link from "next/link";

import { getDemoBusiness } from "@/lib/portal/demo-business";
import type { PortalStaff } from "@/lib/portal/demo-business";
import { parseDayRange } from "@/lib/staff/schedule";

const HORARIO_KEYS = ["lun-vie", "sab", "dom"] as const;

interface StaffEditable extends PortalStaff
{
  readonly horarios: Record<string, string>;
}

function toEditable(staff: PortalStaff): StaffEditable
{
  return { ...staff, horarios: { ...staff.horarios } };
}

export default function StaffPage()
{
  const demo = getDemoBusiness("ar", "barberia-diego");
  const [profesionales, setProfesionales] = useState<StaffEditable[]>(
    () => (demo?.staff ?? []).map(toEditable),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [guardado, setGuardado] = useState(false);

  function updateProfesional(id: string, patch: Partial<StaffEditable>): void
  {
    setGuardado(false);
    setProfesionales((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function updateHorario(id: string, key: string, value: string): void
  {
    const profesional = profesionales.find((p) => p.id === id);

    if (profesional === undefined)
    {
      return;
    }

    const horarios = { ...profesional.horarios };

    if (value.trim() === "")
    {
      delete horarios[key];
    }
    else
    {
      horarios[key] = value.trim();
    }

    setErrores((prev) =>
    {
      const next = { ...prev };
      const errorKey = `${id}:${key}`;

      if (value.trim() === "")
      {
        delete next[errorKey];
      }
      else
      {
        try
        {
          parseDayRange(value.trim());
          delete next[errorKey];
        }
        catch
        {
          next[errorKey] = "Formato HH:MM-HH:MM, cierre posterior a apertura.";
        }
      }

      return next;
    });
    updateProfesional(id, { horarios });
  }

  function toggleActivo(id: string): void
  {
    const profesional = profesionales.find((p) => p.id === id);

    if (profesional !== undefined)
    {
      updateProfesional(id, { activo: !profesional.activo });
    }
  }

  function addProfesional(): void
  {
    setGuardado(false);
    setProfesionales((prev) => [
      ...prev,
      { id: `nuevo-${Date.now()}`, nombre: "Nuevo profesional", horarios: { "lun-vie": "09:00-18:00" }, activo: true },
    ]);
  }

  function removeProfesional(id: string): void
  {
    setGuardado(false);
    setProfesionales((prev) => prev.filter((p) => p.id !== id));
  }

  const hayErrores = Object.keys(errores).length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold text-slate-900">Profesionales</h1>
            <button
              onClick={addProfesional}
              className="bg-blue-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Agregar
            </button>
          </div>
          <p className="text-sm text-slate-600 mb-6">Quiénes atienden y en qué horarios. Vacío = día cerrado.</p>
          <div className="space-y-4">
            {profesionales.map((profesional) => (
              <div key={profesional.id} className="p-4 border border-slate-200 rounded-lg space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    value={profesional.nombre}
                    onChange={(event) => updateProfesional(profesional.id, { nombre: event.target.value })}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-semibold text-slate-900 outline-none
                      focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={() => toggleActivo(profesional.id)}
                    className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${
                      profesional.activo
                        ? "bg-green-100 text-green-800 border-green-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {profesional.activo ? "Activo" : "Inactivo"}
                  </button>
                  <button
                    onClick={() => removeProfesional(profesional.id)}
                    className="shrink-0 text-sm text-red-600 hover:underline"
                  >
                    Quitar
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {HORARIO_KEYS.map((key) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{key}</label>
                      <input
                        value={profesional.horarios[key] ?? ""}
                        onChange={(event) => updateHorario(profesional.id, key, event.target.value)}
                        placeholder="—"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none
                          focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      {errores[`${profesional.id}:${key}`] ? (
                        <p className="text-xs text-red-600 mt-1">{errores[`${profesional.id}:${key}`]}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={() => setGuardado(true)}
              disabled={hayErrores}
              className="bg-blue-600 text-white font-semibold px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Guardar cambios
            </button>
            {guardado ? <span className="text-sm text-green-700">✓ Cambios guardados en esta demo.</span> : null}
          </div>
          <p className="text-xs text-slate-400 mt-4">Datos de demostración de Barbería Diego.</p>
        </div>
      </div>
    </div>
  );
}
