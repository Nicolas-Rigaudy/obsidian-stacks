import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BOOK_CONFIG } from "../src/settings/legacy.ts";
import { DEFAULT_SETTINGS, mergePrefs, mergeSettings, needsMigration } from "../src/settings/settings.ts";
import { addLibraryFromPreset, PRESETS, removeLibrary } from "../src/settings/presets.ts";

describe("mergeSettings", () => {
	test("no saved data gives the defaults", () => {
		assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);
		assert.deepEqual(mergeSettings("garbage"), DEFAULT_SETTINGS);
	});

	test("result is a copy: editing it doesn't touch the defaults", () => {
		const s = mergeSettings({ mediaTypes: {} });
		s.mediaTypes.book.statuses.push({ value: "x", label: "X", bucket: "other" });
		s.mediaTypes.book.progress!.quickIncrements.push(100);
		assert.equal(BOOK_CONFIG.statuses.length, 4);
		assert.deepEqual(BOOK_CONFIG.progress!.quickIncrements, [10, 25]);
	});

	test("saved values win, missing ones come from defaults", () => {
		const s = mergeSettings({ mediaTypes: { book: { label: "Library", folder: "Books" } } });
		assert.equal(s.mediaTypes.book.label, "Library");
		assert.equal(s.mediaTypes.book.folder, "Books");
		assert.equal(s.mediaTypes.book.coverField, "cover");
		assert.deepEqual(s.mediaTypes.book.statuses, BOOK_CONFIG.statuses);
	});

	test("nested groups merge field by field", () => {
		const s = mergeSettings({ mediaTypes: { book: { progress: { quickIncrements: [5, 50], unitLabel: "p." } } } });
		assert.deepEqual(s.mediaTypes.book.progress, {
			categories: [],
			currentField: "pages_read",
			totalField: "pages_total",
			unitLabel: "p.",
			quickIncrements: [5, 50],
		});
	});

	test("explicit null switches a group off", () => {
		const s = mergeSettings({ mediaTypes: { book: { series: null } } });
		assert.equal(s.mediaTypes.book.series, null);
		assert.ok(s.mediaTypes.book.progress);
	});

	test("saved statuses replace the list; bad entries dropped, bad buckets become 'other'", () => {
		const s = mergeSettings({
			mediaTypes: {
				book: {
					statuses: [
						{ value: "backlog", label: "To read", bucket: "backlog" },
						{ value: "dnf", bucket: "nonsense" },
						{ label: "no value" },
						"junk",
					],
				},
			},
		});
		assert.deepEqual(s.mediaTypes.book.statuses, [
			{ value: "backlog", label: "To read", bucket: "backlog" },
			{ value: "dnf", label: "dnf", bucket: "other" },
		]);
	});

	test("filter chips and progress categories merge; bad chips dropped", () => {
		const s = mergeSettings({
			mediaTypes: {
				book: {
					categoryFilters: [{ value: "book", label: "Books" }, { value: "bd" }, { label: "no value" }],
					progress: { categories: ["book", 3] },
				},
			},
		});
		assert.deepEqual(s.mediaTypes.book.categoryFilters, [{ value: "book", label: "Books" }, { value: "bd", label: "bd" }]);
		assert.deepEqual(s.mediaTypes.book.progress!.categories, ["book"]);
	});

	test("status hints survive the merge; blank hints are dropped", () => {
		const s = mergeSettings({ mediaTypes: { game: { statuses: [{ value: "played", label: "Played", bucket: "other", hint: "might return" }, { value: "x", bucket: "other", hint: "  " }] } } });
		assert.deepEqual(s.mediaTypes.game.statuses, [
			{ value: "played", label: "Played", bucket: "other", hint: "might return" },
			{ value: "x", label: "x", bucket: "other" },
		]);
	});

	test("episodes for series and anime, not films", () => {
		const p = mergeSettings({ mediaTypes: {} }).mediaTypes.watching.progress!;
		assert.deepEqual([p.currentField, p.totalField, p.categories], ["episodes_watched", "episodes_total", ["series", "anime"]]);
	});

	test("defaults ship Games and Watching with the agreed statuses", () => {
		const s = mergeSettings({ mediaTypes: {} });
		const bucket = (id: string, v: string) => s.mediaTypes[id].statuses.find((x) => x.value === v)?.bucket;
		assert.equal(bucket("game", "played"), "other"); // played but not finished: not done
		assert.equal(bucket("game", "finished"), "done");
		assert.equal(bucket("watching", "watched"), "done");
		assert.deepEqual(s.mediaTypes.watching.categoryFilters.map((f) => f.value), ["movie", "series", "anime"]);
	});

	test("look per library; an unknown look falls back to the default", () => {
		const s = mergeSettings({ mediaTypes: { game: { appearance: "vinyl" }, watching: { appearance: "books" } } });
		assert.equal(s.mediaTypes.book.appearance, "books");
		assert.equal(s.mediaTypes.game.appearance, "games");
		assert.equal(s.mediaTypes.watching.appearance, "books");
	});

	test("old books-only saved settings move to the combined Reading library; hand edits survive", () => {
		const s = mergeSettings({
			mediaTypes: {
				book: {
					label: "Books",
					folder: "20 Personal/Hobbies/Reading/Books",
					categoryValues: ["book"],
					progress: { quickIncrements: [5, 50] },
				},
			},
		});
		const b = s.mediaTypes.book;
		assert.equal(b.folder, "20 Personal/Hobbies/Reading");
		assert.deepEqual(b.categoryValues, ["book", "bd"]);
		assert.equal(b.label, "Reading");
		assert.deepEqual(b.progress!.categories, []);
		assert.deepEqual(b.progress!.quickIncrements, [5, 50]);

		const custom = mergeSettings({ mediaTypes: { book: { folder: "Library", categoryValues: ["book"] } } });
		assert.equal(custom.mediaTypes.book.folder, "Library");
		assert.deepEqual(custom.mediaTypes.book.categoryValues, ["book"]);
	});

	test("wrong-typed values are ignored", () => {
		const s = mergeSettings({ mediaTypes: { book: { folder: 42, enabled: "yes", categoryValues: "book" } } });
		assert.equal(s.mediaTypes.book.folder, BOOK_CONFIG.folder);
		assert.equal(s.mediaTypes.book.enabled, true);
		assert.deepEqual(s.mediaTypes.book.categoryValues, ["book", "bd"]);
	});

	test("libraries the user added are kept, filled out from the blank template", () => {
		const s = mergeSettings({ mediaTypes: { comics: { label: "Comics", folder: "Reading/BDs" } } });
		assert.deepEqual(Object.keys(s.mediaTypes), ["book", "game", "watching", "comics"]);
		assert.equal(s.mediaTypes.comics.label, "Comics");
		assert.equal(s.mediaTypes.comics.folder, "Reading/BDs");
		assert.equal(s.mediaTypes.comics.statusField, "status");
		assert.equal(s.mediaTypes.comics.progress, null);
	});
});

describe("neutral defaults and presets", () => {
	test("a fresh install has no library and no vault-specific path", () => {
		for (const saved of [null, undefined, "garbage", {}, { version: 2 }]) {
			const s = mergeSettings(saved);
			assert.deepEqual(s.mediaTypes, {});
		}
		assert.doesNotMatch(JSON.stringify(DEFAULT_SETTINGS), /Personal|Hobbies/);
	});

	test("no preset carries a folder or a vault-specific value", () => {
		for (const p of PRESETS) {
			const c = p.build();
			assert.equal(c.folder, "", p.id);
			assert.doesNotMatch(JSON.stringify(c), /Personal|Hobbies|\[\[|"area"|dataview/i, p.id);
			for (const n of Object.values(c.newNotes)) assert.equal(n.folder, "", p.id);
		}
	});

	test("books, video games and films & series presets exist and each has a board column order", () => {
		const ids = PRESETS.map((p) => p.id);
		for (const id of ["books", "games", "watching"]) assert.ok(ids.includes(id), id);
		for (const p of PRESETS) {
			const c = p.build();
			assert.ok(c.statuses.some((s) => s.bucket === "backlog"), p.id);
			assert.ok(c.statuses.some((s) => s.bucket === "active"), p.id);
			assert.ok(c.statuses.some((s) => s.bucket === "done"), p.id);
			assert.ok(c.categoryValues.length > 0, p.id);
		}
	});

	test("adding a library from a preset survives a save and reload unchanged", () => {
		const s = mergeSettings(null);
		const id = addLibraryFromPreset(s, "books")!;
		s.mediaTypes[id].folder = "Library/Books";
		const again = mergeSettings(JSON.parse(JSON.stringify(s)));
		assert.deepEqual(again, s);
	});

	test("the same preset twice gets distinct ids; unknown preset adds nothing", () => {
		const s = mergeSettings(null);
		assert.equal(addLibraryFromPreset(s, "books"), "books");
		assert.equal(addLibraryFromPreset(s, "books"), "books-2");
		assert.equal(addLibraryFromPreset(s, "nope"), null);
		assert.deepEqual(Object.keys(s.mediaTypes), ["books", "books-2"]);
	});

	test("removing a library drops its view state too", () => {
		const s = mergeSettings(null);
		const id = addLibraryFromPreset(s, "games")!;
		s.prefs[id] = mergePrefs({ sort: "title" });
		removeLibrary(s, id);
		assert.deepEqual([s.mediaTypes, s.prefs], [{}, {}]);
	});

	test("data saved before versioning keeps the old libraries; versioned data does not get them back", () => {
		assert.deepEqual(Object.keys(mergeSettings({ mediaTypes: {} }).mediaTypes), ["book", "game", "watching"]);
		assert.equal(needsMigration({ mediaTypes: {}, prefs: {} }), true);
		const kept = mergeSettings({ version: 2, mediaTypes: { game: { label: "Games" } } });
		assert.deepEqual(Object.keys(kept.mediaTypes), ["game"]);
		assert.equal(needsMigration(kept), false);
		assert.equal(needsMigration(null), false);
	});

	test("a migrated setup, once saved, reloads identical without the legacy defaults", () => {
		const old = mergeSettings({ mediaTypes: { book: { folder: "Mine" } }, prefs: { book: { sort: "title" } } });
		const reloaded = mergeSettings(JSON.parse(JSON.stringify(old)));
		assert.deepEqual(reloaded, old);
		assert.equal(reloaded.mediaTypes.book.folder, "Mine");
		assert.equal(reloaded.prefs.book.sort, "title");
	});
});
