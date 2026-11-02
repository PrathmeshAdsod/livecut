import { describe, it, expect } from "vitest";
import { presets, categories } from "../lib/presets";
import {
  entrySchema,
  roundSchema,
  normalize,
  similarity,
  manualShortlist,
  transitions,
} from "../lib/domain";
import type { Entry } from "../lib/types";
describe("creative engine", () => {
  it("defines fifty unique, meaningful presets across five collections and six renderers", () => {
    expect(presets).toHaveLength(50);
    expect(new Set(presets.map((p) => p.id)).size).toBe(50);
    expect(new Set(presets.map((p) => p.renderer)).size).toBe(6);
    for (const category of categories)
      expect(presets.filter((p) => p.category === category)).toHaveLength(10);
    for (const p of presets) {
      expect(p.prompt.length).toBeGreaterThan(18);
      expect(p.example.length).toBeGreaterThanOrEqual(3);
      expect(p.detailExample.length).toBeGreaterThan(10);
      expect(p.label).toBeTruthy();
      expect(
        entrySchema.safeParse({
          nickname: "Viewer",
          mode: p.id,
          headline: p.example,
          detail: p.detailExample,
        }).success,
      ).toBe(true);
    }
  });
  it("normalizes punctuation, case and whitespace for exact duplicate protection", () => {
    expect(normalize("  HERO!  Falls. ")).toBe("hero falls");
    expect(normalize("ＨＥＲＯ falls")).toBe("hero falls");
    expect(similarity("hero saves a friend", "hero saves a friend!")).toBe(1);
  });
});
describe("untrusted viewer input", () => {
  const good = {
    nickname: "Nova_Byte",
    mode: "breaking-news",
    headline: "The floor declined to comment.",
    detail: "Fictional game-world parody.",
  };
  it("accepts a guest creation and trims values", () => {
    expect(
      entrySchema.parse({ ...good, nickname: " Nova_Byte " }).nickname,
    ).toBe("Nova_Byte");
  });
  it.each([
    { nickname: "x" },
    { nickname: "<script>alert(1)</script>" },
    { headline: "x" },
    { headline: "x".repeat(121) },
    { detail: "x".repeat(201) },
    { mode: "unregistered-format" },
    { headline: "hello\u0000there" },
  ])("rejects invalid or oversized input %j", (patch) => {
    expect(entrySchema.safeParse({ ...good, ...patch }).success).toBe(false);
  });
  it("treats HTML-like entry text as inert data", () => {
    expect(
      entrySchema.parse({ ...good, headline: "<img src=x onerror=alert(1)>" })
        .headline,
    ).toContain("<img");
  });
  it("bounds durations, queue size and context", () => {
    const r = {
      title: "A rescue",
      context: "A game character misses a jump.",
      clipType: "scene",
      clipUrl: "/images/skyfall.svg",
      mode: "open-remix",
      duration: 180,
      limit: 100,
    };
    expect(roundSchema.safeParse(r).success).toBe(true);
    expect(roundSchema.safeParse({ ...r, limit: 100000 }).success).toBe(false);
    expect(roundSchema.safeParse({ ...r, duration: 0 }).success).toBe(false);
    expect(
      roundSchema.safeParse({ ...r, context: "a".repeat(401) }).success,
    ).toBe(false);
  });
});
describe("human controlled review", () => {
  function entry(
    id: string,
    mode: string,
    headline: string,
    status: Entry["status"] = "pending",
  ): Entry {
    return {
      id,
      roundId: "r",
      nickname: "viewer",
      mode,
      headline,
      detail: "",
      status,
      synthetic: 0,
      suggested: 0,
      reason: null,
      created: 1,
    };
  }
  it("returns diverse deterministic picks, skips rejected and near duplicates", () => {
    const list = [
      entry("1", "breaking-news", "A hero saved a friend"),
      entry("2", "breaking-news", "A hero saved a friend!"),
      entry("3", "movie-trailer", "The return of the missing platform"),
      entry("4", "funny-caption", "No return journey included"),
      entry(
        "5",
        "sports-commentary",
        "Look at that completely unnecessary leap",
      ),
      entry("6", "documentary", "Observe the human mistake in its habitat"),
      entry(
        "7",
        "corporate-disaster",
        "Meeting targets not platforms",
        "rejected",
      ),
    ];
    expect(manualShortlist(list).map((v) => v.id)).toEqual([
      "1",
      "3",
      "4",
      "5",
      "6",
    ]);
    expect(
      manualShortlist(list).every((v) => v.reason.includes("Rule-based")),
    ).toBe(true);
  });
  it("only permits reveals and winners after close", () => {
    expect(transitions.reveal).not.toContain("open");
    expect(transitions.winner).not.toContain("draft");
    expect(transitions.pause).toEqual(["open"]);
    expect(transitions.resume).toEqual(["paused"]);
  });
});
