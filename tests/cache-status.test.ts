import { describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ value: false }));
vi.mock("@/lib/db/client", () => ({
  getDatabase: () => ({
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => [
            {
              value: state.value,
              expiresAt: new Date(Date.now() + 86_400_000),
            },
          ],
        }),
      }),
    }),
  }),
}));
import { getCache } from "@/lib/cache/store";
describe("mutable refresh status", () => {
  it("observes failure and recovery written by another process even with a warm memory entry", async () => {
    state.value = false;
    expect(await getCache("refresh-status-test")).toBe(false);
    state.value = true;
    expect(await getCache("refresh-status-test", { authoritative: true })).toBe(
      true,
    );
    state.value = false;
    expect(await getCache("refresh-status-test", { authoritative: true })).toBe(
      false,
    );
  });
});
