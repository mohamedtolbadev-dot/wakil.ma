SET @column_sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'waProvider'),
  'SELECT 1',
  'ALTER TABLE `agents` ADD COLUMN `waProvider` VARCHAR(191) NOT NULL DEFAULT ''meta'''
));
PREPARE stmt FROM @column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'twilioAccountSid'),
  'SELECT 1',
  'ALTER TABLE `agents` ADD COLUMN `twilioAccountSid` VARCHAR(191) NULL'
));
PREPARE stmt FROM @column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'twilioAuthToken'),
  'SELECT 1',
  'ALTER TABLE `agents` ADD COLUMN `twilioAuthToken` TEXT NULL'
));
PREPARE stmt FROM @column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @column_sql = (SELECT IF(
  EXISTS(SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agents' AND COLUMN_NAME = 'twilioPhoneNumber'),
  'SELECT 1',
  'ALTER TABLE `agents` ADD COLUMN `twilioPhoneNumber` VARCHAR(191) NULL'
));
PREPARE stmt FROM @column_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
