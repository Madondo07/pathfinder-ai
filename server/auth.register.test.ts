import { describe, expect, it, vi, beforeEach } from "vitest";

const getUserByEmail = vi.fn();
const createLocalUser = vi.fn();
const createSessionToken = vi.fn().mockResolvedValue("signed.session.token");

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, getUserByEmail, createLocalUser };
});

vi.mock("./_core/sdk", () => ({ sdk: { createSessionToken } }));

const { appRouter } = await import("./routers");

type CookieCall = { name: string; value: string; options: Record<string, unknown> };

function createContext() {
  const cookies: CookieCall[] = [];
  const ctx = {
    user: null,
    req: { protocol: "https", headers: {} } as any,
    res: { cookie: (name: string, value: string, options: Record<string, unknown>) => { cookies.push({ name, value, options }); } } as any,
  };
  return { ctx, cookies };
}

const storedUser = {
  id: 5,
  openId: "local_abc123",
  name: "Thandi Learner",
  email: "thandi@example.com",
  passwordHash: "deadbeef:cafebabe",
  loginMethod: "password",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates the account, starts a session, and never returns the password hash", async () => {
    getUserByEmail.mockResolvedValueOnce(undefined);
    createLocalUser.mockResolvedValueOnce(storedUser);
    const { ctx, cookies } = createContext();

    const result = await appRouter.createCaller(ctx).auth.register({ name: "Thandi Learner", email: "  Thandi@Example.com  ", password: "Realistic1" });

    expect(createLocalUser).toHaveBeenCalledWith({ email: "thandi@example.com", name: "Thandi Learner", passwordHash: expect.any(String) });
    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).toMatchObject({ email: "thandi@example.com", name: "Thandi Learner" });
    expect(cookies).toHaveLength(1);
    expect(cookies[0].value).toBe("signed.session.token");
  });

  it("rejects an invalid email without creating an account", async () => {
    const { ctx } = createContext();
    await expect(appRouter.createCaller(ctx).auth.register({ name: "Thandi", email: "not-an-email", password: "Realistic1" })).rejects.toThrow(/valid email/i);
    expect(createLocalUser).not.toHaveBeenCalled();
  });

  it("rejects a password that doesn't meet the minimum bar", async () => {
    const { ctx } = createContext();
    await expect(appRouter.createCaller(ctx).auth.register({ name: "Thandi", email: "thandi@example.com", password: "short" })).rejects.toThrow(/at least 8 characters/i);
    expect(createLocalUser).not.toHaveBeenCalled();
  });

  it("rejects a duplicate email and does not overwrite the existing account", async () => {
    getUserByEmail.mockResolvedValueOnce(storedUser);
    const { ctx } = createContext();
    await expect(appRouter.createCaller(ctx).auth.register({ name: "Thandi", email: "thandi@example.com", password: "Realistic1" })).rejects.toThrow(/already exists/i);
    expect(createLocalUser).not.toHaveBeenCalled();
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs in with the correct password and never returns the password hash", async () => {
    const { hashPassword } = await import("./passwordAuth");
    getUserByEmail.mockResolvedValueOnce({ ...storedUser, passwordHash: await hashPassword("Realistic1") });
    const { ctx, cookies } = createContext();

    const result = await appRouter.createCaller(ctx).auth.login({ email: "thandi@example.com", password: "Realistic1" });

    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(cookies).toHaveLength(1);
  });

  it("rejects an incorrect password without starting a session", async () => {
    const { hashPassword } = await import("./passwordAuth");
    getUserByEmail.mockResolvedValueOnce({ ...storedUser, passwordHash: await hashPassword("Realistic1") });
    const { ctx, cookies } = createContext();

    await expect(appRouter.createCaller(ctx).auth.login({ email: "thandi@example.com", password: "WrongPassword1" })).rejects.toThrow(/incorrect email or password/i);
    expect(cookies).toHaveLength(0);
  });

  it("rejects an unknown email without starting a session", async () => {
    getUserByEmail.mockResolvedValueOnce(undefined);
    const { ctx, cookies } = createContext();

    await expect(appRouter.createCaller(ctx).auth.login({ email: "nobody@example.com", password: "Realistic1" })).rejects.toThrow(/incorrect email or password/i);
    expect(cookies).toHaveLength(0);
  });
});
