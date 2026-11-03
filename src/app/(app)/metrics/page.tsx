import type { Metadata } from "next";
import { ComingSoon } from "@/components/shell/coming-soon";

export const metadata: Metadata = { title: "מדדים · Budgi" };

export default function Page() {
  return <ComingSoon title="מדדים" />;
}
