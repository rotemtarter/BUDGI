import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

// Label above the control, help text and error below (DESIGN.md 2.3)
export function Field({
  id,
  label,
  required,
  help,
  error,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  help?: ReactNode;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label id={`${id}-label`} htmlFor={id}>
        {label}
        {required && (
          <span aria-hidden className="text-error">
            *
          </span>
        )}
      </Label>
      {children}
      {help && !error && (
        <p id={`${id}-help`} className="type-small text-muted-foreground">
          {help}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="type-small text-error">
          {error}
        </p>
      )}
    </div>
  );
}

// aria props that tie a control to its Field help/error text
export function fieldA11y(id: string, { error, help }: { error?: string; help?: boolean }) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : help ? `${id}-help` : undefined,
  } as const;
}
