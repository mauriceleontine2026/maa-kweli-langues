import { afterEach, describe, expect, it, vi } from "vitest";
import { request } from "./backendClient";

describe("backendClient CSRF recovery", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("retries a rejected mutation with the CSRF token exposed by the API", async () => {
    vi.stubGlobal("window", {
      location: {
        hostname: "maa-kweli-langues.vercel.app",
        origin: "https://maa-kweli-langues.vercel.app",
      },
    });
    vi.stubGlobal("document", { cookie: "" });

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "CSRF token missing or invalid" }), {
        status: 403,
        headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf-from-api" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ accepted: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await request("POST", "/api/ai/chat", { prompt: "test" });

    expect(result).toEqual({ accepted: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers["X-CSRF-Token"]).toBe("csrf-from-api");
    expect(fetchMock.mock.calls[1][1].credentials).toBe("include");
  });
});