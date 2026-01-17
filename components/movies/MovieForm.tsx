// components/Movies/MovieAddForm.tsx
"use client";
import React, { useState } from "react";
import { Loader2, ExternalLink, Tv, Search } from "lucide-react";
import { AddButton, CancelButton } from "../CommonButtons";

interface MovieAddFormProps {
  onSubmit: (movie: NewMovieData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export interface NewMovieData {
  title: string;
  genre: string | null;
  rating: number | null;
  platform: string | null;
  description: string | null;
}

// TMDB Genre mapping
const GENRE_MAP: { [key: number]: string } = {
  28: "Akcja",
  12: "Przygodowy",
  16: "Animacja",
  35: "Komedia",
  80: "Kryminalny",
  99: "Dokumentalny",
  18: "Dramat",
  10751: "Familijny",
  14: "Fantasy",
  36: "Historyczny",
  27: "Horror",
  10402: "Musical",
  9648: "Tajemnica",
  10749: "Romans",
  878: "Sci-Fi",
  10770: "Film TV",
  53: "Thriller",
  10752: "Wojenny",
  37: "Western",
};

// Streaming provider logos (using TMDB logo URLs)
const PROVIDER_LOGOS: { [key: string]: string } = {
  "Netflix": "https://image.tmdb.org/t/p/original/9A1JSVmSxsyaBK4SUFsYVqbAYfW.jpg",
  "Amazon Prime Video": "https://image.tmdb.org/t/p/original/68MNrwlkpF7WnmNPXLah69CR5cb.jpg",
  "Disney Plus": "https://image.tmdb.org/t/p/original/7rwgEs15tFwyR9NPQ5vpzxTj19Q.jpg",
  "HBO Max": "https://image.tmdb.org/t/p/original/Ajqyt5aNxNGjmF9uOfxArGrdf3X.jpg",
  "Apple TV Plus": "https://image.tmdb.org/t/p/original/6uhKBfmtzFqOcLousHwZuzcrScK.jpg",
  "SkyShowtime": "https://image.tmdb.org/t/p/original/8VCV78prwd9QzZnEm0ReO6bRzIW.jpg",
  "Canal+ Online": "https://image.tmdb.org/t/p/original/dTRbWGJHNew0KOd3p3iqmYOWKdO.jpg",
  "Player": "https://image.tmdb.org/t/p/original/i0JRjpGU7oXQJPLHa1Y7Dqjh5P4.jpg",
  "TVP VOD": "https://image.tmdb.org/t/p/original/x3iLIzatY0NQaIKp8SYqGpHmz8q.jpg",
};

interface StreamingProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
}

export default function MovieAddForm({
  onSubmit,
  onCancel,
  loading = false,
}: MovieAddFormProps) {
  const [formData, setFormData] = useState({
    title: "",
    genre: "",
    rating: "",
    platform: "",
    description: "",
  });

  const [fetchingTMDB, setFetchingTMDB] = useState(false);
  const [movieOptions, setMovieOptions] = useState<any[]>([]);
  const [showOptions, setShowOptions] = useState(false);
  const [streamingProviders, setStreamingProviders] = useState<StreamingProvider[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    await onSubmit({
      title: formData.title,
      genre: formData.genre || null,
      rating: formData.rating ? parseFloat(formData.rating) : null,
      platform: formData.platform || null,
      description: formData.description || null,
    });

    // Reset form
    setFormData({
      title: "",
      genre: "",
      rating: "",
      platform: "",
      description: "",
    });
    setMovieOptions([]);
    setShowOptions(false);
    setStreamingProviders([]);
  };

  const fetchTMDBData = async () => {
    if (!formData.title.trim()) {
      alert("Wprowadź tytuł filmu");
      return;
    }

    setFetchingTMDB(true);
    setShowOptions(false);

    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "8265bd1679663a7ea12ac168da84d2e8";
      
      const response = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(
          formData.title
        )}&language=pl-PL`
      );
      
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        setMovieOptions(data.results.slice(0, 5));
        setShowOptions(true);
      } else {
        alert("Nie znaleziono filmu. Spróbuj innego tytułu.");
      }
    } catch (error) {
      console.error("Błąd podczas pobierania danych z TMDB:", error);
      alert("Błąd podczas pobierania danych. Sprawdź połączenie z internetem.");
    } finally {
      setFetchingTMDB(false);
    }
  };

  const selectMovie = async (movie: any) => {
    setFetchingTMDB(true);

    try {
      const apiKey = process.env.NEXT_PUBLIC_TMDB_API_KEY || "8265bd1679663a7ea12ac168da84d2e8";
      
      // Fetch detailed info for selected movie
      const detailsResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}?api_key=${apiKey}&language=pl-PL`
      );
      const details = await detailsResponse.json();

      // Fetch streaming availability (watch providers)
      const providersResponse = await fetch(
        `https://api.themoviedb.org/3/movie/${movie.id}/watch/providers?api_key=${apiKey}`
      );
      const providersData = await providersResponse.json();

      // Get providers for Poland (PL)
      const plProviders = providersData.results?.PL;
      let providers: StreamingProvider[] = [];
      let platformNames: string[] = [];

      if (plProviders) {
        // Combine flatrate (subscription) and rent/buy providers
        const flatrate = plProviders.flatrate || [];
        const rent = plProviders.rent || [];
        const buy = plProviders.buy || [];
        
        // Use flatrate primarily, as these are subscriptions
        providers = flatrate.length > 0 ? flatrate : [...rent, ...buy];
        
        // Remove duplicates by provider_id
        providers = Array.from(
          new Map(providers.map(p => [p.provider_id, p])).values()
        );
        
        platformNames = providers.map(p => p.provider_name);
      }

      setStreamingProviders(providers);

      // Map genre IDs to names
      const genres = details.genres
        ? details.genres.map((g: any) => g.name).join(", ")
        : movie.genre_ids?.map((id: number) => GENRE_MAP[id] || "").filter(Boolean).join(", ") || "";

      setFormData((prev) => ({
        ...prev,
        title: movie.title,
        genre: genres,
        rating: movie.vote_average 
          ? (movie.vote_average).toFixed(1)
          : prev.rating,
        platform: platformNames.length > 0 
          ? platformNames.join(", ")
          : "",
        description: movie.overview || prev.description,
      }));

      setShowOptions(false);
      setMovieOptions([]);
    } catch (error) {
      console.error("Błąd podczas pobierania szczegółów filmu:", error);
    } finally {
      setFetchingTMDB(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="mb-6 p-6 bg-white border border-gray-200 rounded-xl shadow-sm"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tytuł z przyciskiem fetch */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tytuł:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setShowOptions(false);
                setStreamingProviders([]);
              }}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="Np. Moonlight"
            />
            
          </div>
        </div>
        <button
              type="button"
              onClick={fetchTMDBData}
              disabled={fetchingTMDB || !formData.title.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {fetchingTMDB ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Szukam...
                </>
              ) : (
                <span className="flex w-full justify-center items-center gap-2">
                  Szukaj w TMDB
                  <Search className="w-4 h-4" />
                </span>
              )}
        </button>       

        {/* Movie options dropdown */}
        {showOptions && movieOptions.length > 0 && (
          <div className="md:col-span-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              Wybierz z wyników ({movieOptions.length}):
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {movieOptions.map((movie) => (
                <button
                  key={movie.id}
                  type="button"
                  onClick={() => selectMovie(movie)}
                  className="w-full text-left p-3 bg-white hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-300"
                >
                  <div className="flex gap-3">
                    {movie.poster_path && (
                      <img
                        src={`https://image.tmdb.org/t/p/w92${movie.poster_path}`}
                        alt={movie.title}
                        className="w-12 h-18 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">
                        {movie.title}
                        {movie.release_date && (
                          <span className="text-gray-500 font-normal">
                            {" "}({movie.release_date.split("-")[0]})
                          </span>
                        )}
                      </p>
                      {movie.vote_average > 0 && (
                        <p className="text-sm text-yellow-600">
                          ⭐ {movie.vote_average.toFixed(1)}/10
                        </p>
                      )}
                      {movie.overview && (
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {movie.overview}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setShowOptions(false);
                setMovieOptions([]);
              }}
              className="mt-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Zamknij wyniki
            </button>
          </div>
        )}

        {/* Gatunek */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Gatunek:
          </label>
          <input
            type="text"
            value={formData.genre}
            onChange={(e) =>
              setFormData({ ...formData, genre: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Np. Dramat, Romans"
          />
        </div>

        {/* Ocena */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ocena (0-10):
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={formData.rating}
            onChange={(e) =>
              setFormData({ ...formData, rating: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="7.5"
          />
        </div>

        {/* Dostępność */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dostępność:
          </label>
          <input
            type="text"
            value={formData.platform}
            onChange={(e) =>
              setFormData({ ...formData, platform: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            placeholder="Np. Netflix, HBO Max (wypełni się automatycznie)"
          />
        </div>

        {/* Opis */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Opis:
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
            rows={3}
            placeholder="Krótki opis filmu..."
          />
        </div>
      </div>

      {/* Przyciski */}
      <div className="flex gap-2 mt-4">
        <AddButton loading={loading} type="submit" />
        <CancelButton onCancel={onCancel} loading={loading} />
      </div>
    </form>
  );
}