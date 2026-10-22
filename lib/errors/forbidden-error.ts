import { AppError } from "./app-error";

/** El usuario autenticado no puede ejecutar la operación. */
export class ForbiddenError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("FORBIDDEN", 403, message, details);
  }
}
