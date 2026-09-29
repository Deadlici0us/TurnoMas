import { describe, expect, it } from "vitest";

import { shouldSendRemarketing } from "./remarketing";

const AHORA = new Date("2026-09-28T10:00:00Z");

describe("shouldSendRemarketing",
() =>
{
  it("debería enviar cuando pasaron X días y no fue enviado",
  () =>
  {
    const fin = new Date("2026-09-20T10:00:00Z");

    expect(shouldSendRemarketing({ fin, remarketingEnviado: false }, AHORA, 7)).toBe(true);
  });

  it("debería conservar cuando aún no pasaron X días",
  () =>
  {
    const fin = new Date("2026-09-25T10:00:00Z");

    expect(shouldSendRemarketing({ fin, remarketingEnviado: false }, AHORA, 7)).toBe(false);
  });

  it("debería conservar cuando ya fue enviado",
  () =>
  {
    const fin = new Date("2026-09-10T10:00:00Z");

    expect(shouldSendRemarketing({ fin, remarketingEnviado: true }, AHORA, 7)).toBe(false);
  });

  it("debería rechazar una ventana no positiva",
  () =>
  {
    const fin = new Date("2026-09-10T10:00:00Z");

    expect(() => shouldSendRemarketing({ fin, remarketingEnviado: false }, AHORA, 0))
      .toThrow(RangeError);
  });
});
