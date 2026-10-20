import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { bucketOf, isEligible, rankCandidates } from "../src/logic/upNext.ts";
import { BOOK_CONFIG } from "../src/settings/legacy.ts";
import type { MediaTypeConfig } from "../src/types/mediaConfig.ts";
import { note, titles } from "./helpers.ts";

const books = BOOK_CONFIG;

describe("bucketOf", () => {
	test("maps configured statuses to their bucket", () => {
		assert.equal(bucketOf("backlog", books), "backlog");
		assert.equal(bucketOf("reading", books), "active");
		assert.equal(bucketOf("read", books), "done");
		assert.equal(bucketOf("wishlist", books), "other");
	});
	test("unknown or missing status is 'other'", () => {
		assert.equal(bucketOf("abandoned", books), "other");
		assert.equal(bucketOf(null, books), "other");
	});
});

describe("isEligible", () => {
	test("a standalone book is always eligible", () => {
		const b = note("Scion", "backlog");
		assert.equal(isEligible(b, [b], books), true);
	});

	test("a series entry with no position is eligible", () => {
		const b = note("Loose", "backlog", { name: "Eisenhorn" });
		const other = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		assert.equal(isEligible(b, [b, other], books), true);
	});

	test("blocked while an earlier volume is unread", () => {
		const one = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		assert.equal(isEligible(two, [one, two], books), false);
	});

	test("an earlier volume in progress doesn't block the next one", () => {
		const one = note("Xenos", "reading", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		assert.equal(isEligible(two, [one, two], books), true);
	});

	test("...but an unstarted earlier volume still blocks, even if a later one is in progress", () => {
		const one = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "reading", { name: "Eisenhorn", position: 2 });
		const three = note("Hereticus", "backlog", { name: "Eisenhorn", position: 3 });
		assert.equal(isEligible(three, [one, two, three], books), false);
	});

	test("only the volume right after the current one opens up, not the ones beyond", () => {
		const one = note("Xenos", "reading", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		const three = note("Hereticus", "backlog", { name: "Eisenhorn", position: 3 });
		assert.equal(isEligible(three, [one, two, three], books), false);
	});

	test("eligible once every earlier volume is read", () => {
		const one = note("Xenos", "read", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "read", { name: "Eisenhorn", position: 2 });
		const three = note("Hereticus", "backlog", { name: "Eisenhorn", position: 3 });
		assert.equal(isEligible(three, [one, two, three], books), true);
	});

	test("only earlier volumes matter, not later ones", () => {
		const one = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		assert.equal(isEligible(one, [one, two], books), true);
	});

	test("other series don't interfere", () => {
		const cain = note("For the Emperor", "backlog", { name: "Ciaphas Cain", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		const one = note("Xenos", "read", { name: "Eisenhorn", position: 1 });
		assert.equal(isEligible(two, [cain, one, two], books), true);
	});

	test("a read omnibus covers the single volumes inside its range", () => {
		// Books 4-6 read as one omnibus; a stray single note for book 5 is still in the backlog.
		const omnibus = note("Omnibus 4-6", "read", { name: "S", position: 4, positionEnd: 6 });
		const five = note("Five", "backlog", { name: "S", position: 5 });
		const seven = note("Seven", "backlog", { name: "S", position: 7 });
		const earlier = [1, 2, 3].map((p) => note(`B${p}`, "read", { name: "S", position: p }));
		assert.equal(isEligible(seven, [...earlier, omnibus, five, seven], books), true);
	});

	test("an unread omnibus blocks what comes after it", () => {
		const omnibus = note("Omnibus 1-3", "backlog", { name: "S", position: 1, positionEnd: 3 });
		const four = note("Four", "backlog", { name: "S", position: 4 });
		assert.equal(isEligible(four, [omnibus, four], books), false);
	});

	test("series config switched off: nothing is ever blocked", () => {
		const noSeries: MediaTypeConfig = { ...books, series: null };
		const one = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		assert.equal(isEligible(two, [one, two], noSeries), true);
	});
});

describe("rankCandidates", () => {
	test("only backlog-bucket notes are candidates (wishlist, reading, read are not)", () => {
		const all = [
			note("Wish", "wishlist"),
			note("Now", "reading"),
			note("Done", "read"),
			note("Next", "backlog"),
		];
		assert.deepEqual(titles(rankCandidates(all, books).eligible), ["Next"]);
	});

	test("blocked volumes are reported as held back", () => {
		const one = note("Xenos", "backlog", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		const r = rankCandidates([one, two], books);
		assert.deepEqual(titles(r.eligible), ["Xenos"]);
		assert.deepEqual(titles(r.heldBack), ["Malleus"]);
	});

	test("while book 2 is being read, book 3 is suggested first", () => {
		const one = note("For the Emperor", "read", { name: "Ciaphas Cain", position: 1 });
		const two = note("Caves of Ice", "reading", { name: "Ciaphas Cain", position: 2 });
		const three = note("The Traitor's Hand", "backlog", { name: "Ciaphas Cain", position: 3 });
		const four = note("Death or Glory", "backlog", { name: "Ciaphas Cain", position: 4 });
		const fresh = note("Mistborn", "backlog", { name: "Mistborn", position: 1 });
		const r = rankCandidates([fresh, one, two, three, four], books);
		assert.deepEqual(titles(r.eligible), ["The Traitor's Hand", "Mistborn"]);
		assert.deepEqual(titles(r.heldBack), ["Death or Glory"]);
	});

	test("real Eisenhorn data (2026-09-24): Ravenor opens up once The Magos sits after it", () => {
		const s = (title: string, status: string, position: number) => note(title, status, { name: "Eisenhorn", position });
		const all = [
			s("Xenos", "read", 1), s("Malleus", "read", 2), s("Hereticus", "read", 3),
			s("Ravenor", "backlog", 4), s("Ravenor Returned", "backlog", 5), s("Ravenor Rogue", "backlog", 6),
			s("The Magos", "wishlist", 7), s("Pariah", "wishlist", 8),
		];
		const r = rankCandidates(all, books);
		assert.deepEqual(titles(r.eligible), ["Ravenor"]);
		assert.deepEqual(titles(r.heldBack), ["Ravenor Returned", "Ravenor Rogue"]);
	});

	test("an eligible book in an active series ranks ahead of a lower position elsewhere", () => {
		// Reading an unnumbered side novel keeps the series active without blocking anything.
		const side = note("The Magos", "reading", { name: "Eisenhorn" });
		const one = note("Xenos", "read", { name: "Eisenhorn", position: 1 });
		const two = note("Malleus", "backlog", { name: "Eisenhorn", position: 2 });
		const fresh = note("Mistborn", "backlog", { name: "Mistborn", position: 1 });
		const r = rankCandidates([fresh, side, one, two], books);
		assert.deepEqual(titles(r.eligible), ["Malleus", "Mistborn"]);
	});

	test("active series first, then by position, then by title", () => {
		const sun1 = note("Empire of Silence", "read", { name: "The Sun Eater", position: 1 });
		const sun2 = note("Howling Dark", "backlog", { name: "The Sun Eater", position: 2 });
		const sun3 = note("Demon in White", "reading", { name: "The Sun Eater", position: 3 });
		const zulu = note("Zulu", "backlog");
		const alpha = note("Alpha", "backlog");
		const mistborn = note("Mistborn", "backlog", { name: "Mistborn", position: 1 });
		const r = rankCandidates([zulu, sun1, sun2, sun3, alpha, mistborn], books);
		// Howling Dark: series active (book 3 in progress) and book 1 read -> first.
		// Then Mistborn (has a position), then standalones by title.
		assert.deepEqual(titles(r.eligible), ["Howling Dark", "Mistborn", "Alpha", "Zulu"]);
	});

	test("works with any status names: buckets drive it, not strings", () => {
		const games: MediaTypeConfig = {
			...books,
			statuses: [
				{ value: "backlog", label: "Backlog", bucket: "backlog" },
				{ value: "playing", label: "Playing", bucket: "active" },
				{ value: "played", label: "Played", bucket: "done" },
				{ value: "finished", label: "Finished", bucket: "done" },
			],
		};
		const one = note("Game 1", "played", { name: "Franchise", position: 1 });
		const two = note("Game 2", "finished", { name: "Franchise", position: 2 });
		const three = note("Game 3", "backlog", { name: "Franchise", position: 3 });
		assert.deepEqual(titles(rankCandidates([one, two, three], games).eligible), ["Game 3"]);
	});

	test("empty library", () => {
		assert.deepEqual(rankCandidates([], books), { eligible: [], heldBack: [] });
	});
});
