"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldA11y } from "@/components/forms/field";
import {
  MAX_BUSINESS_NAME,
  businessNameSchema,
  type BusinessNameInput,
  type BusinessNameValues,
} from "@/lib/validation/profile";
import { saveBusinessNameAction } from "./actions";

const ID = "business-name";

// Settings, account details (DESIGN.md 1.10): optional business name shown in
// the header instead of the Google name. Emptying it brings the Google name back.
export function BusinessNameForm({ businessName }: { businessName: string | null }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    getValues,
    setError,
    formState: { errors },
  } = useForm<BusinessNameInput, unknown, BusinessNameValues>({
    resolver: zodResolver(businessNameSchema),
    defaultValues: { businessName: businessName ?? "" },
  });

  const onSubmit = handleSubmit(() => {
    startTransition(async () => {
      const input = getValues();
      const result = await saveBusinessNameAction(input);
      if (result.ok) {
        toast.success(input.businessName.trim() ? "שם בית העסק נשמר" : "יוצג השם מחשבון Google");
      } else {
        if (result.fieldErrors?.businessName) setError("businessName", { message: result.fieldErrors.businessName });
        toast.error(result.message);
      }
    });
  });

  const error = errors.businessName?.message;
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 sm:max-w-md">
      <Field id={ID} label="שם בית העסק" help="אופציונלי. אם תמלא, השם יוצג בראש המסך במקום השם מ-Google." error={error}>
        <Input {...register("businessName")} {...fieldA11y(ID, { error, help: true })} maxLength={MAX_BUSINESS_NAME} dir="auto" />
      </Field>
      <Button type="submit" variant="secondary" disabled={pending} className="w-fit">
        {pending ? "שומר…" : "שמירה"}
      </Button>
    </form>
  );
}
