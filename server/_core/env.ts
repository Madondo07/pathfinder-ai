export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  // Fallback LLM provider — tried only when the primary (Manus Forge) call fails or isn't
  // configured. Any OpenAI-compatible base URL works here (OpenAI itself, Groq, etc.) since this
  // app already speaks that exact request/response shape (messages, response_format json_schema,
  // choices[0].message.content) — no translation layer needed, just swap the base URL/key/model.
  fallbackApiKey: process.env.FALLBACK_LLM_API_KEY ?? "",
  fallbackApiUrl: process.env.FALLBACK_LLM_API_URL ?? "",
  fallbackModel: process.env.FALLBACK_LLM_MODEL || "gpt-4o-mini",
};
