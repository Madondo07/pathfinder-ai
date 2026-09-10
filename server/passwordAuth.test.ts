import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwordAuth";

describe("password hashing", () => {
  it("verifies the correct password against its own hash", async () => {
    const hash = await hashPassword("Realistic1");
    expect(await verifyPassword("Realistic1", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("Realistic1");
    expect(await verifyPassword("WrongPassword1", hash)).toBe(false);
  });

  it("produces a different hash (different salt) for the same password each time", async () => {
    const a = await hashPassword("Realistic1");
    const b = await hashPassword("Realistic1");
    expect(a).not.toBe(b);
    expect(await verifyPassword("Realistic1", a)).toBe(true);
    expect(await verifyPassword("Realistic1", b)).toBe(true);
  });

  it("never throws and safely fails closed on missing or malformed stored hashes", async () => {
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", undefined)).toBe(false);
    expect(await verifyPassword("anything", "")).toBe(false);
    expect(await verifyPassword("anything", "not-a-valid-hash")).toBe(false);
  });
});
