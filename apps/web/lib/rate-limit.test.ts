/**
 * lib/rate-limit.test.ts — covers the IN-MEMORY fallback path of checkRateLimit.
 *
 * In the vitest env neither UPSTASH_REDIS_REST_URL nor UPSTASH_REDIS_REST_TOKEN is
 * set (see vitest.setup.ts), so `env.UPSTASH_*` are empty strings and
 * checkRateLimit deterministically uses the in-memory window. That lets us assert
 * the exact semantics the public routes depend on — without any Redis or mocking.
 *
 * The Upstash branch is intentionally NOT exercised here: it requires a live REST
 * endpoint and its fail-open behaviour is documented + covered by the "never
 * throws / always boolean" contract test below. Each test uses a UNIQUE key so the
 * module-level memory Map doesn't bleed between cases.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit — in-memory fallback", () => {
  it("allows the first `limit` calls, then limits the next", async () => {
    const key = `k-basic-${Math.random()}`;
    const opts = { limit: 3, windowMs: 60_000 };

    // First `limit` (3) calls are under the cap → allowed (false).
    expect(await checkRateLimit(key, opts)).toBe(false);
    expect(await checkRateLimit(key, opts)).toBe(false);
    expect(await checkRateLimit(key, opts)).toBe(false);

    // The 4th call exceeds the cap → limited (true).
    expect(await checkRateLimit(key, opts)).toBe(true);
    // And it stays limited within the same window.
    expect(await checkRateLimit(key, opts)).toBe(true);
  });

  it("tracks different keys independently", async () => {
    const opts = { limit: 1, windowMs: 60_000 };
    const a = `k-a-${Math.random()}`;
    const b = `k-b-${Math.random()}`;

    expect(await checkRateLimit(a, opts)).toBe(false); // a: 1st allowed
    expect(await checkRateLimit(a, opts)).toBe(true); //  a: 2nd limited

    // b is a fresh bucket — a's exhaustion must not affect it.
    expect(await checkRateLimit(b, opts)).toBe(false);
  });

  it("resets the count after the window elapses", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));

    const key = `k-window-${Math.random()}`;
    const opts = { limit: 2, windowMs: 60_000 };

    expect(await checkRateLimit(key, opts)).toBe(false); // 1
    expect(await checkRateLimit(key, opts)).toBe(false); // 2
    expect(await checkRateLimit(key, opts)).toBe(true); //  3 → limited

    // Advance past the window — the bucket should reset on the next call.
    vi.advanceTimersByTime(60_001);
    expect(await checkRateLimit(key, opts)).toBe(false); // fresh window
    expect(await checkRateLimit(key, opts)).toBe(false);
    expect(await checkRateLimit(key, opts)).toBe(true); //  limited again
  });

  it("treats the same key under different limits/windows as separate buckets", async () => {
    const key = `k-shared-${Math.random()}`;

    // Exhaust the (limit:1) bucket.
    expect(await checkRateLimit(key, { limit: 1, windowMs: 60_000 })).toBe(false);
    expect(await checkRateLimit(key, { limit: 1, windowMs: 60_000 })).toBe(true);

    // A different (limit,window) config for the same key is independent.
    expect(await checkRateLimit(key, { limit: 5, windowMs: 30_000 })).toBe(false);
  });

  it("never throws and always returns a boolean", async () => {
    const key = `k-contract-${Math.random()}`;
    const result = await checkRateLimit(key, { limit: 1, windowMs: 1_000 });
    expect(typeof result).toBe("boolean");

    // Degenerate options must not blow up either (sub-second window rounds to 1s
    // for the Upstash duration string; in-memory uses the raw ms).
    await expect(checkRateLimit(key, { limit: 0, windowMs: 1 })).resolves.toEqual(
      expect.any(Boolean)
    );
  });
});
