"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { DefaultAvatar } from "@/components/default-avatar";
import { deleteAvatar, updateProfile } from "./actions";

export function EditBioDialog({
  initialBio,
  initialDisplayName,
  initialAvatarUrl,
  initialLocation,
}: {
  initialBio: string;
  initialDisplayName: string;
  initialAvatarUrl: string | null;
  initialLocation: string;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [bio, setBio] = useState(initialBio);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [location, setLocation] = useState(initialLocation);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [pickedPreview, setPickedPreview] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [removing, startRemove] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const previewSrc = pickedPreview ?? avatarUrl;

  function resetLocal() {
    setBio(initialBio);
    setDisplayName(initialDisplayName);
    setLocation(initialLocation);
    setAvatarUrl(initialAvatarUrl);
    setPickedPreview(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) resetLocal();
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Edit profil
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit profil</DialogTitle>
        </DialogHeader>

        <form
          action={(formData) => {
            setError(null);
            startTransition(async () => {
              const result = await updateProfile(formData);
              if (result?.error) setError(result.error);
              else {
                setOpen(false);
                router.refresh();
              }
            });
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Foto profil</Label>
            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-[rgb(102,119,136)]">
                {previewSrc ? (
                  <Image
                    src={previewSrc}
                    alt=""
                    width={64}
                    height={64}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                ) : (
                  <DefaultAvatar />
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4" />
                  {avatarUrl || pickedPreview ? "Ganti foto" : "Upload foto"}
                </Button>
                {(avatarUrl || pickedPreview) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={removing}
                    onClick={() => {
                      // If only a local preview was picked (not yet saved), clear locally.
                      if (pickedPreview && !avatarUrl) {
                        setPickedPreview(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        return;
                      }
                      // Otherwise hit the server to delete the stored avatar.
                      startRemove(async () => {
                        const result = await deleteAvatar();
                        if (result?.error) setError(result.error);
                        else {
                          setAvatarUrl(null);
                          setPickedPreview(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          router.refresh();
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
                  </Button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                name="avatar"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setPickedPreview(URL.createObjectURL(file));
                }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              PNG, JPEG, atau WebP. Maks 2 MB.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name">Nama tampilan</Label>
            <Input
              id="display_name"
              name="display_name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
              placeholder="Nama yang ditampilin di profil dan review"
            />
            <p className="text-xs text-muted-foreground">
              Opsional. Username tetap dipakai buat URL profil.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Lokasi</Label>
            <Input
              id="location"
              name="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={80}
              placeholder="Misal: Jakarta, Bandung, Yogyakarta"
            />
            <p className="text-xs text-muted-foreground">Opsional.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={280}
              rows={3}
              placeholder="Suka horror Indonesia, anti review tanpa konteks."
            />
            <p className="text-xs text-muted-foreground">{bio.length} / 280</p>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
