import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { BOOK_CONFIG, DEFAULT_SETTINGS, mergeSettings } from "../src/settings/settings.ts";

describe("mergeSettings", () => {
	test("no saved data gives the defaults", () => {
		assert.deepEqual(mergeSettings(null), DEFAULT_SETTINGS);
		assert.deepEqual(mergeSettings("garbage"), DEFAULT_SETTINGS);
	});

	test("result is a copy: editing it doesn't touch the defaults", () => {
		const s = mergeSettings(null);
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

	test("defaults ship Games and Watching with the agreed statuses", () => {
		const s = mergeSettings(null);
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

	test("wrong-typed values are ignored", () => {
		const s = mergeSettings({ mediaTypes: { book: { folder: 42, enabled: "yes", categoryValues: "book" } } });
		assert.equal(s.mediaTypes.book.folder, BOOK_CONFIG.folder);
		assert.equal(s.mediaTypes.book.enabled, true);
		assert.deepEqual(s.mediaTypes.book.categoryValues, ["book"]);
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
