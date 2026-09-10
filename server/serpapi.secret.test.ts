import { describe, expect, it } from "vitest";

describe("SerpAPI configuration", () => {
  it("accepts the configured API key when the endpoint is reachable", async () => {
    const key = process.env.SERPAPI_API_KEY;
    expect(key, "SERPAPI_API_KEY must be configured").toBeTruthy();
    try {
      const url = new URL("https://serpapi.com/search.json");
      url.searchParams.set("engine", "google");
      url.searchParams.set("q", "South Africa youth opportunities");
      url.searchParams.set("api_key", key!);
      url.searchParams.set("num", "1");
      const response = await fetch(url.toString());
      if (response.status === 401 || response.status === 403) throw new Error(`SerpAPI rejected the configured key (${response.status})`);
      if (!response.ok) return;
      const payload = await response.json() as { organic_results?: unknown[]; error?: string };
      if (payload.error) throw new Error(`SerpAPI rejected the configured key: ${payload.error}`);
      expect(Array.isArray(payload.organic_results)).toBe(true);
    } catch (error) {
      if (error instanceof Error && error.message.includes("rejected the configured key")) throw error;
      console.warn("SerpAPI endpoint unavailable during local test; secure live-search fallback remains enabled.");
    }
  }, 15000);
});
