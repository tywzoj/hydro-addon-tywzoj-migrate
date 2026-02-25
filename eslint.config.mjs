import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import globals from "globals";
import tseslint from "typescript-eslint";

const IGNORED_FILES = ["node_modules/**"];
const JS_FILES = ["*.js", "*.cjs", "*.mjs"];
const TS_FILES = ["*.ts", "*.cts", "*.mts"];

export default defineConfig(
    js.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        files: JS_FILES,
        extends: [tseslint.configs.disableTypeChecked],
    },
    {
        files: [...TS_FILES, ...JS_FILES],
        plugins: {
            "simple-import-sort": simpleImportSort,
        },
        rules: {
            "arrow-parens": ["error", "always"],
            curly: ["error", "multi-line"],
            "import/no-cycle": "off",
            "no-await-in-loop": "error",
            "no-empty": "off",
            "no-extend-native": "error",
            "no-unused-vars": "off",

            "simple-import-sort/exports": "error",
            "simple-import-sort/imports": "error",
        },
    },
    {
        files: TS_FILES,
        languageOptions: {
            globals: {
                ...globals.node,
            },
            parserOptions: {
                projectService: {
                    tsconfigRootDir: import.meta.dirname,
                    defaultProject: "tsconfig.json",
                },
            },
        },
        rules: {
            "@typescript-eslint/consistent-type-imports": "error",
            "@typescript-eslint/explicit-function-return-type": [
                "error",
                {
                    allowExpressions: true,
                    allowTypedFunctionExpressions: true,
                },
            ],
            "@typescript-eslint/explicit-member-accessibility": [
                "error",
                {
                    accessibility: "explicit",

                    overrides: {
                        constructors: "no-public",
                    },
                },
            ],
            "@typescript-eslint/explicit-module-boundary-types": "off",
            "@typescript-eslint/no-empty-interface": "off",
            "@typescript-eslint/no-unsafe-enum-comparison": "off",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-duplicate-enum-values": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    vars: "local",
                    args: "after-used",
                    caughtErrors: "all",
                    argsIgnorePattern: "^_",
                    caughtErrorsIgnorePattern: "^_",
                    destructuredArrayIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                },
            ],
            "@typescript-eslint/prefer-as-const": "error",
        },
    },
    {
        files: [...TS_FILES, ...JS_FILES],
        extends: [prettierRecommended],
        rules: {
            "prettier/prettier": [
                "error",
                {},
                {
                    usePrettierrc: true,
                },
            ],
        },
    },
    { ignores: IGNORED_FILES },
);
