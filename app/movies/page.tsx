import Link from "next/link";
import { MovieCard } from "@/components/movie-card";
import { searchMovies, discoverIndonesian } from "@/lib/tmdb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Cari Film" };

export default async function MoviesSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query ? await searchMovies(query) : await discoverIndonesian({ sort: "popularity.desc" });

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {query ? `Hasil pencarian: "${query}"` : "Jelajah film Indonesia"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {query
            ? `${results.length} film ketemu.`
            : "Pilih dari yang lagi populer atau cari judul tertentu di atas."}
        </p>
      </header>

      <form action="/movies" className="flex max-w-xl gap-2">
        <Input
          name="q"
          defaultValue={query}
          placeholder="Cari judul film..."
          aria-label="Cari judul film"
        />
        <Button type="submit">Cari</Button>
      </form>

      {results.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Tidak ketemu film yang cocok. Coba kata kunci lain, atau{" "}
          <Link href="/movies" className="underline">
            lihat semua film
          </Link>
          .
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((m) => (
            <MovieCard key={m.id} movie={m} />
          ))}
        </div>
      )}
    </div>
  );
}
