"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, fieldA11y } from "@/components/forms/field";
import { PASSWORD_HELP } from "@/lib/validation/auth";
import {
  forgotPasswordAction,
  resetPasswordAction,
  signInWithEmailAction,
  signUpWithEmailAction,
  type AuthResult,
} from "./email-actions";

// Email and password forms of the sign-in screens (DESIGN.md 1.1, ADR-21).
// The server checks everything again; the messages come back in Hebrew.

type Values = Record<string, string>;

function useAuthForm(action: (input: Values) => Promise<AuthResult>, initial: Values) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const field = (name: string) => ({
    value: values[name],
    onChange: (event: { target: { value: string } }) => setValues((v) => ({ ...v, [name]: event.target.value })),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await action(values);
      if (result.ok) {
        setErrors({});
        setDone(true);
        return;
      }
      setErrors(result.fieldErrors ?? {});
      if (!result.fieldErrors) setMessage(result.message);
    });
  };

  return { values, errors, message, done, pending, field, onSubmit };
}

function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="w-full rounded-lg bg-red-50 px-3 py-2 text-center type-small text-error">
      {message}
    </p>
  );
}

function TextField({
  id,
  label,
  type,
  autoComplete,
  error,
  help,
  input,
}: {
  id: string;
  label: string;
  type: "email" | "password";
  autoComplete: string;
  error?: string;
  help?: ReactNode;
  input: { value: string; onChange: (event: { target: { value: string } }) => void };
}) {
  return (
    <Field id={id} label={label} error={error} help={help}>
      <Input
        type={type}
        autoComplete={autoComplete}
        dir="ltr"
        className="text-right"
        {...fieldA11y(id, { error, help: Boolean(help) })}
        {...input}
      />
    </Field>
  );
}

export function SignInForm() {
  const form = useAuthForm(signInWithEmailAction, { email: "", password: "" });
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex w-full flex-col gap-4">
      <FormError message={form.message} />
      <TextField id="signin-email" label="אימייל" type="email" autoComplete="email" error={form.errors.email} input={form.field("email")} />
      <TextField
        id="signin-password"
        label="סיסמה"
        type="password"
        autoComplete="current-password"
        error={form.errors.password}
        input={form.field("password")}
      />
      <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={form.pending}>
        {form.pending ? "מתחבר…" : "התחברות עם אימייל"}
      </Button>
    </form>
  );
}

function Sent({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div role="status" className="flex w-full flex-col items-center gap-3 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent">
        <MailCheck aria-hidden className="size-7 text-primary" />
      </span>
      <p className="type-h4">{title}</p>
      <p className="type-small text-muted-foreground">{children}</p>
    </div>
  );
}

export function SignUpForm() {
  const form = useAuthForm(signUpWithEmailAction, { email: "", password: "", confirm: "" });
  if (form.done) {
    return (
      <Sent title="בדוק את תיבת הדואר">
        שלחנו קישור לאישור לכתובת <bdi dir="ltr">{form.values.email.trim()}</bdi>. לחץ עליו כדי להשלים את ההרשמה. לא
        הגיע? בדוק גם בתיקיית הספאם.
      </Sent>
    );
  }
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex w-full flex-col gap-4">
      <FormError message={form.message} />
      <TextField id="signup-email" label="אימייל" type="email" autoComplete="email" error={form.errors.email} input={form.field("email")} />
      <TextField
        id="signup-password"
        label="סיסמה"
        type="password"
        autoComplete="new-password"
        error={form.errors.password}
        help={PASSWORD_HELP}
        input={form.field("password")}
      />
      <TextField
        id="signup-confirm"
        label="אימות סיסמה"
        type="password"
        autoComplete="new-password"
        error={form.errors.confirm}
        input={form.field("confirm")}
      />
      <Button type="submit" size="lg" className="w-full" disabled={form.pending}>
        {form.pending ? "נרשם…" : "הרשמה"}
      </Button>
    </form>
  );
}

export function ForgotPasswordForm() {
  const form = useAuthForm(forgotPasswordAction, { email: "" });
  if (form.done) {
    return (
      <Sent title="בדוק את תיבת הדואר">
        אם יש חשבון לכתובת <bdi dir="ltr">{form.values.email.trim()}</bdi>, נשלח אליה קישור לבחירת סיסמה חדשה.
      </Sent>
    );
  }
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex w-full flex-col gap-4">
      <FormError message={form.message} />
      <TextField id="forgot-email" label="אימייל" type="email" autoComplete="email" error={form.errors.email} input={form.field("email")} />
      <Button type="submit" size="lg" className="w-full" disabled={form.pending}>
        {form.pending ? "שולח…" : "שליחת קישור לאיפוס"}
      </Button>
    </form>
  );
}

export function ResetPasswordForm() {
  const form = useAuthForm(resetPasswordAction, { password: "", confirm: "" });
  return (
    <form onSubmit={form.onSubmit} noValidate className="flex w-full flex-col gap-4">
      <FormError message={form.message} />
      <TextField
        id="reset-password"
        label="סיסמה חדשה"
        type="password"
        autoComplete="new-password"
        error={form.errors.password}
        help={PASSWORD_HELP}
        input={form.field("password")}
      />
      <TextField
        id="reset-confirm"
        label="אימות סיסמה"
        type="password"
        autoComplete="new-password"
        error={form.errors.confirm}
        input={form.field("confirm")}
      />
      <Button type="submit" size="lg" className="w-full" disabled={form.pending}>
        {form.pending ? "שומר…" : "שמירת הסיסמה"}
      </Button>
    </form>
  );
}
