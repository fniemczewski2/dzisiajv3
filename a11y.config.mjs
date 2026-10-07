import tseslint from "typescript-eslint";
import jsxA11y from "eslint-plugin-jsx-a11y";
export default [{ files: ["components/**/*.tsx","pages/**/*.tsx","providers/**/*.tsx"],
  languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
  plugins: { "jsx-a11y": jsxA11y }, rules: { ...jsxA11y.flatConfigs.strict.rules, "jsx-a11y/control-has-associated-label": "off" } }];
