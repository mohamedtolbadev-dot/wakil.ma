CREATE TABLE `blog_posts` (
  `id` VARCHAR(191) NOT NULL,
  `authorId` VARCHAR(191) NULL,
  `title` VARCHAR(191) NOT NULL,
  `slug` VARCHAR(191) NOT NULL,
  `excerpt` TEXT NOT NULL,
  `content` LONGTEXT NOT NULL,
  `coverImage` VARCHAR(191) NULL,
  `category` VARCHAR(191) NULL,
  `language` VARCHAR(191) NOT NULL DEFAULT 'fr',
  `metaTitle` VARCHAR(191) NULL,
  `metaDescription` TEXT NULL,
  `keywords` TEXT NULL,
  `status` ENUM('DRAFT', 'PUBLISHED', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `publishedAt` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `blog_posts_slug_key`(`slug`),
  INDEX `blog_posts_status_publishedAt_idx`(`status`, `publishedAt`),
  INDEX `blog_posts_language_status_idx`(`language`, `status`),
  INDEX `blog_posts_authorId_idx`(`authorId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
