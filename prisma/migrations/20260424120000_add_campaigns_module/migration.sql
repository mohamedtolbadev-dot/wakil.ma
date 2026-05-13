-- Add marketing tracking fields to customers
ALTER TABLE `customers`
  ADD COLUMN `lastMarketingSentAt` DATETIME(3) NULL,
  ADD COLUMN `marketingOptInAt` DATETIME(3) NULL,
  ADD COLUMN `marketingOptInSource` VARCHAR(191) NULL,
  ADD COLUMN `marketingOptOutAt` DATETIME(3) NULL,
  ADD COLUMN `outboundBlocked` BOOLEAN NOT NULL DEFAULT false;

-- Store reusable WhatsApp templates per user
CREATE TABLE `campaign_templates` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `metaTemplateName` VARCHAR(191) NOT NULL,
  `language` VARCHAR(191) NOT NULL DEFAULT 'fr',
  `headerType` VARCHAR(191) NULL,
  `bodyVariables` JSON NULL,
  `previewText` TEXT NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `campaign_templates_userId_isActive_idx`(`userId`, `isActive`),
  UNIQUE INDEX `campaign_templates_userId_metaTemplateName_language_key`(`userId`, `metaTemplateName`, `language`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Campaign jobs and summary counters
CREATE TABLE `campaigns` (
  `id` VARCHAR(191) NOT NULL,
  `userId` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NULL,
  `templateId` VARCHAR(191) NULL,
  `name` VARCHAR(191) NOT NULL,
  `status` ENUM('DRAFT', 'READY', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `audienceType` ENUM('ALL_BUYERS', 'SAME_PRODUCT_BUYERS', 'SAME_CATEGORY_BUYERS', 'TAG_BUYERS', 'RECENT_BUYERS') NOT NULL,
  `filtersJson` JSON NULL,
  `templateVariablesJson` JSON NULL,
  `batchSize` INTEGER NOT NULL DEFAULT 25,
  `audienceCount` INTEGER NOT NULL DEFAULT 0,
  `eligibleCount` INTEGER NOT NULL DEFAULT 0,
  `sentCount` INTEGER NOT NULL DEFAULT 0,
  `failedCount` INTEGER NOT NULL DEFAULT 0,
  `skippedCount` INTEGER NOT NULL DEFAULT 0,
  `repliedCount` INTEGER NOT NULL DEFAULT 0,
  `scheduledAt` DATETIME(3) NULL,
  `startedAt` DATETIME(3) NULL,
  `completedAt` DATETIME(3) NULL,
  `lastDispatchedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `campaigns_userId_status_idx`(`userId`, `status`),
  INDEX `campaigns_userId_createdAt_idx`(`userId`, `createdAt`),
  INDEX `campaigns_productId_idx`(`productId`),
  INDEX `campaigns_templateId_idx`(`templateId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Snapshot of recipients and delivery state for each campaign
CREATE TABLE `campaign_recipients` (
  `id` VARCHAR(191) NOT NULL,
  `campaignId` VARCHAR(191) NOT NULL,
  `customerId` VARCHAR(191) NULL,
  `customerName` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `status` ENUM('PENDING', 'SKIPPED', 'SENT', 'FAILED', 'REPLIED', 'OPTED_OUT') NOT NULL DEFAULT 'PENDING',
  `skipReason` VARCHAR(191) NULL,
  `variablesJson` JSON NULL,
  `waMessageId` VARCHAR(191) NULL,
  `lastError` TEXT NULL,
  `lastAttemptAt` DATETIME(3) NULL,
  `sentAt` DATETIME(3) NULL,
  `repliedAt` DATETIME(3) NULL,
  `optedOutAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  INDEX `campaign_recipients_campaignId_status_idx`(`campaignId`, `status`),
  INDEX `campaign_recipients_customerId_status_idx`(`customerId`, `status`),
  UNIQUE INDEX `campaign_recipients_campaignId_phone_key`(`campaignId`, `phone`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
