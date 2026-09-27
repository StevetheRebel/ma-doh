import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command: `PYTHONPATH=../backend ${process.env.E2E_PYTHON || "python"} -m uvicorn support_api:app --app-dir e2e --host 127.0.0.1 --port 8100`,
      url: "http://127.0.0.1:8100/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      timeout: 120000,
      env: {
        NEXT_PUBLIC_API_BASE_URL: "http://127.0.0.1:8100",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "synthetic-publishable-key",
      },
      reuseExistingServer: false,
    },
  ],
});
