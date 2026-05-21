import { isTmdbConfigured } from "./env";

const TMDB_BASE = "https://api.themoviedb.org/3";
const REVALIDATE_SECONDS = 60 * 60 * 24; // 24h

export type TmdbMovie = {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  original_language: string;
  vote_average: number;
  vote_count: number;
  genre_ids?: number[];
};

export type TmdbMovieDetail = TmdbMovie & {
  runtime: number | null;
  genres: { id: number; name: string }[];
  credits?: {
    cast: { id: number; name: string; character: string; profile_path: string | null; order: number }[];
  };
};

/**
 * Mock fixtures — Indonesian classics + recent hits. Used when TMDB_API_KEY is unset
 * so the scaffold runs end-to-end before the user wires real credentials.
 */
const MOCK_MOVIES: TmdbMovieDetail[] = [
  {
    id: 587732,
    title: "Pengabdi Setan 2: Communion",
    original_title: "Pengabdi Setan 2: Communion",
    overview:
      "Tiga tahun setelah peristiwa di rumah lama, keluarga yang selamat tinggal di sebuah rusun yang ternyata menyimpan teror lebih besar.",
    poster_path: "/iU8mIuMU8I5o9YkXrJTLrTbAm12.jpg",
    backdrop_path: "/qrGtVUO4kjcKkUmcaXLOUWlVoyf.jpg",
    release_date: "2022-08-04",
    original_language: "id",
    vote_average: 7.0,
    vote_count: 312,
    runtime: 119,
    genres: [
      { id: 27, name: "Horror" },
      { id: 53, name: "Thriller" },
    ],
    credits: {
      cast: [
        { id: 1, name: "Tara Basro", character: "Rini", profile_path: null, order: 0 },
        { id: 2, name: "Endy Arfian", character: "Toni", profile_path: null, order: 1 },
        { id: 3, name: "Bront Palarae", character: "Bapak", profile_path: null, order: 2 },
      ],
    },
  },
  {
    id: 14160,
    title: "Laskar Pelangi",
    original_title: "Laskar Pelangi",
    overview:
      "Sepuluh anak di sebuah sekolah terpencil di Belitung berjuang menjaga sekolahnya tetap berdiri, dipandu dua guru yang penuh dedikasi.",
    poster_path: "/qpfH5G4cP8KrwINSlx3wRYqlNXi.jpg",
    backdrop_path: "/eYyqLwIqYDfXfYjE3Ej9hF8GLqM.jpg",
    release_date: "2008-09-25",
    original_language: "id",
    vote_average: 7.6,
    vote_count: 198,
    runtime: 125,
    genres: [
      { id: 18, name: "Drama" },
      { id: 10751, name: "Family" },
    ],
    credits: {
      cast: [
        { id: 4, name: "Cut Mini", character: "Bu Muslimah", profile_path: null, order: 0 },
        { id: 5, name: "Ikranagara", character: "Pak Harfan", profile_path: null, order: 1 },
        { id: 6, name: "Zulfanny", character: "Ikal", profile_path: null, order: 2 },
      ],
    },
  },
  {
    id: 821937,
    title: "KKN di Desa Penari",
    original_title: "KKN di Desa Penari",
    overview:
      "Enam mahasiswa menjalani KKN di sebuah desa terpencil dan secara tidak sadar melanggar pantangan yang membawa mereka pada teror mistis.",
    poster_path: "/aoLymZw9PHaQCfvuxhVlPSV5wQM.jpg",
    backdrop_path: "/3PFRGdngTV1xs5MmwFTLOGUjQ0J.jpg",
    release_date: "2022-04-30",
    original_language: "id",
    vote_average: 7.2,
    vote_count: 412,
    runtime: 121,
    genres: [
      { id: 27, name: "Horror" },
      { id: 9648, name: "Mystery" },
    ],
    credits: {
      cast: [
        { id: 7, name: "Tissa Biani", character: "Nur", profile_path: null, order: 0 },
        { id: 8, name: "Adinda Thomas", character: "Widya", profile_path: null, order: 1 },
        { id: 9, name: "Achmad Megantara", character: "Bima", profile_path: null, order: 2 },
      ],
    },
  },
  {
    id: 410075,
    title: "Marlina si Pembunuh dalam Empat Babak",
    original_title: "Marlina si Pembunuh dalam Empat Babak",
    overview:
      "Marlina, seorang janda di Sumba, melakukan perjalanan untuk mencari keadilan setelah membela diri dari sekelompok perampok.",
    poster_path: "/8N6PgFq97jKCt3rOXt9rk1aQ9Yj.jpg",
    backdrop_path: "/dXvUJ0e2bSqK6S8tAS7B4nL0wPg.jpg",
    release_date: "2017-11-16",
    original_language: "id",
    vote_average: 7.4,
    vote_count: 256,
    runtime: 93,
    genres: [
      { id: 18, name: "Drama" },
      { id: 53, name: "Thriller" },
    ],
    credits: {
      cast: [
        { id: 10, name: "Marsha Timothy", character: "Marlina", profile_path: null, order: 0 },
        { id: 11, name: "Dea Panendra", character: "Novi", profile_path: null, order: 1 },
        { id: 12, name: "Egi Fedly", character: "Markus", profile_path: null, order: 2 },
      ],
    },
  },
  {
    id: 13927,
    title: "Ada Apa Dengan Cinta?",
    original_title: "Ada Apa Dengan Cinta?",
    overview:
      "Cinta, gadis SMA populer yang gemar puisi, jatuh hati pada Rangga yang pendiam dan misterius. Sebuah kisah cinta yang mendefinisikan satu generasi.",
    poster_path: "/yjQYxhPaR2yvHuBKBxYNvBVwBHc.jpg",
    backdrop_path: "/abc.jpg",
    release_date: "2002-02-07",
    original_language: "id",
    vote_average: 7.8,
    vote_count: 178,
    runtime: 112,
    genres: [
      { id: 10749, name: "Romance" },
      { id: 18, name: "Drama" },
    ],
    credits: {
      cast: [
        { id: 13, name: "Dian Sastrowardoyo", character: "Cinta", profile_path: null, order: 0 },
        { id: 14, name: "Nicholas Saputra", character: "Rangga", profile_path: null, order: 1 },
      ],
    },
  },
  {
    id: 1000001,
    title: "Sore: Istri Dari Masa Depan",
    original_title: "Sore: Istri Dari Masa Depan",
    overview:
      "Jonathan dipertemukan dengan Sore — perempuan yang mengaku sebagai istrinya dari masa depan, datang untuk mengubah hidupnya.",
    poster_path: null,
    backdrop_path: null,
    release_date: "2024-08-29",
    original_language: "id",
    vote_average: 8.1,
    vote_count: 89,
    runtime: 109,
    genres: [
      { id: 10749, name: "Romance" },
      { id: 14, name: "Fantasy" },
    ],
    credits: {
      cast: [
        { id: 15, name: "Sheila Dara", character: "Sore", profile_path: null, order: 0 },
        { id: 16, name: "Dion Wiyoko", character: "Jonathan", profile_path: null, order: 1 },
      ],
    },
  },
];

let warnedMock = false;
function warnMockOnce() {
  if (!warnedMock) {
    warnedMock = true;
    console.log("[tmdb] TMDB_API_KEY not set — using mock fixtures. Add a key in .env.local to fetch real data.");
  }
}

async function tmdbFetch<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", process.env.TMDB_API_KEY!);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, String(v));
  }
  const res = await fetch(url.toString(), { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`TMDB request failed: ${res.status} ${res.statusText} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export async function searchMovies(query: string): Promise<TmdbMovie[]> {
  if (!query.trim()) return [];
  if (!isTmdbConfigured()) {
    warnMockOnce();
    const q = query.toLowerCase();
    return MOCK_MOVIES.filter(
      (m) => m.title.toLowerCase().includes(q) || m.original_title.toLowerCase().includes(q)
    );
  }
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/search/movie", {
    query,
    language: "id-ID",
    include_adult: "false",
  });
  return data.results.filter((m) => m.original_language === "id");
}

export async function discoverIndonesian(opts: { page?: number; sort?: "popularity.desc" | "release_date.desc" } = {}): Promise<TmdbMovie[]> {
  if (!isTmdbConfigured()) {
    warnMockOnce();
    return MOCK_MOVIES;
  }
  const data = await tmdbFetch<{ results: TmdbMovie[] }>("/discover/movie", {
    with_original_language: "id",
    sort_by: opts.sort ?? "popularity.desc",
    page: opts.page ?? 1,
    "vote_count.gte": 5,
  });
  return data.results;
}

export async function getMovie(tmdbId: number): Promise<TmdbMovieDetail | null> {
  if (!isTmdbConfigured()) {
    warnMockOnce();
    return MOCK_MOVIES.find((m) => m.id === tmdbId) ?? null;
  }
  try {
    return await tmdbFetch<TmdbMovieDetail>(`/movie/${tmdbId}`, {
      language: "id-ID",
      append_to_response: "credits",
    });
  } catch (err) {
    console.error("[tmdb] getMovie failed", tmdbId, err);
    return null;
  }
}
