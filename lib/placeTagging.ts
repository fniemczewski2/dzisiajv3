// lib/placeTagging.ts

/**
 * Comprehensive tag mapping system for automatic place categorization
 */

// Mapping Google Place types to our custom tags
export const GOOGLE_TYPE_TO_TAGS: Record<string, string[]> = {
  // Food & Dining
  restaurant: ["restauracja"],
  cafe: ["kawiarnia"],
  bar: ["bar"],
  bakery: ["piekarnia", "wypieki"],
  meal_takeaway: ["na wynos"],
  meal_delivery: ["dostawa"],
  food: ["fast food"],
  
  // Cuisine types
  italian_restaurant: ["włoskie", "restauracja"],
  chinese_restaurant: ["chińskie", "restauracja"],
  japanese_restaurant: ["japońskie", "sushi", "restauracja"],
  indian_restaurant: ["indyjskie", "curry", "restauracja"],
  mexican_restaurant: ["meksykańskie", "tacos", "burrito", "restauracja"],
  french_restaurant: ["francuskie", "restauracja"],
  spanish_restaurant: ["hiszpańskie", "tapas", "restauracja"],
  greek_restaurant: ["greckie", "restauracja"],
  thai_restaurant: ["tajskie", "restauracja"],
  korean_restaurant: ["koreańskie", "restauracja"],
  vietnamese_restaurant: ["wietnamskie", "restauracja"],
  turkish_restaurant: ["tureckie", "kebab", "restauracja"],
  
  // Drinks
  night_club: ["klub", "imprezowo"],
  liquor_store: ["alkohol"],
  wine_bar: ["winiarnia", "wino"],
  
  // Entertainment
  movie_theater: ["kino"],
  museum: ["muzeum"],
  art_gallery: ["galeria sztuki", "wystawy"],
  theater: ["teatr"],
  
  // Shopping
  store: ["sklep"],
  supermarket: ["delikatesy"],
  convenience_store: ["sklep"],
  
  // Health & Wellness
  gym: ["fit"],
  spa: ["wellness"],
  
  // Services
  lodging: ["hotel"],
  parking: ["parking"],
};

// Keywords in place name/description to tag mapping
export const KEYWORD_TO_TAGS: Record<string, string[]> = {
  // Cuisine keywords
  pizza: ["pizza", "włoskie"],
  pasta: ["makaron", "włoskie"],
  sushi: ["sushi", "japońskie"],
  ramen: ["ramen", "japońskie"],
  burger: ["burger", "amerykańskie"],
  kebab: ["kebab", "tureckie"],
  steak: ["steki"],
  taco: ["tacos", "meksykańskie"],
  burrito: ["burrito", "meksykańskie"],
  falafel: ["falafel", "bliskowschodnie"],
  hummus: ["hummus", "bliskowschodnie"],
  curry: ["curry", "indyjskie"],
  poke: ["hawajskie"],
  pierogi: ["pierogi", "polskie"],
  naleśniki: ["naleśniki"],
  
  // Dietary
  vegan: ["vegan", "roślinne"],
  wege: ["wege", "roślinne"],
  vegetarian: ["wege", "roślinne"],
  "gluten free": ["bezglutenowe", "glutenfree"],
  bezglutenowe: ["bezglutenowe", "glutenfree"],
  "bez laktozy": ["bez laktozy"],
  keto: ["keto"],
  fit: ["fit", "zdrowe"],
  healthy: ["zdrowe", "fit"],
  organic: ["zdrowe"],
  
  // Meal types
  śniadanie: ["śniadania"],
  breakfast: ["śniadania"],
  brunch: ["brunch"],
  lunch: ["lunch menu"],
  
  // Venue types
  bistro: ["bistro"],
  "bar mleczny": ["bar mleczny", "budżetowo"],
  "food truck": ["food truck", "street food"],
  cukiernia: ["cukiernia", "desery"],
  lodziarnia: ["lody"],
  piekarnia: ["piekarnia", "wypieki"],
  winiarnia: ["winiarnia", "wino"],
  pub: ["pub"],
  "craft beer": ["kraftowe piwo"],
  kraftowe: ["kraftowe piwo"],
  "specialty coffee": ["speciality coffee", "kawa"],
  kawa: ["kawa", "kawiarnia"],
  
  // Atmosphere
  romantic: ["romantycznie", "randkowo"],
  family: ["rodzinnie", "dzieci-friendly"],
  pet: ["pet-friendly"],
  hipster: ["hipstersko"],
  elegant: ["elegancko"],
  casual: ["casual"],
  rooftop: ["rooftop", "z widokiem"],
  
  // Features
  laptop: ["laptop-friendly", "praca zdalna"],
  coworking: ["praca zdalna", "laptop-friendly"],
  "live music": ["klub muzyczny", "koncerty"],
  music: ["bar muzyczny"],
  "stand up": ["stand-up"],
  wystawa: ["wystawy"],
  warsztat: ["warsztaty"],
  
  // Special
  "24": ["24h"],
  "24h": ["24h"],
  nocny: ["nocne jedzenie"],
  ogródek: ["ogródek"],
  taras: ["ogródek"],
};

// Price level to tags
export const PRICE_LEVEL_TO_TAGS: Record<number, string[]> = {
  0: ["budżetowo", "tanio"],
  1: ["budżetowo", "tanio"],
  2: ["średnio"],
  3: ["premium", "drogo"],
  4: ["luksusowo", "drogo"],
};

// Rating to tags
export const RATING_TO_TAGS = (rating: number): string[] => {
  const tags: string[] = [];
  if (rating >= 4.5) tags.push("kultowe");
  if (rating >= 4.0) tags.push("polecane");
  return tags;
};

/**
 * Extract tags from Google Place data
 */
export function extractTagsFromGooglePlace(placeData: any): string[] {
  const tags = new Set<string>();
  
  // 1. Extract from Google Place types
  if (placeData.types && Array.isArray(placeData.types)) {
    placeData.types.forEach((type: string) => {
      const mappedTags = GOOGLE_TYPE_TO_TAGS[type];
      if (mappedTags) {
        mappedTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
      }
    });
  }
  
  // 2. Extract from name and editorial summary
  const searchText = [
    placeData.name || "",
    placeData.editorial_summary?.overview || "",
    placeData.vicinity || "",
  ].join(" ").toLowerCase();
  
  Object.entries(KEYWORD_TO_TAGS).forEach(([keyword, tagList]) => {
    if (searchText.includes(keyword.toLowerCase())) {
      tagList.forEach(tag => tags.add(tag.toLowerCase().trim()));
    }
  });
  
  // 3. Extract from price level
  if (typeof placeData.price_level === "number") {
    const priceTags = PRICE_LEVEL_TO_TAGS[placeData.price_level];
    if (priceTags) {
      priceTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
    }
  }
  
  // 4. Extract from rating
  if (typeof placeData.rating === "number") {
    const ratingTags = RATING_TO_TAGS(placeData.rating);
    ratingTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
  }
  
  // 5. Opening hours analysis
  if (placeData.opening_hours) {
    if (placeData.opening_hours.periods) {
      const has24h = placeData.opening_hours.periods.some(
        (p: any) => !p.close
      );
      if (has24h) tags.add("24h");
    }
  }
  
  return Array.from(tags).filter(tag => tag.length > 0);
}

/**
 * Analyze place name for additional context
 */
export function analyzeNameForTags(name: string): string[] {
  const tags = new Set<string>();
  const lowerName = name.toLowerCase();
  
  // Chain detection
  const chains = [
    { keywords: ["mcdonald", "kfc", "burger king", "subway"], tags: ["sieciówka", "fast food"] },
    { keywords: ["starbucks", "costa coffee"], tags: ["sieciówka", "kawiarnia"] },
  ];
  
  chains.forEach(chain => {
    if (chain.keywords.some(k => lowerName.includes(k))) {
      chain.tags.forEach(tag => tags.add(tag.toLowerCase().trim()));
    }
  });
  
  // Local/independent detection
  if (!lowerName.match(/mcdonald|kfc|burger king|starbucks|costa|subway/)) {
    tags.add("lokalne");
  }
  
  return Array.from(tags).filter(tag => tag.length > 0);
}

/**
 * Main function to generate tags for a place
 * Automatically removes duplicates and returns unique tags
 */
export async function generatePlaceTags(
  placeName: string,
  googlePlaceData?: any
): Promise<string[]> {
  const allTags = new Set<string>();
  
  // Tags from Google data
  if (googlePlaceData) {
    const googleTags = extractTagsFromGooglePlace(googlePlaceData);
    googleTags.forEach(tag => allTags.add(tag.toLowerCase().trim()));
  }
  
  // Tags from name analysis
  const nameTags = analyzeNameForTags(placeName);
  nameTags.forEach(tag => allTags.add(tag.toLowerCase().trim()));
  
  // Tags from name keywords (even without Google data)
  const lowerName = placeName.toLowerCase();
  Object.entries(KEYWORD_TO_TAGS).forEach(([keyword, tagList]) => {
    if (lowerName.includes(keyword.toLowerCase())) {
      tagList.forEach(tag => allTags.add(tag.toLowerCase().trim()));
    }
  });
  
  // Convert to array and remove empty strings
  const uniqueTags = Array.from(allTags).filter(tag => tag.length > 0);
  
  // Sort alphabetically for consistency
  return uniqueTags.sort((a, b) => a.localeCompare(b, 'pl'));
}