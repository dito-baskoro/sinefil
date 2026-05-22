"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteList } from "../actions";

export function AdminDeleteListButton({ listId }: { listId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm("Hapus list ini sebagai admin?")) return;
          start(async () => {
            const result = await deleteList(listId);
            if (result.error) setError(result.error);
          });
        }}
      >
        Hapus (admin)
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
