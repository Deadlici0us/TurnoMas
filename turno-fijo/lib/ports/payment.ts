/**
 * Puerto IPaymentGateway (arquitectura hexagonal, PLAN.md 2.1).
 *
 * La implementación real (MercadoPagoAdapter) vivirá en
 * `lib/adapters/`; los tests usan FakePaymentGateway.
 */

export interface CreateDepositPreferenceInput
{
  readonly bookingId: string;
  readonly amountCents: number;
  readonly percentage: number;
  readonly description: string;
}

export interface DepositPreference
{
  readonly id: string;
  readonly checkoutUrl: string;
  readonly amountCents: number;
}

export interface IPaymentGateway
{
  createDepositPreference(input: CreateDepositPreferenceInput): Promise<DepositPreference>;
  refundPayment(paymentId: string): Promise<void>;
}

export class PaymentNotFoundError extends Error
{
  constructor(paymentId: string)
  {
    super(`Pago no encontrado: ${paymentId}`);
    this.name = "PaymentNotFoundError";
  }
}

/** Calcula el monto de la seña en centavos, redondeando al entero más cercano. */
export function calculateDepositAmount(totalCents: number, percentage: number): number
{
  if (!Number.isInteger(percentage) || percentage < 1 || percentage > 100)
  {
    throw new RangeError("El porcentaje de seña debe ser un entero entre 1 y 100.");
  }

  return Math.round((totalCents * percentage) / 100);
}

/** Doble de test en memoria: registra preferencias y reembolsos sin red. */
export class FakePaymentGateway implements IPaymentGateway
{
  private readonly preferences = new Map<string, DepositPreference>();
  private counter = 0;

  async createDepositPreference(input: CreateDepositPreferenceInput): Promise<DepositPreference>
  {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0)
    {
      throw new RangeError("El monto debe ser un entero positivo en centavos.");
    }

    this.counter += 1;
    const id = `fake-pref-${this.counter}`;
    const preference: DepositPreference =
    {
      id,
      checkoutUrl: `https://checkout.fake/pay/${id}`,
      amountCents: input.amountCents,
    };
    this.preferences.set(id, preference);

    return preference;
  }

  async refundPayment(paymentId: string): Promise<void>
  {
    const existed = this.preferences.delete(paymentId);

    if (!existed)
    {
      throw new PaymentNotFoundError(paymentId);
    }
  }
}
