// eslint.config.mjs
//
// eslint-config-next@16 dostarcza natywne flat-configi — FlatCompat
// (używany w poprzedniej wersji tego pliku) nie jest już potrzebny
// i wywala się na cyklicznych strukturach.
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import unusedImports from "eslint-plugin-unused-imports";

const eslintConfig = [
  ...coreWebVitals,
  ...nextTypescript,
  {
    files: ["**/*.ts", "**/*.tsx"],
    // Typed linting — wymagane przez reguły *-promises i switch-exhaustiveness.
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { "unused-imports": unusedImports },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Repo utrzymuje zero `any` — betonujemy to jako błąd, nie warning
      // (warny nie failują builda i z czasem gniją).
      "@typescript-eslint/no-explicit-any": "error",
      // Złapie niezawaitowane wywołania Supabase i inne "zgubione" Promise.
      // STRATEGIA RATCHET: na dziś "warn" (stan zastany: ~79 miejsc w repo,
      // głównie fetchX() w useEffect — poprawny fix to `void fetchX()` lub
      // .catch). Po wyczyszczeniu podnieś na "error", żeby zabetonować.
      "@typescript-eslint/no-floating-promises": ["warn", { ignoreVoid: true }],
      "@typescript-eslint/no-misused-promises": [
        "warn",
        // onClick={asyncHandler} to świadomy, powszechny wzorzec w tym repo.
        { checksVoidReturn: { attributes: false } },
      ],
      "@typescript-eslint/switch-exhaustiveness-check": "warn",
      // Nowa reguła presetu Next 16 (React Compiler lint) — 44 zastane
      // miejsca; ratchet jak wyżej.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/exhaustive-deps": "error",
      // Konsola: warn/error zostają (API routes logują serwerowo),
      // console.log w kodzie produkcyjnym — nie.
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    // W testach floating promises i console są akceptowalne.
    files: ["__tests__/**/*.ts", "__tests__/**/*.tsx", "vitest.setup.ts"],
    rules: {
      "@typescript-eslint/no-floating-promises": "off",
      "no-console": "off",
    },
  },
  {
    ignores: ["supabase/functions/**", "public/sw.js", ".next/**"],
  },
];

export default eslintConfig;
