import { AppError } from "./app-error";

/** La operación choca con el estado actual o con una restricción de datos. */
export class ConflictError extends AppError
{
  public constructor(
    message: string,
    code: string = "CONFLICT",
    details?: Readonly<Record<string, unknown>>,
  )
  {
    super(code, 409, message, details);
  }
}
