import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { TmdbMovie } from "@/lib/tmdb";
import { formatDate, tmdbImage } from "@/lib/utils";

export function MovieCard({ movie }: { movie: TmdbMovie }) {
  const poster = tmdbImage(movie.poster_path, "w342");
  const year = movie.release_date ? movie.release_date.slice(0, 4) : null;

  return (
    <Link
      href={`/movies/${movie.id}`}
      className="group flex flex-col gap-2 transition-opacity hover:opacity-90"
    >
      <div className="relative aspect-[2/3] overflow-hidden rounded-md border border-border bg-secondary">
        {poster ? (
          <Image
            src={poster}
            alt={`Poster ${movie.title}`}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 25vw, 200px"
            className="object-cover transition-transform group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs text-muted-foreground">
            {movie.title}
          </div>
        )}
        {movie.vote_count > 0 && (
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white backdrop-blur">
            <Star className="h-3 w-3 fill-current text-yellow-400" />
            {movie.vote_average.toFixed(1)}
          </div>
        )}
      </div>
      <div className="space-y-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight">{movie.title}</h3>
        <p className="text-xs text-muted-foreground">{year ?? formatDate(movie.release_date)}</p>
      </div>
    </Link>
  );
}
