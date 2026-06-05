-- Migração manual para garantir que as colunas de site_settings existam
CREATE TABLE IF NOT EXISTS `site_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mainLogoUrl` longtext,
	`footerLogoUrl` longtext,
	`homeHighlightImageUrl` longtext,
	`homeHeroImagesJson` longtext,
	`homeHeroTitlesJson` longtext,
	`modalityBannerImagesJson` longtext,
	`partnersJson` longtext,
	`liveStreamsJson` longtext,
	`championshipAddressesJson` longtext,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `site_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `clinicsHeroImageUrl` text;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `aboutHeroImageUrl` text;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `aboutMissionImageUrl` text;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `contactHeroImageUrl` text;
--> statement-breakpoint
ALTER TABLE `site_settings` ADD COLUMN `clinicsJson` longtext;
--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `mainLogoUrl` longtext;
--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `footerLogoUrl` longtext;
--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `homeHighlightImageUrl` longtext;
--> statement-breakpoint
ALTER TABLE `site_settings` MODIFY COLUMN `partnersJson` longtext;
