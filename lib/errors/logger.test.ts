import { afterEach, describe, expect, it, vi } from "vitest";

import { ConflictError } from "./conflict-error";
import { logError } from "./logger";

describe("logError",
() =>
{
  afterEach(() =>
  {
    vi.restoreAllMocks();
  });

  it("debería loguear código, contexto y digest sin datos sensibles",
  () =>
  {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(new ConflictError("Tiene historial", "staff_con_historial"), {
      digest: "abc123",
    });

    logError(error, { action: "eliminarStaff", requestId: "req-1" });

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(spy.mock.calls[0]?.[1]));
    expect(payload).toMatchObject({
      code: "staff_con_historial",
      digest: "abc123",
      action: "eliminarStaff",
      requestId: "req-1",
    });
  });

  it("debería loguear un error desconocido sin romper",
  () =>
  {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    logError("fallo raro", { route: "/api/reservas" });

    expect(spy).toHaveBeenCalledOnce();
    const payload = JSON.parse(String(spy.mock.calls[0]?.[1]));
    expect(payload.message).toBe("fallo raro");
    expect(payload.route).toBe("/api/reservas");
  });
});
