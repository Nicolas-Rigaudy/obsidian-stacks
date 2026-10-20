import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buyNext, isOrderedSeries, seriesView } from "../src/logic/series.ts";
import { isEligible } from "../src/logic/upNext.ts";
import { parseNote } from "../src/logic/parseNote.ts";
import { BOOK_CONFIG, GAME_CONFIG } from "../src/settings/legacy.ts";
import { mergeSettings } from "../src/settings/settings.ts";
import type { MediaTypeConfig } from "../src/types/mediaConfig.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";
import { note, titles } from "./helpers.ts";

const books = BOOK_CONFIG;
const vol = (title: string, status: string, series: string, position: number, positionEnd?: number) => note(title, status, { name: series, position, positionEnd });
const withSeriesOrder = (base: MediaTypeConfig, orderedByDefault: boolean, exceptions: string[] = []): MediaTypeConfig =>
	({ ...base, series: { ...base.series!, orderedByDefault, exceptions } });

describe("ordered vs loose series", () => {
	test("defaults: books ordered, games loose; exceptions flip it", () => {
		assert.equal(isOrderedSeries(books, "Eisenhorn"), true);
		assert.equal(isOrderedSeries(GAME_CONFIG, "Assassin's Creed"), false);
		const g = withSeriesOrder(GAME_CONFIG, false, ["Mass Effect"]);
		assert.equal(isOrderedSeries(g, "Mass Effect"), true);
	});

	test("a loose series never holds a later entry back", () => {
		const one = vol("AC II", "backlog", "Assassin's Creed", 2);
		const two = vol("AC IV", "backlog", "Assassin's Creed", 4);
		assert.equal(isEligible(two, [one, two], GAME_CONFIG), true);
		const ordered = withSeriesOrder(GAME_CONFIG, false, ["Assassin's Creed"]);
		assert.equal(isEligible(two, [one, two], ordered), false);
	});
});

describe("seriesView", () => {
	test("volumes in order, gaps, next position, counts", () => {
		const all = [
			vol("Hereticus", "read", "Eisenhorn", 3), vol("Xenos", "read", "Eisenhorn", 1),
			vol("Ravenor", "backlog", "Eisenhorn", 5), vol("Pariah", "wishlist", "Eisenhorn", 8),
			vol("Other", "read", "Else", 1),
		];
		const v = seriesView(all, books, "Eisenhorn");
		assert.deepEqual(titles(v.volumes), ["Xenos", "Hereticus", "Ravenor", "Pariah"]);
		assert.deepEqual(v.gaps, [2, 4, 6, 7]);
		assert.equal(v.next, 9);
		assert.deepEqual(v.counts, { read: 2, owned: 3, wishlist: 1 });
		assert.equal(v.ordered, true);
	});

	test("an omnibus covers its whole range", () => {
		const v = seriesView([vol("1", "read", "S", 1), vol("Omnibus", "read", "S", 2, 4), vol("5", "backlog", "S", 5)], books, "S");
		assert.deepEqual(v.gaps, []);
		assert.equal(v.next, 6);
	});
});

describe("buyNext", () => {
	test("next wishlist volume of series you own part of; starred first", () => {
		const all: MediaNote[] = [
			vol("Xenos", "read", "Eisenhorn", 1), vol("Malleus", "backlog", "Eisenhorn", 2),
			vol("Hereticus", "wishlist", "Eisenhorn", 3), vol("Ravenor", "wishlist", "Eisenhorn", 4),
			vol("Mistborn", "wishlist", "Mistborn", 1), // don't own any: not a follow-up
			{ ...note("Scion", "wishlist"), starred: true },
			{ ...note("Owned Star", "read"), starred: true }, // owned: nothing to buy
		];
		const items = buyNext(all, books);
		assert.deepEqual(items.map((i) => [i.note.title, i.reason]), [["Scion", "starred"], ["Hereticus", "series"]]);
	});

	test("a starred follow-up appears once, as starred", () => {
		const all: MediaNote[] = [vol("One", "read", "S", 1), { ...vol("Two", "wishlist", "S", 2), starred: true }];
		assert.deepEqual(buyNext(all, books).map((i) => [i.note.title, i.reason]), [["Two", "starred"]]);
	});

	test("libraries without a wishlist status: stars only", () => {
		const all: MediaNote[] = [vol("A", "finished", "F", 1), vol("B", "backlog", "F", 2), { ...note("C", "backlog"), starred: true }];
		assert.deepEqual(buyNext(all, GAME_CONFIG).map((i) => i.note.title), ["C"]);
	});
});

describe("stars and settings", () => {
	test("buy_next: true is read as a star", () => {
		const n = parseNote("20 Personal/Hobbies/Reading/Books/X.md", "X", { category: "book", buy_next: true }, books);
		assert.equal(n?.starred, true);
		const m = parseNote("20 Personal/Hobbies/Reading/Books/Y.md", "Y", { category: "book" }, books);
		assert.equal(m?.starred, false);
	});

	test("series order settings merge", () => {
		const s = mergeSettings({ mediaTypes: { game: { series: { orderedByDefault: true, exceptions: ["Zelda", 3] } } } });
		assert.equal(s.mediaTypes.game.series?.orderedByDefault, true);
		assert.deepEqual(s.mediaTypes.game.series?.exceptions, ["Zelda"]);
		assert.equal(s.mediaTypes.game.series?.seriesField, "series");
	});
});
