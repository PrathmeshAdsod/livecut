import { beforeEach, describe, it, expect, vi } from "vitest";
const { runtime, generate, statements } = vi.hoisted(() => ({
  runtime: {
    GEMINI_API_KEY: "fake-key-for-unit-tests",
    GEMINI_FREE_TIER_CONFIRMED: "true",
  },
  generate: vi.fn(),
  statements: [] as { sql: string; args: unknown[] }[],
}));
vi.mock("cloudflare:workers", () => {
  const DB = {
    prepare: (sql: string) => ({
      bind: (...args: unknown[]) => {
        statements.push({ sql, args });
        return {
          first: async () => ({ id: "round" }),
          run: async () => ({ success: true }),
        };
      },
    }),
    batch: async () => [],
  };
  return {
    env: {
      get GEMINI_API_KEY() {
        return runtime.GEMINI_API_KEY;
      },
      get GEMINI_FREE_TIER_CONFIRMED() {
        return runtime.GEMINI_FREE_TIER_CONFIRMED;
      },
      DB,
    },
  };
});
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent: generate };
  },
}));
import { shortlist } from "../lib/shortlist";
import type { Entry, Round } from "../lib/types";
const round = {
  id: "round",
  status: "closed",
  context: "A fictional hero misses a jump.",
} as Round;
const entries: Entry[] = [
  {
    id: "a",
    roundId: "round",
    nickname: "Viewer",
    mode: "breaking-news",
    headline: "The landing remains under investigation.",
    detail: "Fictional parody",
    status: "pending",
    synthetic: 0,
    suggested: 0,
    reason: null,
    created: 1,
  },
];
beforeEach(() => {
  generate.mockReset();
  statements.length = 0;
  runtime.GEMINI_FREE_TIER_CONFIRMED = "true";
});
describe("bounded Gemini review", () => {
  it("does not call AI before the round closes", async () => {
    await expect(
      shortlist({ ...round, status: "open" }, entries, true),
    ).rejects.toMatchObject({ status: 409 });
    expect(generate).not.toHaveBeenCalled();
  });
  it("requires explicit free-tier configuration", async () => {
    runtime.GEMINI_FREE_TIER_CONFIRMED = "false";
    await expect(shortlist(round, entries, true)).rejects.toMatchObject({
      status: 503,
    });
    expect(generate).not.toHaveBeenCalled();
  });
  it("clearly labels provider failure as a non-AI fallback", async () => {
    generate.mockRejectedValue(new Error("provider unavailable"));
    const result = await shortlist(round, entries, true);
    expect(result.source).toBe("manual");
    expect(result.note).toContain("unavailable");
    expect(statements.some((s) => s.sql.includes("status="))).toBe(false);
  });
  it("rejects invented finalist IDs and falls back", async () => {
    generate.mockResolvedValue({
      text: JSON.stringify({
        items: [{ id: "a", flag: false, reason: "Safe parody" }],
        finalists: ["invented"],
      }),
    });
    expect((await shortlist(round, entries, true)).source).toBe("manual");
  });
  it("retains complete valid suggestions without approving or picking a winner", async () => {
    generate.mockResolvedValue({
      text: JSON.stringify({
        items: [{ id: "a", flag: false, reason: "Safe, relevant parody" }],
        finalists: ["a"],
      }),
    });
    const result = await shortlist(round, entries, true);
    expect(result.source).toBe("gemini");
    expect(generate).toHaveBeenCalledOnce();
    const request = generate.mock.calls[0][0];
    expect(request.config.maxOutputTokens).toBe(10000);
    expect(request.config.responseMimeType).toBe("application/json");
    expect(
      statements.some(
        (s) => s.sql.includes("winnerId") || s.sql.includes("SET status"),
      ),
    ).toBe(false);
  });
  it("never suggests a flagged entry even if the model includes it", async () => {
    generate.mockResolvedValue({
      text: JSON.stringify({
        items: [{ id: "a", flag: true, reason: "Private information" }],
        finalists: ["a"],
      }),
    });
    await shortlist(round, entries, true);
    expect(statements.some((s) => s.sql.includes("suggested=1"))).toBe(false);
  });
});
