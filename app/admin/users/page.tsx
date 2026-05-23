import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DefaultAvatar } from "@/components/default-avatar";
import { formatDate } from "@/lib/utils";
import { BanButton } from "./ban-button";
import { AdminButton } from "./admin-button";

export const metadata = { title: "Admin · Users" };

const PAGE_SIZE = 20;

type Row = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  is_admin: boolean | null;
  is_banned: boolean | null;
  created_at: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: me } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle();
  if (!me?.is_admin) notFound();

  const { q = "", page: pageParam } = await searchParams;
  const query = q.trim();
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let usersQuery = supabase
    .from("profiles")
    .select(
      "id, username, display_name, avatar_url, bio, location, is_admin, is_banned, created_at",
      { count: "exact" }
    );

  if (query) {
    const escaped = query.replace(/[%_,]/g, (c) => `\\${c}`);
    const pattern = `%${escaped}%`;
    usersQuery = usersQuery.or(`username.ilike.${pattern},display_name.ilike.${pattern}`);
  }

  const { data, count } = await usersQuery
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as Row[];
  const total = count ?? rows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const buildHref = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/users?${qs}` : "/admin/users";
  };

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          {query
            ? `${total} match${total === 1 ? "" : "es"} for "${query}".`
            : `${total} registered users.`}
        </p>
      </header>

      <form action="/admin/users" className="flex max-w-xl gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by username or display name..."
          aria-label="Search users"
        />
        <Button type="submit" variant="secondary">Search</Button>
      </form>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No users found.
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-md border border-border">
            {rows.map((u) => {
              const isSelf = u.id === user.id;
              const banned = Boolean(u.is_banned);
              return (
                <li key={u.id} className="flex min-h-[78px] items-center gap-3 px-3 py-2">
                  <Link
                    href={`/profile/${u.username}`}
                    className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
                  >
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      {u.avatar_url ? (
                        <Image
                          src={u.avatar_url}
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
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">
                          {u.display_name || u.username}
                        </span>
                        {u.is_admin && (
                          <Badge variant="default" className="h-4 shrink-0 px-1.5 text-[10px] font-medium">
                            Admin
                          </Badge>
                        )}
                        {banned && (
                          <Badge variant="destructive" className="h-4 shrink-0 px-1.5 text-[10px] font-medium">
                            Banned
                          </Badge>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">
                        @{u.username} · joined {formatDate(u.created_at)}
                        {u.location && <> · 📍 {u.location}</>}
                      </div>
                      {u.bio && (
                        <div className="truncate text-xs text-muted-foreground">{u.bio}</div>
                      )}
                    </div>
                  </Link>
                  <div className="flex shrink-0 items-center gap-2">
                    <AdminButton
                      targetUserId={u.id}
                      isAdmin={Boolean(u.is_admin)}
                      disabled={isSelf || banned}
                    />
                    <BanButton
                      targetUserId={u.id}
                      banned={banned}
                      disabled={isSelf || Boolean(u.is_admin)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>

          {totalPages > 1 && (
            <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
              <span className="text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                {page > 1 ? (
                  <Link
                    href={buildHref(page - 1)}
                    className="rounded-md border border-input px-3 py-1.5 hover:bg-secondary"
                  >
                    ← Previous
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-md border border-input px-3 py-1.5 text-muted-foreground opacity-50">
                    ← Previous
                  </span>
                )}
                {page < totalPages ? (
                  <Link
                    href={buildHref(page + 1)}
                    className="rounded-md border border-input px-3 py-1.5 hover:bg-secondary"
                  >
                    Next →
                  </Link>
                ) : (
                  <span className="cursor-not-allowed rounded-md border border-input px-3 py-1.5 text-muted-foreground opacity-50">
                    Next →
                  </span>
                )}
              </div>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
