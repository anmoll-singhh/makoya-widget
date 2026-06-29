/**
 * lib/scan-queue.test.ts
 *
 * Locks the SAFE-WHEN-UNCONFIGURED contract: with Upstash env unset, every queue
 * primitive must be a harmless no-op — never throw, never block a real scan, never
 * silently swallow one. This is what lets the queue ship without breaking local dev
 * (no Redis) or a deploy whose Upstash env isn't wired yet.
 *
 * env.server is mocked with empty Upstash creds so getRedis() returns null and all
 * functions take the unconfigured branch. (The live Redis logic — Lua claim/lease —
 * is exercised in integration, not here.)
 */
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/env.server", () => ({
  env: { UPSTASH_REDIS_REST_URL: "", UPSTASH_REDIS_REST_TOKEN: "" },
}));

import {
  enqueueSites,
  claimBatch,
  ackScan,
  recordDeliveryAndMaybeDeadLetter,
  acquireScanLock,
  releaseScanLock,
  reserveInteractiveSlot,
  releaseInteractiveSlot,
  queueDepth,
} from "./scan-queue";

describe("scan-queue — safe when Upstash is unconfigured", () => {
  it("enqueueSites no-ops without throwing", async () => {
    await expect(enqueueSites(["a", "b"])).resolves.toBeUndefined();
  });

  it("claimBatch returns [] (nothing to dispatch)", async () => {
    await expect(claimBatch(10, 60_000)).resolves.toEqual([]);
  });

  it("ackScan / recordDeliveryAndMaybeDeadLetter are safe no-ops", async () => {
    await expect(ackScan("a")).resolves.toBeUndefined();
    await expect(recordDeliveryAndMaybeDeadLetter("a")).resolves.toBe(false);
  });

  it("acquireScanLock returns a non-null sentinel so the interactive path PROCEEDS", async () => {
    const token = await acquireScanLock("site", 90);
    expect(token).not.toBeNull(); // unconfigured must not look like 'someone else holds it'
    await expect(releaseScanLock("site", token as string)).resolves.toBeUndefined();
  });

  it("reserveInteractiveSlot fails OPEN (true) and release is safe", async () => {
    await expect(reserveInteractiveSlot(5)).resolves.toBe(true);
    await expect(releaseInteractiveSlot()).resolves.toBeUndefined();
  });

  it("queueDepth returns 0", async () => {
    await expect(queueDepth()).resolves.toBe(0);
  });
});
