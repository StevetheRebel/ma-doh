import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWithAuthTimeout } from "./supabase";

describe("Supabase auth fetch", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns successful responses", async () => {
    const response = new Response(null, { status: 204 });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));

    await expect(fetchWithAuthTimeout("https://example.com", {}, 50)).resolves.toBe(
      response,
    );
  });

  it("stops a hung auth request with a useful error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((_input, init?: RequestInit) => {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("Aborted", "AbortError")),
          );
        });
      }),
    );

    await expect(
      fetchWithAuthTimeout("https://example.com", {}, 5),
    ).rejects.toThrow("Authentication request timed out");
  });
});
