import { describe, expect, it } from "vitest";

import { FakeEmailProvider } from "./email";
import { FakeBackgroundJobs } from "./jobs";

describe("FakeEmailProvider",
() =>
{
  it("debería registrar el email transaccional en memoria",
  async () =>
  {
    const fake = new FakeEmailProvider();

    const id = await fake.send({
      to: "cliente@ejemplo.com",
      subject: "Confirmación de reserva",
      html: "<p>Te esperamos</p>",
    });

    expect(id.length).toBeGreaterThan(0);
    expect(fake.sent).toHaveLength(1);
    expect(fake.sent[0]?.to).toBe("cliente@ejemplo.com");
  });
});

describe("FakeBackgroundJobs",
() =>
{
  it("debería programar tareas con retardo en memoria",
  async () =>
  {
    const fake = new FakeBackgroundJobs();

    const id = await fake.schedule({
      url: "https://turnofijo-roan.vercel.app/api/cron/recordatorios",
      delaySeconds: 86_400,
      body: { turnoId: "t-1" },
    });

    expect(id.length).toBeGreaterThan(0);
    expect(fake.scheduled).toHaveLength(1);
    expect(fake.scheduled[0]?.delaySeconds).toBe(86_400);
  });
});
