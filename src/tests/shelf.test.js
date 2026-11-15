import { beforeEach, describe, it, expect, vi } from "vitest";
import { db } from "../db/local.js";
import { mutateShelf } from "../repositories/shelf.js";
import {
  acknowledge,
  flushShelf,
  hydrate,
  reconcileOperation,
} from "../db/sync.js";
const movie = {
  key: "tmdb:12",
  source: "tmdb",
  sourceId: "12",
  title: "Transient title",
};
beforeEach(async () => {
  await Promise.all(db.tables.map((t) => t.clear()));
});
describe("durable shelf and outbox", () => {
  it("coalesces rapid additions and preserves ID through delete/re-add", async () => {
    await Promise.all([mutateShelf("A", movie), mutateShelf("A", movie)]);
    expect(await db.shelf.count()).toBe(1);
    expect(await db.outbox.count()).toBe(1);
    const first = await db.shelf.get(["A", movie.key]);
    await mutateShelf("A", movie, {}, true);
    await mutateShelf("A", movie);
    expect((await db.shelf.get(["A", movie.key])).id).toBe(first.id);
    expect((await db.outbox.get(["A", movie.key])).operation).toBe("upsert");
    expect(first.snapshot).toBeNull();
  });
  it("sets and clears completion date while preserving it during review edits", async () => {
    await mutateShelf("A", movie, { status: "completed" });
    const a = await db.shelf.get(["A", movie.key]);
    await mutateShelf("A", movie, { review: "Great" });
    expect((await db.shelf.get(["A", movie.key])).completed_at).toBe(
      a.completed_at,
    );
    await mutateShelf("A", movie, { status: "watching" });
    expect((await db.shelf.get(["A", movie.key])).completed_at).toBeNull();
  });
  it("does not lose newer edits to a stale acknowledgement", async () => {
    await mutateShelf("A", movie);
    const old = await db.outbox.get(["A", movie.key]);
    await mutateShelf("A", movie, { review: "new revision" });
    await acknowledge(old, { id: "server-id" });
    const latest = await db.outbox.get(["A", movie.key]);
    expect(latest.payload.review).toBe("new revision");
    expect(latest.itemId).toBe("server-id");
    expect(latest.revision).toBe(2);
    await acknowledge(latest, { id: "server-id" });
    expect(await db.outbox.count()).toBe(0);
    expect((await db.shelf.get(["A", movie.key])).review).toBe("new revision");
  });
  it("retains failed operations and isolates accounts", async () => {
    await mutateShelf("A", movie);
    await mutateShelf("B", movie);
    await flushShelf("A", {
      send: async () => {
        throw Error("network");
      },
      load: vi.fn(),
    });
    expect(await db.outbox.count()).toBe(2);
    expect((await db.shelf.get(["A", movie.key])).syncState).toBe("error");
    expect((await db.shelf.get(["B", movie.key])).syncState).toBe("pending");
  });
  it("never sends an operation with a mismatched session", async () => {
    await mutateShelf("A", movie);
    const op = await db.outbox.get(["A", movie.key]);
    const transport = vi.fn();
    await expect(
      reconcileOperation(op, transport, async () => {
        throw Error("wrong user");
      }),
    ).rejects.toThrow("wrong user");
    expect(transport).not.toHaveBeenCalled();
  });
  it("replays an uncertain create by patching its canonical row", async () => {
    await mutateShelf("A", movie);
    const op = await db.outbox.get(["A", movie.key]);
    const transport = vi
      .fn()
      .mockResolvedValueOnce([{ id: "canonical" }])
      .mockResolvedValueOnce([{ id: "canonical" }]);
    await reconcileOperation(op, transport, async () => {});
    expect(transport.mock.calls[1][1].method).toBe("PATCH");
    expect(transport.mock.calls[1][1].params.user_id).toBe("eq.A");
  });
  it("does not hydrate over edits made during the read", async () => {
    await mutateShelf("A", movie);
    const op = await db.outbox.get(["A", movie.key]);
    await acknowledge(op, { id: op.itemId });
    let finish;
    const loading = hydrate(
      "A",
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await vi.waitFor(() => expect(finish).toBeTypeOf("function"));
    await mutateShelf("A", movie, { review: "local wins" });
    finish([]);
    await loading;
    expect((await db.shelf.get(["A", movie.key])).review).toBe("local wins");
  });
  it("rolls back shelf changes if the outbox transaction fails", async () => {
    const spy = vi
      .spyOn(db.outbox, "put")
      .mockRejectedValueOnce(Error("quota"));
    await expect(mutateShelf("A", movie)).rejects.toThrow("quota");
    expect(await db.shelf.count()).toBe(0);
    spy.mockRestore();
  });
  it("confirms deletes before removing tombstones", async () => {
    await mutateShelf("A", movie);
    await mutateShelf("A", movie, {}, true);
    await flushShelf("A", { send: async () => null, load: async () => {} });
    expect(await db.outbox.count()).toBe(0);
    expect(await db.shelf.count()).toBe(0);
  });
});
