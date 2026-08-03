// config/limits.ts

export const MAX_SHOPPING_LISTS = 5;
export const MAX_FAVORITE_STOPS = 10;
export const MAX_CATEGORIES = 20;
export const MAX_HISTORY = 5;
export const MAX_SEARCH_SUGGESTIONS = 5;
export const MAX_TRUSTED_USERS = 10;
export const MAX_LETTER_PDF_SIZE_MB = 10;
export const BILLS_PAGE_LIMIT = 20;
export const BILLS_DEDUP_FETCH_LIMIT = 5000;
export const TICKET_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
export const TICKET_ALLOWED_MIME = "application/pdf";
export const TRANSPORT_SUGGESTIONS_LIMIT = 10;
export const FLAT_RENTAL_DEFAULT = 2000;
export const FLAT_FEE_DEFAULT = 630;
export const TAX_DEFAULT = 8.5;
export const ZUS_DEFAULT = 798;
export const STATIONS_TTL_MS = 24 * 60 * 60 * 1000; 
export const OPERATIONS_TTL_MS = 30 * 1000;
export const RETRY_DELAY_MS = 1500;
export const TRANSPORT_API_LIMIT = 30;
export const UNDO_WINDOW_MS = 500;
export const OFFLINE_QUEUE_DB = "offline_queue_db";
export const OFFLINE_QUEUE_STORE = "offline_queue";