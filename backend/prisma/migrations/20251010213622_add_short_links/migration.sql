-- CreateTable
CREATE TABLE "public"."ShortLink" (
    "code" TEXT NOT NULL,
    "targetUrl" TEXT NOT NULL,
    "roomId" TEXT,
    "createdBy" TEXT,
    "expireAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShortLink_pkey" PRIMARY KEY ("code")
);

-- CreateIndex
CREATE INDEX "ShortLink_roomId_idx" ON "public"."ShortLink"("roomId");

-- CreateIndex
CREATE INDEX "ShortLink_expireAt_idx" ON "public"."ShortLink"("expireAt");

-- AddForeignKey
ALTER TABLE "public"."ShortLink" ADD CONSTRAINT "ShortLink_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ShortLink" ADD CONSTRAINT "ShortLink_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
