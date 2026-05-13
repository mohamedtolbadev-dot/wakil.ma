SET @dbname = DATABASE();

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema = @dbname AND table_name = 'orders' AND column_name = 'deliveryReference'),
  'SELECT 1',
  'ALTER TABLE `orders` ADD COLUMN `deliveryReference` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema = @dbname AND table_name = 'orders' AND column_name = 'deliveryStatus'),
  'SELECT 1',
  'ALTER TABLE `orders` ADD COLUMN `deliveryStatus` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema = @dbname AND table_name = 'orders' AND column_name = 'sentToDeliveryAt'),
  'SELECT 1',
  'ALTER TABLE `orders` ADD COLUMN `sentToDeliveryAt` DATETIME(3) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema = @dbname AND table_name = 'orders' AND column_name = 'lastNotifiedDeliveryStatus'),
  'SELECT 1',
  'ALTER TABLE `orders` ADD COLUMN `lastNotifiedDeliveryStatus` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.columns
         WHERE table_schema = @dbname AND table_name = 'orders' AND column_name = 'deliveryProviderName'),
  'SELECT 1',
  'ALTER TABLE `orders` ADD COLUMN `deliveryProviderName` VARCHAR(191) NULL'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = IF(
  EXISTS(SELECT 1 FROM information_schema.statistics
         WHERE table_schema = @dbname AND table_name = 'orders' AND index_name = 'orders_deliveryReference_key'),
  'SELECT 1',
  'CREATE UNIQUE INDEX `orders_deliveryReference_key` ON `orders`(`deliveryReference`)'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
