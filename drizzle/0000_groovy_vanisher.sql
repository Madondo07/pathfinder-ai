CREATE TYPE "public"."application_status" AS ENUM('Not started', 'Applied', 'Interview', 'Waiting', 'Accepted', 'Not this time', 'Withdrawn');--> statement-breakpoint
CREATE TYPE "public"."application_type" AS ENUM('Study', 'Work', 'Skills', 'Business', 'Other');--> statement-breakpoint
CREATE TYPE "public"."message_sender" AS ENUM('user', 'assistant');--> statement-breakpoint
CREATE TYPE "public"."opportunity_category" AS ENUM('Study', 'Work', 'Skills', 'Business');--> statement-breakpoint
CREATE TYPE "public"."prompt_category" AS ENUM('Study', 'Work', 'Skills', 'Business', 'Not Sure');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('verified', 'needs_review');--> statement-breakpoint
CREATE TABLE "applications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(220) NOT NULL,
	"organisation" varchar(180) NOT NULL,
	"type" "application_type" NOT NULL,
	"dateApplied" timestamp,
	"deadlineDate" timestamp,
	"status" "application_status" DEFAULT 'Not started' NOT NULL,
	"notes" text,
	"linkedPathwayId" integer,
	"linkedOpportunityId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(180),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversationId" integer NOT NULL,
	"sender" "message_sender" NOT NULL,
	"message" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "opportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "opportunity_category" NOT NULL,
	"name" varchar(220) NOT NULL,
	"organisation" varchar(180) NOT NULL,
	"description" text NOT NULL,
	"keyRequirements" text,
	"traits" text,
	"province" varchar(80),
	"deadlineDate" timestamp,
	"sourceUrl" text NOT NULL,
	"verificationStatus" "verification_status" DEFAULT 'needs_review' NOT NULL,
	"sourceUpdatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathwayChecklistItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"pathwayId" integer NOT NULL,
	"text" text NOT NULL,
	"isComplete" integer DEFAULT 0 NOT NULL,
	"isCustom" integer DEFAULT 0 NOT NULL,
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pathways" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"conversationId" integer,
	"isSaved" smallint DEFAULT 0 NOT NULL,
	"goal" text,
	"currentSituation" text,
	"recommendedDirection" text,
	"reasons" text,
	"nextSteps" text,
	"alternativeOptions" text,
	"immediateAction" text,
	"matchScore" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"title" varchar(180) NOT NULL,
	"items" text NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"country" varchar(80) DEFAULT 'South Africa',
	"education" varchar(80),
	"province" varchar(80),
	"goal" varchar(120),
	"interests" text,
	"skills" text,
	"experience" text,
	"location" varchar(120),
	"constraints" text,
	"resources" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "promptLibrary" (
	"id" serial PRIMARY KEY NOT NULL,
	"category" "prompt_category" NOT NULL,
	"promptText" text NOT NULL,
	"displayOrder" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savedOpportunities" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"opportunityId" integer,
	"snapshotData" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"passwordHash" varchar(255),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
