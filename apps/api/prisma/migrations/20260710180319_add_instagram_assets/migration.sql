-- CreateEnum
CREATE TYPE "InstagramAssetType" AS ENUM ('REEL', 'POST', 'CAROUSEL', 'VIDEO', 'IMAGE', 'UNKNOWN');

-- CreateTable
CREATE TABLE "InstagramAsset" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "instagramMediaId" TEXT NOT NULL,
    "assetType" "InstagramAssetType" NOT NULL,
    "caption" TEXT,
    "mediaType" TEXT,
    "thumbnailUrl" TEXT,
    "mediaUrl" TEXT,
    "permalink" TEXT,
    "shortCode" TEXT,
    "timestamp" TIMESTAMP(3),
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "syncVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstagramProfile" (
    "id" TEXT NOT NULL,
    "instagramAccountId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT,
    "profilePictureUrl" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "following" INTEGER NOT NULL DEFAULT 0,
    "mediaCount" INTEGER NOT NULL DEFAULT 0,
    "biography" TEXT,
    "website" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstagramProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramAsset_instagramAccountId_idx" ON "InstagramAsset"("instagramAccountId");

-- CreateIndex
CREATE INDEX "InstagramAsset_instagramMediaId_idx" ON "InstagramAsset"("instagramMediaId");

-- CreateIndex
CREATE INDEX "InstagramAsset_assetType_idx" ON "InstagramAsset"("assetType");

-- CreateIndex
CREATE INDEX "InstagramAsset_timestamp_idx" ON "InstagramAsset"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramAsset_instagramAccountId_instagramMediaId_key" ON "InstagramAsset"("instagramAccountId", "instagramMediaId");

-- CreateIndex
CREATE UNIQUE INDEX "InstagramProfile_instagramAccountId_key" ON "InstagramProfile"("instagramAccountId");

-- AddForeignKey
ALTER TABLE "InstagramAsset" ADD CONSTRAINT "InstagramAsset_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstagramProfile" ADD CONSTRAINT "InstagramProfile_instagramAccountId_fkey" FOREIGN KEY ("instagramAccountId") REFERENCES "InstagramAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
