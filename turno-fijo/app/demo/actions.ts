"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Entra a la demo: sesión local con cookie, sin Supabase. */
export async function enterDemo(): Promise<void>
{
  (await cookies()).set("session", "demo", { path: "/", maxAge: 60 * 60 * 24 });

  redirect("/dashboard");
}
