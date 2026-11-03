"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Starts Google sign-in. New users are created automatically (PRD 3.2).
export function GoogleButton() {
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function signIn() {
    setPending(true);
    setFailed(false);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setPending(false);
      setFailed(true);
    }
  }

  return (
    <div className="flex w-full flex-col gap-3">
      {failed && <LoginErrorMessage />}
      <Button size="lg" className="w-full" onClick={signIn} disabled={pending}>
        <GoogleIcon />
        {pending ? "מעביר ל-Google…" : "התחברות עם Google"}
      </Button>
    </div>
  );
}

export function LoginErrorMessage() {
  return (
    <p role="alert" className="w-full rounded-lg bg-red-50 px-3 py-2 text-center type-small text-error">
      ההתחברות לא הושלמה. נסה שוב.
    </p>
  );
}

function GoogleIcon() {
  return (
    <span aria-hidden className="flex size-6 items-center justify-center rounded-full bg-white">
      <svg viewBox="0 0 24 24" className="size-4">
        <path
          fill="#EA4335"
          d="M12 10.2v3.9h5.5c-.24 1.26-.96 2.33-2.04 3.05l3.3 2.56c1.92-1.77 3.03-4.38 3.03-7.48 0-.72-.06-1.41-.18-2.07H12z"
        />
        <path
          fill="#34A853"
          d="M5.27 14.29l-.74.57-2.63 2.05C3.56 20.22 7.5 22.5 12 22.5c2.97 0 5.46-.98 7.28-2.66l-3.3-2.56c-.9.6-2.06.97-3.98.97-2.87 0-5.3-1.94-6.17-4.55z"
        />
        <path
          fill="#4A90E2"
          d="M1.9 7.09A10.4 10.4 0 0 0 1.5 12c0 1.75.42 3.4 1.17 4.86l3.37-2.62A6.2 6.2 0 0 1 5.73 12c0-.78.13-1.54.37-2.24z"
        />
        <path
          fill="#FBBC05"
          d="M12 5.4c1.6 0 3.04.55 4.18 1.63l2.92-2.92C17.46 2.57 14.97 1.5 12 1.5 7.5 1.5 3.56 3.78 1.9 7.09l3.43 2.66C6.2 7.14 8.63 5.4 12 5.4z"
        />
      </svg>
    </span>
  );
}
