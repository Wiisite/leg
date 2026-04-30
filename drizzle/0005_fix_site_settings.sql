-- Migração manual para garantir que as colunas de site_settings existam
ALTER TABLE `site_settings` ADD COLUMN `clinicsHeroImageUrl` text;
ALTER TABLE `site_settings` ADD COLUMN `aboutHeroImageUrl` text;
ALTER TABLE `site_settings` ADD COLUMN `aboutMissionImageUrl` text;
ALTER TABLE `site_settings` ADD COLUMN `contactHeroImageUrl` text;
ALTER TABLE `site_settings` ADD COLUMN `clinicsJson` longtext;
ALTER TABLE `site_settings` MODIFY COLUMN `mainLogoUrl` longtext;
ALTER TABLE `site_settings` MODIFY COLUMN `footerLogoUrl` longtext;
ALTER TABLE `site_settings` MODIFY COLUMN `homeHighlightImageUrl` longtext;
ALTER TABLE `site_settings` MODIFY COLUMN `partnersJson` longtext;
