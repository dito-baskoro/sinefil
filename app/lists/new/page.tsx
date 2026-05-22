import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { NewListForm } from "./new-list-form";

export const metadata = { title: "List baru" };

export default async function NewListPage() {
  if (!isSupabaseConfigured()) redirect("/");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Bikin list baru</h1>
      <NewListForm />
    </div>
  );
}
