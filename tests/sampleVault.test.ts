import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { parseNote } from "../src/logic/parseNote.ts";
import { PRESETS } from "../src/settings/presets.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";

const root = new URL("../sample-vault/", import.meta.url);

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

function notesFor(presetId: string, folder: string): MediaNote[] {
	const config = { ...PRESETS.find((p) => p.id === presetId)!.build(), folder };
	return readdirSync(new URL(`${folder}/`, root)).flatMap((file) => {
		const text = readFileSync(new URL(`${folder}/${file}`, root), "utf8");
		const note = parseNote(`${folder}/${file}`, file.replace(/\.md$/, ""), frontmatter(text), config);
		return note ? [note] : [];
	});
}

describe("sample vault with the presets, no further edits", () => {
	test("books: every note shows, each on a board column of the preset", () => {
		const notes = notesFor("books", "Books");
		const statuses = PRESETS.find((p) => p.id === "books")!.build().statuses.map((s) => s.value);
		assert.equal(notes.length, readdirSync(new URL("Books/", root)).length);
		for (const n of notes) assert.ok(statuses.includes(n.status ?? ""), n.title);
		assert.deepEqual(notes.filter((n) => n.series).map((n) => n.series!.position).sort(), [1, 2, 3]);
		assert.equal(notes.find((n) => n.title === "Dracula")!.progress!.total, 418);
	});

	test("video games: every note shows, with its platform", () => {
		const notes = notesFor("games", "Games");
		assert.equal(notes.length, readdirSync(new URL("Games/", root)).length);
		const statuses = PRESETS.find((p) => p.id === "games")!.build().statuses.map((s) => s.value);
		for (const n of notes) assert.ok(statuses.includes(n.status ?? "") && n.facet, n.title);
	});

	test("films & series: every note shows; episodes only on series", () => {
		const notes = notesFor("watching", "Watching");
		assert.equal(notes.length, readdirSync(new URL("Watching/", root)).length);
		assert.equal(notes.find((n) => n.title === "Spirited Away")!.progress, null);
		assert.equal(notes.find((n) => n.title === "The Expanse")!.progress!.total, 62);
	});

	test("a library pointed at the wrong preset finds nothing (the empty-library hint case)", () => {
		assert.equal(notesFor("games", "Books").length, 0);
	});
});
