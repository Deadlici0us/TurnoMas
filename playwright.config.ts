import { defineConfig } from "@playwright/test";

const previewUrl = process.env.PREVIEW_URL;
const baseURL = previewUrl ?? "http://127.0.0.1:3100";
// Bypass de Vercel Authentication para previews protegidos (System Environment Variable).
const protectionBypass = process.env.VERCEL_PROTECTION_BYPASS;

export default defineConfig(
{
  testDir: "./e2e",
  fullyParallel: true,
  use:
  {
    baseURL,
    ...(protectionBypass === undefined || protectionBypass.length === 0
      ? {}
      : { extraHTTPHeaders: { "x-vercel-protection-bypass": protectionBypass } }),
  },
  webServer: previewUrl
    ? undefined
    : {
      command: "npm run build --silent && npm run start -- --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env:
      {
        NEXT_PUBLIC_SUPABASE_URL: "",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "",
        SUPABASE_SECRET_KEY: "",
      },
    },
});
