import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { ListEditor } from "./list-editor";

type Params = { id: string };

export const metadata = { title: "Edit list" };

export default async function EditListPage({ params }: { params: Promise<Params> }) {
  if (!isSupabaseConfigured()) notFound();
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: list } = await supabase
    .from("lists")
    .select("id, user_id, title, description, is_public")
    .eq("id", id)
    .maybeSingle();
  if (!list) notFound();
  if (list.user_id !== user.id) redirect(`/lists/${id}`);

  const { data: itemRows } = await supabase
    .from("list_items")
    .select(
      `position, note,
       movie:movies!list_items_movie_id_fkey(id, tmdb_id, title, poster_path, release_date)`
    )
    .eq("list_id", id)
    .order("position", { ascending: true });

  type Row = {
    position: number;
    note: string | null;
    movie: { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null } | { id: number; tmdb_id: number; title: string; poster_path: string | null; release_date: string | null }[] | null;
  };

  const items = ((itemRows ?? []) as Row[])
    .map((r) => {
      const m = Array.isArray(r.movie) ? r.movie[0] : r.movie;
      return m
        ? {
            movie_id: m.id,
            tmdb_id: m.tmdb_id,
            title: m.title,
            poster_path: m.poster_path,
            release_date: m.release_date ?? "",
          }
        : null;
    })
    .filter(Boolean) as {
    movie_id: number;
    tmdb_id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
  }[];

  return (
    <ListEditor
      list={{
        id: list.id,
        title: list.title,
        description: list.description ?? "",
        is_public: list.is_public,
      }}
      initialItems={items}
    />
  );
}
