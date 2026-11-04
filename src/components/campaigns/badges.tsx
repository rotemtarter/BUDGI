import { cn } from "@/lib/utils";
import {
  PLATFORM_LABELS,
  STATUS_LABELS,
  type CampaignStatus,
  type Platform,
} from "@/lib/campaigns/platforms";
import { PlatformLogo } from "./platform-logo";

const BASE = "inline-flex h-6 w-fit shrink-0 items-center gap-1.5 rounded-full px-2.5 type-caption font-medium whitespace-nowrap";

// Platform tag: 16px logo and name (DESIGN.md 2.3)
export function PlatformBadge({ platform, className }: { platform: Platform; className?: string }) {
  return (
    <span className={cn(BASE, "border border-brand-light-gray bg-white text-brand-dark", className)}>
      <PlatformLogo platform={platform} decorative />
      <span dir="ltr">{PLATFORM_LABELS[platform]}</span>
    </span>
  );
}

// Status text on white keeps 4.5:1 or more on any surface (DESIGN.md 2.1, axe);
// a tinted background under it would not
const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: "border border-success/30 bg-white text-success",
  paused: "border border-warning/30 bg-white text-warning",
  ended: "bg-muted text-brand-dark",
};

export function StatusBadge({ status }: { status: CampaignStatus }) {
  return <span className={cn(BASE, STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}

// Where a weekly row came from: "ידני" or "ייבוא"
export function SourceBadge({ source }: { source: "manual" | "import" }) {
  return (
    <span className={cn(BASE, source === "import" ? "bg-brand-light-blue text-brand-dark" : "bg-accent text-primary")}>
      {source === "import" ? "ייבוא" : "ידני"}
    </span>
  );
}
