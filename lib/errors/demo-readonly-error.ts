import { AppError } from "./app-error";

/** La cuenta demo intentó ejecutar una escritura. */
export class DemoReadonlyError extends AppError
{
  public constructor(message: string)
  {
    super("DEMO_READONLY", 403, message);
  }
}
