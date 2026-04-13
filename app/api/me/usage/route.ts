import { requireUser } from "@/lib/server/auth";
import { getUserDailyUsage } from "@/lib/server/services/usage-service";

export async function GET() {
  try {
    const user = await requireUser();
    const usage = await getUserDailyUsage(user.plan, user.userId);
    return Response.json(usage);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown server error";
    const status = message === "UNAUTHORIZED" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
