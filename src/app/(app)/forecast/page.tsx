import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "תחזית חודשית · Budgi" };

export default function Page() {
  return <ComingSoon title="תחזית חודשית" />;
}
