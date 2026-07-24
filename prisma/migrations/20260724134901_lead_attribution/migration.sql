-- AlterTable
ALTER TABLE `contact_messages` ADD COLUMN `attribution` JSON NULL;

-- AlterTable
ALTER TABLE `registration_leads` ADD COLUMN `attribution` JSON NULL;
