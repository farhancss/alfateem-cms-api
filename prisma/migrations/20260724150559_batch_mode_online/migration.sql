-- AlterTable
ALTER TABLE `batches` ADD COLUMN `mode` ENUM('ONCAMPUS', 'ONLINE', 'HYBRID') NOT NULL DEFAULT 'ONCAMPUS';

-- AlterTable
ALTER TABLE `registration_leads` ADD COLUMN `preferredMode` VARCHAR(191) NULL;
