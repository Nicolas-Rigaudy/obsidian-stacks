import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { libraryHints } from "../src/settings/hints.ts";
import { PRESETS } from "../src/settings/presets.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";

const config = { ...PRESETS.find((p) => p.id === "books")!.build(), folder: "Books" };
const note = (status: string | null): MediaNote => ({
	path: "Books/x.md", title: "x", category: "book", facet: "book", status, cover: null, rating: null,
	progress: null, series: null, starred: false, added: null, frontmatter: {},
});

describe("libraryHints", () => {
	test("a healthy library has no hints", () => {
		assert.deepEqual(libraryHints(config, [note("read"), note("backlog")], true), []);
	});
	test("a missing folder is named, and nothing else is said", () => {
		const h = libraryHints(config, [], false);
		assert.equal(h.length, 1);
		assert.match(h[0], /“Books” does not exist/);
	});
	test("an empty library points at folder and category", () => {
		const h = libraryHints(config, [], true);
		assert.match(h[0], /No notes found in “Books” with category book/);
	});
	test("whole-vault library with no notes says so", () => {
		assert.match(libraryHints({ ...config, folder: "" }, [], true)[0], /in the vault/);
	});
	test("notes without a status, and with an unlisted status, are counted", () => {
		const h = libraryHints(config, [note(null), note("on hold"), note("on hold"), note("read")], true);
		assert.match(h[0], /1 of 4 notes have no “status” field/);
		assert.match(h[1], /2 notes use a status not listed below \(“on hold”\)/);
	});
});
