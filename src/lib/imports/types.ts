import type { Platform } from "@/lib/campaigns/platforms";
import type { NewAlert } from "@/lib/alerts/types";
import type { ColumnMapping } from "./fields";
import type { AdjustedDate, RowError } from "./rows";
import type { WeekValues } from "./campaign";

// Responses of /api/imports/* (shared by the server and the browser)

export type FileColumns = {
  headers: string[];
  // Value of each column in the first data row, for the mapping step
  samples: string[];
  mapping: ColumnMapping;
};

export type PreviewSummary = {
  rowsTotal: number;
  newRows: number;
  updatedRows: number;
  newCampaigns: { name: string; platform: Platform }[];
  errors: RowError[];
  adjusted: AdjustedDate[];
};

// Import into one campaign: the file's rows added up into one week
export type CampaignPreview = {
  weekStart: string;
  crossesWeeks: boolean;
  totals: WeekValues;
  // The week's stored values, when it already has data
  existing: WeekValues | null;
  rowsSummed: number;
  rowsSkipped: number;
  errors: RowError[];
};

export type PreviewResponse =
  | ({ ok: true; stage: "mapping" } & FileColumns)
  | ({ ok: true; stage: "campaign-review"; summary: CampaignPreview } & FileColumns)
  | ({ ok: true; stage: "review"; autoMapped: boolean; summary: PreviewSummary } & FileColumns)
  | { ok: false; message: string };

export type CommitResult = {
  rowsImported: number;
  rowsInserted: number;
  rowsUpdated: number;
  rowsRejected: number;
  campaignsCreated: number;
};

export type CommitResponse =
  | { ok: true; result: CommitResult; alerts: NewAlert[] }
  | { ok: false; message: string };
