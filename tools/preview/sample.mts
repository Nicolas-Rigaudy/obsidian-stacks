// Writes sample.json: the sample vault notes as preview snapshots, by library.
// Run: node sample.mts
import { readdirSync, readFileSync, writeFileSync } from "node:fs";

const root = new URL("../../sample-vault/", import.meta.url);
const folders: Record<string, string> = { book: "Books", game: "Games", watching: "Watching" };

/** The flat `key: value` frontmatter the sample notes use (scalars only). */
function frontmatter(text: string): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const line of text.split("---")[1].trim().split("\n")) {
		const i = line.indexOf(":");
		const raw = line.slice(i + 1).trim();
		out[line.slice(0, i)] = /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : raw.replace(/^"(.*)"$/, "$1");
	}
	return out;
}

const out: Record<string, unknown[]> = {};
for (const [lib, folder] of Object.entries(folders)) {
	out[lib] = readdirSync(new URL(`${folder}/`, root)).sort().map((file) => ({
		path: `${folder}/${file}`,
		basename: file.replace(/\.md$/, ""),
		fm: frontmatter(readFileSync(new URL(`${folder}/${file}`, root), "utf8")),
	}));
}
writeFileSync(new URL("sample.json", import.meta.url), JSON.stringify(out, null, "\t") + "\n");
console.log("wrote sample.json:", Object.entries(out).map(([k, v]) => `${k} ${v.length}`).join(", "));
