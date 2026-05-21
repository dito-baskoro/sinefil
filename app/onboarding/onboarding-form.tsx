"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { completeOnboarding } from "./actions";

export function OnboardingForm({
  initialDisplayName,
  initialAvatarUrl,
}: {
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatarUrl);

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const result = await completeOnboarding(formData);
          if (result?.error) setError(result.error);
          else router.push("/");
        });
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          required
          pattern="^[a-z0-9_]{3,20}$"
          placeholder="contohnya: pecintafilm_id"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          3–20 karakter. Hanya huruf kecil, angka, dan underscore.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Nama tampilan (opsional)</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={initialDisplayName ?? ""}
          maxLength={50}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">Foto profil (opsional)</Label>
        <div className="flex items-center gap-3">
          <div className="h-16 w-16 overflow-hidden rounded-full border border-border bg-secondary">
            {avatarPreview ? (
              <Image src={avatarPreview} alt="" width={64} height={64} className="h-full w-full object-cover" unoptimized />
            ) : null}
          </div>
          <Input
            id="avatar"
            name="avatar"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setAvatarPreview(URL.createObjectURL(file));
            }}
            className="cursor-pointer"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Menyimpan..." : "Simpan & lanjut"}
      </Button>
    </form>
  );
}
