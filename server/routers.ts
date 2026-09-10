import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { isValidEmail, normalizeEmail, passwordIssues } from "@shared/authValidation";
import { getSessionCookieOptions } from "./_core/cookies";
import { sdk } from "./_core/sdk";
import { invokeLLM } from "./_core/llm";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { isPathwayReady } from "../shared/pathwaySave";
import { hashPassword, verifyPassword } from "./passwordAuth";
import { adminUpdateOpportunity, adminListOpportunities, createLocalUser, getUserByEmail, sanitizeUser } from "./db";

const adminProcedure = protectedProcedure.use(({ ctx, next }) => { if (ctx.user.role !== "admin") throw new Error("Admin access required"); return next(); });
import { addMessage, createApplication, createConversation, listApplications, updateApplication, deleteApplication, listChecklistItems, listConversations, listMessages, listOpportunities, listPathways, listPromptLibrary, listSavedOpportunities, toggleSavedOpportunity, updateChecklist, upsertProfile, getProfile, searchLiveOpportunities, upsertPersonalisedPathwayDraft, saveConversationPathway } from "./db";

// Issues one PathFinder session cookie the exact same way for a freshly registered account, a
// returning local sign-in, and an OAuth login — everything downstream (tRPC context, protected
// procedures) only ever looks at this one cookie, never at how the user authenticated.
async function startLocalSession(res: import("express").Response, req: import("express").Request, user: { openId: string; name: string | null }) {
  const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || "", expiresInMs: ONE_YEAR_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
}

const profileInput = z.object({ country: z.string().default("South Africa"), education: z.string().optional(), province: z.string().optional(), goal: z.string().optional(), interests: z.string().optional(), skills: z.string().optional(), experience: z.string().optional(), location: z.string().optional(), constraints: z.string().optional(), resources: z.string().optional() });
// The chat guide extracts profile fields from freeform conversation as it goes (even dense,
// multi-field messages). We only ever trust fields that are (a) one of these known profile
// columns and (b) a non-empty string for that turn — anything else the model returns is dropped
// rather than written to the database. Derived from profileInput so the two can't drift apart.
const PROFILE_FIELD_KEYS = Object.keys(profileInput.shape) as (keyof z.infer<typeof profileInput>)[];
function extractProfileUpdates(rawUpdates: unknown): Partial<Record<(typeof PROFILE_FIELD_KEYS)[number], string>> {
  const source = rawUpdates && typeof rawUpdates === "object" ? (rawUpdates as Record<string, unknown>) : {};
  const updates: Partial<Record<(typeof PROFILE_FIELD_KEYS)[number], string>> = {};
  for (const key of PROFILE_FIELD_KEYS) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) updates[key] = value.trim();
  }
  return updates;
}
const applicationInput = z.object({ title: z.string().min(2), organisation: z.string().min(2), type: z.enum(["Study", "Work", "Skills", "Business", "Other"]), dateApplied: z.date().optional(), deadlineDate: z.date().optional(), status: z.enum(["Not started", "Applied", "Interview", "Waiting", "Accepted", "Not this time", "Withdrawn"]).optional(), notes: z.string().optional(), linkedPathwayId: z.number().optional(), linkedOpportunityId: z.number().optional() });
const historyInput = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }));
const pathwayResponseSchema = { type: "object", properties: { recommended_direction: { type: "string" }, goal: { type: "string" }, education: { type: "string" }, interests_or_skills: { type: "string" }, province: { type: "string" }, constraint: { type: "string" }, reasons: { type: "string" }, next_steps: { type: "array", items: { type: "string" } }, immediate_action: { type: "string" } }, required: ["recommended_direction", "goal", "education", "interests_or_skills", "province", "constraint", "reasons", "next_steps", "immediate_action"], additionalProperties: false } as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => (opts.ctx.user ? sanitizeUser(opts.ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
    register: publicProcedure.input(z.object({ name: z.string().trim().min(1, "Name is required").max(120), email: z.string().min(1), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      if (!isValidEmail(email)) throw new Error("Enter a valid email address.");
      const issues = passwordIssues(input.password);
      if (issues.length) throw new Error(issues.join(" "));
      const existing = await getUserByEmail(email);
      if (existing) throw new Error("An account with this email already exists — try signing in instead.");
      const passwordHash = await hashPassword(input.password);
      const user = await createLocalUser({ email, name: input.name, passwordHash });
      if (!user) throw new Error("Could not create your account right now — please try again.");
      await startLocalSession(ctx.res, ctx.req, user);
      return { success: true, user: sanitizeUser(user) } as const;
    }),
    login: publicProcedure.input(z.object({ email: z.string().min(1), password: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      const email = normalizeEmail(input.email);
      const user = await getUserByEmail(email);
      const passwordOk = await verifyPassword(input.password, user?.passwordHash);
      if (!user || !passwordOk) throw new Error("Incorrect email or password.");
      await startLocalSession(ctx.res, ctx.req, user);
      return { success: true, user: sanitizeUser(user) } as const;
    }),
  }),
  opportunities: router({ adminList: adminProcedure.query(() => adminListOpportunities()), adminUpdate: adminProcedure.input(z.object({ id: z.number(), name: z.string().min(2).optional(), organisation: z.string().min(2).optional(), description: z.string().min(2).optional(), sourceUrl: z.string().url().startsWith("https://").optional(), verificationStatus: z.enum(["verified", "needs_review"]).optional(), deadlineDate: z.date().nullable().optional(), province: z.string().optional() })).mutation(({ input }) => { const { id, ...data } = input; return adminUpdateOpportunity(id, data); }), liveSearch: publicProcedure.input(z.object({ query: z.string().optional(), category: z.string().optional(), province: z.string().optional() })).query(({ input }) => searchLiveOpportunities(input.query || "", input.category, input.province)),
    list: publicProcedure.input(z.object({ search: z.string().optional(), category: z.enum(["Study", "Work", "Skills", "Business"]).optional(), province: z.string().optional() }).optional()).query(({ input }) => listOpportunities(input?.search, input?.category, input?.province)),
    save: protectedProcedure.input(z.object({ opportunityId: z.number().optional(), snapshotData: z.string() })).mutation(({ ctx, input }) => toggleSavedOpportunity(ctx.user.id, input.opportunityId, input.snapshotData)),
    saved: protectedProcedure.query(({ ctx }) => listSavedOpportunities(ctx.user.id)),
  }),
  prompts: router({ list: publicProcedure.query(() => listPromptLibrary()) }),
  profile: router({ get: protectedProcedure.query(({ ctx }) => getProfile(ctx.user.id)), save: protectedProcedure.input(profileInput).mutation(({ ctx, input }) => upsertProfile(ctx.user.id, input)) }),
  conversations: router({
    list: protectedProcedure.query(({ ctx }) => listConversations(ctx.user.id)),
    create: protectedProcedure.input(z.object({ title: z.string().optional() }).optional()).mutation(({ ctx, input }) => createConversation(ctx.user.id, input?.title)),
    messages: protectedProcedure.input(z.object({ conversationId: z.number() })).query(({ ctx, input }) => listMessages(ctx.user.id, input.conversationId)),
    addMessage: protectedProcedure.input(z.object({ conversationId: z.number(), sender: z.enum(["user", "assistant"]), message: z.string().min(1) })).mutation(({ ctx, input }) => addMessage(ctx.user.id, input.conversationId, input.sender, input.message)),
  }),
  applications: router({ list: protectedProcedure.query(({ ctx }) => listApplications(ctx.user.id)), create: protectedProcedure.input(applicationInput).mutation(({ ctx, input }) => createApplication(ctx.user.id, input)), update: protectedProcedure.input(applicationInput.partial().extend({ id: z.number() })).mutation(({ ctx, input }) => { const { id, ...data } = input; return updateApplication(ctx.user.id, id, data); }), remove: protectedProcedure.input(z.object({ id: z.number() })).mutation(({ ctx, input }) => deleteApplication(ctx.user.id, input.id)) }),
  pathways: router({ list: protectedProcedure.query(({ ctx }) => listPathways(ctx.user.id)), checklist: protectedProcedure.input(z.object({ pathwayId: z.number() })).query(({ ctx, input }) => listChecklistItems(ctx.user.id, input.pathwayId)), toggleChecklist: protectedProcedure.input(z.object({ itemId: z.number(), isComplete: z.number().min(0).max(1) })).mutation(({ ctx, input }) => updateChecklist(ctx.user.id, input.itemId, input.isComplete)),
    // The one deterministic save path: promotes whatever ready draft the guide has already
    // persisted for this conversation. Returns null (no save, no error) if no ready draft
    // exists — the client-side button is disabled before that point, but this guards the
    // same rule server-side in case it's ever called directly.
    save: protectedProcedure.input(z.object({ conversationId: z.number() })).mutation(({ ctx, input }) => saveConversationPathway(ctx.user.id, input.conversationId)),
  }),
  guide: router({
    respond: protectedProcedure.input(z.object({ profile: z.string(), history: historyInput, message: z.string(), conversationId: z.number().optional() })).mutation(async ({ ctx, input }) => {
      if (input.conversationId) await addMessage(ctx.user.id, input.conversationId, "user", input.message);
      const response = await invokeLLM({ messages: [{ role: "system", content: "You are PathFinder, a warm South African youth career guide. Ask only one question at a time. Use Grade 10 reading level, stay practical and encouraging, never diagnose, never guarantee outcomes, and never invent an institution or opportunity. Return only JSON matching the schema. In profile_updates, extract every profile field the user states in their latest message as plain strings — including when several fields (for example goal, education, interests, skills, experience, location, province, and constraints) are all given together in one dense message — but only fields actually mentioned this turn; never re-ask about a field already present in the profile context you were given. Set pathway to a real object only when the readiness bar is met: goal, education, interests or skills, province, and main constraint are all known from the profile or conversation. Otherwise pathway must be null. Once a pathway is ready, tell the user in plain language that they can save it using the 'Save this pathway' button in the pathway panel — never ask them to confirm or say 'yes' to save in chat, since saving now only happens through that button." }, { role: "user", content: `Profile context: ${input.profile}\nConversation so far: ${JSON.stringify(input.history)}\nNew message: ${input.message}` }], response_format: { type: "json_schema", json_schema: { name: "pathfinder_guide_response", strict: true, schema: { type: "object", properties: { reply: { type: "string" }, profile_updates: { type: "object", additionalProperties: { type: "string" } }, pathway: { anyOf: [{ ...pathwayResponseSchema }, { type: "null" }] } }, required: ["reply", "profile_updates", "pathway"], additionalProperties: false } } } });
      const content = response.choices?.[0]?.message?.content; let parsed: any = null; try { parsed = typeof content === "string" ? JSON.parse(content) : null; } catch { parsed = null; }
      const message = typeof parsed?.reply === "string" ? parsed.reply : "I’m listening. Tell me a little more about what you want to explore.";
      if (input.conversationId) await addMessage(ctx.user.id, input.conversationId, "assistant", message);
      const profileUpdates = extractProfileUpdates(parsed?.profile_updates);
      if (Object.keys(profileUpdates).length) await upsertProfile(ctx.user.id, profileUpdates);
      const ready = isPathwayReady(parsed?.pathway);
      const pathwayDraft = ready ? parsed.pathway : null;
      if (input.conversationId && ready) {
        // Keep the conversation's draft pathway current on every ready turn — saving itself
        // is a separate, deliberate action (the "Save this pathway" button), not something
        // triggered by parsing what the user typed here.
        await upsertPersonalisedPathwayDraft(ctx.user.id, input.conversationId, parsed.pathway, message);
      }
      return { message, pathwayDraft: input.conversationId ? pathwayDraft : null, pathwayReady: ready && Boolean(input.conversationId), profileUpdates };
    }),
  }),
  drafts: router({
    generate: protectedProcedure.input(z.object({ opportunity: z.string(), profile: z.string(), draftType: z.enum(["study", "work"]) })).mutation(async ({ input }) => {
      const response = await invokeLLM({ messages: [{ role: "system", content: "You are PathFinder's application assistant. Produce a complete, editable starting draft. Use only the profile and opportunity context provided. Do not invent marks, qualifications, work history, or claims. Use placeholders like [add your subject] when information is missing. Include a short note that the user must personalise and verify the official requirements." }, { role: "user", content: `Draft type: ${input.draftType}\nOpportunity: ${input.opportunity}\nProfile: ${input.profile}` }] });
      const content = response.choices?.[0]?.message?.content; return { draft: typeof content === "string" ? content : "Start by adding your education, skills, and why this opportunity interests you." };
    }),
  }),
});
export type AppRouter = typeof appRouter;
