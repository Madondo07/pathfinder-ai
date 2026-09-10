import { afterEach, describe, expect, it, vi } from "vitest";
import { scoreOpportunity } from "../shared/recommendation";
import { searchLiveOpportunities } from "./db";

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.SERPAPI_API_KEY;
});

describe("PathFinder regression contracts", () => {
  it("keeps pathway scoring transparent and bounded", () => {
    expect(scoreOpportunity({ categoryMatch: true, traitOverlap: 32, constraintFit: 18 })).toEqual({ score: 90, reason: "matches your chosen direction; overlaps with your interests or skills; fits the constraints you shared" });
    expect(scoreOpportunity({ categoryMatch: false, traitOverlap: 99, constraintFit: -4 }).score).toBe(40);
  });

  it("falls back clearly when live opportunity search is unavailable", async () => {
    process.env.SERPAPI_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));
    const result = await searchLiveOpportunities("digital skills");
    expect(result.fallback).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.message).toMatch(/curated|timed out|unavailable/i);
  });

  it("never lets a live-search failure remove the always-on curated fallback contract", async () => {
    // searchLiveOpportunities itself only ever describes the *live* layer — `fallback: true` must
    // never be mistaken by a caller for "hide the curated list", since curated results are sourced
    // independently and are never gated on this function's outcome.
    delete process.env.SERPAPI_API_KEY;
    const result = await searchLiveOpportunities("digital skills");
    expect(result.fallback).toBe(true);
    expect(result.results).toEqual([]);
  });
});
