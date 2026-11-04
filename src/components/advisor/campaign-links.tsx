"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { PlatformLogo } from "@/components/campaigns/platform-logo";
import type { Platform } from "@/lib/campaigns/platforms";

// Where to enter missing data from the Advisor (DESIGN.md 1.12): a purple
// button that opens the list of the user's campaigns; each opens its details
// screen, where weekly data is entered. With no campaigns yet: "new campaign".
// Import is offered next to it by the caller.

export type CampaignChoice = { id: string; name: string; platform: Platform };

const CampaignChoices = createContext<CampaignChoice[]>([]);

export const CampaignChoicesProvider = CampaignChoices.Provider;

export function CampaignLinks({ label, size = "default" }: { label: string; size?: "default" | "sm" }) {
  const campaigns = useContext(CampaignChoices);

  if (campaigns.length === 0) {
    return (
      <Link href="/campaigns/new" className={buttonVariants({ size, className: "w-fit" })}>
        <Plus aria-hidden />
        קמפיין חדש
      </Link>
    );
  }

  return (
    <Popover>
      <PopoverTrigger className={buttonVariants({ size, className: "w-fit" })}>
        {label}
        <ChevronDown aria-hidden />
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 max-w-[calc(100vw-2rem)] p-1.5">
        <p className="px-2.5 pt-1 type-caption text-muted-foreground">בחר קמפיין להזנת נתונים</p>
        <ul className="flex max-h-72 flex-col overflow-y-auto" aria-label="קמפיינים">
          {campaigns.map((campaign) => (
            <li key={campaign.id}>
              <Link
                href={`/campaigns/${campaign.id}`}
                className="flex min-h-11 items-center gap-2 rounded-md px-2.5 py-2 type-small text-brand-dark outline-none hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring md:min-h-9"
              >
                <PlatformLogo platform={campaign.platform} decorative />
                <span className="truncate" dir="auto">
                  {campaign.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
