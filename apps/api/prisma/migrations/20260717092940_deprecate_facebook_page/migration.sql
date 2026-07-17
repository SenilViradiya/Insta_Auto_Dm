/*
  Warnings:

  - You are about to drop the column `accessTokenEncrypted` on the `InstagramAccount` table. All the data in the column will be lost.
  - You are about to drop the column `pageId` on the `InstagramAccount` table. All the data in the column will be lost.
  - You are about to drop the column `pageName` on the `InstagramAccount` table. All the data in the column will be lost.
  - You are about to drop the column `tokenExpiresAt` on the `InstagramAccount` table. All the data in the column will be lost.
  - Added the required column `accessToken` to the `InstagramAccount` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `InstagramAccount` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "ActionType" ADD VALUE IF NOT EXISTS 'REPLY_COMMENT';

-- AlterTable
ALTER TABLE "InstagramAccount" DROP COLUMN "accessTokenEncrypted",
DROP COLUMN "pageId",
DROP COLUMN "pageName",
DROP COLUMN "tokenExpiresAt",
ADD COLUMN     "accessToken" TEXT NOT NULL,
ADD COLUMN     "expiresAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT NOT NULL;
