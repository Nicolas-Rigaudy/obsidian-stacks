import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { creatorOf, progressFraction, secondaryLine, seriesLabel } from "../src/logic/cardText.ts";
import { parseCoverRef } from "../src/logic/cover.ts";
import { sortNotes } from "../src/logic/listSort.ts";
import { bindingHue, stableRange } from "../src/logic/placeholder.ts";
import { SerialQueue } from "../src/logic/serialQueue.ts";
import { shelfSections } from "../src/logic/shelf.ts";
import { firstStatusOf } from "../src/logic/upNext.ts";
import { parseBlockParams } from "../src/logic/viewKinds.ts";
import { BOOK_CONFIG } from "../src/settings/settings.ts";
import type { MediaNote } from "../src/types/mediaNote.ts";
import { note, titles } from "./helpers.ts";

const books = BOOK_CONFIG;
const withFm = (n: MediaNote, fm: Record<string, unknown>): MediaNote => ({ ...n, frontmatter: fm });

describe("card text", () => {
	test("series + position + author", () => {
		const n = withFm(note("Caves of Ice", "read", { name: "Ciaphas Cain", position: 2 }), { author: "Sandy Mitchell" });
		assert.equal(secondaryLine(n, books), "Ciaphas Cain #2 · Sandy Mitchell");
	});
	test("standalone: author only; omnibus range; unnumbered series", () => {
		assert.equal(secondaryLine(withFm(note("Scion", "wishlist"), { author: "James Islington" }), books), "James Islington");
		assert.equal(seriesLabel(note("O", "read", { name: "S", position: 4, positionEnd: 6 })), "S #4–6");
		assert.equal(seriesLabel(note("Side", "read", { name: "Eisenhorn" })), "Eisenhorn");
	});
	test("author lists and wikilinks", () => {
		assert.equal(creatorOf(withFm(note("M", "x"), { author: ["[[Anand Gandhi]]", "Zain Memon"] }), books), "Anand Gandhi, Zain Memon");
		assert.equal(creatorOf(withFm(note("M", "x"), { author: "[[People/X|Dan Abnett]]" }), books), "Dan Abnett");
		assert.equal(creatorOf(withFm(note("M", "x"), { author: "" }), books), null);
	});
	test("progress fraction", () => {
		assert.equal(progressFraction({ ...note("T", "reading"), progress: { current: 208, total: 416 } }), 0.5);
		assert.equal(progressFraction({ ...note("T", "reading"), progress: { current: 225, total: null } }), null);
		assert.equal(progressFraction({ ...note("T", "reading"), progress: { current: 999, total: 416 } }), 1);
	});
});

describe("parseCoverRef", () => {
	test("URLs and vault links", () => {
		assert.deepEqual(parseCoverRef("https://covers.openlibrary.org/b/id/1-L.jpg"), { kind: "url", url: "https://covers.openlibrary.org/b/id/1-L.jpg" });
		assert.deepEqual(parseCoverRef("![[covers/xenos.jpg|200]]"), { kind: "vault", link: "covers/xenos.jpg" });
		assert.deepEqual(parseCoverRef("Attachments/x.png"), { kind: "vault", link: "Attachments/x.png" });
		assert.equal(parseCoverRef("  "), null);
		assert.equal(parseCoverRef(null), null);
	});
});

describe("placeholder", () => {
	test("stable and in range", () => {
		assert.equal(bindingHue("Xenos"), bindingHue("Xenos"));
		for (const t of ["a", "Xenos", "The Wandering Inn", ""]) {
			const h = bindingHue(t);
			assert.ok(h >= 0 && h < 360);
			const w = stableRange(t, 20, 30);
			assert.ok(w >= 20 && w <= 30 && Number.isInteger(w));
		}
	});
});

describe("shelfSections", () => {
	const all = [
		note("Xenos", "read", { name: "Eisenhorn", position: 1 }),
		note("Malleus", "read", { name: "Eisenhorn", position: 2 }),
		note("Hereticus", "read", { name: "Eisenhorn", position: 3 }),
		note("Ravenor", "backlog", { name: "Eisenhorn", position: 4 }),
		note("The Traitor's Hand", "reading", { name: "Ciaphas Cain", position: 3 }),
		note("Mistborn", "wishlist", { name: "Mistborn", position: 1 }),
		note("Aardvark", "read"),
		note("Odd", "abandoned"),
	];

	test("bookcases ordered reading → to read → read → other, empty ones skipped", () => {
		const labels = shelfSections(all, books).map((s) => s.status?.value ?? "(unsorted)");
		assert.deepEqual(labels, ["reading", "backlog", "read", "wishlist", "(unsorted)"]);
	});

	test("several volumes of a series on one shelf become a pile, in reading order", () => {
		const read = shelfSections(all, books).find((s) => s.status?.value === "read")!;
		assert.equal(read.count, 4);
		assert.equal(read.items.length, 2);
		const [first, second] = read.items;
		assert.equal(first.kind, "book"); // Aardvark sorts before Eisenhorn
		assert.equal(second.kind, "pile");
		if (second.kind === "pile") {
			assert.equal(second.series, "Eisenhorn");
			assert.deepEqual(titles(second.notes), ["Xenos", "Malleus", "Hereticus"]);
		}
	});

	test("a lone volume of a series stays a single book", () => {
		const backlog = shelfSections(all, books).find((s) => s.status?.value === "backlog")!;
		assert.equal(backlog.items[0].kind, "book");
	});

	test("status filter; no unsorted bookcase when filtering", () => {
		const s = shelfSections(all, books, ["read", "abandoned"]);
		assert.deepEqual(s.map((x) => x.status?.value), ["read"]);
	});

	test("empty bookcases on request (drop targets), still in bucket order", () => {
		const onlyRead = [note("Xenos", "read")];
		assert.deepEqual(shelfSections(onlyRead, books).map((x) => x.status?.value), ["read"]);
		const all = shelfSections(onlyRead, books, null, true);
		assert.deepEqual(all.map((x) => [x.status?.value, x.count]), [["reading", 0], ["backlog", 0], ["read", 1], ["wishlist", 0]]);
	});

	test("no piles when the library has no series config", () => {
		const s = shelfSections(all, { ...books, series: null }).find((x) => x.status?.value === "read")!;
		assert.ok(s.items.every((i) => i.kind === "book"));
	});
});

describe("sortNotes", () => {
	const a = { ...note("Alpha", "read"), rating: 3 };
	const b = { ...note("Beta", "backlog", { name: "S", position: 2 }), rating: 5 };
	const c = { ...note("Gamma", "wishlist", { name: "S", position: 1 }), rating: null };
	test("by title, both directions", () => {
		assert.deepEqual(titles(sortNotes([c, a, b], books, "title", "asc")), ["Alpha", "Beta", "Gamma"]);
		assert.deepEqual(titles(sortNotes([c, a, b], books, "title", "desc")), ["Gamma", "Beta", "Alpha"]);
	});
	test("empty values last in either direction", () => {
		assert.deepEqual(titles(sortNotes([c, a, b], books, "rating", "desc")), ["Beta", "Alpha", "Gamma"]);
		assert.deepEqual(titles(sortNotes([c, a, b], books, "rating", "asc")), ["Alpha", "Beta", "Gamma"]);
	});
	test("series sorts by position within the series; status by configured order", () => {
		assert.deepEqual(titles(sortNotes([a, b, c], books, "series", "asc")), ["Gamma", "Beta", "Alpha"]);
		assert.deepEqual(titles(sortNotes([a, b, c], books, "status", "asc")), ["Gamma", "Beta", "Alpha"]);
	});
});

describe("parseBlockParams", () => {
	test("defaults to the shelf", () => {
		assert.deepEqual(parseBlockParams(""), { view: "shelf", library: null, statuses: null, errors: [] });
	});
	test("options and aliases", () => {
		const p = parseBlockParams("view: kanban\nlibrary: book\nstatus: backlog, reading\n");
		assert.deepEqual(p, { view: "board", library: "book", statuses: ["backlog", "reading"], errors: [] });
		assert.equal(parseBlockParams("view: Up Next").view, "upnext");
		assert.equal(parseBlockParams("view: gallery").view, "shelf");
	});
	test("reports mistakes instead of failing silently", () => {
		const p = parseBlockParams("view: carousel\ncolour: red\nnonsense");
		assert.equal(p.view, "shelf");
		assert.equal(p.errors.length, 3);
	});
});

describe("firstStatusOf", () => {
	test("what Start and Finish set", () => {
		assert.equal(firstStatusOf(books, "active"), "reading");
		assert.equal(firstStatusOf(books, "done"), "read");
		assert.equal(firstStatusOf({ ...books, statuses: [] }, "done"), null);
	});
});

describe("SerialQueue (stale-button regression)", () => {
	test("two quick bumps on the same note accumulate: +10 twice gives +20", async () => {
		const q = new SerialQueue();
		let stored = 100;
		// Simulates processFrontMatter: read the live value, yield, write.
		const bump = (delta: number) =>
			q.run("book.md", async () => {
				const current = stored;
				await new Promise((r) => setTimeout(r, 5));
				stored = current + delta;
				return stored;
			});
		const results = await Promise.all([bump(10), bump(10)]);
		assert.deepEqual(results, [110, 120]);
		assert.equal(stored, 120);
	});

	test("different notes don't wait on each other; a failure doesn't block the next task", async () => {
		const q = new SerialQueue();
		const order: string[] = [];
		const slow = q.run("a.md", async () => {
			await new Promise((r) => setTimeout(r, 20));
			order.push("a");
		});
		const fast = q.run("b.md", async () => {
			order.push("b");
		});
		await Promise.all([slow, fast]);
		assert.deepEqual(order, ["b", "a"]);

		await assert.rejects(q.run("a.md", async () => { throw new Error("boom"); }));
		assert.equal(await q.run("a.md", async () => "after"), "after");
	});

	test("forgets idle keys", async () => {
		const q = new SerialQueue();
		await q.run("a.md", async () => 1);
		await new Promise((r) => setTimeout(r, 0));
		assert.equal(q.size, 0);
	});
});
