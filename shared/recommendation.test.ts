import { describe, expect, it } from "vitest";
import { guessCategoryFromText, scoreOpportunity, scoreOpportunityForContext } from "./recommendation";

describe("scoreOpportunity", () => {
  it("weights category, interest overlap, and constraints transparently", () => {
    expect(scoreOpportunity({ categoryMatch: true, traitOverlap: 32, constraintFit: 18 })).toEqual({ score: 90, reason: "matches your chosen direction; overlaps with your interests or skills; fits the constraints you shared" });
  });

  it("does not allow scores outside the 0-100 range", () => {
    expect(scoreOpportunity({ categoryMatch: false, traitOverlap: 99, constraintFit: -4 }).score).toBe(40);
  });
});

describe("guessCategoryFromText", () => {
  it("recognises study, work, and business language", () => {
    expect(guessCategoryFromText("Apply for this bursary at the university")).toBe("Study");
    expect(guessCategoryFromText("A digital skills internship for youth")).toBe("Work");
    expect(guessCategoryFromText("Start a small enterprise with seed funding")).toBe("Business");
  });

  it("falls back to Skills when nothing else matches", () => {
    expect(guessCategoryFromText("Learn to use design software")).toBe("Skills");
  });
});

describe("scoreOpportunityForContext", () => {
  const opportunity = {
    category: "Work",
    place: "Gauteng · Remote",
    title: "Digital Skills Internship",
    desc: "A supported entry point into digital work for young people building computer skills.",
    tags: ["Digital", "First step"],
  };

  it("scores higher when the opportunity matches the saved pathway's direction and the user's interests", () => {
    const strong = scoreOpportunityForContext(opportunity, {
      preferredDirectionText: "Digital skills internship route",
      interests: "computers, problem solving",
      skills: "typing",
      province: "Gauteng",
    });
    const weak = scoreOpportunityForContext(opportunity, {
      preferredDirectionText: "Start a small business",
      interests: "farming",
      skills: "carpentry",
      province: "Limpopo",
    });
    expect(strong.score).toBeGreaterThan(weak.score);
  });

  it("never fabricates a category match when there is no pathway or goal text to go on", () => {
    const result = scoreOpportunityForContext(opportunity, {});
    expect(result.score).toBeLessThan(40); // no category credit, no trait overlap — constraint fit only
  });

  it("treats remote/national opportunities as accessible regardless of stated province", () => {
    const remote = scoreOpportunityForContext({ ...opportunity, place: "Remote" }, { province: "Limpopo" });
    const localMismatch = scoreOpportunityForContext({ ...opportunity, place: "Western Cape" }, { province: "Limpopo" });
    expect(remote.score).toBeGreaterThan(localMismatch.score);
  });
});
