import { describe, it, expect } from "vitest";
import { upstreamUrl, proxyTmdb } from "../../server/tmdbProxy.js";
describe("TMDB boundary", () => {
  it.each([
    "endpoint=http://evil.test",
    "endpoint=detail&id=-1",
    "endpoint=popular&page=501",
    "endpoint=popular&token=x",
    "endpoint=search&query=",
    "endpoint=discover&genre=42",
    "endpoint=popular&page=1&page=2",
  ])("rejects %s", (q) =>
    expect(() => upstreamUrl(new URLSearchParams(q))).toThrow(),
  );
  it("uses fixed host and adult filter", () => {
    const u = upstreamUrl(
      new URLSearchParams({ endpoint: "search", query: "Alien" }),
    );
    expect(u.hostname).toBe("api.themoviedb.org");
    expect(u.searchParams.get("include_adult")).toBe("false");
  });
  it("fails honestly without credentials", async () =>
    expect(
      (await proxyTmdb("GET", new URLSearchParams("endpoint=popular"))).status,
    ).toBe(503));
  it("rejects writes", async () =>
    expect((await proxyTmdb("POST", new URLSearchParams())).status).toBe(405));
  it("never echoes upstream secrets", async () => {
    const r = await proxyTmdb(
      "GET",
      new URLSearchParams("endpoint=popular"),
      "SECRET",
      async () => new Response("SECRET", { status: 401 }),
    );
    expect(r.status).toBe(502);
    expect(JSON.stringify(r)).not.toContain("SECRET");
  });
});
