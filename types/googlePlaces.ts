
interface GoogleFindPlaceCandidate {
  place_id: string;
  name: string;
}

export interface GoogleFindPlaceResponse {
  status: string;
  candidates?: GoogleFindPlaceCandidate[];
}

interface GoogleNearbyResult {
  place_id: string;
  name: string;
}

export interface GoogleNearbyResponse {
  status: string;
  results?: GoogleNearbyResult[];
}

export interface GooglePlaceDetailsResult {
  name?: string;
  formatted_phone_number?: string;
  website?: string;
  rating?: number;
  opening_hours?: { periods?: { open?: { time?: string }; close?: unknown }[] };
  place_id?: string;
  url?: string;
  types?: string[];
  price_level?: number;
  editorial_summary?: { overview?: string };
  vicinity?: string;
}

export interface GooglePlaceDetailsResponse {
  status: string;
  error_message?: string;
  result?: GooglePlaceDetailsResult;
}
