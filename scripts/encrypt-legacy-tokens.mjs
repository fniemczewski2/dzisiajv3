import { createCipheriv, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const APPLY = process.argv.includes("--apply");
const PAGE = 500;

const TARGETS = [
  { table: "connected_calendars", key: "id", columns: ["access_token", "refresh_token"] },
  { table: "slack_connections", key: "id", columns: ["access_token"] },
  { table: "google_calendar_tokens", key: "user_id", columns: ["access_token", "refresh_token"] },
];

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Brak zmiennej środowiskowej ${name}.`);
    process.exit(1);
  }
  return value;
}

const key = Buffer.from(requireEnv("CALENDAR_TOKEN_ENCRYPTION_KEY"), "base64");
if (key.length !== 32) {
  console.error("CALENDAR_TOKEN_ENCRYPTION_KEY musi mieć 32 bajty (base64).");
  process.exit(1);
}

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}

const isPlaintext = (value) => typeof value === "string" && value !== "" && !value.startsWith("v1:");

const admin = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"));

async function encryptPage(table, pk, columns, rows) {
  const pending = [];
  for (const row of rows) {
    const update = {};
    for (const column of columns) {
      if (isPlaintext(row[column])) update[column] = encrypt(row[column]);
    }
    if (Object.keys(update).length > 0) pending.push({ id: row[pk], update });
  }
  if (APPLY) {
    await Promise.all(
      pending.map(async ({ id, update }) => {
        const { error } = await admin.from(table).update(update).eq(pk, id);
        if (error) console.error(`[${table}] ${id}: ${error.message}`);
      })
    );
  }
  return pending.length;
}

let total = 0;
for (const { table, key: pk, columns } of TARGETS) {
  let found = 0;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin // NOSONAR
      .from(table)
      .select([pk, ...columns].join(", "))
      .order(pk)
      .range(from, from + PAGE - 1);
    if (error) {

      console.warn(`[${table}] pominięto: ${error.message}`);
      break;
    }

    found += await encryptPage(table, pk, columns, data ?? []); // NOSONAR
    if (!data || data.length < PAGE) break;
  }
  console.log(`[${table}] wierszy z jawnym tokenem: ${found}${APPLY ? " (zaszyfrowano)" : ""}`);
  total += found;
}

console.log(APPLY ? `Gotowe. Zaszyfrowano ${total} wierszy.` : `Podgląd: ${total} wierszy do zaszyfrowania. Uruchom z --apply.`);
