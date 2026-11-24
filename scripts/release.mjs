// scripts/release.mjs
//
// Wydanie: sprawdzenie (format, lint, typecheck, testy, knip, deno check, build), podbicie wersji w package.json
// i package-lock.json, podsumowanie, opis commita i – po potwierdzeniu – git commit oraz git push.
//
// Użycie (działa tak samo przez `npm run release -- --minor` i `npm run release --minor`):
//   npm run release                    # patch (1.43.0 → 1.43.1), pyta o potwierdzenie
//   npm run release --minor            # 1.43.0 → 1.44.0
//   npm run release --major            # 1.43.0 → 2.0.0
//   npm run release --patch            # jawnie patch
//   npm run release --yes              # bez pytania o potwierdzenie
//   npm run release --dry-run          # tylko kontrole i podsumowanie; bez zmian w plikach, commita i push
//   npm run release --only=lint,test   # wybrane kontrole (do diagnozy; wydanie wymaga wszystkich)
//
// npm zjada flagi podane bez `--` i zamienia je na zmienne npm_config_* – skrypt czyta oba źródła,
// więc nie trzeba pamiętać o podwójnym myślniku.

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const argv = process.argv.slice(2);
const args = new Set(argv);

/** Flaga z wiersza poleceń albo z npm_config_* (npm przenosi tam flagi podane bez `--`). */
function hasFlag(name) {
  if (args.has(`--${name}`)) return true;
  const fromNpm = process.env[`npm_config_${name.replaceAll("-", "_")}`];
  return fromNpm === "true" || fromNpm === "";
}

/** Wartość flagi: `--only=a,b`, `--only a,b` albo npm_config_only. */
function flagValue(name) {
  const inline = argv.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(`--${name}=`.length);
  const index = argv.indexOf(`--${name}`);
  const next = index >= 0 ? argv[index + 1] : undefined;
  if (next && !next.startsWith("--")) return next;
  const fromNpm = process.env[`npm_config_${name}`];
  return fromNpm && fromNpm !== "true" ? fromNpm : null;
}

const onlyArg = flagValue("only");
const ONLY = onlyArg
  ? new Set(
      onlyArg
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean)
    )
  : null;
const DRY_RUN = hasFlag("dry-run");
const ASSUME_YES = hasFlag("yes");

function bumpKind() {
  const selected = ["major", "minor", "patch"].filter((kind) => hasFlag(kind));
  if (selected.length > 1) throw new Error(`Sprzeczne flagi wersji: ${selected.map((k) => `--${k}`).join(", ")}`);
  return selected[0] ?? "patch";
}
const BUMP = bumpKind();

const KNOWN_CHECK_NAMES = ["format", "lint", "typecheck", "test", "knip", "deno", "build"];
if (ONLY) {
  const unknown = [...ONLY].filter((name) => !KNOWN_CHECK_NAMES.includes(name));
  if (unknown.length) {
    throw new Error(`Nieznane kontrole w --only: ${unknown.join(", ")}. Dostępne: ${KNOWN_CHECK_NAMES.join(", ")}`);
  }
}

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

/** Wersja asynchroniczna: kontrole są długie, więc co HEARTBEAT_MS wypisujemy czas trwania zamiast milczeć. */
const HEARTBEAT_MS = 5000;
const runAsync = (command, { cwd, env = {}, onLine = null, heartbeat = true } = {}) =>
  new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(command, { shell: true, cwd, env: { ...process.env, ...env } });
    let output = "";
    let pending = "";
    const collect = (chunk) => {
      output += chunk;
      if (!onLine) return;
      // Dzielimy strumień na pełne linie (fragment bez końca linii czeka na kolejną porcję).
      const lines = (pending + chunk).split("\n");
      pending = lines.pop() ?? "";
      for (const line of lines) onLine(line.replace(ANSI_COLOR, ""));
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", collect);
    child.stderr.on("data", collect);
    // Znak życia: w terminalu interaktywnym odświeżana jedna linia, w logu (CI) kolejne wiersze.
    const tick = () => {
      const text = `      … trwa ${Math.round((Date.now() - started) / 1000)} s`;
      if (stdout.isTTY) stdout.write(`\r${text.padEnd(TEST_LINE_WIDTH)}`);
      else say(text);
    };
    const timer = heartbeat ? setInterval(tick, HEARTBEAT_MS) : null;
    const finish = (code, text) => {
      if (timer) {
        clearInterval(timer);
        if (stdout.isTTY) stdout.write(`\r${" ".repeat(TEST_LINE_WIDTH)}\r`);
      }
      if (onLine && pending) onLine(pending.replace(ANSI_COLOR, ""));
      resolve({ code, output: text.replace(ANSI_COLOR, ""), ms: Date.now() - started });
    };
    child.on("error", (error) => finish(1, String(error)));
    child.on("close", (code) => finish(code ?? 1, output));
  });

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

// ---------------------------------------------------------------- postęp testów

const TEST_TOTAL_FILE = ".git/RELEASE_TEST_TOTAL";
const TEST_PROGRESS_INTERVAL_MS = 2000;
/** Odświeżanie linii postępu w terminalze interaktywnym – na tyle często, żeby licznik rósł płynnie. */
const TEST_PAINT_INTERVAL_MS = 120;
/** Szerokość linii postępu: stała, żeby nadpisanie kasowało poprzednią treść w całości. */
const TEST_LINE_WIDTH = 100;
/** Linia pliku w reporterze verbose: „✓ __tests__/lib/x.test.ts (12 tests) 34ms”. */
const TEST_FILE_LINE = /^\s*[✓×↓]\s+(\S+\.test\.[cm]?tsx?)\s/;
// Linia wyniku jednego testu w reporterze verbose: „✓ plik > opis 12ms” (× = nieudany, ↓ = pominięty).
const TEST_RESULT_LINE = /^\s*(✓|×|↓)\s+\S.*\s>\s/;

/**
 * Łączna liczba testów do wykonania. Źródło: liczba z poprzedniego udanego wydania (dokładna, dopóki zestaw się nie
 * zmieni), a bez niej `vitest list` (zaniża wynik dla testów parametryzowanych, więc to tylko oszacowanie).
 */
function readTestTotalEstimate() {
  if (existsSync(TEST_TOTAL_FILE)) {
    const saved = Number(readFileSync(TEST_TOTAL_FILE, "utf8").trim());
    if (Number.isInteger(saved) && saved > 0) return { total: saved, source: "z poprzedniego wydania" };
  }
  const listed = run("npx vitest list")
    .output.split("\n")
    .filter((line) => line.includes(" > ")).length;
  return { total: listed, source: "vitest list" };
}

function saveTestTotal(total) {
  writeFileSync(TEST_TOTAL_FILE, `${total}\n`);
}

/**
 * Licznik na żywo. W terminalu interaktywnym odświeża jedną linię (\r), więc postęp rośnie płynnie
 * zamiast zasypywać ekran kolejnymi wierszami; poza terminalem (CI, przekierowanie do pliku) wypisuje
 * wiersz co TEST_PROGRESS_INTERVAL_MS, bo \r w logu nic nie daje.
 */
function createTestProgress(total) {
  const interactive = Boolean(stdout.isTTY);
  let done = 0;
  let failed = 0;
  let file = "";
  let lastPrint = 0;

  const line = () => {
    const share = total > 0 && done <= total ? ` (${Math.round((done / total) * 100)}%)` : "";
    const of = done > total ? "+" : `/${total}`;
    const failedPart = failed > 0 ? `  nieudanych ${failed}` : "";
    return `      testy ${done}${of}${share}${failedPart}${file ? `  ${file}` : ""}`;
  };

  const paint = () => {
    const text = line();
    // Dopełnienie spacjami kasuje ogon dłuższej poprzedniej linii (nazwy plików mają różną długość).
    stdout.write(`\r${text.padEnd(TEST_LINE_WIDTH).slice(0, TEST_LINE_WIDTH)}`);
    lastPrint = Date.now();
  };

  const log = () => {
    say(line());
    lastPrint = Date.now();
  };

  return {
    onLine(incoming) {
      const fileMatch = TEST_FILE_LINE.exec(incoming);
      if (fileMatch) file = fileMatch[1].replace(/^__tests__\//, "");
      const match = TEST_RESULT_LINE.exec(incoming);
      if (match) {
        done += 1;
        if (match[1] === "×") failed += 1;
      }
      if (!match && !fileMatch) return;
      const due = Date.now() - lastPrint >= (interactive ? TEST_PAINT_INTERVAL_MS : TEST_PROGRESS_INTERVAL_MS);
      if (!due) return;
      if (interactive) paint();
      else log();
    },
    finish() {
      if (interactive) {
        paint();
        stdout.write("\n");
      } else {
        log();
      }
    },
  };
}

// ---------------------------------------------------------------- formatowanie

/** Rozszerzenia, które prettier w tym repozytorium obsługuje (reszta i tak wypadłaby na --ignore-unknown). */
const FORMAT_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css", ".md", ".yml", ".yaml"];
/** Ile ścieżek w jednym wywołaniu – limit długości wiersza poleceń w cmd.exe to ~8 tys. znaków. */
const FORMAT_BATCH = 40;

const quoteArg = (value) => (/[\s"]/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value);

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/** Zmienione pliki, które prettier ma sformatować: istniejące (bez usuniętych) i o obsługiwanym rozszerzeniu. */
function formatTargets() {
  return changedFiles().filter(
    (file) => existsSync(file) && FORMAT_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext))
  );
}

// ---------------------------------------------------------------- kontrole

const checks = [
  {
    name: "format",
    label: "format (prettier, zmienione pliki)",
    run: async () => {
      // Tylko pliki zmienione w tym wydaniu i tylko jeden przebieg: `--write` sam zgłasza błędy składni,
      // więc osobny `--check` całego repozytorium (kilkadziesiąt sekund) niczego nie dokłada.
      const targets = formatTargets();
      if (targets.length === 0) return { ok: true, summary: "brak plików do sformatowania", ms: 0, detail: "" };
      const results = [];
      for (const batch of chunk(targets, FORMAT_BATCH)) {
        // NOSONAR: partie muszą iść po kolei – jeden proces prettiera na raz, żeby nie zająć całego procesora.
        results.push(await runAsync(`npx prettier --write --ignore-unknown ${batch.map(quoteArg).join(" ")}`));
      }
      const output = results.map((r) => r.output).join("\n");
      const ms = results.reduce((sum, r) => sum + r.ms, 0);
      const code = results.find((r) => r.code !== 0)?.code ?? 0;
      // Pliki z .prettierignore nie dają żadnej linii, więc liczymy to, co prettier faktycznie przetworzył.
      const processedLines = output.split("\n").filter((l) => /\b\d+ms\b/.test(l));
      const reformatted = processedLines.filter((l) => !l.includes("(unchanged)")).length;
      const processed = processedLines.length;
      return {
        ok: code === 0,
        summary:
          code === 0
            ? `${processed} ${plural(processed, "plik", "pliki", "plików")}, poprawiono ${reformatted}`
            : "prettier zgłosił błąd",
        ms,
        detail: code === 0 ? "" : output.slice(-1500),
      };
    },
  },
  {
    name: "lint",
    label: "lint (oxlint)",
    run: async () => {
      const r = await runAsync("npx oxlint");
      const found = /Found (\d+) warnings? and (\d+) errors?/.exec(r.output);
      const summary = found ? `${found[1]} ostrzeżeń, ${found[2]} błędów` : "brak wyniku";
      return { ok: r.code === 0, summary, ms: r.ms, detail: r.code === 0 ? "" : r.output.slice(-1500) };
    },
  },
  {
    name: "typecheck",
    label: "typecheck (tsc)",
    run: async () => {
      const r = await runAsync("npx tsc --noEmit");
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
    run: async () => {
      const estimate = readTestTotalEstimate();
      say(`      łącznie testów (${estimate.source}): ~${estimate.total}`);
      const progress = createTestProgress(estimate.total);
      const r = await runAsync("npx vitest run --reporter=verbose", {
        onLine: (line) => progress.onLine(line),
        heartbeat: false,
      });
      progress.finish();
      const tests = /Tests\s+(?:(\d+) failed \| )?(\d+) passed(?: \| (\d+) skipped)?(?: \((\d+)\))?/.exec(r.output);
      const files = /Test Files\s+(?:(\d+) failed \| )?(\d+) passed/.exec(r.output);
      const failed = Number(tests?.[1] ?? 0);
      const summary = tests
        ? `${tests[2]} testów przeszło (${failed} nieudanych), ${files?.[2] ?? "?"} plików`
        : "brak wyniku";
      const ok = r.code === 0 && failed === 0 && Boolean(tests);
      if (ok && tests?.[4]) saveTestTotal(Number(tests[4]));
      return {
        ok,
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
    run: async () => {
      const r = await runAsync("npx --yes knip@5.88.1");
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
    run: async () => {
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
      const r = await runAsync(`deno check --no-lock --node-modules-dir=none ${files.join(" ")}`, {
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
    run: async () => {
      // next build przepisuje next-env.d.ts (ścieżki .next/types zamiast .next/dev/types): nie chcemy tego w commicie.
      const generated = "next-env.d.ts";
      const before = existsSync(generated) ? readFileSync(generated, "utf8") : null;
      // Te same wartości zastępcze co w CI (.github/workflows): build nie łączy się z bazą.
      const r = await runAsync("npm run build", {
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

/**
 * Zmienione pliki z `git status --porcelain`. Nie używamy tu gitOut(): obcina on początkową spację
 * pierwszego wiersza (status „ M”), przez co pierwsza nazwa traciła pierwszą literę.
 * Format wiersza: dwa znaki statusu, spacja, ścieżka; przy zmianie nazwy „stara -> nowa”.
 */
function changedFiles() {
  return git("status --porcelain=v1 -uall")
    .output.split("\n")
    .map((line) => /^(..) (.+)$/.exec(line.replace(/\r$/, "")))
    .filter(Boolean)
    .map(([, , path]) => {
      const renamed = path.split(" -> ");
      return (renamed.at(-1) ?? path).replace(/^"|"$/g, "");
    });
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

async function runChecks() {
  const results = [];
  let testSummary = null;
  const total = checks.length;
  for (const [index, check] of checks.entries()) {
    const step = `[${index + 1}/${total}]`;
    if (ONLY && !ONLY.has(check.name)) {
      results.push({ ...check, skipped: true, ok: false, summary: "pominięto (--only)", ms: 0 });
      say(`${step} ${check.label}: pominięto (--only)`);
      continue;
    }
    say(`${step} ${check.label} … start`);
    // NOSONAR: kontrole muszą działać kolejno (współdzielą pliki, porty i pamięć podręczną), więc await w pętli jest celowy.
    const r = await check.run();
    if (check.name === "test" && r.tests) testSummary = r.tests;
    results.push({ ...check, ...r });
    say(`${step} ${check.label}: ${r.ok ? "OK" : "BŁĄD"}, ${r.summary} (${(r.ms / 1000).toFixed(1)} s)`);
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
  say("\nCommit: dodawanie zmian (git add -A) …");
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
  say("Commit: git commit …");
  const commit = git(`commit -F ${messageFile}`);
  if (commit.code !== 0) throw new Error(`git commit nie powiódł się:\n${commit.output}`);
  say(`\nZacommitowano: ${message.split("\n")[0]}`);

  say("Push: git push …");
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
  say(
    DRY_RUN
      ? "Podbicie wersji: pominięte (dry-run)"
      : `Podbicie wersji w package.json i package-lock.json → ${nextVersion}`
  );
  const originals = DRY_RUN ? null : applyVersion(nextVersion);
  const { results, testSummary } = await runChecks();
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
