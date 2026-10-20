import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";

export default defineConfig([
	{ ignores: ["main.js", "node_modules/**", "tools/**", "scripts/**", "tests/**", "esbuild.config.mjs", "version-bump.mjs"] },
	...obsidianmd.configs.recommended,
	{
		languageOptions: {
			parserOptions: {
				projectService: { allowDefaultProject: ["eslint.config.*"] },
				tsconfigRootDir: import.meta.dirname,
			},
		},
	},
	// TypeScript checks globals itself; the core rule only misreports lib types.
	{ files: ["**/*.ts"], rules: { "no-undef": "off" } },
]);
