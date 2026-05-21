"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { signInWithGoogle } from "@/app/auth/actions";

export function GoogleSignInButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => signInWithGoogle())}
      className="w-full"
    >
      <GoogleGlyph />
      {pending ? "Mengarahkan..." : "Masuk dengan Google"}
    </Button>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M21.8 10.1H12v3.9h5.6c-.8 2.5-3.1 4-5.6 4-3.4 0-6.1-2.7-6.1-6.1S8.6 5.8 12 5.8c1.5 0 2.9.5 4 1.5l2.7-2.7C16.8 2.9 14.5 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5 0 9.5-3.7 9.8-10z"
      />
    </svg>
  );
}
