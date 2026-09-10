import { integer, pgEnum, pgTable, serial, smallint, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Postgres (Supabase) needs each distinct enum value-set declared as its own named type —
// unlike MySQL's inline per-column enum. Names are unique per set, even where two columns
// happen to share a label like "category".
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const messageSenderEnum = pgEnum("message_sender", ["user", "assistant"]);
export const opportunityCategoryEnum = pgEnum("opportunity_category", ["Study", "Work", "Skills", "Business"]);
export const verificationStatusEnum = pgEnum("verification_status", ["verified", "needs_review"]);
export const applicationTypeEnum = pgEnum("application_type", ["Study", "Work", "Skills", "Business", "Other"]);
export const applicationStatusEnum = pgEnum("application_status", ["Not started", "Applied", "Interview", "Waiting", "Accepted", "Not this time", "Withdrawn"]);
export const promptCategoryEnum = pgEnum("prompt_category", ["Study", "Work", "Skills", "Business", "Not Sure"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(), openId: varchar("openId", { length: 64 }).notNull().unique(), name: text("name"), email: varchar("email", { length: 320 }), passwordHash: varchar("passwordHash", { length: 255 }), loginMethod: varchar("loginMethod", { length: 64 }), role: userRoleEnum("role").default("user").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()), lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const profiles = pgTable("profiles", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), country: varchar("country", { length: 80 }).default("South Africa"), education: varchar("education", { length: 80 }), province: varchar("province", { length: 80 }), goal: varchar("goal", { length: 120 }), interests: text("interests"), skills: text("skills"), experience: text("experience"), location: varchar("location", { length: 120 }), constraints: text("constraints"), resources: text("resources"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), title: varchar("title", { length: 180 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(), conversationId: integer("conversationId").notNull(), sender: messageSenderEnum("sender").notNull(), message: text("message").notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pathways = pgTable("pathways", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), conversationId: integer("conversationId"), isSaved: smallint("isSaved").default(0).notNull(), goal: text("goal"), currentSituation: text("currentSituation"), recommendedDirection: text("recommendedDirection"), reasons: text("reasons"), nextSteps: text("nextSteps"), alternativeOptions: text("alternativeOptions"), immediateAction: text("immediateAction"), matchScore: integer("matchScore"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const pathwayChecklistItems = pgTable("pathwayChecklistItems", {
  id: serial("id").primaryKey(), pathwayId: integer("pathwayId").notNull(), text: text("text").notNull(), isComplete: integer("isComplete").default(0).notNull(), isCustom: integer("isCustom").default(0).notNull(), sortOrder: integer("sortOrder").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const opportunities = pgTable("opportunities", {
  id: serial("id").primaryKey(), category: opportunityCategoryEnum("category").notNull(), name: varchar("name", { length: 220 }).notNull(), organisation: varchar("organisation", { length: 180 }).notNull(), description: text("description").notNull(), keyRequirements: text("keyRequirements"), traits: text("traits"), province: varchar("province", { length: 80 }), deadlineDate: timestamp("deadlineDate"), sourceUrl: text("sourceUrl").notNull(), verificationStatus: verificationStatusEnum("verificationStatus").default("needs_review").notNull(), sourceUpdatedAt: timestamp("sourceUpdatedAt").defaultNow().notNull(),
});

export const savedOpportunities = pgTable("savedOpportunities", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), opportunityId: integer("opportunityId"), snapshotData: text("snapshotData"), createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const plans = pgTable("plans", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), title: varchar("title", { length: 180 }).notNull(), items: text("items").notNull(), progress: integer("progress").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(), userId: integer("userId").notNull(), title: varchar("title", { length: 220 }).notNull(), organisation: varchar("organisation", { length: 180 }).notNull(), type: applicationTypeEnum("type").notNull(), dateApplied: timestamp("dateApplied"), deadlineDate: timestamp("deadlineDate"), status: applicationStatusEnum("status").default("Not started").notNull(), notes: text("notes"), linkedPathwayId: integer("linkedPathwayId"), linkedOpportunityId: integer("linkedOpportunityId"), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
});

export const promptLibrary = pgTable("promptLibrary", {
  id: serial("id").primaryKey(), category: promptCategoryEnum("category").notNull(), promptText: text("promptText").notNull(), displayOrder: integer("displayOrder").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type PathwayChecklistItem = typeof pathwayChecklistItems.$inferSelect;
