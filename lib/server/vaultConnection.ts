// lib/server/vaultConnection.ts
//
// Połączenie z vaultem (OAuth OneDrive / Google Drive), ważny token i repozytorium danych dla runVaultSync.

import type { NextApiRequest, NextApiResponse } from "next";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { publicEnv, serverEnv } from "@/config/env";
import {
  CACHE_CONTROL,
  VAULT_GDRIVE_REDIRECT_PATH,
  VAULT_GDRIVE_SCOPES,
  VAULT_ONEDRIVE_REDIRECT_PATH,
  VAULT_ONEDRIVE_SCOPES,
  VAULT_STATE_COOKIE,
} from "@/config/server";
import { DEFAULT_NOTE_COLOR } from "@/config/noteColors";
import { allowMethods, requireUser } from "@/lib/server/apiGuards";
import { createServerSupabase } from "@/lib/supabase/server";
import { decryptToken, encryptToken } from "@/lib/server/tokenCrypto";
import { safeEqual } from "@/lib/server/safeEqual";
import { clearStateCookie } from "@/lib/server/oauthState";
import { fetchWithTimeout } from "@/lib/server/fetchWithTimeout";
import { GOOGLE_TOKEN_URL, refreshGoogleToken, refreshOutlookToken } from "@/lib/server/oauthTokens";
import { buildGoogleAuthUrl, normalizeEmail, parseTokenResponse, profileEmail } from "@/lib/mail/accountRules";
import { graphProfileEmail } from "@/lib/mail/outlookAuth";
import { resolveAccessToken } from "@/lib/mail/accessToken";
import { createGoogleDriveVault, createOneDriveVault, type VaultStorage } from "@/lib/obsidian/storage";
import type { VaultData, VaultNote, VaultRepo } from "@/lib/obsidian/runSync";
import type { VaultItemType } from "@/lib/obsidian/paths";
import { cols, type KnownTable } from "@/lib/db/columns";
import type { SyncStateRow } from "@/lib/obsidian/syncPlan";

export type VaultProvider = "onedrive" | "gdrive";

const PROVIDERS = {
  onedrive: {
    redirectPath: VAULT_ONEDRIVE_REDIRECT_PATH,
    scopes: VAULT_ONEDRIVE_SCOPES,
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    profileUrl: "https://graph.microsoft.com/v1.0/me",
    credentials: () => serverEnv.outlook.get(),
    extractEmail: graphProfileEmail,
  },
  gdrive: {
    redirectPath: VAULT_GDRIVE_REDIRECT_PATH,
    scopes: VAULT_GDRIVE_SCOPES,
    tokenUrl: GOOGLE_TOKEN_URL,
    profileUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    credentials: () => serverEnv.google.get(),
    extractEmail: profileEmail,
  },
} as const;

const RETURN = "/settings";
const redirectUri = (p: VaultProvider) => `${publicEnv.appUrl}${PROVIDERS[p].redirectPath}`;

function authUrl(provider: VaultProvider, clientId: string, state: string): string {
  if (provider === "gdrive") {
    return buildGoogleAuthUrl({ clientId, redirectUri: redirectUri(provider), scopes: VAULT_GDRIVE_SCOPES, state });
  }
  const url = new URL("https://login.microsoftonline.com/common/oauth2/v2.0/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri(provider));
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("scope", VAULT_ONEDRIVE_SCOPES.join(" "));
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", state);
  return url.toString();
}

export async function startVaultOAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  provider: VaultProvider
): Promise<void> {
  if (!allowMethods(req, res, ["GET"])) return;
  if (!(await requireUser(req, res))) return;
  const credentials = PROVIDERS[provider].credentials();
  if (!credentials) {
    res.status(503).json({ error: "Połączenie z tą chmurą nie jest skonfigurowane." });
    return;
  }
  const nonce = randomBytes(24).toString("base64url");
  res.setHeader("Set-Cookie", `${VAULT_STATE_COOKIE}=${nonce}; HttpOnly; Secure; SameSite=Lax; Max-Age=600; Path=/`);
  res.setHeader("Cache-Control", CACHE_CONTROL.private);
  res.status(200).json({ url: authUrl(provider, credentials.clientId, nonce) });
}

export async function handleVaultCallback(
  req: NextApiRequest,
  res: NextApiResponse,
  provider: VaultProvider
): Promise<void> {
  if (!allowMethods(req, res, ["GET"])) return;
  const back = (query: string) => {
    res.redirect(303, `${RETURN}?${query}#obsidian`);
  };
  const nonce = req.cookies[VAULT_STATE_COOKIE];
  clearStateCookie(res, VAULT_STATE_COOKIE);
  const { code, state, error } = req.query;
  if (typeof error === "string") return back("vault_error=denied");
  if (typeof code !== "string" || typeof state !== "string" || !nonce || !safeEqual(nonce, state)) {
    return back("vault_error=invalid_state");
  }
  const supabase = createServerSupabase(req, res);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const config = PROVIDERS[provider];
  const credentials = config.credentials();
  if (!user || !credentials) return back("vault_error=auth_failed");

  try {
    const tokenRes = await fetchWithTimeout(config.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        code,
        redirect_uri: redirectUri(provider),
        grant_type: "authorization_code",
      }),
    });
    const body: unknown = await tokenRes.json().catch(() => null);
    const tokens = tokenRes.ok ? parseTokenResponse(body) : null;
    if (!tokens) {
      const { error: code_, error_description: description } = (body ?? {}) as Record<string, unknown>;
      console.error(`[vault] ${provider}: wymiana kodu odrzucona`, {
        status: tokenRes.status,
        error: code_,
        description,
      });
      return back("vault_error=token_failed");
    }
    if (!tokens.refreshToken) return back("vault_error=no_refresh");
    const profileRes = await fetchWithTimeout(config.profileUrl, {
      headers: { Authorization: `Bearer ${tokens.accessToken}` },
    });
    const email = normalizeEmail(
      config.extractEmail(profileRes.ok ? await profileRes.json().catch(() => null) : null) ?? ""
    );
    if (!email) return back("vault_error=profile_failed");

    const { error: saveError } = await supabase.from("vault_connections").upsert(
      {
        user_id: user.id,
        provider,
        email,
        access_token: encryptToken(tokens.accessToken),
        refresh_token: encryptToken(tokens.refreshToken),
        expires_at: tokens.expiresAt,
        scope: config.scopes.join(" "),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (saveError) {
      console.error("[vault] zapis połączenia:", saveError.message);
      return back("vault_error=save_failed");
    }
    // Nowe połączenie (np. inna chmura) – poprzedni stan synchronizacji nie dotyczy nowego vaultu.
    await supabase.from("vault_sync_state").delete().eq("user_id", user.id);
    return back(`vault=${provider}`);
  } catch (err) {
    console.error(`[vault] ${provider}:`, err);
    return back("vault_error=token_failed");
  }
}

interface ConnectionRow {
  user_id: string;
  provider: VaultProvider;
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

/** Klient vaultu z ważnym tokenem (z odświeżeniem); null – połączenie wymaga ponownego ustanowienia. */
export async function vaultStorageFor(supabase: SupabaseClient, conn: ConnectionRow): Promise<VaultStorage | null> {
  const refresh =
    conn.provider === "onedrive"
      ? async (refreshToken: string) => {
          const fresh = await refreshOutlookToken(refreshToken);
          if (fresh?.refresh_token) {
            await supabase
              .from("vault_connections")
              .update({ refresh_token: encryptToken(fresh.refresh_token) })
              .eq("user_id", conn.user_id);
          }
          return fresh?.access_token ?? null;
        }
      : refreshGoogleToken;
  const token = await resolveAccessToken(conn, {
    decrypt: decryptToken,
    encrypt: encryptToken,
    refresh,
    persist: async (encryptedAccessToken, expiresAt) => {
      await supabase
        .from("vault_connections")
        .update({ access_token: encryptedAccessToken, expires_at: expiresAt, updated_at: new Date().toISOString() })
        .eq("user_id", conn.user_id);
    },
  });
  if (!token) return null;
  return conn.provider === "onedrive" ? createOneDriveVault(token) : createGoogleDriveVault(token);
}

const TABLES: Record<VaultItemType, string> = { note: "notes", recipe: "recipes", person: "people", report: "reports" };

/** Repozytorium danych użytkownika dla runVaultSync (sesja użytkownika – RLS). */
export function supabaseVaultRepo(supabase: SupabaseClient, userId: string): VaultRepo {
  async function rows<T>(table: string, columns: string): Promise<T[]> {
    const { data, error } = await supabase.from(table).select(columns).eq("user_id", userId);
    if (error) throw error;
    return (data ?? []) as T[];
  }
  return {
    async loadData(): Promise<VaultData> {
      const [notes, recipes, people, reports] = await Promise.all([
        rows<VaultNote>("notes", "id, user_id, title, items, bg_color, pinned, archived, folder, updated_at"),
        rows<VaultData["recipes"][number]>("recipes", "id, user_id, name, category, products, description, created_at"),
        rows<VaultData["people"][number]>(
          "people",
          "id, user_id, first_name, last_name, relationship, priority, birthday, nameday, phones, emails, notes, last_contact_date, created_at"
        ),
        rows<VaultData["reports"][number]>("reports", "id, user_id, topic, date, agenda, participants, tasks, notes"),
      ]);
      return { notes: notes.filter((n) => !n.archived), recipes, people, reports };
    },
    async loadState() {
      const data = await rows<{ item_id: string; file_id: string; app_hash: string; remote_hash: string }>(
        "vault_sync_state",
        "item_id, file_id, app_hash, remote_hash"
      );
      return data.map((r) => ({
        itemId: r.item_id,
        fileId: r.file_id,
        appHash: r.app_hash,
        remoteHash: r.remote_hash,
      }));
    },
    async saveState(state: SyncStateRow[]) {
      const { error } = await supabase.from("vault_sync_state").upsert(
        state.map((s) => ({
          user_id: userId,
          item_id: s.itemId,
          file_id: s.fileId,
          app_hash: s.appHash,
          remote_hash: s.remoteHash,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "user_id,item_id" }
      );
      if (error) throw error;
    },
    async updateItem(type, id, changes) {
      const patch = type === "note" ? { ...changes, updated_at: new Date().toISOString() } : changes;
      const { error } = await supabase.from(TABLES[type]).update(patch).eq("id", id).eq("user_id", userId);
      if (error) throw error;
    },
    async insertNote(note) {
      const { data, error } = await supabase
        .from("notes")
        .insert({
          ...note,
          user_id: userId,
          bg_color: DEFAULT_NOTE_COLOR,
          pinned: false,
          archived: false,
          updated_at: new Date().toISOString(),
        })
        .select("id, user_id, title, items, bg_color, pinned, archived, folder, updated_at")
        .single();
      if (error || !data) throw error ?? new Error("Brak notatki po zapisie.");
      return data as VaultNote;
    },
    async insertItem(type, values) {
      const table = TABLES[type] as KnownTable;
      const { data, error } = await supabase
        .from(table)
        .insert({ ...values, user_id: userId })
        .select(cols(table))
        .single();
      if (error || !data) throw error ?? new Error("Brak wiersza po zapisie.");
      return data as never;
    },
  };
}
