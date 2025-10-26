-- CreateEnum
CREATE TYPE "public"."RatingStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "public"."Rating" (
    "id" TEXT NOT NULL,
    "roomId" TEXT,
    "userId" TEXT,
    "restaurantId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "tags" JSONB,
    "comment" TEXT,
    "status" "public"."RatingStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RatingPhoto" (
    "id" TEXT NOT NULL,
    "ratingId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "mime" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RatingPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Rating_restaurantId_status_createdAt_idx" ON "public"."Rating"("restaurantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Rating_userId_createdAt_idx" ON "public"."Rating"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RatingPhoto_ratingId_idx" ON "public"."RatingPhoto"("ratingId");

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Rating" ADD CONSTRAINT "Rating_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RatingPhoto" ADD CONSTRAINT "RatingPhoto_ratingId_fkey" FOREIGN KEY ("ratingId") REFERENCES "public"."Rating"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
