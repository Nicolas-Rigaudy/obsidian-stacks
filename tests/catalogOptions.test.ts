import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { activeSources, catalogOptionsFor, KIND_SOURCES } from "../src/catalog/sources.ts";
import { startingStatus } from "../src/logic/newNote.ts";
import { PRESETS } from "../src/settings/presets.ts";
import { DEFAULT_SETTINGS, mergeSettings } from "../src/settings/settings.ts";

describe("catalogue sources per library", () => {
	test("every source of a kind is on until the library switches it off", () => {
		assert.deepEqual(activeSources("game", []), ["steam", "wikipedia"]);
		assert.deepEqual(activeSources("game", ["steam"]), ["wikipedia"]);
		assert.deepEqual(activeSources("film", ["wikipedia", "kitsu"]), []);
		assert.deepEqual(activeSources("book", ["steam"]), ["openlibrary"]);
	});

	test("options carry the sources and the global store choices", () => {
		const o = catalogOptionsFor("game", ["wikipedia"], { steamRegion: "DE", steamLanguage: "german" });
		assert.deepEqual(o, { sources: ["steam"], region: "DE", language: "german" });
	});

	test("every kind has at least one source", () => {
		for (const sources of Object.values(KIND_SOURCES)) assert.ok(sources.length > 0);
	});
});

describe("catalogue and new-note settings", () => {
	test("a fresh install uses the US store in English; pre-0.3 data keeps the French store it had", () => {
		assert.deepEqual(mergeSettings(null).catalog, { steamRegion: "US", steamLanguage: "english" });
		assert.equal(mergeSettings({ mediaTypes: {} }).catalog.steamRegion, "FR");
		assert.equal(mergeSettings({ mediaTypes: {}, catalog: { steamRegion: "de" } }).catalog.steamRegion, "DE");
	});

	test("a bad region or language is ignored", () => {
		const s = mergeSettings({ version: 2, catalog: { steamRegion: "France", steamLanguage: 3 } });
		assert.deepEqual(s.catalog, DEFAULT_SETTINGS.catalog);
	});

	test("switched-off catalogues, default status and template survive a save and reload", () => {
		const s = mergeSettings(null);
		s.mediaTypes.g = { ...PRESETS.find((p) => p.id === "games")!.build(), disabledCatalogs: ["steam"], defaultStatus: "playing", templatePath: "T/Game" };
		const again = mergeSettings(JSON.parse(JSON.stringify(s)));
		assert.deepEqual(again.mediaTypes.g.disabledCatalogs, ["steam"]);
		assert.equal(again.mediaTypes.g.defaultStatus, "playing");
		assert.equal(again.mediaTypes.g.templatePath, "T/Game");
	});

	test("starting status: the library's choice if it exists, else wishlist, else first backlog", () => {
		const books = PRESETS.find((p) => p.id === "books")!.build();
		assert.equal(startingStatus(books), "wishlist");
		assert.equal(startingStatus({ ...books, defaultStatus: "reading" }), "reading");
		assert.equal(startingStatus({ ...books, defaultStatus: "gone" }), "wishlist");
		const games = PRESETS.find((p) => p.id === "games")!.build();
		assert.equal(startingStatus(games), "backlog");
	});
});
