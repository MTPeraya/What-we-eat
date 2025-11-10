-- DropForeignKey
ALTER TABLE "public"."Room" DROP CONSTRAINT "Room_hostId_fkey";

-- AlterTable
ALTER TABLE "public"."Room" ALTER COLUMN "hostId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."Room" ADD CONSTRAINT "Room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
