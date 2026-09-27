import { getSupabase } from "@/lib/supabase";
import type { Page } from "@/types/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail: unknown,
  ) {
    super(message);
  }
}
function describe(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail))
    return detail
      .map((d) => `${d.field ?? ""}: ${d.message ?? d.msg ?? "Invalid value"}`)
      .join("; ");
  if (detail && typeof detail === "object" && "message" in detail)
    return String(detail.message);
  return "The request could not be completed.";
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session)
    throw new ApiError(
      "Your session expired. Please sign in again.",
      401,
      null,
    );
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const base = (
    process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"
  ).replace(/\/$/, "");
  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...options,
      headers,
      cache: "no-store",
    });
  } catch {
    throw new ApiError(
      "Cannot reach the API. Check that FastAPI is running and this frontend origin is allowed in CORS_ORIGINS.",
      0,
      null,
    );
  }
  if (response.status === 204) return undefined as T;
  const body = await response
    .json()
    .catch(() => ({ detail: "The API returned an unreadable response." }));
  if (!response.ok)
    throw new ApiError(describe(body.detail), response.status, body.detail);
  return body as T;
}
export async function allPages<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T[]> {
  const items: T[] = [];
  for (let offset = 0; ; offset += 200) {
    const page = await api<Page<T>>(
      `${path}${path.includes("?") ? "&" : "?"}limit=200&offset=${offset}`,
      { signal },
    );
    items.push(...page.items);
    if (offset + page.items.length >= page.total || page.items.length === 0)
      return items;
  }
}
