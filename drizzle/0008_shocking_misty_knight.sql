CREATE TABLE `athletes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`teamId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`number` int,
	`photo` longtext,
	`document` varchar(50),
	`birthDate` varchar(20),
	`position` varchar(50),
	`status` enum('active','suspended') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `athletes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchId` int NOT NULL,
	`teamId` int NOT NULL,
	`athleteId` int,
	`type` enum('goal','yellow_card','red_card','suspension_2min','point_1','point_2','point_3','foul') NOT NULL,
	`period` int DEFAULT 1,
	`minute` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `match_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `teams` MODIFY COLUMN `logo` longtext;--> statement-breakpoint
ALTER TABLE `tournaments` MODIFY COLUMN `modality` enum('futsal','basquete','volei','handebol','extra1','extra2') NOT NULL DEFAULT 'futsal';--> statement-breakpoint
ALTER TABLE `site_settings` ADD `contactConfigJson` longtext;--> statement-breakpoint
ALTER TABLE `site_settings` ADD `overallStandingsConfigJson` longtext;