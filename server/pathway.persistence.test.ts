import { describe, expect, it, vi, beforeEach } from "vitest";

const upsertDraft = vi.fn();
const saveConversationPathway = vi.fn();
const upsertProfile = vi.fn();
const invokeLLM = vi.fn();

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, addMessage: vi.fn(), upsertPersonalisedPathwayDraft: upsertDraft, saveConversationPathway, upsertProfile };
});

vi.mock("./_core/llm", () => ({ invokeLLM }));

const { appRouter } = await import("./routers");
const { promotePathwayRecord, saveConversationPathway: realSaveConversationPathway } = await vi.importActual<typeof import("./db")>("./db");

const context = {
  user: { id: 7, openId: "pathway-test", name: "Pathway Test", email: "test@example.com", loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as any,
  res: {} as any,
};

const readyPathway = {
  recommended_direction: "Study software development",
  goal: "Earn a qualification",
  education: "Matric",
  interests_or_skills: "Problem solving and computers",
  province: "Gauteng",
  constraint: "Limited transport budget",
  reasons: "It connects the learner's interests with a realistic qualification path.",
  next_steps: ["Compare two accredited programmes", "Check mathematics requirements"],
  immediate_action: "Save one official study opportunity",
};

function llmReply(reply: string, profileUpdates: Record<string, string> = {}) {
  invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ reply, profile_updates: profileUpdates, pathway: readyPathway }) } }] });
}

describe("guide pathway draft flow (save button is the only save path — see pathways.save tests)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the conversation's draft pathway current on every ready turn, regardless of message wording", async () => {
    llmReply("Here is a direction to explore.");
    const first = await appRouter.createCaller(context).guide.respond({ profile: "{}", history: [], message: "show me a direction", conversationId: 92 });
    expect(first.pathwayDraft).toMatchObject(readyPathway);
    expect(first.pathwayReady).toBe(true);
    expect(upsertDraft).toHaveBeenCalledWith(7, 92, readyPathway, expect.any(String));

    // A plain "thanks" no longer needs to be parsed as save intent — the draft still updates,
    // and nothing is auto-promoted to a saved pathway from chat.
    llmReply("Glad that helps!");
    const second = await appRouter.createCaller(context).guide.respond({ profile: "{}", history: [], message: "thanks", conversationId: 92 });
    expect(second.pathwayReady).toBe(true);
    expect(saveConversationPathway).not.toHaveBeenCalled();
  });

  it("does not persist a draft when the pathway is not yet ready", async () => {
    invokeLLM.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ reply: "Tell me more about your interests.", profile_updates: {}, pathway: null }) } }] });
    const result = await appRouter.createCaller(context).guide.respond({ profile: "{}", history: [], message: "I like computers", conversationId: 92 });
    expect(result.pathwayDraft).toBeNull();
    expect(result.pathwayReady).toBe(false);
    expect(upsertDraft).not.toHaveBeenCalled();
  });

  it("promotes a real pathway record into saved state and inserts its checklist exactly once", async () => {
    const updateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const fakeDb = { update: vi.fn().mockReturnValue({ set: updateSet }), insert: vi.fn().mockReturnValue({ values: insertValues }) } as any;
    const pathway = { id: 44, isSaved: 0, nextSteps: "Compare two accredited programmes; Check mathematics requirements", immediateAction: "Save one official study opportunity" } as any;

    const promoted = await promotePathwayRecord(fakeDb, pathway);
    const repeated = await promotePathwayRecord(fakeDb, promoted);

    expect(promoted).toMatchObject({ id: 44, isSaved: 1 });
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledWith([
      expect.objectContaining({ pathwayId: 44, text: "Compare two accredited programmes", sortOrder: 0 }),
      expect.objectContaining({ pathwayId: 44, text: "Check mathematics requirements", sortOrder: 1 }),
      expect.objectContaining({ pathwayId: 44, text: "Save one official study opportunity", sortOrder: 2 }),
    ]);
    expect(repeated).toEqual(promoted);
    expect(updateSet).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);
  });

  it("directly saves a conversation pathway through the real helper with one checklist insert", async () => {
    const pathway = { id: 45, userId: 7, conversationId: 93, isSaved: 0, nextSteps: "Compare two accredited programmes; Check mathematics requirements", immediateAction: "Save one official study opportunity" } as any;
    const savedPathway = { ...pathway, isSaved: 1 };
    let selectCall = 0;
    const selectChain = () => ({
      from: () => ({
        where: () => ({
          orderBy: () => ({ limit: vi.fn().mockImplementation(async () => (++selectCall === 1 ? [pathway] : [savedPathway])) }),
          limit: vi.fn().mockImplementation(async () => (++selectCall === 1 ? [pathway] : [savedPathway])),
        }),
      }),
    });
    const updateSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) });
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const fakeDb = { select: vi.fn(selectChain), update: vi.fn().mockReturnValue({ set: updateSet }), insert: vi.fn().mockReturnValue({ values: insertValues }) } as any;

    const result = await realSaveConversationPathway(7, 93, fakeDb);

    expect(result).toMatchObject({ id: 45, conversationId: 93, isSaved: 1 });
    expect(updateSet).toHaveBeenCalledTimes(1);
    expect(insertValues).toHaveBeenCalledTimes(1);
    expect(insertValues.mock.calls[0][0]).toHaveLength(3);
    expect(insertValues.mock.calls[0][0].map((item: any) => item.text)).toEqual([
      "Compare two accredited programmes",
      "Check mathematics requirements",
      "Save one official study opportunity",
    ]);
  });
});

describe("pathways.save — the explicit, deterministic save button endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("promotes whatever ready draft the guide already persisted for this conversation", async () => {
    saveConversationPathway.mockResolvedValueOnce({ id: 12, conversationId: 92, isSaved: 1 });
    const result = await appRouter.createCaller(context).pathways.save({ conversationId: 92 });
    expect(saveConversationPathway).toHaveBeenCalledWith(7, 92);
    expect(result).toMatchObject({ id: 12, conversationId: 92, isSaved: 1 });
  });

  it("returns null with no save and no error when no ready draft exists for the conversation", async () => {
    saveConversationPathway.mockResolvedValueOnce(null);
    const result = await appRouter.createCaller(context).pathways.save({ conversationId: 999 });
    expect(saveConversationPathway).toHaveBeenCalledWith(7, 999);
    expect(result).toBeNull();
  });
});

describe("guide.respond applies extracted profile_updates to the user's profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("persists every known field the model extracts in one dense turn", async () => {
    llmReply("Great, that's a full picture — thanks!", {
      goal: "Earn a qualification",
      education: "Matric",
      interests: "Computers and problem solving",
      skills: "Basic coding",
      province: "Gauteng",
      constraints: "Limited transport budget",
    });
    const result = await appRouter.createCaller(context).guide.respond({
      profile: "{}",
      history: [],
      message: "My goal is to earn a qualification, I finished matric, I like computers and problem solving, I know basic coding, I'm in Gauteng, and transport is limited for me",
      conversationId: 92,
    });
    expect(upsertProfile).toHaveBeenCalledWith(7, {
      goal: "Earn a qualification",
      education: "Matric",
      interests: "Computers and problem solving",
      skills: "Basic coding",
      province: "Gauteng",
      constraints: "Limited transport budget",
    });
    expect(result.profileUpdates).toEqual({
      goal: "Earn a qualification",
      education: "Matric",
      interests: "Computers and problem solving",
      skills: "Basic coding",
      province: "Gauteng",
      constraints: "Limited transport budget",
    });
  });

  it("drops blank strings and fields that are not real profile columns", async () => {
    llmReply("Tell me more.", { goal: "", province: "Gauteng", favourite_colour: "blue", experience: "   " } as any);
    await appRouter.createCaller(context).guide.respond({ profile: "{}", history: [], message: "I'm in Gauteng", conversationId: 92 });
    expect(upsertProfile).toHaveBeenCalledWith(7, { province: "Gauteng" });
  });

  it("does not touch the profile when nothing new was extracted", async () => {
    llmReply("Tell me more about what you enjoy.", {});
    await appRouter.createCaller(context).guide.respond({ profile: "{}", history: [], message: "hmm not sure", conversationId: 92 });
    expect(upsertProfile).not.toHaveBeenCalled();
  });
});
