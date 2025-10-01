/*
  Warnings:

  - A unique constraint covering the columns `[roomId,userId,restaurantId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `value` to the `Vote` table without a default value. This is not possible if the table is not empty.
  - Made the column `restaurantId` on table `Vote` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."VoteValue" AS ENUM ('ACCEPT', 'REJECT');

-- CreateEnum
CREATE TYPE "public"."ImageSource" AS ENUM ('google', 'wongnai', 'ugc');

-- CreateEnum
CREATE TYPE "public"."AssetStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "public"."Vote" ADD COLUMN     "value" "public"."VoteValue" NOT NULL,
ALTER COLUMN "restaurantId" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."RestaurantImage" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "source" "public"."ImageSource" NOT NULL,
    "externalRef" TEXT,
    "externalUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "attribution" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "RestaurantImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ImageAsset" (
    "id" TEXT NOT NULL,
    "source" "public"."ImageSource" NOT NULL DEFAULT 'ugc',
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "blurHash" TEXT,
    "status" "public"."AssetStatus" NOT NULL DEFAULT 'pending',
    "restaurantId" TEXT,
    "userId" TEXT,
    "roomId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "moderatedAt" TIMESTAMP(3),
    "flaggedCount" INTEGER DEFAULT 0,

    CONSTRAINT "ImageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestaurantImage_restaurantId_idx" ON "public"."RestaurantImage"("restaurantId");

-- CreateIndex
CREATE INDEX "RestaurantImage_source_idx" ON "public"."RestaurantImage"("source");

-- CreateIndex
CREATE INDEX "ImageAsset_restaurantId_idx" ON "public"."ImageAsset"("restaurantId");

-- CreateIndex
CREATE INDEX "ImageAsset_userId_idx" ON "public"."ImageAsset"("userId");

-- CreateIndex
CREATE INDEX "ImageAsset_roomId_idx" ON "public"."ImageAsset"("roomId");

-- CreateIndex
CREATE INDEX "ImageAsset_status_idx" ON "public"."ImageAsset"("status");

-- CreateIndex
CREATE INDEX "Vote_restaurantId_idx" ON "public"."Vote"("restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_roomId_userId_restaurantId_key" ON "public"."Vote"("roomId", "userId", "restaurantId");

-- AddForeignKey
ALTER TABLE "public"."Vote" ADD CONSTRAINT "Vote_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RestaurantImage" ADD CONSTRAINT "RestaurantImage_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImageAsset" ADD CONSTRAINT "ImageAsset_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImageAsset" ADD CONSTRAINT "ImageAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ImageAsset" ADD CONSTRAINT "ImageAsset_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
