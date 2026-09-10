// Shared between client and server so the signup form and the register
// mutation can never validate a password or email differently.

export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Deliberately permissive — good enough to catch typos without rejecting a
// real-world address a stricter RFC-5322 regex would choke on.
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Human-readable reasons a password doesn't meet the minimum bar — empty when it's fine. */
export function passwordIssues(password: string): string[] {
  const issues: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) issues.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  if (!/[a-zA-Z]/.test(password)) issues.push("Password must include at least one letter.");
  if (!/[0-9]/.test(password)) issues.push("Password must include at least one number.");
  return issues;
}

export function isValidPassword(password: string): boolean {
  return passwordIssues(password).length === 0;
}
