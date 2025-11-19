/*
  Warnings:

  - The values [FINISHED] on the enum `RoomStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "public"."RoomStatus_new" AS ENUM ('OPEN', 'STARTED', 'CLOSED');
ALTER TABLE "public"."Room" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "public"."Room" ALTER COLUMN "status" TYPE "public"."RoomStatus_new" USING ("status"::text::"public"."RoomStatus_new");
ALTER TYPE "public"."RoomStatus" RENAME TO "RoomStatus_old";
ALTER TYPE "public"."RoomStatus_new" RENAME TO "RoomStatus";
DROP TYPE "public"."RoomStatus_old";
ALTER TABLE "public"."Room" ALTER COLUMN "status" SET DEFAULT 'OPEN';
COMMIT;

-- AlterTable
ALTER TABLE "public"."RatingPhoto" ADD COLUMN     "base64Data" TEXT,
ALTER COLUMN "storageKey" DROP NOT NULL;

-- AlterTable
ALTER TABLE "public"."Room" ADD COLUMN     "closedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "profilePicture" TEXT;

-- CreateIndex
CREATE INDEX "Room_status_closedAt_idx" ON "public"."Room"("status", "closedAt");
