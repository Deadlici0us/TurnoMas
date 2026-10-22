import { AppError } from "./app-error";

/** Falta de sesión o credenciales inválidas. */
export class AuthError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("UNAUTHENTICATED", 401, message, details);
  }
}
