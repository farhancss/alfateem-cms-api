-- CreateTable
CREATE TABLE `batches` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `schedule` VARCHAR(191) NOT NULL,
    `fee` VARCHAR(191) NULL,
    `seatsTotal` INTEGER NULL,
    `seatsLeft` INTEGER NULL,
    `note` VARCHAR(191) NULL,
    `published` BOOLEAN NOT NULL DEFAULT true,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `batches_courseId_idx`(`courseId`),
    INDEX `batches_startDate_idx`(`startDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `batches` ADD CONSTRAINT `batches_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
