"use client";

import type { ReactNode } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type Choice<T extends string> = { value: T; label: string; icon?: ReactNode };

// A list to choose from, with an optional icon next to each option (platform
// logos, DESIGN.md 2.3). Same height and look as the text fields. The trigger
// is not a native form control, so it is named by the Field label's id.
export function ChoiceSelect<T extends string>({
  id,
  choices,
  value,
  onChange,
  placeholder = "בחירה",
  invalid,
  describedBy,
}: {
  id: string;
  choices: Choice<T>[];
  value: T | "";
  onChange: (value: T) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
}) {
  const byValue = new Map(choices.map((c) => [c.value as string, c]));
  return (
    <Select<string>
      value={value === "" ? null : value}
      onValueChange={(next) => {
        if (next !== null) onChange(next as T);
      }}
    >
      <SelectTrigger id={id} aria-labelledby={`${id}-label`} aria-invalid={invalid || undefined} aria-describedby={describedBy}>
        <SelectValue placeholder={placeholder}>
          {(selected: string | null) => {
            const choice = selected ? byValue.get(selected) : undefined;
            if (!choice) return <span className="text-muted-foreground">{placeholder}</span>;
            return (
              <span className="flex items-center gap-2">
                {choice.icon}
                <span dir="auto">{choice.label}</span>
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {choices.map((choice) => (
          <SelectItem key={choice.value} value={choice.value}>
            {choice.icon}
            <span dir="auto">{choice.label}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
