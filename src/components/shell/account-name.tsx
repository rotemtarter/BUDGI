import { BriefcaseBusiness, CircleUserRound } from "lucide-react";
import { getCurrentUser } from "@/server/auth/session";
import { cn } from "@/lib/utils";

// Who is signed in (DESIGN.md 1.15): the business name with a work icon when
// set in settings, otherwise the Google name (or email) with a user icon.
// `iconFirst`: the icon on the start side, like the drawer's navigation items.
export async function AccountName({ iconFirst = false }: { iconFirst?: boolean }) {
  const user = await getCurrentUser();
  const business = user?.businessName;
  const Icon = business ? BriefcaseBusiness : CircleUserRound;
  return (
    <span className={cn("flex min-w-0 items-center gap-2", iconFirst && "flex-row-reverse justify-end")}>
      <span className="truncate type-small font-medium text-brand-dark" dir="auto" data-testid="header-user-name">
        {business || user?.displayName || user?.email}
      </span>
      <Icon aria-hidden className="size-6 shrink-0 text-brand-dark" data-testid={business ? "icon-business" : "icon-user"} />
    </span>
  );
}
