import { db } from "@/lib/server/db";

export const usageRepository = {
  getDailyUsage(userId: string, dateKey: string) {
    return db.dailyUsage.findUnique({
      where: {
        userId_dateKey: {
          userId,
          dateKey
        }
      }
    });
  },

  addDailyUsage(input: {
    userId: string;
    dateKey: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) {
    return db.dailyUsage.upsert({
      where: {
        userId_dateKey: {
          userId: input.userId,
          dateKey: input.dateKey
        }
      },
      create: input,
      update: {
        promptTokens: {
          increment: input.promptTokens
        },
        completionTokens: {
          increment: input.completionTokens
        },
        totalTokens: {
          increment: input.totalTokens
        }
      }
    });
  }
};
