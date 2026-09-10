import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

// ENV is computed once at module-load time from process.env, so each scenario needs a fresh
// module graph with process.env set beforehand.
async function loadLLM(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  return import("./_core/llm");
}

function okResponse(content: string) {
  return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
}

function failResponse(text: string) {
  return { ok: false, status: 500, statusText: "Internal Server Error", headers: { get: () => null }, text: async () => text, body: { cancel: async () => {} } };
}

describe("invokeLLM provider fallback (Manus Forge primary, configurable OpenAI-compatible secondary)", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("uses the primary provider when it succeeds and never touches the fallback", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("primary ok"));
    const { invokeLLM } = await loadLLM({ BUILT_IN_FORGE_API_KEY: "primary-key", BUILT_IN_FORGE_API_URL: "https://primary.example", FALLBACK_LLM_API_KEY: "fallback-key" });

    const result = await invokeLLM({ messages: [{ role: "user", content: "hi" }] });

    expect(result.choices[0].message.content).toBe("primary ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://primary.example/v1/chat/completions");
  });

  it("falls back to the configured provider (e.g. Groq) once the primary exhausts its retries, filling in a default model", async () => {
    vi.useFakeTimers();
    // fetchWithBackoff retries the primary up to RETRY_MAX_RETRIES times (5 attempts total)
    // before giving up and moving on to the fallback.
    for (let i = 0; i < 5; i++) fetchMock.mockResolvedValueOnce(failResponse("primary down"));
    fetchMock.mockResolvedValueOnce(okResponse("fallback ok"));

    const { invokeLLM } = await loadLLM({
      BUILT_IN_FORGE_API_KEY: "primary-key",
      FALLBACK_LLM_API_KEY: "groq-key",
      FALLBACK_LLM_API_URL: "https://api.groq.com/openai/v1",
      FALLBACK_LLM_MODEL: "llama-3.3-70b-versatile",
    });

    const promise = invokeLLM({ messages: [{ role: "user", content: "hi" }] });
    await vi.runAllTimersAsync();
    const result = await promise;

    expect(result.choices[0].message.content).toBe("fallback ok");
    expect(fetchMock).toHaveBeenCalledTimes(6);
    const [fallbackUrl, fallbackInit] = fetchMock.mock.calls[5];
    expect(fallbackUrl).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(fallbackInit.headers.authorization).toBe("Bearer groq-key");
    const body = JSON.parse(fallbackInit.body);
    expect(body.model).toBe("llama-3.3-70b-versatile");
  }, 20000);

  it("defaults the fallback base URL to OpenAI's API when no custom URL is set", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("fallback only"));
    const { invokeLLM } = await loadLLM({ BUILT_IN_FORGE_API_KEY: undefined, FALLBACK_LLM_API_KEY: "fallback-key" });

    await invokeLLM({ messages: [{ role: "user", content: "hi" }] });

    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
  });

  it("throws a clear error before making any request when neither provider is configured", async () => {
    const { invokeLLM } = await loadLLM({ BUILT_IN_FORGE_API_KEY: undefined, FALLBACK_LLM_API_KEY: undefined });

    await expect(invokeLLM({ messages: [{ role: "user", content: "hi" }] })).rejects.toThrow(/No LLM provider is configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not send a model field to the primary provider when the caller didn't ask for one", async () => {
    fetchMock.mockResolvedValueOnce(okResponse("ok"));
    const { invokeLLM } = await loadLLM({ BUILT_IN_FORGE_API_KEY: "primary-key", BUILT_IN_FORGE_API_URL: "https://primary.example" });

    await invokeLLM({ messages: [{ role: "user", content: "hi" }] });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).not.toHaveProperty("model");
  });
});
