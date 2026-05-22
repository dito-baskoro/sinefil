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
  location: string | null;
  is_admin: boolean;
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
  | "ketiduran_probability"
  | "nangis_meter";

export type FamilyMetrics = {
  id: string;
  review_id: string;
  family_safe: number | null;
  awkward_scene_meter: number | null;
  ketiduran_probability: number | null;
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

export type ReactionKind = "ngakak" | "relatable" | "ngadi_ngadi" | "gas" | "bosen";

export type ReviewReaction = {
  review_id: string;
  user_id: string;
  kind: ReactionKind;
  created_at: string;
};

export type ReviewComment = {
  id: string;
  review_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
};

export const REACTION_KINDS: { kind: ReactionKind; emoji: string; label: string }[] = [
  { kind: "ngakak",       emoji: "😂", label: "Ngakak" },
  { kind: "relatable",    emoji: "💯", label: "Relatable" },
  { kind: "ngadi_ngadi",  emoji: "🤨", label: "Ngadi-ngadi" },
  { kind: "gas",          emoji: "🔥", label: "Gas tonton" },
  { kind: "bosen",        emoji: "😴", label: "Bosen" },
];

export type Follow = {
  follower_id: string;
  followee_id: string;
  created_at: string;
};

export type ProfileFavorite = {
  user_id: string;
  movie_id: number;
  position: number;
  created_at: string;
};

export type List = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type ListItem = {
  list_id: string;
  movie_id: number;
  position: number;
  note: string | null;
  added_at: string;
};

export type FeedEvent =
  | {
      kind: "review";
      at: string;
      actor: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
      review: Pick<Review, "id" | "rating" | "review_text" | "contains_spoiler" | "created_at">;
      movie: Pick<Movie, "id" | "tmdb_id" | "title" | "poster_path" | "release_date">;
      vibes: VibeTag[];
    }
  | {
      kind: "list";
      at: string;
      actor: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
      list: Pick<List, "id" | "title" | "description" | "created_at">;
      item_count: number;
      preview_posters: string[];
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
  ketiduran_probability: {
    label: "Ketiduran Probability",
    help: "Berapa besar kemungkinan ketiduran di tengah film",
  },
  nangis_meter: {
    label: "Nangis Meter",
    help: "Tarik tisu sebanyak ini",
  },
};

export const FAMILY_METRIC_KEYS: FamilyMetricKey[] = [
  "family_safe",
  "awkward_scene_meter",
  "ketiduran_probability",
  "nangis_meter",
];
