-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'L',
ADD COLUMN     "exchangeRate" DECIMAL(10,4);
