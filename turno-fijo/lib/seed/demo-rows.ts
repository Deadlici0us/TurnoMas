/**
 * Filas del seed demo (cuenta permanente "Barbería Diego").
 *
 * Datos puros en memoria: `POST /api/init` los inserta con service role
 * solo cuando `negocios` está vacío. Espeja `supabase/seed-demo.sql`.
 */

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

export interface DemoNegocioRow
{
  readonly id: string;
  readonly duenio_id: string;
  readonly nombre: string;
  readonly pais: string;
  readonly slug: string;
  readonly suscripcion_estado: string;
}

export interface DemoStaffRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly horarios: Record<string, string>;
}

export interface DemoServicioRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly duracion_min: number;
  readonly buffer_limpieza_min: number;
  readonly precio_base: number;
  readonly precio_promocional: number | null;
  readonly sena_requerida: boolean;
  readonly sena_porcentaje: number;
}

export interface DemoClienteRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly ausencias: number;
}

export interface DemoTurnoRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly staff_id: string;
  readonly servicio_id: string;
  readonly cliente_id: string;
  readonly inicio: string;
  readonly estado: string;
  readonly monto_total: number;
  readonly sena_monto: number | null;
  readonly sena_porcentaje: number;
}

export interface DemoSeed
{
  readonly negocio: DemoNegocioRow;
  readonly staff: readonly DemoStaffRow[];
  readonly servicios: readonly DemoServicioRow[];
  readonly clientes: readonly DemoClienteRow[];
  readonly turnos: readonly DemoTurnoRow[];
}

const NEGOCIO_ID = "d0e6b000-0000-4000-8000-000000000001";
const STAFF_DIEGO = "d0e6b000-0000-4000-8000-000000000011";
const STAFF_CAMILA = "d0e6b000-0000-4000-8000-000000000012";
const SERV_CORTE = "d0e6b000-0000-4000-8000-000000000021";
const SERV_BARBA_CORTE = "d0e6b000-0000-4000-8000-000000000022";
const SERV_BARBA = "d0e6b000-0000-4000-8000-000000000023";
const CLI_JUAN = "d0e6b000-0000-4000-8000-000000000031";
const CLI_MARIA = "d0e6b000-0000-4000-8000-000000000032";
const CLI_FALTA = "d0e6b000-0000-4000-8000-000000000033";

/** Construye las filas del seed demo para el dueño indicado. */
export function buildDemoSeed(duenioId: string): DemoSeed
{
  const owner = duenioId.trim();

  if (owner.length === 0)
  {
    throw new RangeError("El seed demo requiere el UID del dueño demo.");
  }

  const now = Date.now();

  return {
    negocio: {
      id: NEGOCIO_ID,
      duenio_id: owner,
      nombre: "Barbería Diego",
      pais: "ar",
      slug: "barberia-diego",
      suscripcion_estado: "active",
    },
    staff: [
      {
        id: STAFF_DIEGO,
        negocio_id: NEGOCIO_ID,
        nombre: "Diego",
        horarios: { "lun-vie": "09:00-19:00", sab: "09:00-14:00" },
      },
      {
        id: STAFF_CAMILA,
        negocio_id: NEGOCIO_ID,
        nombre: "Camila",
        horarios: { "lun-vie": "10:00-20:00" },
      },
    ],
    servicios: [
      {
        id: SERV_CORTE,
        negocio_id: NEGOCIO_ID,
        nombre: "Corte clásico",
        duracion_min: 30,
        buffer_limpieza_min: 15,
        precio_base: 1500000,
        precio_promocional: null,
        sena_requerida: true,
        sena_porcentaje: 50,
      },
      {
        id: SERV_BARBA_CORTE,
        negocio_id: NEGOCIO_ID,
        nombre: "Barba + corte",
        duracion_min: 45,
        buffer_limpieza_min: 15,
        precio_base: 2000000,
        precio_promocional: 1700000,
        sena_requerida: true,
        sena_porcentaje: 50,
      },
      {
        id: SERV_BARBA,
        negocio_id: NEGOCIO_ID,
        nombre: "Perfilado de barba",
        duracion_min: 20,
        buffer_limpieza_min: 10,
        precio_base: 800000,
        precio_promocional: null,
        sena_requerida: false,
        sena_porcentaje: 50,
      },
    ],
    clientes: [
      {
        id: CLI_JUAN,
        negocio_id: NEGOCIO_ID,
        nombre: "Juan Pérez",
        whatsapp: "+549110000001",
        ausencias: 0,
      },
      {
        id: CLI_MARIA,
        negocio_id: NEGOCIO_ID,
        nombre: "María Gómez",
        whatsapp: "+549110000002",
        ausencias: 1,
      },
      {
        id: CLI_FALTA,
        negocio_id: NEGOCIO_ID,
        nombre: "Falta Siempre",
        whatsapp: "+549110000003",
        ausencias: 2,
      },
    ],
    turnos: [
      {
        id: "d0e6b000-0000-4000-8000-000000000041",
        negocio_id: NEGOCIO_ID,
        staff_id: STAFF_DIEGO,
        servicio_id: SERV_CORTE,
        cliente_id: CLI_JUAN,
        inicio: new Date(now + 2 * HOUR_MS).toISOString(),
        estado: "pagado",
        monto_total: 1500000,
        sena_monto: 750000,
        sena_porcentaje: 50,
      },
      {
        id: "d0e6b000-0000-4000-8000-000000000042",
        negocio_id: NEGOCIO_ID,
        staff_id: STAFF_DIEGO,
        servicio_id: SERV_BARBA_CORTE,
        cliente_id: CLI_MARIA,
        inicio: new Date(now + DAY_MS).toISOString(),
        estado: "pendiente",
        monto_total: 2000000,
        sena_monto: 1000000,
        sena_porcentaje: 50,
      },
      {
        id: "d0e6b000-0000-4000-8000-000000000043",
        negocio_id: NEGOCIO_ID,
        staff_id: STAFF_CAMILA,
        servicio_id: SERV_BARBA,
        cliente_id: CLI_JUAN,
        inicio: new Date(now - DAY_MS).toISOString(),
        estado: "completado",
        monto_total: 800000,
        sena_monto: null,
        sena_porcentaje: 50,
      },
    ],
  };
}
