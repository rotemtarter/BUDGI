"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Stepper } from "@/components/common/stepper";
import { MAX_FILE_BYTES, emptyMapping, type ColumnMapping } from "@/lib/imports/fields";
import { FILE_MESSAGES } from "@/lib/imports/messages";
import type {
  CampaignPreview,
  CommitResponse,
  CommitResult,
  FileColumns,
  PreviewResponse,
  PreviewSummary,
} from "@/lib/imports/types";
import { UploadStep } from "./upload-step";
import { MappingStep } from "./mapping-step";
import { ReviewStep } from "./review-step";
import { DoneStep } from "./done-step";
import { CampaignReviewStep } from "./campaign-review-step";

const STEPS = ["העלאה", "התאמת עמודות", "בדיקה", "סיום"] as const;
type Step = 0 | 1 | 2 | 3;

const NETWORK_MESSAGE = "לא הצלחנו להתחבר לשרת. בדוק את החיבור ונסה שוב.";

// The file stays in the browser and is sent again for every step; the server
// stores nothing until the import is confirmed (ARCHITECTURE.md 5.2)
async function send<T extends { ok: boolean }>(url: string, file: File, mapping?: ColumnMapping, campaignId?: string) {
  const body = new FormData();
  body.set("file", file);
  if (mapping) body.set("mapping", JSON.stringify(mapping));
  if (campaignId) body.set("campaign", campaignId);
  try {
    const response = await fetch(url, { method: "POST", body });
    // Vercel rejects large bodies before they reach the app (ADR-8)
    if (response.status === 413) return { ok: false as const, message: FILE_MESSAGES.tooBig };
    return (await response.json()) as T;
  } catch {
    return { ok: false as const, message: NETWORK_MESSAGE };
  }
}

function hasAllowedExtension(name: string) {
  return /\.(csv|xlsx)$/i.test(name);
}

export type ImportCampaign = { id: string; name: string };

// Import screen (DESIGN.md 1.11): upload → column mapping → review → done.
// With `campaign`, the file's rows are added up into one week of that campaign.
export function ImportWizard({ campaign }: { campaign?: ImportCampaign }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(0);
  const [file, setFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<FileColumns | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>(emptyMapping);
  const [summary, setSummary] = useState<PreviewSummary | null>(null);
  const [campaignSummary, setCampaignSummary] = useState<CampaignPreview | null>(null);
  const [autoMapped, setAutoMapped] = useState(false);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // Move focus to the new step's heading, so screen readers follow along
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  function showPreview(response: Extract<PreviewResponse, { ok: true }>) {
    setColumns({ headers: response.headers, samples: response.samples, mapping: response.mapping });
    setMapping(response.mapping);
    if (response.stage === "mapping") {
      setStep(1);
      return;
    }
    if (response.stage === "campaign-review") setCampaignSummary(response.summary);
    else {
      setSummary(response.summary);
      setAutoMapped(response.autoMapped);
    }
    setStep(2);
  }

  async function handleFile(chosen: File) {
    setUploadError(null);
    if (!hasAllowedExtension(chosen.name)) return setUploadError(FILE_MESSAGES.unsupported);
    if (chosen.size === 0) return setUploadError(FILE_MESSAGES.empty);
    if (chosen.size > MAX_FILE_BYTES) return setUploadError(FILE_MESSAGES.tooBig);

    setPending(true);
    const response = await send<PreviewResponse>("/api/imports/preview", chosen, undefined, campaign?.id);
    setPending(false);
    if (!response.ok) return setUploadError(response.message);
    setFile(chosen);
    showPreview(response);
  }

  async function handleContinue() {
    if (!file) return;
    setPending(true);
    const response = await send<PreviewResponse>("/api/imports/preview", file, mapping, campaign?.id);
    setPending(false);
    if (!response.ok) return void toast.error(response.message);
    showPreview(response);
  }

  async function handleImport() {
    if (!file) return;
    setPending(true);
    const response = await send<CommitResponse>("/api/imports/commit", file, mapping, campaign?.id);
    setPending(false);
    if (!response.ok) return void toast.error(response.message);
    setResult(response.result);
    setStep(3);
    // Campaign screens show the imported data
    router.refresh();
  }

  function reset() {
    setFile(null);
    setColumns(null);
    setMapping(emptyMapping());
    setSummary(null);
    setCampaignSummary(null);
    setResult(null);
    setUploadError(null);
    setStep(0);
  }

  return (
    <div className="max-w-4xl">
      <Stepper steps={STEPS} current={step} />
      <h2 ref={headingRef} tabIndex={-1} className="type-h3 outline-none">
        {STEPS[step]}
      </h2>
      {file && step > 0 && step < 3 ? (
        <p className="mb-4 mt-1 type-small text-muted-foreground">
          קובץ: <bdi>{file.name}</bdi>
        </p>
      ) : (
        <div className="mb-4" />
      )}

      {step === 0 && <UploadStep onFile={handleFile} error={uploadError} pending={pending} />}
      {step === 1 && columns && (
        <MappingStep
          columns={columns}
          mapping={mapping}
          onChange={setMapping}
          onContinue={handleContinue}
          onBack={reset}
          pending={pending}
          forCampaign={Boolean(campaign)}
        />
      )}
      {step === 2 && campaign && campaignSummary && (
        <CampaignReviewStep
          campaignName={campaign.name}
          summary={campaignSummary}
          onImport={handleImport}
          onBack={() => setStep(1)}
          pending={pending}
        />
      )}
      {step === 2 && !campaign && summary && (
        <ReviewStep
          summary={summary}
          autoMapped={autoMapped}
          onImport={handleImport}
          onBack={() => setStep(1)}
          pending={pending}
        />
      )}
      {step === 3 && result && (
        <DoneStep
          result={result}
          onAnother={reset}
          campaign={campaign && campaignSummary ? { ...campaign, weekStart: campaignSummary.weekStart } : undefined}
        />
      )}
    </div>
  );
}
