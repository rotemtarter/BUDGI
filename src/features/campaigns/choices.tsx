import { PlatformLogo } from "@/components/campaigns/platform-logo";
import type { Choice } from "@/components/forms/choice-select";
import {
  CAMPAIGN_STATUSES,
  PLATFORMS,
  PLATFORM_LABELS,
  STATUS_LABELS,
  type CampaignStatus,
  type Platform,
} from "@/lib/campaigns/platforms";

export const PLATFORM_CHOICES: Choice<Platform>[] = PLATFORMS.map((platform) => ({
  value: platform,
  label: PLATFORM_LABELS[platform],
  icon: <PlatformLogo platform={platform} decorative />,
}));

export const STATUS_CHOICES: Choice<CampaignStatus>[] = CAMPAIGN_STATUSES.map((status) => ({
  value: status,
  label: STATUS_LABELS[status],
}));
