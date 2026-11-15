import { it, expect, vi } from "vitest";
vi.mock("../services/tmdb.js", () => ({ tmdbList: vi.fn() }));
vi.mock("../services/custom.js", () => ({ customList: vi.fn() }));
import { tmdbList } from "../services/tmdb.js";
import { customList } from "../services/custom.js";
import { queryCatalog } from "../repositories/catalog.js";
it("keeps a failed source cursor while advancing the successful source", async () => {
  tmdbList.mockRejectedValueOnce(Error("rate limited"));
  customList.mockResolvedValueOnce({
    items: [{ key: "custom:1", genreIds: [18] }],
    next: 20,
  });
  const result = await queryCatalog({ cursors: { tmdb: 2, custom: 0 } });
  expect(result.next).toEqual({ tmdb: 2, custom: 20 });
  expect(result.items).toHaveLength(1);
  expect(result.errors[0]).toContain("TMDB");
});
