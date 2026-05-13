-- Add commerce fields to products: salePrice, category, variants, askQuantity
ALTER TABLE `products`
  ADD COLUMN `salePrice`   DOUBLE      NULL,
  ADD COLUMN `category`    VARCHAR(191) NULL,
  ADD COLUMN `variants`    TEXT         NULL,
  ADD COLUMN `askQuantity` BOOLEAN     NOT NULL DEFAULT true;
