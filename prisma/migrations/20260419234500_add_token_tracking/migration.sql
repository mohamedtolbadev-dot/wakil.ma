-- Add token tracking fields to monthly_usage
ALTER TABLE `monthly_usage`
  ADD COLUMN `aiTokensInput` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `aiTokensOutput` INTEGER NOT NULL DEFAULT 0;
