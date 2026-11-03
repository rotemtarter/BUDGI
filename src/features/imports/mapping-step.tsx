"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChoiceSelect, type Choice } from "@/components/forms/choice-select";
import { PlatformLogo } from "@/components/campaigns/platform-logo";
import { PLATFORMS, PLATFORM_LABELS } from "@/lib/campaigns/platforms";
import { formatWeekRange } from "@/lib/dates/week";
import {
  FIELD_LABELS,
  MAX_PERIOD_DAYS,
  VALUE_FIELDS,
  isPlatformValue,
  missingCampaignMapping,
  missingMapping,
  periodCrossesWeeks,
  periodError,
  periodWeek,
  type ColumnMapping,
} from "@/lib/imports/fields";
import type { FileColumns } from "@/lib/imports/types";

const SKIP = "skip";
const GRID = "md:grid-cols-[minmax(10rem,1fr)_minmax(12rem,1.5fr)_minmax(8rem,1fr)]";

function Row({ id, label, required, control, sample }: {
  id: string;
  label: string;
  required?: boolean;
  control: ReactNode;
  sample: ReactNode;
}) {
  return (
    <li className={`grid gap-2 px-4 py-3 md:items-center md:gap-4 ${GRID}`}>
      <span id={`${id}-label`} className="type-body font-medium">
        {label}
        {required && (
          <>
            <span aria-hidden className="text-error">*</span>
            <span className="sr-only"> (חובה)</span>
          </>
        )}
      </span>
      {control}
      <span className="truncate type-small text-muted-foreground" dir="auto">
        {sample}
      </span>
    </li>
  );
}

// Step 2 (DESIGN.md 1.11): platform first (one platform for the whole file, or
// a column), the campaign-name column, the dates of the file (typed once, one
// week), and the value columns. "המשך" says what is still missing.
// For an import into one campaign (`forCampaign`), the campaign and its
// platform are known: only the dates and the value columns are chosen.
export function MappingStep({
  columns,
  mapping,
  onChange,
  onContinue,
  onBack,
  pending,
  forCampaign = false,
}: {
  forCampaign?: boolean;
  columns: FileColumns;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  onContinue: () => void;
  onBack: () => void;
  pending: boolean;
}) {
  const columnChoices: Choice<string>[] = columns.headers.map((header, index) => ({ value: String(index), label: header }));
  const platformChoices: Choice<string>[] = [
    ...PLATFORMS.map((platform) => ({
      value: platform,
      label: `${PLATFORM_LABELS[platform]} – לכל השורות`,
      icon: <PlatformLogo platform={platform} decorative />,
    })),
    ...columns.headers.map((header, index) => ({ value: String(index), label: `עמודה בקובץ: ${header}` })),
  ];
  const sampleOf = (index: number | null) => (index === null ? "" : columns.samples[index]) || "—";
  const missing = forCampaign ? missingCampaignMapping(mapping) : missingMapping(mapping);

  const from = mapping.period?.from ?? "";
  const to = mapping.period?.to ?? "";
  const setPeriod = (next: { from: string; to: string }) => onChange({ ...mapping, week: null, period: next });
  const periodProblem = mapping.period && from && to ? periodError(mapping.period) : null;

  let dateSample: ReactNode = "—";
  if (mapping.period && from && to && !periodProblem) {
    dateSample = (
      <>
        שבוע <span dir="ltr">{formatWeekRange(periodWeek(mapping.period))}</span>
        {periodCrossesWeeks(mapping.period) && " (רוב הימים)"}
      </>
    );
  } else if (mapping.week !== null) dateSample = sampleOf(mapping.week);

  return (
    <div className="flex flex-col gap-6">
      <p className="type-body text-muted-foreground">
        {forCampaign
          ? "בחר את התאריכים של הקובץ ואת העמודות של הנתונים. כל השורות בקובץ (למשל מודעה בכל שורה) יחוברו לשורת שבוע אחת בקמפיין."
          : "הכותרות בקובץ לא תואמות לקובץ הדוגמה. בחר מאיפה מגיע כל שדה. עמודות שלא נבחרו לא ייובאו."}
      </p>

      <div className="rounded-xl border border-brand-light-gray bg-white shadow-card">
        <div className={`hidden gap-4 border-b border-brand-light-gray px-4 py-3 type-small font-medium text-muted-foreground md:grid ${GRID}`}>
          <span>שדה ב-Budgi</span>
          <span>מקור</span>
          <span>דוגמה מהשורה הראשונה</span>
        </div>
        <ul className="divide-y divide-brand-light-gray">
          {/* The campaign and its platform are known in campaign mode */}
          {!forCampaign && (
            <>
              <Row
                id="map-platform"
                label={FIELD_LABELS.platform}
                required
                control={
                  <ChoiceSelect
                    id="map-platform"
                    choices={platformChoices}
                    value={mapping.platform === null ? "" : String(mapping.platform)}
                    onChange={(value) => onChange({ ...mapping, platform: isPlatformValue(value) ? value : Number(value) })}
                  />
                }
                sample={
                  isPlatformValue(mapping.platform) ? "כל השורות" : typeof mapping.platform === "number" ? sampleOf(mapping.platform) : "—"
                }
              />
              <Row
                id="map-name"
                label={FIELD_LABELS.name}
                required
                control={
                  <ChoiceSelect
                    id="map-name"
                    choices={columnChoices}
                    value={mapping.name === null ? "" : String(mapping.name)}
                    onChange={(value) => onChange({ ...mapping, name: Number(value) })}
                  />
                }
                sample={sampleOf(mapping.name)}
              />
            </>
          )}
          <Row
            id="map-dates"
            label="תאריכים"
            required
            control={
              mapping.week !== null && !mapping.period ? (
                <div className="flex flex-wrap items-center gap-2 type-small">
                  <span>
                    מהעמודה „<bdi>{columns.headers[mapping.week]}</bdi>” בקובץ
                  </span>
                  <Button type="button" variant="link" className="h-auto p-0" onClick={() => setPeriod({ from: "", to: "" })}>
                    הזנת תאריכים ידנית
                  </Button>
                </div>
              ) : (
                <div role="group" aria-labelledby="map-dates-label" className="flex flex-col gap-1">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col gap-1 type-small text-muted-foreground">
                      מתאריך
                      <Input
                        type="date"
                        value={from}
                        aria-invalid={periodProblem ? true : undefined}
                        aria-describedby={periodProblem ? "map-dates-error" : undefined}
                        onChange={(event) => setPeriod({ from: event.target.value, to })}
                      />
                    </label>
                    <label className="flex flex-col gap-1 type-small text-muted-foreground">
                      עד תאריך
                      <Input
                        type="date"
                        value={to}
                        min={from || undefined}
                        aria-invalid={periodProblem ? true : undefined}
                        aria-describedby={periodProblem ? "map-dates-error" : undefined}
                        onChange={(event) => setPeriod({ from, to: event.target.value })}
                      />
                    </label>
                  </div>
                  {periodProblem && (
                    <p id="map-dates-error" className="type-small text-error">
                      {periodProblem}
                    </p>
                  )}
                </div>
              )
            }
            sample={dateSample}
          />
          {VALUE_FIELDS.map((field) => {
            const selected = mapping[field];
            return (
              <Row
                key={field}
                id={`map-${field}`}
                label={FIELD_LABELS[field]}
                control={
                  <ChoiceSelect
                    id={`map-${field}`}
                    choices={[{ value: SKIP, label: "לא לייבא" }, ...columnChoices]}
                    value={selected === null ? SKIP : String(selected)}
                    onChange={(value) => onChange({ ...mapping, [field]: value === SKIP ? null : Number(value) })}
                  />
                }
                sample={selected === null ? "—" : sampleOf(selected)}
              />
            );
          })}
        </ul>
      </div>

      <p className="type-small text-muted-foreground">
        הנתונים נשמרים לשבוע של התאריכים שנבחרו (עד {MAX_PERIOD_DAYS} ימים). טווח שעובר בין שני שבועות נשמר לשבוע שבו רוב הימים.
        {!forCampaign && " קובץ עם כמה שבועות אפשר לייבא עם עמודת „תחילת שבוע” כמו בקובץ הדוגמה."}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={onContinue} disabled={missing !== null || pending}>
          {pending ? "בודק…" : "המשך"}
        </Button>
        <Button variant="secondary" onClick={onBack} disabled={pending}>
          חזרה
        </Button>
        {missing && !periodProblem && (
          <p role="status" className="type-small text-muted-foreground">
            {missing}
          </p>
        )}
      </div>
    </div>
  );
}
