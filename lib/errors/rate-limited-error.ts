import { AppError } from "./app-error";

/** Se superó un límite de uso temporal. */
export class RateLimitedError extends AppError
{
  public constructor(message: string, details?: Readonly<Record<string, unknown>>)
  {
    super("RATE_LIMITED", 429, message, details);
  }
}
