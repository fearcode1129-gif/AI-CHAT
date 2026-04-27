import { db } from "@/server/db/db";

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
  },

  async tryConsumeDailyTokens(input: {
    userId: string;
    dateKey: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    limitTokens: number;
  }) {
    await db.dailyUsage.upsert({
      where: {
        userId_dateKey: {
          userId: input.userId,
          dateKey: input.dateKey
        }
      },
      create: {
        userId: input.userId,
        dateKey: input.dateKey,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      },
      update: {}
    });

    const result = await db.dailyUsage.updateMany({
      where: {
        userId: input.userId,
        dateKey: input.dateKey,
        totalTokens: {
          lte: input.limitTokens - input.totalTokens
        }
      },
      data: {
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

    return result.count === 1;
  },

  refundDailyTokens(input: {
    userId: string;
    dateKey: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  }) {
    return db.dailyUsage.updateMany({
      where: {
        userId: input.userId,
        dateKey: input.dateKey,
        promptTokens: {
          gte: input.promptTokens
        },
        completionTokens: {
          gte: input.completionTokens
        },
        totalTokens: {
          gte: input.totalTokens
        }
      },
      data: {
        promptTokens: {
          decrement: input.promptTokens
        },
        completionTokens: {
          decrement: input.completionTokens
        },
        totalTokens: {
          decrement: input.totalTokens
        }
      }
    });
  }
};
