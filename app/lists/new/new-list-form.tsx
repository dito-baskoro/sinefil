"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { createList } from "../actions";

export function NewListForm() {
  const [error, setError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(fd) => {
        if (isPublic) fd.set("is_public", "true");
        setError(null);
        startTransition(async () => {
          const result = await createList(fd);
          if (result?.error) setError(result.error);
          // success path redirects server-side
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Judul</Label>
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          placeholder="Misal: Film Jumat Malam Anti-Bosan"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi (opsional)</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          placeholder="Kenapa list ini dibikin, vibe-nya, dll."
        />
      </div>
      <div className="flex items-center gap-2">
        <Switch id="is_public" checked={isPublic} onCheckedChange={setIsPublic} />
        <Label htmlFor="is_public">Tampilkan publik</Label>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
          {error}
        </div>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Membuat..." : "Buat list"}
      </Button>
    </form>
  );
}
