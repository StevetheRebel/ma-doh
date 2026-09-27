import { afterEach, describe, expect, it, vi } from "vitest";
const session = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({
  getSupabase: () => ({ auth: { getSession: session } }),
}));
import { api, allPages } from "./api";
import { formatKes } from "./finance";
afterEach(() => vi.unstubAllGlobals());
describe("authenticated API adapter", () => {
  it("preserves the bearer token and paginates past the first 200 rows", async () => {
    session.mockResolvedValue({
      data: { session: { access_token: "synthetic-token" } },
    });
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            items: Array.from({ length: 200 }, (_, i) => i),
            total: 201,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ items: [200], total: 201 })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await allPages("/transactions")).toHaveLength(201);
    expect(fetcher.mock.calls[1][0]).toContain("offset=200");
    expect(fetcher.mock.calls[0][1].headers.get("Authorization")).toBe(
      "Bearer synthetic-token",
    );
  });
  it("does not send financial requests without a session", async () => {
    session.mockResolvedValue({ data: { session: null } });
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    await expect(api("/me")).rejects.toMatchObject({ status: 401 });
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("leaves multipart boundaries to the browser", async () => {
    session.mockResolvedValue({ data: { session: { access_token: "test" } } });
    const fetcher = vi.fn().mockResolvedValue(new Response("{}"));
    vi.stubGlobal("fetch", fetcher);
    const body = new FormData();
    body.set("file", new Blob(["test"]), "audio.webm");
    await api("/captures/voice", { method: "POST", body });
    expect(fetcher.mock.calls[0][1].headers.has("Content-Type")).toBe(false);
  });
  it("shows duplicate errors from the API", async () => {
    session.mockResolvedValue({ data: { session: { access_token: "test" } } });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              detail: { message: "A similar transaction exists" },
            }),
            { status: 409 },
          ),
        ),
    );
    await expect(api("/drafts/id/confirm")).rejects.toThrow(
      "A similar transaction exists",
    );
  });
  it("formats exact large amounts without losing cents", () =>
    expect(formatKes("99999999999999.99")).toBe("KES 99,999,999,999,999.99"));
});
