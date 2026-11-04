import type { Metadata } from "next";
import { DAILY_QUESTION_LIMIT } from "@/lib/advisor/schema";
import { AdvisorChat } from "@/features/advisor/advisor-chat";
import { requireOnboardedUser } from "@/server/auth/session";
import { getTodayUsage } from "@/server/repositories/advisor-usage";
import { listInsights } from "@/server/repositories/advisor-insights";
import { getFirstWeekStart } from "@/server/repositories/performance";
import { listCampaigns } from "@/server/repositories/campaigns";

export const metadata: Metadata = { title: "AI Budget · Budgi" };

// AI Budget Advisor (DESIGN.md 1.12): today's remaining questions and whether
// the account has any data yet, the saved insights and the campaigns (to enter
// missing data); the conversation itself stays in the browser
export default async function AdvisorPage() {
  await requireOnboardedUser();
  const [used, firstWeek, insights, campaigns] = await Promise.all([
    getTodayUsage(),
    getFirstWeekStart(),
    listInsights(),
    listCampaigns(),
  ]);
  return (
    <AdvisorChat
      initialRemaining={Math.max(DAILY_QUESTION_LIMIT - used, 0)}
      hasData={firstWeek !== null}
      initialInsights={insights}
      campaigns={campaigns.map(({ id, name, platform }) => ({ id, name, platform }))}
    />
  );
}
