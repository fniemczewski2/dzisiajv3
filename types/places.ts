
export interface OpeningHours {
  [key: string]: string[];
}

export interface Place {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  tags: string[];
  phone_number?: string;
  website?: string;
  rating?: number;
  notes?: string;
  google_place_id?: string;
  opening_hours?: OpeningHours;
  created_at: string;
  updated_at: string;
}

export interface GoogleMapsFeature {
  geometry: {
    coordinates: [number, number];
    type: string;
  };
  properties: {
    date?: string;
    google_maps_url?: string;
    location?: {
      address?: string;
      country_code?: string;
      name?: string;
    };
    Comment?: string;
  };
  type: string;
}

export interface GoogleMapsExport {
  type: string;
  features: GoogleMapsFeature[];
}

export type PlaceInsert = Omit<Place, "id" | "created_at" | "updated_at">;

export type ViewMode = "list" | "map";

export interface TimeFilter {
  day: number;
  startTime: string;
  endTime: string;
}