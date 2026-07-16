// pages/api/google-places.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePlaceTags } from '@/lib/placeTagging';
import { createServerSupabase } from '@/lib/supabase/server';
import { GoogleFindPlaceResponse, GoogleNearbyResponse, GooglePlaceDetailsResponse } from '@/types/googlePlaces';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export function parseLatLng(rawLat: unknown, rawLng: unknown): { lat: number; lng: number } | null {
  if (Array.isArray(rawLat) || Array.isArray(rawLng) || typeof rawLat !== 'string' || typeof rawLng !== 'string') {
    return null;
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

export function parseSingleString(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  return raw;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  
  const supabase = createServerSupabase(req, res);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return res
      .status(401)
      .json({ error: 'Unauthorized — valid Supabase session required' });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    return res
      .status(500)
      .json({ error: 'Google Places API key is not configured on the server' });
  }

  const { lat, lng, name } = req.query;

  const coords = parseLatLng(lat, lng);
  const placeName = parseSingleString(name);

  if (!placeName || !coords) {
    return res
      .status(400)
      .json({ error: 'Query params name, lat, and lng are all required, lat/lng muszą być liczbami (lat: -90..90, lng: -180..180)' });
  }

  try {
    let finalPlaceId: string | null = null;

    const findPlaceUrl = new URL('https://maps.googleapis.com/maps/api/place/findplacefromtext/json');
    findPlaceUrl.searchParams.set('input', placeName);
    findPlaceUrl.searchParams.set('inputtype', 'textquery');
    findPlaceUrl.searchParams.set('fields', 'place_id,name');
    findPlaceUrl.searchParams.set('locationbias', `circle:100@${coords.lat},${coords.lng}`);
    findPlaceUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    const findResponse = await fetch(findPlaceUrl.toString());
    const findData: GoogleFindPlaceResponse = await findResponse.json();

    if (findData.status === 'OK' && findData.candidates && findData.candidates.length > 0) {
      finalPlaceId = findData.candidates[0].place_id;
    } else {
      const nearbyUrl = new URL('https://maps.googleapis.com/maps/api/place/nearbysearch/json');
      nearbyUrl.searchParams.set('location', `${coords.lat},${coords.lng}`);
      nearbyUrl.searchParams.set('radius', '100');
      nearbyUrl.searchParams.set('keyword', placeName);
      nearbyUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

      const nearbyResponse = await fetch(nearbyUrl.toString());
      const nearbyData: GoogleNearbyResponse = await nearbyResponse.json();

      if (nearbyData.status === 'OK' && nearbyData.results && nearbyData.results.length > 0) {
        const nameLower = placeName.toLowerCase();
        const bestMatch =
          nearbyData.results.find(
            (r) =>
              r.name.toLowerCase().includes(nameLower) ||
              nameLower.includes(r.name.toLowerCase())
          ) ?? nearbyData.results[0];

        finalPlaceId = bestMatch.place_id;
      }
    }

    if (!finalPlaceId) {
      console.warn(`[google-places] Could not find: "${placeName}" at ${coords.lat},${coords.lng}`);

      const tags = await generatePlaceTags(placeName);
      return res.status(404).json({
        error: 'Place not found in Google Places',
        name: placeName,
        lat: coords.lat,
        lng: coords.lng,
        suggested_tags: tags,
      });
    }

    const detailsUrl = new URL('https://maps.googleapis.com/maps/api/place/details/json');
    detailsUrl.searchParams.set('place_id', finalPlaceId);
    detailsUrl.searchParams.set(
      'fields',
      'name,formatted_phone_number,website,rating,opening_hours,place_id,url,types,price_level,editorial_summary,vicinity'
    );
    detailsUrl.searchParams.set('key', GOOGLE_PLACES_API_KEY);

    const detailsResponse = await fetch(detailsUrl.toString());
    const detailsData: GooglePlaceDetailsResponse = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      return res.status(400).json({
        error: detailsData.status,
        message: detailsData.error_message || 'Failed to fetch place details',
      });
    }

    const autoTags = await generatePlaceTags(placeName, detailsData.result);

    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.status(200).json({ ...detailsData, auto_tags: autoTags });
  } catch {
    return res.status(500).json({ error: "Wystąpił błąd Google Places" });
  }
}