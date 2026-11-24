import { describe, expect, it } from "vitest";
import { isFreshSession } from "@/lib/auth/freshness";

const NOW = new Date("2026-11-24T13:00:00.000Z");

describe("isFreshSession", () => {
  it("vale até 1 dia depois de entrar", () => {
    expect(isFreshSession(new Date("2026-11-23T13:00:00.000Z"), NOW)).toBe(true);
    expect(isFreshSession(new Date("2026-11-23T12:59:59.999Z"), NOW)).toBe(false);
  });
});
