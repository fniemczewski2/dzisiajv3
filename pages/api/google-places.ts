// pages/api/google-places.ts

import { createServerClient } from '@supabase/ssr';
import type { NextApiRequest, NextApiResponse } from 'next';
import { generatePlaceTags } from '../../lib/placeTagging';

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

async function getAuthenticatedUser(req: NextApiRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) return null;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => {
        return Object.entries(req.cookies ?? {}).map(([name, value]) => ({
          name,
          value: value ?? '',
        }));
      },
      setAll: () => {
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
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

  if (!name || !lat || !lng) {
    return res
      .status(400)
      .json({ error: 'Query params name, lat, and lng are all required' });
  }

  try {
    let finalPlaceId: string | null = null;

    const findPlaceUrl =
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
      `?input=${encodeURIComponent(name as string)}` +
      `&inputtype=textquery` +
      `&fields=place_id,name` +
      `&locationbias=circle:100@${lat},${lng}` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();

    if (findData.status === 'OK' && findData.candidates?.length > 0) {
      finalPlaceId = findData.candidates[0].place_id;
    } else {
      const nearbyUrl =
        `https://maps.googleapis.com/maps/api/place/nearbysearch/json` +
        `?location=${lat},${lng}` +
        `&radius=100` +
        `&keyword=${encodeURIComponent(name as string)}` +
        `&key=${GOOGLE_PLACES_API_KEY}`;

      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();

      if (nearbyData.status === 'OK' && nearbyData.results?.length > 0) {
        const nameLower = (name as string).toLowerCase();
        const bestMatch =
          nearbyData.results.find(
            (r: { name: string }) =>
              r.name.toLowerCase().includes(nameLower) ||
              nameLower.includes(r.name.toLowerCase())
          ) || nearbyData.results[0];

        finalPlaceId = bestMatch.place_id;
      }
    }

    if (!finalPlaceId) {
      console.warn(`[google-places] Could not find: "${name}" at ${lat},${lng}`);

      const tags = await generatePlaceTags(name as string);
      return res.status(404).json({
        error: 'Place not found in Google Places',
        name,
        lat,
        lng,
        suggested_tags: tags,
      });
    }

    const detailsUrl =
      `https://maps.googleapis.com/maps/api/place/details/json` +
      `?place_id=${finalPlaceId}` +
      `&fields=name,formatted_phone_number,website,rating,opening_hours,place_id,url,types,price_level,editorial_summary,vicinity` +
      `&key=${GOOGLE_PLACES_API_KEY}`;

    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== 'OK') {
      return res.status(400).json({
        error: detailsData.status,
        message: detailsData.error_message || 'Failed to fetch place details',
      });
    }

    const autoTags = await generatePlaceTags(name as string, detailsData.result);

    res.setHeader('Cache-Control', 'private, max-age=3600'); 
    return res.status(200).json({ ...detailsData, auto_tags: autoTags });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[google-places] Unexpected error:', message);
    return res
      .status(500)
      .json({ error: 'Failed to fetch place details', message });
  }
}