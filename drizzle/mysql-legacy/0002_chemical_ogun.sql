CREATE TABLE `pathwayChecklistItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pathwayId` int NOT NULL,
	`text` text NOT NULL,
	`isComplete` int NOT NULL DEFAULT 0,
	`isCustom` int NOT NULL DEFAULT 0,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pathwayChecklistItems_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `promptLibrary` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('Study','Work','Skills','Business','Not Sure') NOT NULL,
	`promptText` text NOT NULL,
	`displayOrder` int NOT NULL DEFAULT 0,
	CONSTRAINT `promptLibrary_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `opportunities` RENAME COLUMN `linkUrl` TO `sourceUrl`;--> statement-breakpoint
ALTER TABLE `opportunities` MODIFY COLUMN `sourceUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `savedOpportunities` MODIFY COLUMN `opportunityId` int;--> statement-breakpoint
ALTER TABLE `profiles` ADD `country` varchar(80) DEFAULT 'South Africa';--> statement-breakpoint
ALTER TABLE `profiles` ADD `resources` text;--> statement-breakpoint
ALTER TABLE `savedOpportunities` ADD `snapshotData` text;