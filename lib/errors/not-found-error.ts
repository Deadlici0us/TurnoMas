import { AppError } from "./app-error";

/** El recurso solicitado no existe o no pertenece al negocio. */
export class NotFoundError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("NOT_FOUND", 404, message, details);
  }
}
