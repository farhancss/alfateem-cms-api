-- AlterTable
ALTER TABLE `sections` MODIFY `type` ENUM('hero', 'techMarquee', 'ticker', 'whyUs', 'coursesGrid', 'graduatesWall', 'blogPreview', 'faq', 'cta', 'richText', 'gallery', 'stats', 'testimonials') NOT NULL;
