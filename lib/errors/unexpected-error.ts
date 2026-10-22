import { AppError } from "./app-error";

/** Error no previsto; su mensaje interno nunca se muestra al usuario. */
export class UnexpectedError extends AppError
{
  public constructor(details?: Readonly<Record<string, unknown>>)
  {
    super("UNEXPECTED", 500, "Ocurrió un error inesperado. Probá de nuevo.", details);
  }
}
