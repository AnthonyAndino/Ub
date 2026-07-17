-- AlterTable
ALTER TABLE "User" ALTER COLUMN "currency" SET DEFAULT 'L';

-- Update existing users to default to Lempiras
UPDATE "User" SET currency = 'L' WHERE currency = '$';
