import { describe, expect, it } from "vitest";
import { isValidEmail, isValidPassword, normalizeEmail, passwordIssues } from "./authValidation";

describe("normalizeEmail", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeEmail("  Learner@Example.COM  ")).toBe("learner@example.com");
  });
});

describe("isValidEmail", () => {
  it("accepts ordinary addresses", () => {
    expect(isValidEmail("learner@example.com")).toBe(true);
    expect(isValidEmail("a.b+tag@sub.example.co.za")).toBe(true);
  });

  it("rejects obviously malformed input", () => {
    expect(isValidEmail("not-an-email")).toBe(false);
    expect(isValidEmail("missing@domain")).toBe(false);
    expect(isValidEmail("@example.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("passwordIssues / isValidPassword", () => {
  it("requires at least 8 characters, a letter, and a number", () => {
    expect(passwordIssues("short1")).toContain("Password must be at least 8 characters.");
    expect(passwordIssues("alllettersnodigits")).toContain("Password must include at least one number.");
    expect(passwordIssues("12345678")).toContain("Password must include at least one letter.");
  });

  it("accepts a password that clears the bar", () => {
    expect(passwordIssues("Realistic1")).toEqual([]);
    expect(isValidPassword("Realistic1")).toBe(true);
  });

  it("rejects a password that fails any check", () => {
    expect(isValidPassword("short")).toBe(false);
  });
});
