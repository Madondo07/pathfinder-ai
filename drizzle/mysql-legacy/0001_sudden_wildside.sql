CREATE TABLE `applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(220) NOT NULL,
	`organisation` varchar(180) NOT NULL,
	`type` enum('Study','Work','Skills','Business','Other') NOT NULL,
	`dateApplied` timestamp,
	`deadlineDate` timestamp,
	`status` enum('Not started','Applied','Interview','Waiting','Accepted','Not this time','Withdrawn') NOT NULL DEFAULT 'Not started',
	`notes` text,
	`linkedPathwayId` int,
	`linkedOpportunityId` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `applications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`sender` enum('user','assistant') NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `opportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('Study','Work','Skills','Business') NOT NULL,
	`name` varchar(220) NOT NULL,
	`organisation` varchar(180) NOT NULL,
	`description` text NOT NULL,
	`keyRequirements` text,
	`traits` text,
	`province` varchar(80),
	`deadlineDate` timestamp,
	`linkUrl` text,
	`sourceUpdatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `opportunities_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pathways` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`goal` text,
	`currentSituation` text,
	`recommendedDirection` text,
	`reasons` text,
	`nextSteps` text,
	`alternativeOptions` text,
	`immediateAction` text,
	`matchScore` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `pathways_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`title` varchar(180) NOT NULL,
	`items` text NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`education` varchar(80),
	`province` varchar(80),
	`goal` varchar(120),
	`interests` text,
	`skills` text,
	`location` varchar(120),
	`constraints` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `savedOpportunities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`opportunityId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `savedOpportunities_id` PRIMARY KEY(`id`)
);
