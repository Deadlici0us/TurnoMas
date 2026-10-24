/**
 * Filas del seed demo (cuenta temporal "Negocio Demo").
 *
 * Datos puros en memoria para la demo de solo lectura. Nunca se insertan en
 * Supabase: el dashboard y el portal demo se sirven desde estas filas.
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
  readonly timezone: string;
  readonly sena_retencion_hs: number;
  readonly recordatorio_activo: boolean;
  readonly recordatorio_hs: number;
  readonly resena_activa: boolean;
  readonly resena_hs: number;
  readonly remarketing_activo: boolean;
  readonly remarketing_dias: number;
  readonly descripcion: string | null;
  readonly google_maps_url: string | null;
  readonly horarios: Record<string, readonly string[]>;
}

export interface DemoStaffRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly horarios: Record<string, string>;
  readonly descripcion: string | null;
  readonly foto_url: string | null;
}

export interface DemoStaffServicioRow
{
  readonly staff_id: string;
  readonly servicio_id: string;
  readonly negocio_id: string;
}

export interface DemoServicioRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly duracion_min: number;
  readonly precio_base: number;
  readonly precio_promocional: number | null;
  readonly sena_requerida: boolean;
  readonly sena_porcentaje: number;
  readonly remarketing: boolean;
  readonly remarketing_dias: number | null;
}

export interface DemoClienteRow
{
  readonly id: string;
  readonly negocio_id: string;
  readonly nombre: string;
  readonly whatsapp: string;
  readonly email: string | null;
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
  readonly staffServicios: readonly DemoStaffServicioRow[];
  readonly clientes: readonly DemoClienteRow[];
  readonly turnos: readonly DemoTurnoRow[];
}

/** ID fijo del negocio demo en el seed en memoria. */
export const DEMO_NEGOCIO_ID = "d0e6b000-0000-4000-8000-000000000001";
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
      id: DEMO_NEGOCIO_ID,
      duenio_id: owner,
      nombre: "Negocio Demo",
      pais: "ar",
      slug: "negocio-demo",
      suscripcion_estado: "trial",
      timezone: "America/Argentina/Buenos_Aires",
      sena_retencion_hs: 72,
      recordatorio_activo: true,
      recordatorio_hs: 24,
      resena_activa: true,
      resena_hs: 2,
      remarketing_activo: true,
      remarketing_dias: 30,
      descripcion: "Barbería de barrio con turnos sin esperas. Cortes clásicos, barba y color.",
      google_maps_url: "https://www.google.com/maps/@-34.6037389,-58.3815704,17z",
      horarios: {
        lun: ["08:00-22:00"],
        mar: ["08:00-22:00"],
        mié: ["08:00-22:00"],
        jue: ["08:00-22:00"],
        vie: ["08:00-22:00"],
        sáb: ["08:00-20:00"],
        dom: [],
      },
    },
    staff: [
      {
        id: STAFF_DIEGO,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Diego",
        horarios: { "lun-vie": "09:00-19:00", sab: "09:00-14:00" },
        descripcion: "Barbero con 10 años de experiencia. Especialista en corte clásico y perfilado.",
        foto_url: null,
      },
      {
        id: STAFF_CAMILA,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Camila",
        horarios: { "lun-vie": "10:00-20:00" },
        descripcion: "Colorista y estilista. Te asesora para encontrar tu mejor versión.",
        foto_url: null,
      },
    ],
    servicios: [
      {
        id: SERV_CORTE,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Corte clásico",
        duracion_min: 30,
        precio_base: 1500000,
        precio_promocional: null,
        sena_requerida: true,
        sena_porcentaje: 50,
        remarketing: true,
        remarketing_dias: null,
      },
      {
        id: SERV_BARBA_CORTE,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Barba + corte",
        duracion_min: 45,
        precio_base: 2000000,
        precio_promocional: 1700000,
        sena_requerida: true,
        sena_porcentaje: 50,
        remarketing: true,
        remarketing_dias: 45,
      },
      {
        id: SERV_BARBA,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Perfilado de barba",
        duracion_min: 20,
        precio_base: 800000,
        precio_promocional: null,
        sena_requerida: false,
        sena_porcentaje: 50,
        remarketing: true,
        remarketing_dias: null,
      },
    ],
    staffServicios: [
      { staff_id: STAFF_DIEGO, servicio_id: SERV_CORTE, negocio_id: DEMO_NEGOCIO_ID },
      { staff_id: STAFF_DIEGO, servicio_id: SERV_BARBA_CORTE, negocio_id: DEMO_NEGOCIO_ID },
      { staff_id: STAFF_DIEGO, servicio_id: SERV_BARBA, negocio_id: DEMO_NEGOCIO_ID },
      { staff_id: STAFF_CAMILA, servicio_id: SERV_CORTE, negocio_id: DEMO_NEGOCIO_ID },
      { staff_id: STAFF_CAMILA, servicio_id: SERV_BARBA, negocio_id: DEMO_NEGOCIO_ID },
    ],
    clientes: [
      {
        id: CLI_JUAN,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Juan Pérez",
        whatsapp: "+549110000001",
        email: "juan@ejemplo.com",
        ausencias: 0,
      },
      {
        id: CLI_MARIA,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "María Gómez",
        whatsapp: "+549110000002",
        email: "maria@ejemplo.com",
        ausencias: 1,
      },
      {
        id: CLI_FALTA,
        negocio_id: DEMO_NEGOCIO_ID,
        nombre: "Falta Siempre",
        whatsapp: "+549110000003",
        email: "falta@ejemplo.com",
        ausencias: 2,
      },
    ],
    turnos: [
      {
        id: "d0e6b000-0000-4000-8000-000000000041",
        negocio_id: DEMO_NEGOCIO_ID,
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
        negocio_id: DEMO_NEGOCIO_ID,
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
        negocio_id: DEMO_NEGOCIO_ID,
        staff_id: STAFF_CAMILA,
        servicio_id: SERV_BARBA,
        cliente_id: CLI_JUAN,
        inicio: new Date(now - DAY_MS).toISOString(),
        estado: "completado",
        monto_total: 800000,
        sena_monto: null,
        sena_porcentaje: 50,
      },
      {
        id: "d0e6b000-0000-4000-8000-000000000044",
        negocio_id: DEMO_NEGOCIO_ID,
        staff_id: STAFF_CAMILA,
        servicio_id: SERV_CORTE,
        cliente_id: CLI_FALTA,
        inicio: new Date(now - 40 * DAY_MS).toISOString(),
        estado: "completado",
        monto_total: 1500000,
        sena_monto: null,
        sena_porcentaje: 50,
      },
    ],
  };
}
