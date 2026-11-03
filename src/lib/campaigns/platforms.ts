// Fixed list of ad platforms and campaign statuses (PRD 4.3). Also used by the
// import in Milestone 4.

export const PLATFORMS = ["meta_ads", "google_ads", "tiktok_ads", "linkedin_ads"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const PLATFORM_LABELS: Record<Platform, string> = {
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  linkedin_ads: "LinkedIn Ads",
};

export const CAMPAIGN_STATUSES = ["active", "paused", "ended"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  active: "פעיל",
  paused: "מושהה",
  ended: "הסתיים",
};

export function isPlatform(value: string): value is Platform {
  return (PLATFORMS as readonly string[]).includes(value);
}

export function isCampaignStatus(value: string): value is CampaignStatus {
  return (CAMPAIGN_STATUSES as readonly string[]).includes(value);
}
