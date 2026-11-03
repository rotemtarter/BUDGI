"use client";

import { useId, useState } from "react";
import { Download, FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { IMPORT_FIELDS } from "@/lib/imports/fields";

const REQUIRED = IMPORT_FIELDS.filter((f) => f.required).map((f) => f.header).join(", ");
const OPTIONAL = IMPORT_FIELDS.filter((f) => !f.required).map((f) => f.header).join(", ");

// Step 1 (DESIGN.md 1.11): drop zone, sample file and file errors. The zone is
// a label around a file input, so it works with a click, the keyboard or a drop.
export function UploadStep({
  onFile,
  error,
  pending,
}: {
  onFile: (file: File) => void;
  error: string | null;
  pending: boolean;
}) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <label
        htmlFor={id}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && !pending) onFile(file);
        }}
        className={cn(
          "flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed bg-white px-6 py-14 text-center transition-colors",
          "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
          dragging ? "border-primary bg-accent" : "border-brand-light-gray hover:border-primary",
          error && "border-error",
          pending && "cursor-wait opacity-70",
        )}
      >
        <span className="flex size-14 items-center justify-center rounded-full bg-accent">
          <FileUp aria-hidden className="size-7 text-primary" />
        </span>
        <span className="type-body font-medium text-brand-dark">
          {pending ? "בודק את הקובץ…" : "גרור קובץ לכאן או בחר קובץ"}
        </span>
        <span className="type-small text-muted-foreground">CSV או Excel, עד 5MB ו-5,000 שורות</span>
        <input
          id={id}
          type="file"
          accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          disabled={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(event) => {
            const file = event.target.files?.[0];
            // Allow choosing the same file again after an error
            event.target.value = "";
            if (file) onFile(file);
          }}
        />
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="type-small text-error">
          {error}
        </p>
      )}

      <div className="flex flex-col gap-2 rounded-xl border border-brand-light-gray bg-white p-4 shadow-card">
        <a
          href="/api/imports/template"
          download
          className="inline-flex w-fit items-center gap-2 type-body font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Download aria-hidden className="size-4" />
          הורדת קובץ דוגמה
        </a>
        <p className="type-small text-muted-foreground">
          כל שורה היא קמפיין אחד בשבוע אחד. עמודות חובה: {REQUIRED}. עמודות נוספות: {OPTIONAL}.
        </p>
      </div>
    </div>
  );
}
