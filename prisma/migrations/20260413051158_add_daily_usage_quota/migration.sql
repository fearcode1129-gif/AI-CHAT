-- CreateTable
CREATE TABLE "DailyUsage" (
    "id" TEXT NOT NULL,
    "dateKey" TEXT NOT NULL,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "totalTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "DailyUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DailyUsage_dateKey_idx" ON "DailyUsage"("dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "DailyUsage_userId_dateKey_key" ON "DailyUsage"("userId", "dateKey");

-- AddForeignKey
ALTER TABLE "DailyUsage" ADD CONSTRAINT "DailyUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
