import { describe, expect, it } from "vitest";

import { resolveSessionState } from "./session";

describe("resolveSessionState",
() =>
{
  it("debería marcar autenticado con usuario Supabase",
  () =>
  {
    expect(resolveSessionState({ userId: "user-123" })).toBe("authenticated");
  });

  it("debería marcar invitado sin usuario",
  () =>
  {
    expect(resolveSessionState({ userId: null })).toBe("guest");
  });
});
