-- Add the self-service Business package and monthly plan expiry.
ALTER TABLE `users`
  ADD COLUMN `planExpiresAt` DATETIME(3) NULL,
  MODIFY COLUMN `plan` ENUM('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE') NOT NULL DEFAULT 'FREE';

ALTER TABLE `invoices`
  MODIFY COLUMN `plan` ENUM('FREE', 'PRO', 'BUSINESS', 'ENTERPRISE') NOT NULL DEFAULT 'FREE';
