import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "התראות · Budgi" };

export default function Page() {
  return <ComingSoon title="התראות" />;
}
