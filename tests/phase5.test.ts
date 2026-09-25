import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch } from "../src/logic/search.ts";
import { comparatorFor, shelfSections } from "../src/logic/shelf.ts";
import { BOOK_CONFIG, GAME_CONFIG, mergePrefs, mergeSettings } from "../src/settings/settings.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";
import { note, titles } from "./helpers.ts";

const books = BOOK_CONFIG;
const withFm = (n: MediaNote, fm: Record<string, unknown>, extra: Partial<MediaNote> = {}): MediaNote => ({ ...n, frontmatter: fm, ...extra });

describe("matchesSearch", () => {
	const troisieme = withFm(note("La Ville lumière", "backlog", { name: "Le Troisième Œil", position: 1 }), { author: "Olivier Ledroit" });
	test("title, author and series; accents and case ignored", () => {
		assert.ok(matchesSearch(troisieme, books, "ville"));
		assert.ok(matchesSearch(troisieme, books, "LEDROIT"));
		assert.ok(matchesSearch(troisieme, books, "troisieme"));
		assert.ok(matchesSearch(troisieme, books, "lumiere"));
	});
	test("every word has to match somewhere", () => {
		assert.ok(matchesSearch(troisieme, books, "ledroit ville"));
		assert.ok(!matchesSearch(troisieme, books, "ledroit sanderson"));
	});
	test("empty query matches everything; games match on platform", () => {
		assert.ok(matchesSearch(troisieme, books, "   "));
		const hades = { ...withFm(note("Hades", "backlog"), { platform: "Switch" }), category: "game", facet: "Switch" };
		assert.ok(matchesSearch(hades, GAME_CONFIG, "switch"));
	});
});

describe("shelf sorting", () => {
	const a = withFm(note("Alpha", "read"), { author: "Zed", year: 1999 }, { rating: 3, added: 100 });
	const b = withFm(note("Beta", "read"), { author: "Amy", year: 2021 }, { rating: 5, added: 300 });
	const c = withFm(note("Gamma", "read"), { author: "Mo" }, { rating: null, added: 200 });
	const sorted = (s: Parameters<typeof comparatorFor>[0]) => titles([c, a, b].sort(comparatorFor(s, books)));
	test("title, author, recently added", () => {
		assert.deepEqual(sorted("title"), ["Alpha", "Beta", "Gamma"]);
		assert.deepEqual(sorted("creator"), ["Beta", "Gamma", "Alpha"]);
		assert.deepEqual(sorted("added"), ["Beta", "Gamma", "Alpha"]);
	});
	test("rating and year: highest first, missing values last", () => {
		assert.deepEqual(sorted("rating"), ["Beta", "Alpha", "Gamma"]);
		assert.deepEqual(sorted("year"), ["Beta", "Alpha", "Gamma"]);
	});
	test("a bookcase uses the sort; piles sort by their first volume", () => {
		const one = withFm(note("Xenos", "read", { name: "Eisenhorn", position: 1 }), {}, { added: 50 });
		const two = withFm(note("Malleus", "read", { name: "Eisenhorn", position: 2 }), {}, { added: 400 });
		const [read] = shelfSections([a, b, one, two], books, ["read"], false, "added");
		const order = read.items.map((i) => (i.kind === "pile" ? `pile:${i.series}` : i.note.title));
		assert.deepEqual(order, ["Beta", "Alpha", "pile:Eisenhorn"]);
	});
});

describe("view preferences", () => {
	test("defaults, and bad values fall back", () => {
		assert.deepEqual(mergePrefs(undefined), { sort: "library", density: "medium", openPiles: [], openCases: [] });
		assert.deepEqual(mergePrefs({ sort: "weird", density: "huge", openPiles: ["read\u0000Eisenhorn", 3], openCases: "x" }), {
			sort: "library", density: "medium", openPiles: ["read\u0000Eisenhorn"], openCases: [],
		});
	});
	test("saved per library alongside the settings", () => {
		const s = mergeSettings({ prefs: { book: { sort: "rating", density: "large", openCases: ["wishlist"] } } });
		assert.equal(s.prefs.book.sort, "rating");
		assert.equal(s.prefs.book.density, "large");
		assert.deepEqual(s.prefs.book.openCases, ["wishlist"]);
	});
});
