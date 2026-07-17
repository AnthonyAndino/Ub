-- AlterTable
ALTER TABLE "WishlistItem" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'L',
ADD COLUMN     "exchangeRate" DECIMAL(10,4);
