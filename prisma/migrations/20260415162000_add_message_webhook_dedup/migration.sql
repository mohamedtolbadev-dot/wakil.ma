ALTER TABLE `messages`
  ADD COLUMN `whatsappMessageId` VARCHAR(191) NULL;

CREATE UNIQUE INDEX `messages_whatsappMessageId_key`
  ON `messages`(`whatsappMessageId`);
