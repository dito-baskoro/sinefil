"use client";

import { useTransition } from "react";
import { setBanStatus } from "./actions";

export function BanButton({
  targetUserId,
  banned,
  disabled,
}: {
  targetUserId: string;
  banned: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (disabled || pending) return;
    if (!banned && !confirm("Ban user ini? Mereka akan langsung logout.")) return;
    startTransition(async () => {
      const res = await setBanStatus(targetUserId, !banned);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className={
        banned
          ? "rounded-md border border-input px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50"
          : "rounded-md border border-destructive px-2.5 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
      }
    >
      {pending ? "..." : banned ? "Unban" : "Ban"}
    </button>
  );
}
