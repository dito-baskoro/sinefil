"use client";

import { useTransition } from "react";
import { setAdminStatus } from "./actions";

export function AdminButton({
  targetUserId,
  isAdmin,
  disabled,
}: {
  targetUserId: string;
  isAdmin: boolean;
  disabled?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (disabled || pending) return;
    const msg = isAdmin
      ? "Cabut akses admin user ini?"
      : "Jadikan user ini admin?";
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await setAdminStatus(targetUserId, !isAdmin);
      if (res?.error) alert(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="rounded-md border border-input px-2.5 py-1 text-xs hover:bg-secondary disabled:opacity-50"
    >
      {pending ? "..." : isAdmin ? "Demote" : "Make admin"}
    </button>
  );
}
