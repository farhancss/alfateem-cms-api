-- Add the `testimonials` section type to the folds enum
ALTER TABLE `sections`
  MODIFY `type` ENUM('hero', 'techMarquee', 'whyUs', 'coursesGrid', 'graduatesWall', 'blogPreview', 'faq', 'cta', 'richText', 'gallery', 'stats', 'testimonials') NOT NULL;

-- CreateTable
CREATE TABLE `testimonials` (
    `id` VARCHAR(191) NOT NULL,
    `author` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NULL,
    `quote` TEXT NOT NULL,
    `rating` INTEGER NOT NULL DEFAULT 5,
    `source` ENUM('GOOGLE', 'FACEBOOK', 'MANUAL', 'WEBSITE') NOT NULL DEFAULT 'MANUAL',
    `sourceUrl` VARCHAR(191) NULL,
    `avatar` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `approved` BOOLEAN NOT NULL DEFAULT true,
    `featured` BOOLEAN NOT NULL DEFAULT false,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `testimonials_approved_idx`(`approved`),
    INDEX `testimonials_source_idx`(`source`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
