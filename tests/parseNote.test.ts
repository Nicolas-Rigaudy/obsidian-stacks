import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isInFolder, parseNote } from "../src/logic/parseNote.ts";
import { BOOK_CONFIG } from "../src/settings/settings.ts";

const BOOKS = "20 Personal/Hobbies/Reading/Books";
const path = (name: string) => `${BOOKS}/${name}.md`;

describe("isInFolder", () => {
	test("inside, nested, outside, sibling-prefix", () => {
		assert.equal(isInFolder(`${BOOKS}/X.md`, BOOKS), true);
		assert.equal(isInFolder(`${BOOKS}/Sub/X.md`, BOOKS), true);
		assert.equal(isInFolder("99 Archive/X.md", BOOKS), false);
		assert.equal(isInFolder(`${BOOKS} Old/X.md`, BOOKS), false);
	});
	test("tolerates slashes; empty folder = whole vault", () => {
		assert.equal(isInFolder(`${BOOKS}/X.md`, `/${BOOKS}/`), true);
		assert.equal(isInFolder("anything.md", ""), true);
	});
});

describe("parseNote (book config)", () => {
	test("a real series book", () => {
		const n = parseNote(path("Malleus"), "Malleus", {
			category: "book",
			title: "Malleus",
			status: "backlog",
			series: "Eisenhorn",
			position: 2,
			position_end: null,
			pages_read: 0,
			pages_total: 352,
			cover: "https://covers.openlibrary.org/b/id/1-L.jpg",
			rating: null,
		}, BOOK_CONFIG);
		assert.ok(n);
		assert.equal(n.title, "Malleus");
		assert.equal(n.status, "backlog");
		assert.deepEqual(n.series, { name: "Eisenhorn", position: 2, positionEnd: null });
		assert.deepEqual(n.progress, { current: 0, total: 352 });
		assert.equal(n.cover, "https://covers.openlibrary.org/b/id/1-L.jpg");
	});

	test('series: "" means no series (18 real notes have this)', () => {
		const n = parseNote(path("Scion"), "Scion", { category: "book", series: "", position: 1 }, BOOK_CONFIG);
		assert.equal(n?.series, null);
	});

	test("archived copies outside the folder are excluded", () => {
		assert.equal(parseNote("99 Archive/Lorebase trial copies/Xenos.md", "Xenos", { category: "book" }, BOOK_CONFIG), null);
	});

	test("wrong category or no frontmatter is excluded", () => {
		assert.equal(parseNote(path("X"), "X", { category: "game" }, BOOK_CONFIG), null);
		assert.equal(parseNote(path("X"), "X", undefined, BOOK_CONFIG), null);
	});

	test("category as a list", () => {
		assert.ok(parseNote(path("X"), "X", { category: ["book", "reference"] }, BOOK_CONFIG));
	});

	test("title falls back to the filename; blanks become null", () => {
		const n = parseNote(path("Untitled Thing"), "Untitled Thing", { category: "book", title: "", cover: "", status: "" }, BOOK_CONFIG);
		assert.equal(n?.title, "Untitled Thing");
		assert.equal(n?.cover, null);
		assert.equal(n?.status, null);
	});

	test("numeric strings are coerced; missing progress is 0 with unknown total", () => {
		const n = parseNote(path("X"), "X", { category: "book", series: "S", position: "3", rating: "4" }, BOOK_CONFIG);
		assert.equal(n?.series?.position, 3);
		assert.equal(n?.rating, 4);
		assert.deepEqual(n?.progress, { current: 0, total: null });
	});

	test("category is recorded; progress only for the listed categories", () => {
		const reading = { ...BOOK_CONFIG, folder: "20 Personal/Hobbies/Reading", categoryValues: ["book", "bd"], progress: { ...BOOK_CONFIG.progress!, categories: ["book"] } };
		const book = parseNote("20 Personal/Hobbies/Reading/Books/X.md", "X", { category: "book", pages_read: 10 }, reading);
		const bd = parseNote("20 Personal/Hobbies/Reading/BDs/Y.md", "Y", { category: "bd" }, reading);
		assert.equal(book?.category, "book");
		assert.deepEqual(book?.progress, { current: 10, total: null });
		assert.equal(bd?.category, "bd");
		assert.equal(bd?.progress, null);
	});

	test("omnibus range; an invalid range is dropped", () => {
		const ok = parseNote(path("O"), "O", { category: "book", series: "S", position: 4, position_end: 6 }, BOOK_CONFIG);
		assert.deepEqual(ok?.series, { name: "S", position: 4, positionEnd: 6 });
		const bad = parseNote(path("O"), "O", { category: "book", series: "S", position: 4, position_end: 2 }, BOOK_CONFIG);
		assert.equal(bad?.series?.positionEnd, null);
	});
});
