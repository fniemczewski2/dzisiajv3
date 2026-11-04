// lib/obsidian/storage.ts
//
// Dostęp do vaultu w chmurze za wspólnym interfejsem. Fetch wstrzykiwany (testy bez sieci).
// OneDrive: folder aplikacji (Files.ReadWrite.AppFolder) – widzi też pliki utworzone przez Obsidiana.
// Google Drive: folder „dzisiaj.fun”; przy zakresie drive.file aplikacja widzi wyłącznie pliki, które sama utworzyła.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface VaultFile {
  fileId: string;
  /** Ścieżka względna wobec katalogu vaultu, z ukośnikami: „Notatki/A/x.md”. */
  path: string;
}

export interface VaultStorage {
  list(): Promise<VaultFile[]>;
  read(fileId: string): Promise<string>;
  /** Zapis: istniejący plik po fileId, nowy po ścieżce (foldery tworzone w razie potrzeby). Zwraca fileId. */
  write(path: string, content: string, fileId: string | null): Promise<string>;
}

export class VaultStorageError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "VaultStorageError";
  }
}

function ok(res: Response, what: string): Response {
  if (!res.ok) throw new VaultStorageError(res.status, `${what}: błąd ${res.status}.`);
  return res;
}

const encodePath = (path: string) => path.split("/").map(encodeURIComponent).join("/");

// --- OneDrive (Microsoft Graph, folder aplikacji) ------------------------------------------------
const GRAPH = "https://graph.microsoft.com/v1.0/me/drive";

interface GraphItem {
  id: string;
  name: string;
  file?: unknown;
  deleted?: unknown;
  parentReference?: { path?: string };
}

export function createOneDriveVault(accessToken: string, fetchImpl: FetchLike = fetch): VaultStorage {
  const auth = { Authorization: `Bearer ${accessToken}` };
  return {
    async list() {
      const root = (await ok(
        await fetchImpl(`${GRAPH}/special/approot`, { headers: auth }),
        "OneDrive"
      ).json()) as GraphItem;
      const rootPath = `${root.parentReference?.path ?? ""}/${root.name}`;
      const files: VaultFile[] = [];
      let url: string | undefined = `${GRAPH}/special/approot/delta`;
      while (url) {
        const page = (await ok(await fetchImpl(url, { headers: auth }), "OneDrive").json()) as {
          value: GraphItem[];
          "@odata.nextLink"?: string;
        };
        for (const item of page.value) {
          if (!item.file || item.deleted || !item.name.toLowerCase().endsWith(".md")) continue;
          const parent = decodeURIComponent(item.parentReference?.path ?? "");
          if (!parent.startsWith(rootPath)) continue;
          const dir = parent.slice(rootPath.length).replace(/^\//, "");
          files.push({ fileId: item.id, path: dir ? `${dir}/${item.name}` : item.name });
        }
        url = page["@odata.nextLink"];
      }
      return files;
    },
    async read(fileId) {
      return ok(
        await fetchImpl(`${GRAPH}/items/${encodeURIComponent(fileId)}/content`, { headers: auth }),
        "OneDrive"
      ).text();
    },
    async write(path, content, fileId) {
      const url = fileId
        ? `${GRAPH}/items/${encodeURIComponent(fileId)}/content`
        : `${GRAPH}/special/approot:/${encodePath(path)}:/content`;
      const res = ok(
        await fetchImpl(url, {
          method: "PUT",
          headers: { ...auth, "Content-Type": "text/markdown; charset=utf-8" },
          body: content,
        }),
        "OneDrive"
      );
      return ((await res.json()) as GraphItem).id;
    },
  };
}

// --- Google Drive ----------------------------------------------------------------------------------
const DRIVE = "https://www.googleapis.com/drive/v3/files";
const UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";
const FOLDER_MIME = "application/vnd.google-apps.folder";
const DRIVE_VAULT_FOLDER = "dzisiaj.fun";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const q = (s: string) => s.replaceAll("\\", String.raw`\\`).replaceAll("'", String.raw`\'`);

export function createGoogleDriveVault(accessToken: string, fetchImpl: FetchLike = fetch): VaultStorage {
  const auth = { Authorization: `Bearer ${accessToken}` };
  const folderIds = new Map<string, string>();

  async function children(parentId: string): Promise<DriveFile[]> {
    const out: DriveFile[] = [];
    let pageToken = "";
    do {
      const params = new URLSearchParams({
        q: `'${q(parentId)}' in parents and trashed = false`,
        fields: "nextPageToken, files(id, name, mimeType)",
        pageSize: "1000",
      });
      if (pageToken) params.set("pageToken", pageToken);
      const page = (await ok(await fetchImpl(`${DRIVE}?${params}`, { headers: auth }), "Google Drive").json()) as {
        files: DriveFile[];
        nextPageToken?: string;
      };
      out.push(...page.files);
      pageToken = page.nextPageToken ?? "";
    } while (pageToken);
    return out;
  }

  async function folder(name: string, parentId: string | null): Promise<string> {
    const key = `${parentId ?? "root"}/${name}`;
    const cached = folderIds.get(key);
    if (cached) return cached;
    const parentClause = parentId ? `'${q(parentId)}' in parents` : "'root' in parents";
    const params = new URLSearchParams({
      q: `name = '${q(name)}' and mimeType = '${FOLDER_MIME}' and ${parentClause} and trashed = false`,
      fields: "files(id)",
    });
    const found = (await ok(await fetchImpl(`${DRIVE}?${params}`, { headers: auth }), "Google Drive").json()) as {
      files: { id: string }[];
    };
    let id = found.files[0]?.id;
    if (!id) {
      const created = ok(
        await fetchImpl(DRIVE, {
          method: "POST",
          headers: { ...auth, "Content-Type": "application/json" },
          body: JSON.stringify({ name, mimeType: FOLDER_MIME, ...(parentId ? { parents: [parentId] } : {}) }),
        }),
        "Google Drive"
      );
      id = ((await created.json()) as { id: string }).id;
    }
    folderIds.set(key, id);
    return id;
  }

  return {
    async list() {
      const rootId = await folder(DRIVE_VAULT_FOLDER, null);
      const files: VaultFile[] = [];
      const queue: { id: string; dir: string }[] = [{ id: rootId, dir: "" }];
      while (queue.length > 0) {
        const { id, dir } = queue.shift() as { id: string; dir: string };
        for (const f of await children(id)) {
          const path = dir ? `${dir}/${f.name}` : f.name;
          if (f.mimeType === FOLDER_MIME) queue.push({ id: f.id, dir: path });
          else if (f.name.toLowerCase().endsWith(".md")) files.push({ fileId: f.id, path });
        }
      }
      return files;
    },
    async read(fileId) {
      return ok(
        await fetchImpl(`${DRIVE}/${encodeURIComponent(fileId)}?alt=media`, { headers: auth }),
        "Google Drive"
      ).text();
    },
    async write(path, content, fileId) {
      if (fileId) {
        ok(
          await fetchImpl(`${UPLOAD}/${encodeURIComponent(fileId)}?uploadType=media`, {
            method: "PATCH",
            headers: { ...auth, "Content-Type": "text/markdown; charset=utf-8" },
            body: content,
          }),
          "Google Drive"
        );
        return fileId;
      }
      const segments = path.split("/");
      const name = segments.pop() as string;
      let parentId = await folder(DRIVE_VAULT_FOLDER, null);
      for (const segment of segments) parentId = await folder(segment, parentId);
      const boundary = `vault_${crypto.randomUUID()}`;
      const body =
        `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [parentId], mimeType: "text/markdown" })}\r\n` +
        `--${boundary}\r\nContent-Type: text/markdown; charset=UTF-8\r\n\r\n${content}\r\n--${boundary}--`;
      const res = ok(
        await fetchImpl(`${UPLOAD}?uploadType=multipart&fields=id`, {
          method: "POST",
          headers: { ...auth, "Content-Type": `multipart/related; boundary=${boundary}` },
          body,
        }),
        "Google Drive"
      );
      return ((await res.json()) as { id: string }).id;
    },
  };
}
