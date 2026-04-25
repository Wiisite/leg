ALTER TABLE `tournaments` ADD `modality` enum('futsal','basquete','volei','handebol') DEFAULT 'futsal' NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `pointsPerWin` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `pointsPerDraw` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `tournaments` ADD `pointsPerLoss` int DEFAULT 0 NOT NULL;