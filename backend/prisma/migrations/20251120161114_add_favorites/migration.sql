-- CreateTable
CREATE TABLE "public"."Favorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_userId_idx" ON "public"."Favorite"("userId");

-- CreateIndex
CREATE INDEX "Favorite_restaurantId_idx" ON "public"."Favorite"("restaurantId");

-- CreateIndex
CREATE INDEX "Favorite_userId_createdAt_idx" ON "public"."Favorite"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_restaurantId_key" ON "public"."Favorite"("userId", "restaurantId");

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Favorite" ADD CONSTRAINT "Favorite_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
