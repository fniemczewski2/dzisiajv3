// components/movies/MovieForm.tsx

import React, { useRef, useState } from "react";
import Image from "next/image";
import { Film, Loader2, Search, Tv } from "lucide-react";
import { FormButtons } from "../ui/CommonButtons";
import { useToast } from "@/providers/ToastProvider";
import { buildMovieData, fetchMediaDetails, posterUrl, searchMedia } from "@/lib/tmdb";
import { MEDIA_TYPE_LABELS, type MediaSearchResult, type MediaType, type NewMovieData } from "@/types/movies";
import { isAbortError } from "@/lib/abortUtils";

interface MovieAddFormProps {
  onSubmit: (movie: NewMovieData) => Promise<boolean>;
  onCancel: () => void;
  loading?: boolean;
}

type SearchFilter = MediaType | "all";

const FILTERS: { value: SearchFilter; label: string }[] = [
  { value: "all", label: "Wszystko" },
  { value: "movie", label: "Filmy" },
  { value: "tv", label: "Seriale" },
];

interface FormState {
  title: string;
  genre: string;
  rating: string;
  platform: string;
  description: string;
  mediaType: MediaType;
}

const EMPTY_FORM: FormState = { title: "", genre: "", rating: "", platform: "", description: "", mediaType: "movie" };

/** Metadane z TMDB, których użytkownik nie edytuje ręcznie. */
type TmdbMeta = Pick<NewMovieData, "tmdb_id" | "poster_path" | "release_year" | "seasons_count" | "episodes_count" | "series_status">;
const EMPTY_META: TmdbMeta = { tmdb_id: null, poster_path: null, release_year: null, seasons_count: null, episodes_count: null, series_status: null };

export function MediaTypeBadge({ type }: Readonly<{ type: MediaType }>) {
  const Icon = type === "tv" ? Tv : Film;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-surface border border-gray-200 dark:border-gray-700 text-text-secondary">
      <Icon className="w-3 h-3" aria-hidden="true" />
      {MEDIA_TYPE_LABELS[type]}
    </span>
  );
}

export default function MovieAddForm({ onSubmit, onCancel, loading = false }: Readonly<MovieAddFormProps>) {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [meta, setMeta] = useState<TmdbMeta>(EMPTY_META);
  const [filter, setFilter] = useState<SearchFilter>("all");
  const [fetching, setFetching] = useState(false);
  const [tmdbError, setTmdbError] = useState<string | null>(null);
  const [options, setOptions] = useState<MediaSearchResult[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const newSignal = () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  };

  const runSearch = async () => {
    if (!form.title.trim()) return;
    setFetching(true);
    setTmdbError(null);
    setOptions([]);
    try {
      const results = await searchMedia(form.title, filter, newSignal());
      if (results.length > 0) setOptions(results);
      else setTmdbError(`Nie znaleziono ${filter === "tv" ? "serialu" : filter === "movie" ? "filmu" : "filmu ani serialu"}. Spróbuj innego tytułu.`);
    } catch (err) {
      if (!isAbortError(err)) toast.error("Wystąpił błąd wyszukiwania TMDB");
    } finally {
      setFetching(false);
    }
  };

  const selectResult = async (result: MediaSearchResult) => {
    setFetching(true);
    setTmdbError(null);
    try {
      let details = null;
      try {
        details = await fetchMediaDetails(result.mediaType, result.tmdbId, newSignal());
      } catch (err) {
        if (isAbortError(err)) return;
        // Szczegóły są opcjonalne – wypełniamy tym, co dało wyszukiwanie.
        toast.info("Nie udało się pobrać szczegółów – uzupełniono podstawowe dane.");
      }
      const data = buildMovieData(result, details);
      setForm({
        title: data.title,
        genre: data.genre ?? "",
        rating: data.rating?.toFixed(1) ?? "",
        platform: data.platform ?? "",
        description: data.description ?? "",
        mediaType: data.media_type,
      });
      setMeta({
        tmdb_id: data.tmdb_id,
        poster_path: data.poster_path,
        release_year: data.release_year,
        seasons_count: data.seasons_count,
        episodes_count: data.episodes_count,
        series_status: data.series_status,
      });
      setOptions([]);
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;

    const rating = form.rating ? Number.parseFloat(form.rating.replaceAll(",", ".")) : Number.NaN;
    const isTv = form.mediaType === "tv";
    const ok = await onSubmit({
      title: form.title.trim(),
      genre: form.genre.trim() || null,
      rating: Number.isFinite(rating) ? Math.min(10, Math.max(0, rating)) : null,
      platform: form.platform.trim() || null,
      description: form.description.trim() || null,
      media_type: form.mediaType,
      ...meta,
      // Dane serialowe nie mają sensu, jeśli użytkownik przełączył typ na film.
      seasons_count: isTv ? meta.seasons_count : null,
      episodes_count: isTv ? meta.episodes_count : null,
      series_status: isTv ? meta.series_status : null,
    });

    if (ok) {
      setForm(EMPTY_FORM);
      setMeta(EMPTY_META);
      setOptions([]);
      setTmdbError(null);
    }
  };

  const onTitleChange = (value: string) => {
    update("title", value);
    setOptions([]);
    setTmdbError(null);
    // Nowy tytuł = nowa pozycja; stare metadane TMDB przestają pasować.
    if (meta.tmdb_id) setMeta(EMPTY_META);
  };

  const selectedPoster = posterUrl(meta.poster_path, "w92");

  return (
    <form onSubmit={handleSubmit} className="form-card mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
        <div className="md:col-span-2">
          <label htmlFor="new-movie-title" className="form-label">Tytuł:</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="new-movie-title"
              type="text"
              required
              maxLength={300}
              value={form.title}
              onChange={(e) => onTitleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !meta.tmdb_id) { e.preventDefault(); void runSearch(); }
              }}
              className="input-field flex-1"
              placeholder="Np. Moonlight albo Wiedźmin"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={fetching || !form.title.trim()}
              className="px-4 py-2 bg-surface hover:bg-surface-hover text-text shadow border border-gray-200 dark:border-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {fetching ? <><Loader2 className="w-4 h-4 animate-spin" /> Szukam...</> : <>Szukaj w TMDB <Search className="w-4 h-4" /></>}
            </button>
          </div>

          <fieldset className="mt-2 flex flex-wrap gap-1.5">
            <legend className="sr-only">Czego szukać</legend>
            {FILTERS.map((f) => (
              <label key={f.value}
                className={`cursor-pointer px-3 py-1 rounded-full text-xs font-bold border transition-colors ${
                  filter === f.value
                    ? "bg-secondary text-white border-primary"
                    : "bg-surface text-text-secondary border-gray-200 dark:border-gray-700 hover:text-text"
                }`}>
                <input type="radio" name="tmdb-filter" value={f.value} checked={filter === f.value}
                  onChange={() => { setFilter(f.value); setOptions([]); }} className="sr-only" />
                {f.label}
              </label>
            ))}
          </fieldset>

          {tmdbError && <p className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">{tmdbError}</p>}
        </div>

        {options.length > 0 && (
          <div className="md:col-span-2 bg-surface border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <p className="form-label">Wybierz z wyników ({options.length}):</p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
              {options.map((r) => {
                const img = posterUrl(r.posterPath, "w92");
                return (
                  <button key={`${r.mediaType}-${r.tmdbId}`} type="button" onClick={() => selectResult(r)}
                    disabled={fetching}
                    className="w-full text-left p-3 card hover:bg-surface-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60">
                    <div className="flex gap-3">
                      {img ? (
                        <Image src={img} alt="" loading="lazy" width={48} height={72}
                          className="w-12 h-18 object-cover rounded shadow-sm shrink-0" />
                      ) : (
                        <div className="w-12 h-18 rounded bg-surface-hover shrink-0 flex items-center justify-center text-text-muted" aria-hidden="true">
                          {r.mediaType === "tv" ? <Tv className="w-5 h-5" /> : <Film className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <MediaTypeBadge type={r.mediaType} />
                          <p className="font-semibold text-text">
                            {r.title}
                            {r.year && <span className="text-text-muted font-normal"> ({r.year})</span>}
                          </p>
                        </div>
                        {r.rating && <p className="text-sm text-accent mt-0.5">{r.rating.toFixed(1)}/10</p>}
                        {r.overview && <p className="text-xs text-text-secondary mt-1 line-clamp-2">{r.overview}</p>}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <button type="button" onClick={() => setOptions([])}
              className="mt-3 text-sm font-medium text-text-muted hover:text-text transition-colors">
              Zamknij wyniki
            </button>
          </div>
        )}

        {meta.tmdb_id && (
          <div className="md:col-span-2 flex items-center gap-3 p-3 rounded-lg bg-surface border border-gray-200 dark:border-gray-700">
            {selectedPoster && (
              <Image src={selectedPoster} alt="" width={40} height={60} className="w-10 h-15 object-cover rounded shrink-0" />
            )}
            <div className="text-xs text-text-secondary space-y-0.5">
              <p className="font-bold text-text">Uzupełniono z TMDB{meta.release_year ? ` · ${meta.release_year}` : ""}</p>
              {form.mediaType === "tv" && (meta.seasons_count || meta.series_status) && (
                <p>
                  {meta.seasons_count ? `${meta.seasons_count} ${pluralSeasons(meta.seasons_count)}` : ""}
                  {meta.episodes_count ? `, ${meta.episodes_count} odc.` : ""}
                  {meta.series_status ? ` · ${meta.series_status}` : ""}
                </p>
              )}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="new-movie-type" className="form-label">Typ:</label>
          <select id="new-movie-type" value={form.mediaType}
            onChange={(e) => update("mediaType", e.target.value as MediaType)} className="input-field">
            <option value="movie">Film</option>
            <option value="tv">Serial</option>
          </select>
        </div>
        <div>
          <label htmlFor="new-movie-rating" className="form-label">Ocena (0-10):</label>
          <input id="new-movie-rating" type="number" step="0.1" min="0" max="10" value={form.rating}
            onChange={(e) => update("rating", e.target.value)} className="input-field" placeholder="7.5" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="new-movie-genre" className="form-label">Gatunek:</label>
          <input id="new-movie-genre" type="text" value={form.genre} maxLength={200}
            onChange={(e) => update("genre", e.target.value)} className="input-field" placeholder="Np. Dramat, Romans" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="new-movie-platform" className="form-label">Dostępność:</label>
          <input id="new-movie-platform" type="text" value={form.platform} maxLength={300}
            onChange={(e) => update("platform", e.target.value)} className="input-field"
            placeholder="Np. Netflix, HBO Max (wypełni się automatycznie)" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="new-movie-description" className="form-label">Opis:</label>
          <textarea id="new-movie-description" value={form.description} maxLength={5000}
            onChange={(e) => update("description", e.target.value)} className="input-field" rows={3}
            placeholder={form.mediaType === "tv" ? "Krótki opis serialu..." : "Krótki opis filmu..."} />
        </div>
      </div>
      <FormButtons onClickClose={onCancel} loading={loading} />
    </form>
  );
}

export function pluralSeasons(n: number): string {
  if (n === 1) return "sezon";
  const last = n % 10;
  const lastTwo = n % 100;
  if (last >= 2 && last <= 4 && (lastTwo < 12 || lastTwo > 14)) return "sezony";
  return "sezonów";
}
