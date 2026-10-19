/**
 * Promociones del plan SaaS: alta, extensión, baja y sincronización con
 * MercadoPago.
 *
 * La base es la fuente de verdad. Cada operación persiste primero la promo y
 * después intenta reflejar el monto en el preapproval. Si MP falla, la fila
 * queda con `ultimo_error` y el cron reintenta; nunca se pierde el descuento
 * por un fallo transitorio.
 */

import { readEnv } from "@/lib/env/env";
import {
  calcularNuevaVigencia,
  calcularPrecioConPromo,
  promocionVigente,
  type PrecioConPromo,
} from "@/lib/payments/promocion";
import {
  actualizarMontoPreapproval,
  buscarPreapprovalsPorEstado,
  resolverPlanPais,
  type PlanPais,
} from "@/lib/payments/subscription";

import { SupabasePromocionRepositorio } from "./promociones-repositorio";

const PORCENTAJE_MINIMO = 1;
const PORCENTAJE_MAXIMO = 99;
const MESES_MINIMO = 1;
const MESES_MAXIMO = 24;
const MOTIVO_MAXIMO = 200;

/** Promoción persistida y normalizada para la aplicación. */
export interface Promocion
{
  readonly id: string;
  readonly negocioId: string;
  readonly porcentaje: number;
  readonly motivo: string | null;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string;
  readonly activo: boolean;
  readonly sincronizadoEn: string | null;
  readonly ultimoError: string | null;
  readonly createdBy: string;
}

/** Datos mínimos del negocio para calcular y sincronizar su plan. */
export interface NegocioPlan
{
  readonly id: string;
  readonly nombre: string;
  readonly slug: string;
  readonly pais: string | null;
  readonly duenioId: string;
  readonly suscripcionMpId: string | null;
  readonly suscripcionEstado: string | null;
}

/** Fila a persistir en `promociones_suscripcion`. */
export interface GuardarPromocionInput
{
  readonly negocioId: string;
  readonly porcentaje: number;
  readonly motivo: string | null;
  readonly vigenteDesde: string;
  readonly vigenteHasta: string;
  readonly activo: boolean;
  readonly createdBy: string;
}

/** Contrato de persistencia (facilita tests sin Supabase). */
export interface PromocionRepositorio
{
  obtenerVigente(negocioId: string, ahora: Date): Promise<Promocion | null>;
  obtenerPorNegocio(negocioId: string): Promise<Promocion | null>;
  guardar(input: GuardarPromocionInput): Promise<Promocion>;
  desactivar(negocioId: string): Promise<void>;
  marcarSincronizacion(
    negocioId: string,
    sincronizadoEn: Date | null,
    ultimoError: string | null,
  ): Promise<void>;
  obtenerNegocio(negocioId: string): Promise<NegocioPlan | null>;
  listarNegocios(): Promise<NegocioPlan[]>;
  listarPromociones(): Promise<Promocion[]>;
}

/** Actualizador del monto recurrente en MercadoPago. */
export type ActualizarMonto = (input: {
  readonly preapprovalId: string;
  readonly monto: number;
  readonly currency: string;
}) => Promise<void>;

/** Buscador de preapprovals pendientes del negocio. */
export type ListarPendientes = (negocioId: string) => Promise<string[]>;

/** Entrada para aplicar o extender una promo. */
export interface AplicarPromocionInput
{
  readonly negocioId: string;
  readonly porcentaje: number;
  readonly meses: number;
  readonly motivo: string | null;
  readonly createdBy: string;
  readonly ahora?: Date;
}

/** Resultado de sincronizar una promo con MercadoPago. */
export interface ResultadoSincronizacion
{
  readonly monto: number;
  readonly sincronizada: boolean;
  readonly error: string | null;
}

/** Resultado de aplicar/extender una promo. */
export interface ResultadoPromocion
{
  readonly promocion: Promocion;
  readonly sincronizacion: ResultadoSincronizacion;
}

/** Fila de admin: negocio + su promo y precios calculados. */
export interface PromocionAdmin
{
  readonly negocio: NegocioPlan;
  readonly promocion: Promocion | null;
  readonly plan: PlanPais;
  readonly precio: PrecioConPromo;
}

/** Resumen del barrido del cron. */
export interface ResumenPromociones
{
  readonly revisadas: number;
  readonly sincronizadas: number;
  readonly errores: number;
}

/**
 * Actualiza el monto usando el token de plataforma del entorno.
 *
 * @param input Preapproval, monto y moneda.
 * @throws Error cuando falta `MP_ACCESS_TOKEN`.
 */
async function actualizarConPlataforma(input: {
  readonly preapprovalId: string;
  readonly monto: number;
  readonly currency: string;
}): Promise<void>
{
  const platformToken = readEnv("MP_ACCESS_TOKEN");

  if (platformToken === null)
  {
    throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
  }

  await actualizarMontoPreapproval({ ...input, platformToken });
}

/**
 * Busca preapprovals pendientes del negocio en MercadoPago.
 *
 * Sirve para actualizar el monto de un checkout que el dueño todavía no
 * autorizó: `negocios.suscripcion_mp_id` recién se persiste al activarse.
 *
 * @param negocioId ID del negocio.
 * @return IDs de preapprovals pendientes del negocio.
 * @throws Error cuando falta `MP_ACCESS_TOKEN`.
 */
async function listarPendientesConPlataforma(negocioId: string): Promise<string[]>
{
  const platformToken = readEnv("MP_ACCESS_TOKEN");

  if (platformToken === null)
  {
    throw new Error("Falta configurar MP_ACCESS_TOKEN en el entorno.");
  }

  const filas = await buscarPreapprovalsPorEstado("pending", platformToken);

  return filas
    .filter((fila) => fila.externalReference === negocioId)
    .map((fila) => fila.id);
}

/** Valida el porcentaje de la promo. */
function validarPorcentaje(porcentaje: number): void
{
  if (!Number.isInteger(porcentaje)
    || porcentaje < PORCENTAJE_MINIMO
    || porcentaje > PORCENTAJE_MAXIMO)
  {
    throw new RangeError("El porcentaje debe ser un entero entre 1 y 99.");
  }
}

/** Valida la duración en meses de la promo. */
function validarMeses(meses: number): void
{
  if (!Number.isInteger(meses) || meses < MESES_MINIMO || meses > MESES_MAXIMO)
  {
    throw new RangeError("La duración debe ser un entero entre 1 y 24 meses.");
  }
}

/** Normaliza y valida el motivo opcional. */
function normalizarMotivo(motivo: string | null): string | null
{
  if (motivo === null)
  {
    return null;
  }

  const limpio = motivo.replace(/[\u0000-\u001F\u007F-\u009F]/g, " ").replace(/\s+/g, " ").trim();

  if (limpio.length === 0)
  {
    return null;
  }

  if (limpio.length > MOTIVO_MAXIMO)
  {
    throw new RangeError(`El motivo no puede superar los ${MOTIVO_MAXIMO} caracteres.`);
  }

  return limpio;
}

/** Acota el mensaje de error que se guarda en la fila. */
function mensajeCorto(error: unknown): string
{
  const mensaje = error instanceof Error ? error.message : "Error desconocido al sincronizar.";

  return mensaje.slice(0, 300);
}

export class PromocionService
{
  private readonly repo: PromocionRepositorio;
  private readonly actualizarMonto: ActualizarMonto;
  private readonly listarPendientes: ListarPendientes;

  /**
   * @param repo Persistencia de promociones (Supabase por defecto).
   * @param actualizarMonto Actualizador de MP (inyectable en tests).
   * @param listarPendientes Buscador de checkout pendiente (inyectable).
   */
  constructor(
    repo: PromocionRepositorio = new SupabasePromocionRepositorio(),
    actualizarMonto: ActualizarMonto = actualizarConPlataforma,
    listarPendientes: ListarPendientes = listarPendientesConPlataforma,
  )
  {
    this.repo = repo;
    this.actualizarMonto = actualizarMonto;
    this.listarPendientes = listarPendientes;
  }

  /**
   * Devuelve la promo vigente de un negocio, o null.
   *
   * @param negocioId ID del negocio.
   * @param ahora Momento de referencia.
   * @return Promo activa dentro de su ventana.
   */
  async obtenerVigente(negocioId: string, ahora: Date = new Date()): Promise<Promocion | null>
  {
    return this.repo.obtenerVigente(negocioId, ahora);
  }

  /**
   * Calcula el precio del plan de un negocio con su promo vigente.
   *
   * @param negocioId ID del negocio.
   * @param montoBase Precio de lista en unidades de la moneda.
   * @param ahora Momento de referencia.
   * @return Promo y precio efectivo.
   */
  async precioParaNegocio(
    negocioId: string,
    montoBase: number,
    ahora: Date = new Date(),
  ): Promise<{ readonly promocion: Promocion | null; readonly precio: PrecioConPromo }>
  {
    const promocion = await this.repo.obtenerVigente(negocioId, ahora);

    return {
      promocion,
      precio: calcularPrecioConPromo(montoBase, promocion, ahora),
    };
  }

  /**
   * Aplica una promo nueva o extiende la existente.
   *
   * Si la promo actual sigue vigente, los meses se suman desde su vencimiento;
   * si venció, se cuenta desde `ahora`. Después sincroniza MP.
   *
   * @param input Negocio, porcentaje, meses, motivo y autor.
   * @return Promo persistida y resultado de la sincronización.
   */
  async aplicar(input: AplicarPromocionInput): Promise<ResultadoPromocion>
  {
    validarPorcentaje(input.porcentaje);
    validarMeses(input.meses);

    const ahora = input.ahora ?? new Date();
    const existente = await this.repo.obtenerPorNegocio(input.negocioId);
    const vigenteHasta = calcularNuevaVigencia(existente?.vigenteHasta ?? null, input.meses, ahora);
    const sigueVigente = existente !== null
      && new Date(existente.vigenteHasta).getTime() > ahora.getTime();
    const vigenteDesde = sigueVigente && existente !== null
      ? existente.vigenteDesde
      : ahora.toISOString();

    const promocion = await this.repo.guardar({
      negocioId: input.negocioId,
      porcentaje: input.porcentaje,
      motivo: normalizarMotivo(input.motivo),
      vigenteDesde,
      vigenteHasta: vigenteHasta.toISOString(),
      activo: true,
      createdBy: input.createdBy,
    });

    const sincronizacion = await this.sincronizar(input.negocioId, ahora);

    return { promocion, sincronizacion };
  }

  /**
   * Termina una promo antes de su vencimiento y restaura el precio base.
   *
   * @param negocioId ID del negocio.
   * @param ahora Momento de referencia.
   * @return Resultado de la sincronización.
   */
  async finalizar(negocioId: string, ahora: Date = new Date()): Promise<ResultadoSincronizacion>
  {
    await this.repo.desactivar(negocioId);

    return this.sincronizar(negocioId, ahora);
  }

  /**
   * Refleja en MP el precio que corresponde a la promo vigente.
   *
   * Si el negocio no tiene preapproval, solo marca la fila: el descuento se
   * aplicará al crear la suscripción. Si MP falla, guarda el error y devuelve
   * `sincronizada: false` para que el panel y el cron lo reintenten.
   *
   * @param negocioId ID del negocio.
   * @param ahora Momento de referencia.
   * @return Monto esperado y estado de la sincronización.
   */
  async sincronizar(negocioId: string, ahora: Date = new Date()): Promise<ResultadoSincronizacion>
  {
    const negocio = await this.repo.obtenerNegocio(negocioId);

    if (negocio === null)
    {
      return {
        monto: 0,
        sincronizada: false,
        error: "No encontramos el negocio a sincronizar.",
      };
    }

    const plan = resolverPlanPais(negocio.pais);
    const promocion = await this.repo.obtenerVigente(negocioId, ahora);
    const precio = calcularPrecioConPromo(plan.monto, promocion, ahora);

    let preapprovalIds: string[];

    if (negocio.suscripcionMpId !== null && negocio.suscripcionMpId.length > 0)
    {
      preapprovalIds = [negocio.suscripcionMpId];
    }
    else
    {
      try
      {
        preapprovalIds = await this.listarPendientes(negocioId);
      }
      catch (error)
      {
        const mensaje = mensajeCorto(error);
        await this.repo.marcarSincronizacion(negocioId, null, mensaje);

        return { monto: precio.montoFinal, sincronizada: false, error: mensaje };
      }
    }

    if (preapprovalIds.length === 0)
    {
      await this.repo.marcarSincronizacion(negocioId, ahora, null);

      return { monto: precio.montoFinal, sincronizada: true, error: null };
    }

    let ultimoError: string | null = null;

    for (const preapprovalId of preapprovalIds)
    {
      try
      {
        await this.actualizarMonto({
          preapprovalId,
          monto: precio.montoFinal,
          currency: plan.currency,
        });
      }
      catch (error)
      {
        ultimoError = mensajeCorto(error);
      }
    }

    if (ultimoError !== null)
    {
      await this.repo.marcarSincronizacion(negocioId, null, ultimoError);

      return { monto: precio.montoFinal, sincronizada: false, error: ultimoError };
    }

    await this.repo.marcarSincronizacion(negocioId, ahora, null);

    return { monto: precio.montoFinal, sincronizada: true, error: null };
  }

  /**
   * Barrido periódico: vence promos y reintenta las que quedaron sin sync.
   *
   * @param ahora Momento de referencia.
   * @return Cantidades revisadas, sincronizadas y con error.
   */
  async sincronizarPendientes(ahora: Date = new Date()): Promise<ResumenPromociones>
  {
    const promociones = (await this.repo.listarPromociones()).filter((promo) =>
      promo.activo || promo.sincronizadoEn === null || promo.ultimoError !== null);

    let sincronizadas = 0;
    let errores = 0;

    for (const promo of promociones)
    {
      try
      {
        if (promo.activo && new Date(promo.vigenteHasta).getTime() <= ahora.getTime())
        {
          await this.repo.desactivar(promo.negocioId);
        }

        const resultado = await this.sincronizar(promo.negocioId, ahora);

        if (resultado.sincronizada)
        {
          sincronizadas += 1;
        }
        else
        {
          errores += 1;
        }
      }
      catch
      {
        errores += 1;
      }
    }

    return { revisadas: promociones.length, sincronizadas, errores };
  }

  /**
   * Lista negocios con su promo y precio calculado para el panel admin.
   *
   * @param ahora Momento de referencia.
   * @return Negocios ordenados por nombre con promo y precios.
   */
  async listarParaAdmin(ahora: Date = new Date()): Promise<PromocionAdmin[]>
  {
    const [negocios, promociones] = await Promise.all([
      this.repo.listarNegocios(),
      this.repo.listarPromociones(),
    ]);
    const porNegocio = new Map(promociones.map((promo) => [promo.negocioId, promo]));

    return negocios.map((negocio) =>
    {
      const promocion = porNegocio.get(negocio.id) ?? null;
      const activa = promocion !== null
        && promocion.activo
        && promocionVigente(promocion, ahora);
      const plan = resolverPlanPais(negocio.pais);

      return {
        negocio,
        promocion,
        plan,
        precio: calcularPrecioConPromo(plan.monto, activa ? promocion : null, ahora),
      };
    });
  }
}

export const promocionService = new PromocionService();
