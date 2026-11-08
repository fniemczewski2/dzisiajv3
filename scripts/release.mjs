// scripts/release.mjs
//
// Wydanie: sprawdzenie (format, lint, typecheck, testy, knip, deno check, build), podbicie wersji w package.json
// i package-lock.json, podsumowanie, opis commita i – po potwierdzeniu – git commit oraz git push.
//
// Użycie:
//   node scripts/release.mjs                 # patch (1.43.0 → 1.43.1), pyta o potwierdzenie
//   node scripts/release.mjs --minor         # 1.43.0 → 1.44.0
//   node scripts/release.mjs --major         # 1.43.0 → 2.0.0
//   node scripts/release.mjs --yes           # bez pytania o potwierdzenie
//   node scripts/release.mjs --dry-run       # tylko kontrole i podsumowanie; bez zmian w plikach, commita i push
//   node scripts/release.mjs --only lint,test  # wybrane kontrole (do diagnozy; wydanie wymaga wszystkich)

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const args = new Set(process.argv.slice(2));
const onlyArg = process.argv.find((a) => a.startsWith("--only="))?.slice("--only=".length);
const ONLY = onlyArg ? new Set(onlyArg.split(",")) : null;
const DRY_RUN = args.has("--dry-run");
const ASSUME_YES = args.has("--yes");
function bumpKind() {
  if (args.has("--major")) return "major";
  if (args.has("--minor")) return "minor";
  return "patch";
}
const BUMP = bumpKind();

// Kody kolorów terminala (ESC[…m) usuwane z wyjścia narzędzi.
const ESC = String.fromCodePoint(27);
const ANSI_COLOR = new RegExp(String.raw`${ESC}\[[0-9;]*m`, "g");

const SECRET_PATTERNS = [/(^|\/)\.env(\..*)?$/, /\.pem$/, /\.key$/, /(^|\/)credentials/i, /service[-_]account/i];

const run = (command, { cwd, quiet = true, env = {} } = {}) => {
  const started = Date.now();
  const result = spawnSync(command, {
    shell: true,
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.replace(ANSI_COLOR, "");
  if (!quiet) process.stdout.write(output);
  return { code: result.status ?? 1, output, ms: Date.now() - started };
};

const git = (command) => run(`git ${command}`);
const gitOut = (command) => git(command).output.trim();

const say = (line = "") => process.stdout.write(`${line}\n`);
const heading = (title) => say(`\n== ${title} ==`);

// ---------------------------------------------------------------- wersja

function bumpVersion(version, kind) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) throw new Error(`Nieprawidłowa wersja w package.json: ${version}`);
  const [major, minor, patch] = match.slice(1).map(Number);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/**
 * Podbija wersję w package.json i package-lock.json. Podmienia wyłącznie wartość pola "version" (bez ponownego
 * formatowania JSON), więc wcięcia, końce linii i kolejność kluczy zostają takie same jak w pliku.
 */
function applyVersion(nextVersion) {
  const updates = new Map();
  const originals = new Map();

  const pkgOriginal = readFileSync("package.json", "utf8");
  originals.set("package.json", pkgOriginal);
  updates.set("package.json", replaceVersionValue(pkgOriginal, 0, nextVersion, "package.json"));

  const lockOriginal = readFileSync("package-lock.json", "utf8");
  originals.set("package-lock.json", lockOriginal);
  const rootDone = replaceVersionValue(lockOriginal, 0, nextVersion, "package-lock.json (wersja główna)");
  const emptyPkg = rootDone.indexOf('"": {');
  if (emptyPkg === -1) throw new Error('package-lock.json: brak wpisu packages[""]');
  updates.set(
    "package-lock.json",
    replaceVersionValue(rootDone, emptyPkg, nextVersion, 'package-lock.json (packages[""])')
  );

  // Kontrola: wynik to poprawny JSON z nową wersją, a zmieniły się tylko linie z polem "version".
  const expectedLock = JSON.parse(updates.get("package-lock.json"));
  if (expectedLock.version !== nextVersion || expectedLock.packages?.[""]?.version !== nextVersion) {
    throw new Error("package-lock.json: wersje po podbiciu się nie zgadzają – przerywam");
  }
  for (const [file, text] of updates) {
    const original = originals.get(file);
    if (JSON.parse(text).version !== nextVersion)
      throw new Error(`${file}: wersja po podbiciu się nie zgadza – przerywam`);
    if (diffLines(original, text).some((line) => !line.includes('"version"'))) {
      throw new Error(`${file}: podbicie zmieniłoby więcej niż wersję – przerywam`);
    }
  }

  for (const [file, text] of updates) writeFileSync(file, text);
  return originals;
}

/** Podmienia wartość pierwszego pola "version" w tekście, zaczynając od pozycji `from`. Wymaga dokładnie jednego trafienia. */
function replaceVersionValue(text, from, nextVersion, label) {
  const pattern = /("version"\s*:\s*")([^"]*)(")/g;
  pattern.lastIndex = from;
  const match = pattern.exec(text);
  if (!match) throw new Error(`${label}: nie znaleziono pola "version"`);
  return text.slice(0, match.index) + match[1] + nextVersion + match[3] + text.slice(match.index + match[0].length);
}

function diffLines(a, b) {
  const aLines = a.split("\n");
  const bLines = b.split("\n");
  if (aLines.length !== bLines.length) return ["<różna liczba linii>"];
  return aLines.filter((line, i) => line !== bLines[i]);
}

function restore(originals) {
  for (const [file, text] of originals) writeFileSync(file, text);
}

// ---------------------------------------------------------------- deno

const DENO_INSTALL_HINT = [
  "Zainstaluj Deno (wersja 2.x) i uruchom ponownie. Jedna z opcji:",
  "  Windows (PowerShell):  irm https://deno.land/install.ps1 | iex",
  "  macOS/Linux:           curl -fsSL https://deno.land/install.sh | sh",
  "  npm:                   npm install -g deno",
  "Jeśli Deno jest zainstalowane poza PATH, wskaż je zmienną DENO_BIN (pełna ścieżka do pliku).",
].join("\n");

/** Szuka Deno: w PATH, potem w DENO_BIN, potem w domyślnej lokalizacji instalatora. */
function findDeno() {
  const candidates = [
    "deno",
    process.env.DENO_BIN,
    join(homedir(), ".deno", "bin", process.platform === "win32" ? "deno.exe" : "deno"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    // Ścieżkę cytujemy sami, a argumenty wpisujemy w jednym poleceniu (bez tablicy argumentów przy shell: true).
    const quoted = candidate.includes(" ") ? `"${candidate}"` : candidate;
    const probe = spawnSync(`${quoted} --version`, { shell: true, encoding: "utf8" });
    if (probe.status === 0) return quoted;
  }
  return null;
}

// Punkty wejścia Edge Functions i moduły współdzielone – te same co w CI (index.ts każdej funkcji oraz _shared).
function edgeFunctionEntryPoints() {
  const root = "supabase/functions";
  const entries = [];
  for (const dir of readdirSync(root, { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    if (dir.name === "_shared") {
      for (const file of readdirSync(join(root, dir.name))) if (file.endsWith(".ts")) entries.push(`_shared/${file}`);
    } else if (existsSync(join(root, dir.name, "index.ts"))) {
      entries.push(`${dir.name}/index.ts`);
    }
  }
  return entries.sort();
}

// ---------------------------------------------------------------- kontrole

const checks = [
  {
    name: "format",
    label: "format:check (prettier)",
    run: () => {
      run("npx prettier --write .");
      const r = run("npx prettier --check .");
      const warned = r.output.split("\n").filter((l) => l.startsWith("[warn]") && !l.includes("Code style"));
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? "zgodny z regułami" : `${warned.length} plik(ów) do sformatowania`,
        ms: r.ms,
        detail: warned.slice(0, 10).join("\n"),
      };
    },
  },
  {
    name: "lint",
    label: "lint (oxlint)",
    run: () => {
      const r = run("npx oxlint");
      const found = /Found (\d+) warnings? and (\d+) errors?/.exec(r.output);
      const summary = found ? `${found[1]} ostrzeżeń, ${found[2]} błędów` : "brak wyniku";
      return { ok: r.code === 0, summary, ms: r.ms, detail: r.code === 0 ? "" : r.output.slice(-1500) };
    },
  },
  {
    name: "typecheck",
    label: "typecheck (tsc)",
    run: () => {
      const r = run("npx tsc --noEmit");
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? "bez błędów" : "błędy typów",
        ms: r.ms,
        detail: r.code === 0 ? "" : r.output.slice(-1500),
      };
    },
  },
  {
    name: "test",
    label: "testy (vitest)",
    run: () => {
      const r = run("npx vitest run");
      const tests = /Tests\s+(?:(\d+) failed \| )?(\d+) passed/.exec(r.output);
      const files = /Test Files\s+(?:(\d+) failed \| )?(\d+) passed/.exec(r.output);
      const failed = Number(tests?.[1] ?? 0);
      const summary = tests
        ? `${tests[2]} testów przeszło (${failed} nieudanych), ${files?.[2] ?? "?"} plików`
        : "brak wyniku";
      return {
        ok: r.code === 0 && failed === 0 && Boolean(tests),
        summary,
        ms: r.ms,
        detail:
          r.code === 0
            ? ""
            : r.output
                .split("\n")
                .filter((l) => /FAIL|×|AssertionError/.test(l))
                .slice(0, 15)
                .join("\n"),
        tests: tests ? { passed: Number(tests[2]), failed, files: Number(files?.[2] ?? 0) } : null,
      };
    },
  },
  {
    name: "knip",
    label: "knip (nieużywany kod)",
    run: () => {
      const r = run("npx --yes knip@5.88.1");
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? "brak nieużywanego kodu" : "znaleziono nieużywany kod",
        ms: r.ms,
        detail: r.code === 0 ? "" : r.output.slice(-1500),
      };
    },
  },
  {
    name: "deno",
    label: "deno check (Edge Functions)",
    run: () => {
      const deno = findDeno();
      if (!deno) {
        return {
          ok: false,
          summary: "brak deno (wymagane, jak w CI)",
          ms: 0,
          detail: DENO_INSTALL_HINT,
        };
      }
      // Lista plików liczona w Node (nie przez glob powłoki), żeby działało też w cmd na Windows.
      const files = edgeFunctionEntryPoints();
      const r = run(`deno check --no-lock --node-modules-dir=none ${files.join(" ")}`, {
        cwd: "supabase/functions",
      });
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? `bez błędów (${files.length} plików)` : "błędy typów Edge Functions",
        ms: r.ms,
        detail: r.code === 0 ? "" : r.output.slice(-1500),
      };
    },
  },
  {
    name: "build",
    label: "build (next build)",
    run: () => {
      // next build przepisuje next-env.d.ts (ścieżki .next/types zamiast .next/dev/types): nie chcemy tego w commicie.
      const generated = "next-env.d.ts";
      const before = existsSync(generated) ? readFileSync(generated, "utf8") : null;
      // Te same wartości zastępcze co w CI (.github/workflows): build nie łączy się z bazą.
      const r = run("npm run build", {
        env: {
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-placeholder",
          NEXT_TELEMETRY_DISABLED: "1",
        },
      });
      if (before !== null) writeFileSync(generated, before);
      return {
        ok: r.code === 0,
        summary: r.code === 0 ? "zbudowano" : "build nieudany",
        ms: r.ms,
        detail: r.code === 0 ? "" : r.output.slice(-2000),
      };
    },
  },
];

// ---------------------------------------------------------------- git

function assertRepository() {
  if (gitOut("rev-parse --is-inside-work-tree") !== "true") throw new Error("To nie jest repozytorium git.");
  const branch = gitOut("branch --show-current");
  if (!branch) throw new Error("HEAD nie wskazuje na gałąź (detached). Przełącz się na gałąź przed wydaniem.");
  return branch;
}

function changedFiles() {
  const status = gitOut("status --porcelain=v1 -uall");
  return status
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3).replace(/^"|"$/g, ""));
}

function findSecretLikeFiles(files) {
  return files.filter((file) => SECRET_PATTERNS.some((pattern) => pattern.test(file)));
}

// ---------------------------------------------------------------- opis commita

function groupByArea(files) {
  const groups = new Map();
  for (const file of files) {
    const area = file.includes("/") ? file.split("/")[0] : "(główny katalog)";
    groups.set(area, [...(groups.get(area) ?? []), file]);
  }
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

/** Odmiana rzeczownika przez liczbę: 1 plik, 2–4 pliki, 5+ plików. */
function plural(count, one, few, many) {
  if (count === 1) return one;
  const lastTwo = count % 100;
  const last = count % 10;
  return last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14) ? few : many;
}

function fileList(list) {
  const shown = list.slice(0, 4).join(", ");
  return list.length > 4 ? `${shown}, …` : shown;
}

function stagedFiles() {
  return gitOut("diff --cached --name-only").split("\n").filter(Boolean);
}

function stagedAddedFiles() {
  return gitOut("diff --cached --name-status")
    .split("\n")
    .filter((line) => line.startsWith("A"))
    .map((line) => line.split("\t")[1]);
}

function deploymentNotes(added, files) {
  const notes = [];
  const migrations = added.filter((f) => f.startsWith("supabase/sql/")).map((f) => f.split("/").pop());
  if (migrations.length) notes.push(`migracje SQL do wykonania przed wdrożeniem: ${migrations.join(", ")}`);
  const functions = [...new Set(files.filter((f) => f.startsWith("supabase/functions/")).map((f) => f.split("/")[2]))];
  const deployable = functions.filter((name) => !name.startsWith("_"));
  if (deployable.length) {
    notes.push(`wdrożenie funkcji Edge: ${deployable.map((name) => `supabase functions deploy ${name}`).join("; ")}`);
  }
  return notes;
}

function buildCommitMessage({ version, files, checkResults, testSummary }) {
  const areas = groupByArea(files).map(
    ([area, list]) => `- ${area}: ${list.length} ${plural(list.length, "plik", "pliki", "plików")} (${fileList(list)})`
  );
  const notes = deploymentNotes(stagedAddedFiles(), files);
  const lines = [`Ver ${version}`, "", "Zmiany:", ...areas];
  if (notes.length) lines.push("", "Wdrożenie:", ...notes.map((note) => `- ${note}`));
  lines.push("", "Kontrole:", ...checkResults.map((r) => `- ${r.label}: ${r.summary}`));
  if (testSummary) lines.push(`- testy: ${testSummary.passed} przeszło, ${testSummary.failed} nieudanych`);
  return `${lines.join("\n")}\n`;
}

// ---------------------------------------------------------------- główna część

const indent = (text) =>
  text
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");

function runChecks() {
  const results = [];
  let testSummary = null;
  for (const check of checks) {
    if (ONLY && !ONLY.has(check.name)) {
      results.push({ ...check, skipped: true, ok: false, summary: "pominięto (--only)", ms: 0 });
      continue;
    }
    say(`→ ${check.label} …`);
    const r = check.run();
    if (check.name === "test" && r.tests) testSummary = r.tests;
    results.push({ ...check, ...r });
    say(`  ${r.ok ? "OK" : "BŁĄD"}: ${r.summary}`);
    if (!r.ok && r.detail) say(indent(r.detail));
  }
  return { results, testSummary };
}

function printSummary(results, version, files) {
  heading("Podsumowanie kontroli");
  const width = Math.max(...results.map((r) => r.label.length));
  for (const r of results) {
    const mark = r.skipped ? "POMINIĘTO" : r.ok ? "OK" : "BŁĄD";
    say(`${mark.padEnd(9)} ${r.label.padEnd(width)}  ${(r.ms / 1000).toFixed(1).padStart(6)} s  ${r.summary}`);
  }
  heading("Wersja");
  say(
    `${version}  (${files.length} ${plural(files.length, "zmieniony plik", "zmienione pliki", "zmienionych plików")})`
  );
}

/** Zatrzymuje wydanie: przywraca wersję (jeśli została podbita), wypisuje komunikat i ustawia kod wyjścia. */
function stop(originals, message, exitCode = 1) {
  if (originals) restore(originals);
  say(message);
  process.exitCode = exitCode;
}

async function confirm(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question(question)).trim().toLowerCase();
  rl.close();
  return ["t", "tak", "y", "yes"].includes(answer);
}

async function commitAndPush({ branch, originals, results, testSummary, version }) {
  git("add -A");
  const message = buildCommitMessage({
    version,
    files: stagedFiles(),
    checkResults: results.filter((r) => !r.skipped).map((r) => ({ label: r.label, summary: r.summary })),
    testSummary,
  });
  heading("Opis commita");
  say(message);

  if (!ASSUME_YES && !(await confirm("Zatwierdzić commit i push? [t/N] "))) {
    git("reset -q");
    restore(originals);
    say("Anulowano. Zmiany wróciły do stanu sprzed wydania.");
    return;
  }

  const messageFile = ".git/RELEASE_COMMIT_MSG";
  writeFileSync(messageFile, message);
  const commit = git(`commit -F ${messageFile}`);
  if (commit.code !== 0) throw new Error(`git commit nie powiódł się:\n${commit.output}`);
  say(`\nZacommitowano: ${message.split("\n")[0]}`);

  const hasUpstream = git("rev-parse --abbrev-ref --symbolic-full-name @{u}").code === 0;
  const push = git(hasUpstream ? "push" : `push -u origin ${branch}`);
  if (push.code !== 0) throw new Error(`git push nie powiódł się (commit zostaje lokalnie):\n${push.output}`);
  say(`Wypchnięto na origin/${branch}.`);
}

async function main() {
  const branch = assertRepository();
  const files = changedFiles();
  if (files.length === 0) throw new Error("Brak zmian do wydania.");

  const secrets = findSecretLikeFiles(files);
  if (secrets.length) throw new Error(`Zmienione pliki wyglądają na sekrety – nie wydaję: ${secrets.join(", ")}`);

  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  const nextVersion = bumpVersion(pkg.version, BUMP);
  say(
    `Gałąź: ${branch}   Wersja: ${pkg.version} → ${nextVersion} (${BUMP})   Tryb: ${DRY_RUN ? "dry-run" : "wydanie"}`
  );

  heading("Kontrole");
  const originals = DRY_RUN ? null : applyVersion(nextVersion);
  const { results, testSummary } = runChecks();
  printSummary(results, nextVersion, files);

  const failed = results.filter((r) => !r.skipped && !r.ok);
  if (results.some((r) => r.skipped)) {
    return stop(
      originals,
      "\nUwaga: --only pomija kontrole. Wydanie wymaga pełnego zestawu – wersja została przywrócona."
    );
  }
  if (failed.length) {
    return stop(
      originals,
      `\nZatrzymano: ${failed.map((f) => f.label).join(", ")}. Wersja przywrócona, nic nie zostało zacommitowane.`
    );
  }
  if (DRY_RUN) {
    return stop(originals, "\nDry-run: wszystkie kontrole przeszły. Pliki nie zostały zmienione.", 0);
  }
  await commitAndPush({ branch, originals, results, testSummary, version: nextVersion });
}

try {
  await main();
} catch (error) {
  process.stderr.write(`\nBłąd: ${error.message}\n`);
  process.exitCode = 1;
}
