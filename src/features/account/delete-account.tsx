"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/forms/field";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ACCOUNT_MESSAGES, DELETE_CONFIRM_WORD, isDeleteConfirmed } from "@/lib/validation/account";

const INPUT_ID = "delete-confirm";

// Settings, danger zone (DESIGN.md 1.10 area 6, PRD 4.9): deleting the account
// needs the word "מחק" typed in the dialog (checked again on the server).
export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const onOpenChange = (next: boolean) => {
    if (pending) return;
    setOpen(next);
    if (!next) setConfirm("");
  };

  async function onDelete() {
    if (!isDeleteConfirmed(confirm) || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (response.ok && body?.ok) {
        // A full load (not router.push), so no state of the deleted account
        // stays in memory; replace, so Back does not return to Settings
        window.location.replace("/login");
        return;
      }
      toast.error(body?.message ?? ACCOUNT_MESSAGES.failed);
    } catch {
      toast.error(ACCOUNT_MESSAGES.failed);
    }
    setPending(false);
  }

  return (
    <Card className="border-destructive">
      <CardHeader>
        <CardTitle>מחיקת חשבון</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="type-body text-muted-foreground">
          המחיקה סופית: החשבון וכל הנתונים — קמפיינים, נתונים שבועיים, תקציבים, יעדים, התראות ותובנות שמורות —
          יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.
        </p>
        <Button variant="destructive" className="w-fit" onClick={() => setOpen(true)}>
          מחיקת החשבון
        </Button>
      </CardContent>

      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent initialFocus={inputRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>למחוק את החשבון?</AlertDialogTitle>
            <AlertDialogDescription>
              כל הנתונים שלך יימחקו לצמיתות ולא ניתן יהיה לשחזר אותם.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form
            noValidate
            onSubmit={(event) => {
              event.preventDefault();
              void onDelete();
            }}
          >
            <Field id={INPUT_ID} label={`כדי לאשר, הקלד: ${DELETE_CONFIRM_WORD}`}>
              <Input
                ref={inputRef}
                id={INPUT_ID}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                disabled={pending}
              />
            </Field>
          </form>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              disabled={!isDeleteConfirmed(confirm) || pending}
              onClick={() => void onDelete()}
            >
              {pending ? "מוחק…" : "מחיקה לצמיתות"}
            </AlertDialogAction>
            <AlertDialogCancel disabled={pending}>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
