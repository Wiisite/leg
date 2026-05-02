ALTER TABLE `site_settings` MODIFY COLUMN `clinicsHeroImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `aboutHeroImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `aboutMissionImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `contactHeroImageUrl` longtext;--> statement-breakpoint
ALTER TABLE `matches` ADD `date` varchar(50);--> statement-breakpoint
ALTER TABLE `tournaments` ADD `date` varchar(50);