// lib/placeTagging.ts

export const GOOGLE_TYPE_TO_TAGS: Record<string, string[]> = {

  restaurant: ["restauracja"],
  cafe: ["kawiarnia"],
  bar: ["bar"],
  bakery: ["piekarnia", "wypieki"],
  meal_takeaway: ["na wynos"],
  meal_delivery: ["dostawa"],
  food: ["fast food"],
  
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
  
  night_club: ["klub", "imprezowo"],
  liquor_store: ["alkohol"],
  wine_bar: ["winiarnia", "wino"],
  
  movie_theater: ["kino"],
  museum: ["muzeum"],
  art_gallery: ["galeria sztuki", "wystawy"],
  theater: ["teatr"],
  
  store: ["sklep"],
  supermarket: ["delikatesy"],
  convenience_store: ["sklep"],
  
  gym: ["fit"],
  spa: ["wellness"],
  
  lodging: ["hotel"],
  parking: ["parking"],
};

export const KEYWORD_TO_TAGS: Record<string, string[]> = {
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
  
  śniadanie: ["śniadania"],
  breakfast: ["śniadania"],
  brunch: ["brunch"],
  lunch: ["lunch menu"],
  
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
  
  romantic: ["romantycznie", "randkowo"],
  family: ["rodzinnie", "dzieci-friendly"],
  pet: ["pet-friendly"],
  hipster: ["hipstersko"],
  elegant: ["elegancko"],
  casual: ["casual"],
  rooftop: ["rooftop", "z widokiem"],
  
  laptop: ["laptop-friendly", "praca zdalna"],
  coworking: ["praca zdalna", "laptop-friendly"],
  "live music": ["klub muzyczny", "koncerty"],
  music: ["bar muzyczny"],
  "stand up": ["stand-up"],
  wystawa: ["wystawy"],
  warsztat: ["warsztaty"],
  
  "24": ["24h"],
  "24h": ["24h"],
  nocny: ["nocne jedzenie"],
  ogródek: ["ogródek"],
  taras: ["ogródek"],
};

export const PRICE_LEVEL_TO_TAGS: Record<number, string[]> = {
  0: ["budżetowo", "tanio"],
  1: ["budżetowo", "tanio"],
  2: ["średnio"],
  3: ["premium", "drogo"],
  4: ["luksusowo", "drogo"],
};

export const RATING_TO_TAGS = (rating: number): string[] => {
  const tags: string[] = [];
  if (rating >= 4.5) tags.push("kultowe");
  if (rating >= 4) tags.push("polecane");
  return tags;
};

export function extractTagsFromGooglePlace(placeData: any): string[] {
  const tags = new Set<string>();
  
  if (placeData.types && Array.isArray(placeData.types)) {
    placeData.types.forEach((type: string) => {
      const mappedTags = GOOGLE_TYPE_TO_TAGS[type];
      if (mappedTags) {
        mappedTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
      }
    });
  }
  
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
  
  if (typeof placeData.price_level === "number") {
    const priceTags = PRICE_LEVEL_TO_TAGS[placeData.price_level];
    if (priceTags) {
      priceTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
    }
  }
  
  if (typeof placeData.rating === "number") {
    const ratingTags = RATING_TO_TAGS(placeData.rating);
    ratingTags.forEach(tag => tags.add(tag.toLowerCase().trim()));
  }
  
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

export function analyzeNameForTags(name: string): string[] {
  const tags = new Set<string>();
  const lowerName = name.toLowerCase();

  const chains = [
    { keywords: ["mcdonald", "kfc", "burger king", "subway"], tags: ["sieciówka", "fast food"] },
    { keywords: ["starbucks", "costa coffee"], tags: ["sieciówka", "kawiarnia"] },
  ];
  
  chains.forEach(chain => {
    if (chain.keywords.some(k => lowerName.includes(k))) {
      chain.tags.forEach(tag => tags.add(tag.toLowerCase().trim()));
    }
  });
  
  if (!lowerName.match(/mcdonald|kfc|burger king|starbucks|costa|subway/)) {
    tags.add("lokalne");
  }
  
  return Array.from(tags).filter(tag => tag.length > 0);
}

export async function generatePlaceTags(
  placeName: string,
  googlePlaceData?: any
): Promise<string[]> {
  const allTags = new Set<string>();

  if (googlePlaceData) {
    const googleTags = extractTagsFromGooglePlace(googlePlaceData);
    googleTags.forEach(tag => allTags.add(tag.toLowerCase().trim()));
  }

  const nameTags = analyzeNameForTags(placeName);
  nameTags.forEach(tag => allTags.add(tag.toLowerCase().trim()));

  const lowerName = placeName.toLowerCase();
  Object.entries(KEYWORD_TO_TAGS).forEach(([keyword, tagList]) => {
    if (lowerName.includes(keyword.toLowerCase())) {
      tagList.forEach(tag => allTags.add(tag.toLowerCase().trim()));
    }
  });

  const uniqueTags = Array.from(allTags).filter(tag => tag.length > 0);
  
  return uniqueTags.sort((a, b) => a.localeCompare(b, 'pl'));
}