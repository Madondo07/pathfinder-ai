export type MatchInput = { categoryMatch: boolean; traitOverlap: number; constraintFit: number };
export function scoreOpportunity(input: MatchInput) {
  const category = input.categoryMatch ? 40 : 0;
  const traits = Math.max(0, Math.min(40, input.traitOverlap));
  const constraints = Math.max(0, Math.min(20, input.constraintFit));
  const score = Math.round(category + traits + constraints);
  const reasons: string[] = [];
  if (input.categoryMatch) reasons.push("matches your chosen direction");
  if (traits > 0) reasons.push("overlaps with your interests or skills");
  if (constraints >= 15) reasons.push("fits the constraints you shared");
  if (constraints < 15) reasons.push("check the requirements and access details");
  return { score, reason: reasons.join("; ") };
}

export type OpportunityCategory = "Study" | "Work" | "Skills" | "Business";

// Shared by the live-search category guesser (server) and the opportunity-match scorer (client)
// so the two heuristics can't quietly drift apart.
const CATEGORY_PATTERNS: [OpportunityCategory, RegExp][] = [
  ["Study", /bursar|univers|college|course|study|scholar/i],
  ["Work", /job|intern|work|employment|learnership/i],
  ["Business", /business|enterprise|entrepreneur|fund/i],
];

export function guessCategoryFromText(text: string): OpportunityCategory {
  for (const [category, pattern] of CATEGORY_PATTERNS) {
    if (pattern.test(text)) return category;
  }
  return "Skills";
}

export type OpportunityMatchContext = {
  /** Free text describing what the person wants — a saved pathway's direction/goal, or the profile's goal, whichever is available. */
  preferredDirectionText?: string | null;
  interests?: string | null;
  skills?: string | null;
  province?: string | null;
  constraints?: string | null;
};

export type ScorableOpportunity = {
  category: string;
  place?: string | null;
  province?: string | null;
  title?: string | null;
  desc?: string | null;
  tags?: string[] | null;
};

/**
 * Transparent, rules-based match between one opportunity and what the user has actually told
 * PathFinder (profile fields, and — when one exists — their saved pathway's own direction). Not
 * a trained model; every point traces back to real user input, never a fabricated number.
 */
export function scoreOpportunityForContext(opportunity: ScorableOpportunity, context: OpportunityMatchContext) {
  const preferredCategory = context.preferredDirectionText?.trim() ? guessCategoryFromText(context.preferredDirectionText) : null;
  const categoryMatch = preferredCategory ? opportunity.category === preferredCategory : false;

  const haystack = `${opportunity.title || ""} ${opportunity.desc || ""} ${(opportunity.tags || []).join(" ")}`.toLowerCase();
  const traitWords = Array.from(
    new Set(
      `${context.interests || ""} ${context.skills || ""}`
        .toLowerCase()
        .split(/[,.;\s]+/)
        .map(w => w.trim())
        .filter(w => w.length > 2)
    )
  );
  const matchedTraits = traitWords.filter(w => haystack.includes(w));
  const traitOverlap = matchedTraits.length * 12;

  const place = `${opportunity.place || opportunity.province || ""}`.toLowerCase();
  const remoteFriendly = /remote|national|online/.test(place);
  const provinceMatch = Boolean(context.province?.trim()) && place.includes(context.province!.toLowerCase());
  const constraintFit = remoteFriendly || provinceMatch ? 20 : 8;

  return scoreOpportunity({ categoryMatch, traitOverlap, constraintFit });
}
