"use client";

import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, fieldA11y } from "@/components/forms/field";
import { ChoiceSelect } from "@/components/forms/choice-select";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import {
  updateCampaignSchema,
  type UpdateCampaignInput,
  type UpdateCampaignValues,
} from "@/lib/validation/campaigns";
import type { Campaign } from "@/server/repositories/campaigns";
import { deleteCampaignAction, updateCampaignAction } from "./actions";
import { PLATFORM_CHOICES, STATUS_CHOICES } from "./choices";

function defaults(campaign: Campaign): UpdateCampaignInput {
  return {
    name: campaign.name,
    platform: campaign.platform,
    status: campaign.status,
    description: campaign.description ?? "",
  };
}

// "עריכת פרטים" (DESIGN.md 1.5). Deleting is offered only for a campaign
// without weekly data; one with data can only be marked as ended.
export function EditCampaignDialog({ campaign, canDelete }: { campaign: Campaign; canDelete: boolean }) {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, startDelete] = useTransition();
  const {
    register,
    control,
    handleSubmit,
    getValues,
    reset,
    setError,
    formState: { errors },
  } = useForm<UpdateCampaignInput, unknown, UpdateCampaignValues>({
    resolver: zodResolver(updateCampaignSchema),
    defaultValues: defaults(campaign),
  });

  const onOpenChange = (next: boolean) => {
    if (next) reset(defaults(campaign));
    setOpen(next);
  };

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const result = await updateCampaignAction(campaign.id, getValues());
      if (result.ok) {
        toast.success("פרטי הקמפיין נשמרו");
        setOpen(false);
      } else {
        if (result.fieldErrors?.name) setError("name", { message: result.fieldErrors.name }, { shouldFocus: true });
        toast.error(result.message);
      }
    });
  });

  const onDelete = () => {
    startDelete(async () => {
      const result = await deleteCampaignAction(campaign.id);
      if (result && !result.ok) {
        toast.error(result.message);
        setConfirmOpen(false);
      }
    });
  };

  const nameError = errors.name?.message;
  const platformError = errors.platform?.message;
  const statusError = errors.status?.message;
  const descriptionError = errors.description?.message;

  return (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(true)}>
        עריכת פרטים
      </Button>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>עריכת פרטים</DialogTitle>
          </DialogHeader>
          <form id="edit-campaign-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
            <Field id="edit-name" label="שם הקמפיין" required error={nameError}>
              <Input dir="auto" aria-required {...fieldA11y("edit-name", { error: nameError })} {...register("name")} />
            </Field>
            <Field id="edit-platform" label="פלטפורמה" required error={platformError}>
              <Controller
                control={control}
                name="platform"
                render={({ field }) => (
                  <ChoiceSelect
                    id="edit-platform"
                    choices={PLATFORM_CHOICES}
                    value={field.value}
                    onChange={field.onChange}
                    invalid={Boolean(platformError)}
                  />
                )}
              />
            </Field>
            <Field id="edit-status" label="סטטוס" required error={statusError}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <ChoiceSelect id="edit-status" choices={STATUS_CHOICES} value={field.value} onChange={field.onChange} />
                )}
              />
            </Field>
            <Field id="edit-description" label="תיאור" error={descriptionError}>
              <Textarea
                dir="auto"
                rows={3}
                {...fieldA11y("edit-description", { error: descriptionError })}
                {...register("description")}
              />
            </Field>
          </form>
          <DialogFooter>
            <Button type="submit" form="edit-campaign-form" disabled={pending}>
              {pending ? "שומר…" : "שמירה"}
            </Button>
            <DialogClose render={<Button variant="secondary" />}>ביטול</DialogClose>
          </DialogFooter>
          {canDelete && (
            <div className="border-t border-brand-light-gray pt-4">
              <Button variant="link" className="h-auto px-0 text-error" onClick={() => setConfirmOpen(true)}>
                מחיקת קמפיין
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="מחיקת קמפיין"
        description={`למחוק את הקמפיין „${campaign.name}”? אי אפשר לבטל את הפעולה.`}
        pending={deleting}
        onConfirm={onDelete}
      />
    </>
  );
}
