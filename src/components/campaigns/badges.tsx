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

const STATUS_STYLES: Record<CampaignStatus, string> = {
  active: "bg-success/10 text-success",
  paused: "bg-warning/10 text-warning",
  ended: "bg-muted text-brand-gray",
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
