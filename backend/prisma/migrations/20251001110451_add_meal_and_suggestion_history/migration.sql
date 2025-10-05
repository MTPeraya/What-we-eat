-- CreateTable
CREATE TABLE "public"."MealHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RoomSuggestionHistory" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "suggestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomSuggestionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealHistory_userId_decidedAt_idx" ON "public"."MealHistory"("userId", "decidedAt");

-- CreateIndex
CREATE INDEX "MealHistory_roomId_decidedAt_idx" ON "public"."MealHistory"("roomId", "decidedAt");

-- CreateIndex
CREATE INDEX "RoomSuggestionHistory_roomId_suggestedAt_idx" ON "public"."RoomSuggestionHistory"("roomId", "suggestedAt");

-- CreateIndex
CREATE INDEX "RoomSuggestionHistory_restaurantId_idx" ON "public"."RoomSuggestionHistory"("restaurantId");

-- AddForeignKey
ALTER TABLE "public"."MealHistory" ADD CONSTRAINT "MealHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealHistory" ADD CONSTRAINT "MealHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MealHistory" ADD CONSTRAINT "MealHistory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomSuggestionHistory" ADD CONSTRAINT "RoomSuggestionHistory_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "public"."Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RoomSuggestionHistory" ADD CONSTRAINT "RoomSuggestionHistory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "public"."Restaurant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
