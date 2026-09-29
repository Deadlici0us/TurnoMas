import { defineConfig } from "@playwright/test";

export default defineConfig(
{
  testDir: "./e2e",
  fullyParallel: true,
  use:
  {
    baseURL: "http://127.0.0.1:3100",
  },
  webServer:
  {
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
