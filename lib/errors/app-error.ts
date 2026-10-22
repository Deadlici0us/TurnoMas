/** Error de negocio con código estable y mensaje apto para mostrar al usuario. */
export abstract class AppError extends Error
{
  public readonly code: string;

  public readonly status: number;

  public readonly details: Readonly<Record<string, unknown>> | undefined;

  protected constructor(
    code: string,
    status: number,
    message: string,
    details?: Readonly<Record<string, unknown>>,
  )
  {
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
