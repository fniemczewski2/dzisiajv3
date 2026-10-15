// config/rssSources.ts

export type RssGroup =
  | "Poznań i region"
  | "NGO i granty"
  | "Klimat i energia"
  | "Prawa człowieka"
  | "Wiadomości z Polski";

export interface RssSource {
  id: string;
  name: string;
  url: string;
  group: RssGroup;
  lang: "pl" | "en";
  defaultEnabled: boolean;
}

const on = true;
const off = false;

export const RSS_SOURCES: readonly RssSource[] = [
  // Poznań i region
  { id: "ztm-poznan", name: "ZTM Poznań", url: "https://www.ztm.poznan.pl/rss", group: "Poznań i region", lang: "pl", defaultEnabled: on },
  { id: "zdm-poznan", name: "ZDM Poznań", url: "https://zdm.poznan.pl/pl/rss", group: "Poznań i region", lang: "pl", defaultEnabled: on },
  { id: "poznan-um", name: "Miasto Poznań - środowisko", url: "https://www.poznan.pl/mim/feeds/rss.xml?name=wos", group: "Poznań i region", lang: "pl", defaultEnabled: on },
  { id: "poznan-ngo", name: "Miasto Poznań - ngo", url: "https://www.poznan.pl/mim/feeds/rss.xml?name=wos", group: "Poznań i region", lang: "pl", defaultEnabled: on },
  { id: "poznan-wydarzenia", name: "Miasto Poznań - wydarzenia", url: "https://www.poznan.pl/mim/feeds/rss.xml?name=events", group: "Poznań i region", lang: "pl", defaultEnabled: on },
  { id: "uw-poznan", name: "Wielkopolski Urząd Wojewódzki", url: "https://poznan.uw.gov.pl/rss.xml", group: "Poznań i region", lang: "pl", defaultEnabled: on },

  // NGO i granty
  { id: "niw", name: "NIW CRSO", url: "https://niw.gov.pl/feed/?category_name=niw-crso%2Ckonkurs%2Ckorpus-solidarnosci%2Cngo%2Cnowefio%2Cproo", group: "NGO i granty", lang: "pl", defaultEnabled: on },
  { id: "granty-pl", name: "Granty.pl", url: "https://granty.pl/feed/", group: "NGO i granty", lang: "pl", defaultEnabled: on },
  { id: "eurodesk", name: "Eurodesk", url: "https://eurodesk.pl/rss/", group: "NGO i granty", lang: "pl", defaultEnabled: on },
 
  // Klimat i energia
  { id: "nauka-o-klimacie", name: "Nauka o klimacie", url: "https://naukaoklimacie.pl/feed/", group: "Klimat i energia", lang: "pl", defaultEnabled: on },
  { id: "smoglab", name: "SmogLab", url: "https://smoglab.pl/feed/", group: "Klimat i energia", lang: "pl", defaultEnabled: on },
  { id: "wysokie-napiecie", name: "Wysokie Napięcie", url: "https://wysokienapiecie.pl/feed/", group: "Klimat i energia", lang: "pl", defaultEnabled: on },
  { id: "carbon-brief", name: "Carbon Brief", url: "https://www.carbonbrief.org/feed/", group: "Klimat i energia", lang: "en", defaultEnabled: on },
  { id: "inside-climate", name: "Inside Climate News", url: "https://insideclimatenews.org/feed/", group: "Klimat i energia", lang: "en", defaultEnabled: on },

  // Prawa człowieka
  { id: "panoptykon", name: "Fundacja Panoptykon", url: "https://panoptykon.org/rss.xml", group: "Prawa człowieka", lang: "pl", defaultEnabled: on },
  { id: "amnesty-pl", name: "Amnesty International Polska", url: "https://amnesty.org.pl/feed/", group: "Prawa człowieka", lang: "pl", defaultEnabled: on },
  { id: "amnesty-int", name: "Amnesty International", url: "https://www.amnesty.org/en/feed/", group: "Prawa człowieka", lang: "en", defaultEnabled: on },
  { id: "hrw", name: "Human Rights Watch", url: "https://www.hrw.org/rss/news", group: "Prawa człowieka", lang: "en", defaultEnabled: on },

  // Wiadomości z Polski – ogólnoinformacyjne
  { id: "pap", name: "PAP – Polska Agencja Prasowa", url: "https://pap-mediaroom.pl/rss.xml", group: "Wiadomości z Polski", lang: "pl", defaultEnabled: off },
  { id: "tvn24", name: "TVN24 – najnowsze", url: "https://tvn24.pl/najnowsze.xml", group: "Wiadomości z Polski", lang: "pl", defaultEnabled: off },
  { id: "polsat-news", name: "Polsat News", url: "https://www.polsatnews.pl/rss/wszystkie.xml", group: "Wiadomości z Polski", lang: "pl", defaultEnabled: off },
  { id: "rp", name: "Rzeczpospolita", url: "https://www.rp.pl/rss_main", group: "Wiadomości z Polski", lang: "pl", defaultEnabled: off },
  { id: "oko-press", name: "OKO.press", url: "https://oko.press/feed", group: "Wiadomości z Polski", lang: "pl", defaultEnabled: off },
];

export const RSS_GROUPS: readonly RssGroup[] = [...new Set(RSS_SOURCES.map((s) => s.group))];

export const MAX_CUSTOM_FEEDS = 15;

export interface CustomFeed {
  id: string;
  name: string;
  url: string;
}

const BUILT_IN_IDS = new Set(RSS_SOURCES.map((s) => s.id));

export function defaultEnabledSources(): string[] {
  return RSS_SOURCES.filter((s) => s.defaultEnabled).map((s) => s.id);
}

export function resolveEnabledSources(stored: unknown, customIds: readonly string[] = []): string[] {
  if (!Array.isArray(stored)) return defaultEnabledSources();
  const allowed = new Set([...BUILT_IN_IDS, ...customIds]);
  return [...new Set(stored.filter((id): id is string => typeof id === "string" && allowed.has(id)))];
}

export function normalizeCustomFeeds(raw: unknown): CustomFeed[] {
  if (!Array.isArray(raw)) return [];
  const out: CustomFeed[] = [];
  for (const item of raw) {
    const f = item as Partial<CustomFeed>;
    if (typeof f?.id !== "string" || !f.id.startsWith("c_") || typeof f.url !== "string" || typeof f.name !== "string") continue;
    if (!/^https?:\/\//i.test(f.url) || f.url.length > 500) continue;
    out.push({ id: f.id.slice(0, 40), name: f.name.trim().slice(0, 60) || "Własny kanał", url: f.url.trim() });
    if (out.length >= MAX_CUSTOM_FEEDS) break;
  }
  return out;
}
