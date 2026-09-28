import Link from "next/link";

interface AgendaTurno
{
  readonly cliente: string;
  readonly servicio: string;
  readonly horario: string;
  readonly estado: "pagado" | "pendiente" | "completado";
  readonly sena: string | null;
}

interface AgendaProfesional
{
  readonly nombre: string;
  readonly turnos: readonly AgendaTurno[];
}

/** Agenda demo: espeja el seed de "Barbería Diego" (ver `lib/seed/demo-rows.ts`). */
const PROFESIONALES: readonly AgendaProfesional[] = [
  {
    nombre: "Diego",
    turnos: [
      { cliente: "Juan Pérez", servicio: "Corte clásico", horario: "Hoy", estado: "pagado",
        sena: "Seña cobrada (50%)" },
      { cliente: "María Gómez", servicio: "Barba + corte", horario: "Mañana", estado: "pendiente",
        sena: "Seña pendiente (50%)" },
    ],
  },
  {
    nombre: "Camila",
    turnos: [
      { cliente: "Juan Pérez", servicio: "Perfilado de barba", horario: "Ayer", estado: "completado", sena: null },
    ],
  },
];

const ESTADO_ESTILOS: Record<AgendaTurno["estado"], string> = {
  pagado: "bg-green-100 text-green-800 border-green-200",
  pendiente: "bg-amber-100 text-amber-800 border-amber-200",
  completado: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function AgendaPage()
{
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-4xl w-full px-8 py-12">
        <Link href="/dashboard" className="inline-block mb-4 text-sm font-semibold text-blue-600 hover:underline">
          ← Volver al panel
        </Link>
        <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Agenda</h1>
          <p className="text-sm text-slate-600 mb-6">Vista interactiva de turnos por profesional</p>
          <div className="space-y-6">
            {PROFESIONALES.map((profesional) => (
              <section key={profesional.nombre}>
                <h2 className="font-semibold text-slate-900 mb-3">{profesional.nombre}</h2>
                <div className="space-y-3">
                  {profesional.turnos.map((turno) => (
                    <div
                      key={`${profesional.nombre}-${turno.cliente}-${turno.servicio}`}
                      className="p-4 border border-slate-200 rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="font-semibold text-slate-900">{turno.cliente}</h3>
                          <p className="text-sm text-slate-600">{turno.servicio} · {turno.horario}</p>
                          {turno.sena ? (
                            <p className="text-xs text-slate-500 mt-1">{turno.sena}</p>
                          ) : null}
                        </div>
                        <span
                          className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full border ${ESTADO_ESTILOS[turno.estado]}`}
                        >
                          {turno.estado}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-6">Datos de demostración de Barbería Diego.</p>
        </div>
      </div>
    </div>
  );
}
