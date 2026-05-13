-- Add isDraft + missingFields to orders
ALTER TABLE `orders`
  ADD COLUMN `isDraft` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `missingFields` TEXT NULL;

-- Backfill existing draft orders (identified by notes marker)
UPDATE `orders`
SET `isDraft` = true
WHERE `notes` LIKE '%⚠️ DRAFT_ORDER%'
   OR `notes` LIKE '%طلب بدون عنوان%';
