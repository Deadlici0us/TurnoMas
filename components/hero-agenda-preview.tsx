import { Check } from "lucide-react";

import LeyendaEstados from "@/components/leyenda-estados";
import type { EstadoTurno } from "@/lib/dashboard/estados";
import { claseGrillaPara, etiquetaEstadoPara } from "@/lib/dashboard/estados-colores";
import { DEFAULT_TIMEZONE, obtenerPartesCiviles } from "@/lib/timezone/timezone";

interface TurnoHero
{
  readonly id: string;
  readonly cliente: string;
  readonly servicio: string;
  readonly hora: string;
  readonly duracionMin: number;
  readonly profesional: string;
  readonly estado: EstadoTurno;
}

const HORA_DESDE = 8;
const HORA_HASTA = 16;
const ALTO_HORA_PX = 44;
const MINUTOS_POR_HORA = 60;
const ALTO_MINIMO_BLOQUE_PX = 28;

const NOMBRES_DIA = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const;

const HORAS = Array.from(
  { length: HORA_HASTA - HORA_DESDE },
  (_, indice) => HORA_DESDE + indice,
);

const ALTO_GRILLA_PX = (HORA_HASTA - HORA_DESDE) * ALTO_HORA_PX;

const TURNOS: readonly TurnoHero[] = [
  {
    id: "1", cliente: "Juan", servicio: "Corte", hora: "08:00",
    duracionMin: 60, profesional: "Diego", estado: "confirmado",
  },
  {
    id: "2", cliente: "Ana", servicio: "Color", hora: "09:00",
    duracionMin: 90, profesional: "Camila", estado: "pagado",
  },
  {
    id: "3", cliente: "Leo", servicio: "Barba", hora: "10:30",
    duracionMin: 45, profesional: "Diego", estado: "pendiente",
  },
  {
    id: "4", cliente: "Sofía", servicio: "Corte", hora: "12:00",
    duracionMin: 60, profesional: "Camila", estado: "completado",
  },
  {
    id: "5", cliente: "Martín", servicio: "Color", hora: "13:30",
    duracionMin: 60, profesional: "Diego", estado: "pagado",
  },
  {
    id: "6", cliente: "Vale", servicio: "Peinado", hora: "15:00",
    duracionMin: 60, profesional: "Camila", estado: "confirmado",
  },
];

/**
 * Convierte una hora `HH:mm` a minutos desde la medianoche.
 *
 * @param hora Hora en formato `HH:mm`.
 * @return Minutos transcurridos desde las 00:00.
 */
function minutosDeHora(hora: string): number
{
  const [horas, minutos] = hora.split(":").map(Number) as [number, number];

  return horas * MINUTOS_POR_HORA + minutos;
}

/**
 * Calcula la posición vertical y el alto de un bloque en la grilla.
 *
 * @param turno Turno con hora de inicio y duración.
 * @return Posición `top` y `height` en píxeles.
 */
function posicionTurno(turno: TurnoHero): { readonly top: number; readonly height: number }
{
  const inicio = minutosDeHora(turno.hora);
  const top = ((inicio - HORA_DESDE * MINUTOS_POR_HORA) / MINUTOS_POR_HORA) * ALTO_HORA_PX;
  const height = Math.max(
    (turno.duracionMin / MINUTOS_POR_HORA) * ALTO_HORA_PX,
    ALTO_MINIMO_BLOQUE_PX,
  );

  return { top, height };
}

/**
 * Etiqueta corta del día en curso para la cabecera de la grilla.
 *
 * @return Día de la semana y número del día.
 */
function etiquetaHoy(): { readonly semana: string; readonly numero: string }
{
  const partes = obtenerPartesCiviles(new Date(), DEFAULT_TIMEZONE);

  return {
    semana: NOMBRES_DIA[partes.weekday] ?? "",
    numero: String(partes.dia),
  };
}

/**
 * Vista previa estática de la agenda del día para el hero del index.
 *
 * Replica la estructura visual de la vista Día real: cabecera, leyenda,
 * grilla horaria y bloques con cliente, servicio, hora y profesional.
 *
 * @return Tarjeta compacta con la agenda de ejemplo.
 */
export default function HeroAgendaPreview()
{
  const hoy = etiquetaHoy();
  const senasCobradas = TURNOS.filter((turno) => turno.estado === "pagado").length;

  return (
    <div className="ui-card overflow-hidden" data-testid="hero-agenda">
      <div className="flex items-center justify-between border-b border-line bg-white px-5 py-4">
        <div className="flex items-center gap-2" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-danger" />
          <span className="size-2.5 rounded-full bg-warning" />
          <span className="size-2.5 rounded-full bg-success" />
        </div>
        <span className="font-heading text-sm font-bold text-navy">Agenda de hoy</span>
        <span className="ui-badge ui-badge-info">{`${TURNOS.length} turnos`}</span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2">
        <div className="flex items-center gap-1" aria-hidden="true">
          <span data-testid="hero-agenda-vista-dia" className="ui-tab ui-tab-active">Día</span>
          <span data-testid="hero-agenda-vista-semana" className="ui-tab">Semana</span>
          <span data-testid="hero-agenda-vista-mes" className="ui-tab">Mes</span>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">Hoy</span>
      </div>

      <div className="border-b border-line px-4 py-2">
        <LeyendaEstados />
      </div>

      <div className="grid grid-cols-[56px_1fr] gap-px bg-line">
        <div className="bg-surface" />
        <div className="bg-surface px-2 py-2 text-center">
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">
            {hoy.semana}
          </div>
          <div className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full
            bg-primary text-xs font-bold text-white">
            {hoy.numero}
          </div>
          <div className="mt-0.5 text-[10px] font-semibold text-muted-foreground">Hoy</div>
        </div>

        <div className="relative bg-surface" style={{ height: ALTO_GRILLA_PX }}>
          {HORAS.map((hora, indice) => (
            <span
              key={hora}
              className="absolute right-2 font-mono text-[10px] text-muted-foreground tabular-nums"
              style={{ top: indice === 0 ? 0 : indice * ALTO_HORA_PX - 6 }}
            >
              {`${String(hora).padStart(2, "0")}:00`}
            </span>
          ))}
        </div>

        <div className="relative bg-white" style={{ height: ALTO_GRILLA_PX }} data-testid="hero-agenda-grilla">
          {HORAS.map((hora) => (
            <div
              key={hora}
              className="absolute inset-x-0 border-t border-line"
              style={{ top: (hora - HORA_DESDE) * ALTO_HORA_PX }}
            />
          ))}
          {TURNOS.map((turno) =>
          {
            const posicion = posicionTurno(turno);
            const titulo = `${turno.cliente} · ${turno.servicio}`;
            const detalle = `${turno.hora} · ${turno.profesional}`;
            const descripcion = `${titulo} · ${detalle} · ${etiquetaEstadoPara(turno.estado)}`;

            return (
              <div
                key={turno.id}
                data-testid="hero-agenda-turno"
                title={`${titulo} · ${detalle}`}
                aria-label={descripcion}
                className={`absolute inset-x-2 overflow-hidden rounded-md border px-2 py-px text-[11px]
                  leading-[12px] font-semibold shadow-sm ${claseGrillaPara(turno.estado)}`}
                style={{ top: posicion.top, height: posicion.height }}
              >
                <span className="block truncate">{titulo}</span>
                <span className="block truncate text-[10px] leading-[11px] font-medium opacity-80">
                  {detalle}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-line px-5 py-3">
        <span className="text-xs text-muted-foreground">Hoy</span>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-success">
          <Check className="size-4" aria-hidden="true" />
          {`${senasCobradas} señas cobradas`}
        </span>
      </div>
    </div>
  );
}
