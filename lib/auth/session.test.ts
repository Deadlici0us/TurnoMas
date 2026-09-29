import { describe, expect, it } from "vitest";

import { resolveSessionState } from "./session";

describe("resolveSessionState",
() =>
{
  it("debería marcar autenticado con cookie demo",
  () =>
  {
    expect(resolveSessionState({ userId: null, demoCookie: "demo" })).toBe("authenticated");
  });

  it("debería marcar autenticado con usuario Supabase",
  () =>
  {
    expect(resolveSessionState({ userId: "user-123", demoCookie: undefined })).toBe("authenticated");
  });

  it("debería marcar invitado sin usuario ni cookie demo",
  () =>
  {
    expect(resolveSessionState({ userId: null, demoCookie: undefined })).toBe("guest");
  });

  it("debería marcar invitado con cookie distinta de demo",
  () =>
  {
    expect(resolveSessionState({ userId: null, demoCookie: "otro" })).toBe("guest");
  });
});
