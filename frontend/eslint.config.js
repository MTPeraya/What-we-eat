import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";
import { defineConfig } from "eslint/config";

export default defineConfig([
  { 
    files: ["**/*.{js,mjs,cjs,jsx}"], 
    plugins: { js }, 
    extends: ["js/recommended"], 
    languageOptions: { 
      globals: globals.browser 
    }
  },
  {
    files: ["**/*.{jsx,js}"],
    plugins: {
      react: pluginReact
    },
    settings: {
      react: {
        version: "detect" // Automatically detect React version
      }
    },
    rules: {
      ...pluginReact.configs.flat.recommended.rules
    }
  }
]);