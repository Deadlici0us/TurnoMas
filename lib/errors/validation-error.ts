import { AppError } from "./app-error";

/** Datos inválidos enviados por el usuario. */
export class ValidationError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("VALIDATION", 400, message, details);
  }
}
