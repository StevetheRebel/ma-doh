import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const AUTH_REQUEST_TIMEOUT_MS = 15_000;

export async function fetchWithAuthTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = AUTH_REQUEST_TIMEOUT_MS,
) {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromCaller = () => controller.abort(init?.signal?.reason);
  init?.signal?.addEventListener("abort", abortFromCaller, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      throw new Error(
        "Authentication request timed out. Check your connection and try again.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    init?.signal?.removeEventListener("abort", abortFromCaller);
  }
}

let client: SupabaseClient | undefined;
export function authConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
export function getSupabase() {
  if (!authConfigured())
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local, then restart Next.js.",
    );
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { fetch: fetchWithAuthTimeout },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    },
  );
  return client;
}
