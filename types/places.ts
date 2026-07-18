
export interface OpeningHours {
  [key: string]: string[];
}

export interface GoogleMapsImportFeature {
  properties?: {
    location?: {
      name?: string;
      address?: string;
    };
  };
  geometry?: {
    coordinates?: [number, number];
  };
}

export interface GoogleMapsImportData {
  features?: GoogleMapsImportFeature[];
}

export interface Place {
  id: string;
  user_id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  tags: string[];
  phone_number?: string | null;
  website?: string | null;
  rating?: number | null;
  notes?: string | null;
  google_place_id?: string;
  opening_hours?: OpeningHours | null;
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