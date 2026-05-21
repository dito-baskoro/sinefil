"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { updateBio } from "./actions";

export function EditBioDialog({ initialBio }: { initialBio: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">Edit profil</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profil</DialogTitle>
        </DialogHeader>
        <form
          action={() => {
            setError(null);
            startTransition(async () => {
              const result = await updateBio(bio);
              if (result?.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Suka horror Indonesia, anti review tanpa konteks."
            />
            <p className="text-xs text-muted-foreground">{bio.length} / 280</p>
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">{error}</div>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
