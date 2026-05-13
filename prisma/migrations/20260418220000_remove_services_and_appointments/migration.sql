-- Migration: Remove Service and Appointment models + related columns
-- Focus platform on e-commerce only (product niche)

-- ──────────────────────────────────────────────
-- 1. Drop appointments + services tables
-- ──────────────────────────────────────────────
DROP TABLE IF EXISTS `appointments`;
DROP TABLE IF EXISTS `services`;

-- ──────────────────────────────────────────────
-- 2. Remove service/appointment columns (safe DROP IF EXISTS)
-- ──────────────────────────────────────────────
SET @dbname = DATABASE();

-- Check and drop columns from agents table
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'serviceInstructions'),
  'ALTER TABLE `agents` DROP COLUMN `serviceInstructions`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'serviceWelcomeMessage'),
  'ALTER TABLE `agents` DROP COLUMN `serviceWelcomeMessage`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'selectedServiceId'),
  'ALTER TABLE `agents` DROP COLUMN `selectedServiceId`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'mode'),
  'ALTER TABLE `agents` DROP COLUMN `mode`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'appointmentConfirmMessage'),
  'ALTER TABLE `agents` DROP COLUMN `appointmentConfirmMessage`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'appointmentReminderMessage'),
  'ALTER TABLE `agents` DROP COLUMN `appointmentReminderMessage`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'agents' AND column_name = 'appointmentCancellationMessage'),
  'ALTER TABLE `agents` DROP COLUMN `appointmentCancellationMessage`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Check and drop columns from conversations table
SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'conversations' AND column_name = 'serviceId'),
  'ALTER TABLE `conversations` DROP COLUMN `serviceId`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns 
         WHERE table_schema = @dbname AND table_name = 'conversations' AND column_name = 'type'),
  'ALTER TABLE `conversations` DROP COLUMN `type`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
