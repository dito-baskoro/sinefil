import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { DefaultAvatar } from "@/components/default-avatar";

type Params = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { username } = await params;
  return { title: `Follower @${username}` };
}

export default async function FollowersPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { username } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle();
  if (!profile) notFound();

  const { data: rows } = await supabase
    .from("follows")
    .select("follower:profiles!follows_follower_id_fkey(id, username, display_name, avatar_url, bio)")
    .eq("followee_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const followers = (rows ?? [])
    .map((r) => (Array.isArray(r.follower) ? r.follower[0] : r.follower))
    .filter(Boolean) as { id: string; username: string; display_name: string | null; avatar_url: string | null; bio: string | null }[];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/profile/${profile.username}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          ← @{profile.username}
        </Link>
        <h1 className="text-2xl font-bold">Follower</h1>
      </div>
      {followers.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Belum ada follower.
        </div>
      ) : (
        <ul className="space-y-2">
          {followers.map((p) => (
            <li key={p.id}>
              <Link
                href={`/profile/${p.username}`}
                className="flex items-center gap-3 rounded-md border border-border p-3 hover:bg-secondary"
              >
                <div className="h-10 w-10 overflow-hidden rounded-full border border-border">
                  {p.avatar_url ? (
                    <Image
                      src={p.avatar_url}
                      alt=""
                      width={40}
                      height={40}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <DefaultAvatar />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.display_name || p.username}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">@{p.username}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
