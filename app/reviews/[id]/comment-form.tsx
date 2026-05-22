"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { addComment, deleteComment } from "./actions";

export function CommentForm({ reviewId }: { reviewId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");

  return (
    <form
      ref={formRef}
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const result = await addComment(reviewId, fd);
          if (result.error) setError(result.error);
          else {
            setBody("");
            formRef.current?.reset();
            router.refresh();
          }
        });
      }}
      className="space-y-2"
    >
      <Textarea
        name="body"
        rows={3}
        maxLength={2000}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tulis komentar..."
      />
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{body.length} / 2000</p>
        <Button type="submit" size="sm" disabled={pending || !body.trim()}>
          {pending ? "Mengirim..." : "Kirim"}
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm">
          {error}
        </div>
      )}
    </form>
  );
}

export function DeleteCommentButton({
  commentId,
  reviewId,
}: {
  commentId: string;
  reviewId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm("Hapus komentar?")) return;
        startTransition(async () => {
          const result = await deleteComment(commentId, reviewId);
          if (!result.error) router.refresh();
        });
      }}
      className="text-xs text-muted-foreground hover:text-destructive"
    >
      {pending ? "Menghapus..." : "Hapus"}
    </button>
  );
}
