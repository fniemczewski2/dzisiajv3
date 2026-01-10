import type { NextApiRequest, NextApiResponse } from "next";

const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { lat, lng, name } = req.query;

  if (!GOOGLE_PLACES_API_KEY) {
    console.error("GOOGLE_PLACES_API_KEY is not configured");
    return res.status(500).json({ error: "API key not configured" });
  }

  if (!name || !lat || !lng) {
    return res.status(400).json({ error: "Name, latitude and longitude are required" });
  }

  try {
    let finalPlaceId: string | null = null;

    const findPlaceUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(name as string)}&inputtype=textquery&fields=place_id,name&locationbias=circle:100@${lat},${lng}&key=${GOOGLE_PLACES_API_KEY}`;

    const findResponse = await fetch(findPlaceUrl);
    const findData = await findResponse.json();
    
    if (findData.status === "OK" && findData.candidates?.length > 0) {
      finalPlaceId = findData.candidates[0].place_id;
     
    } else {
      const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=100&keyword=${encodeURIComponent(name as string)}&key=${GOOGLE_PLACES_API_KEY}`;

      const nearbyResponse = await fetch(nearbyUrl);
      const nearbyData = await nearbyResponse.json();
      
      if (nearbyData.status === "OK" && nearbyData.results?.length > 0) {
        const bestMatch = nearbyData.results.find((r: any) => 
          r.name.toLowerCase().includes((name as string).toLowerCase()) ||
          (name as string).toLowerCase().includes(r.name.toLowerCase())
        ) || nearbyData.results[0];
        
        finalPlaceId = bestMatch.place_id;
      } 
    }

    if (!finalPlaceId) {
      console.warn(`Could not find place: "${name}" at ${lat},${lng}`);
      return res.status(404).json({ 
        error: "Place not found",
        name,
        lat,
        lng
      });
    }

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${finalPlaceId}&fields=name,formatted_phone_number,website,rating,opening_hours,place_id,url&key=${GOOGLE_PLACES_API_KEY}`;
    
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    if (detailsData.status !== "OK") {
      console.error(`Google Places API error: ${detailsData.status}`, detailsData.error_message);
      return res.status(400).json({ 
        error: detailsData.status, 
        message: detailsData.error_message || "Failed to fetch place details" 
      });
    }
   
    res.status(200).json(detailsData);

  } catch (error: any) {
    console.error("Error fetching place details:", error);
    res.status(500).json({ 
      error: "Failed to fetch place details",
      message: error.message 
    });
  }
}