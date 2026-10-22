import { AppError } from "./app-error";

/** Un servicio externo o dependencia no está disponible. */
export class UnavailableError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("UNAVAILABLE", 503, message, details);
  }
}
