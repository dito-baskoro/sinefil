/**
 * DB row types — hand-authored for MVP.
 * Replace with `supabase gen types typescript --linked > lib/database.types.ts` after Supabase is provisioned.
 */

export type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
};

export type Movie = {
  id: number;
  tmdb_id: number;
  title: string;
  original_title: string | null;
  overview: string | null;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: string[];
  language: string | null;
  synced_at: string;
};

export type Review = {
  id: string;
  user_id: string;
  movie_id: number;
  rating: number;
  review_text: string | null;
  contains_spoiler: boolean;
  created_at: string;
  updated_at: string;
};

export type WatchlistStatus = "want_to_watch" | "watched";

export type WatchlistEntry = {
  id: string;
  user_id: string;
  movie_id: number;
  status: WatchlistStatus;
  created_at: string;
};

export type FamilyMetricKey =
  | "family_safe"
  | "awkward_scene_meter"
  | "bapak_ketiduran_probability"
  | "ibu_bakal_komentar_terus"
  | "nangis_meter";

export type FamilyMetrics = {
  id: string;
  review_id: string;
  family_safe: number | null;
  awkward_scene_meter: number | null;
  bapak_ketiduran_probability: number | null;
  ibu_bakal_komentar_terus: number | null;
  nangis_meter: number | null;
};

export type VibeTag = {
  id: number;
  slug: string;
  label_id: string;
  emoji: string | null;
};

export type ReviewVibeTag = {
  review_id: string;
  vibe_tag_id: number;
};

export const FAMILY_METRIC_LABELS: Record<FamilyMetricKey, { label: string; help: string }> = {
  family_safe: {
    label: "Family Safe",
    help: "1 = jangan! · 5 = aman banget",
  },
  awkward_scene_meter: {
    label: "Awkward Scene Meter",
    help: "Adegan yang bikin kamu mau pura-pura ke dapur",
  },
  bapak_ketiduran_probability: {
    label: "Bapak Ketiduran Probability",
    help: "Berapa besar kemungkinan Bapak ketiduran",
  },
  ibu_bakal_komentar_terus: {
    label: "Ibu Bakal Komentar Terus",
    help: "Frekuensi komentar Ibu sepanjang film",
  },
  nangis_meter: {
    label: "Nangis Meter",
    help: "Tarik tisu sebanyak ini",
  },
};

export const FAMILY_METRIC_KEYS: FamilyMetricKey[] = [
  "family_safe",
  "awkward_scene_meter",
  "bapak_ketiduran_probability",
  "ibu_bakal_komentar_terus",
  "nangis_meter",
];
