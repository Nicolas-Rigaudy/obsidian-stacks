import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Candidate } from "../src/catalog/parse.ts";
import { buildNewNote, catalogKind, safeFileName, uniqueFileName } from "../src/logic/newNote.ts";
import { removeLastLogLine, restoreFields, snapshotFields } from "../src/logic/undo.ts";
import { BOOK_CONFIG, GAME_CONFIG, WATCHING_CONFIG } from "../src/settings/settings.ts";

const cand = (over: Partial<Candidate> = {}): Candidate => ({
	source: "openlibrary", id: "/works/X", title: "The Final Empire", creators: ["Brandon Sanderson"], year: 2006,
	covers: ["https://covers.openlibrary.org/b/id/1-L.jpg"], total: 541, isbn: "9780765311788", link: "https://openlibrary.org/works/X", note: null, ...over,
});

const fmOf = (text: string) => Object.fromEntries(
	text.split("---")[1].trim().split("\n").map((l) => [l.slice(0, l.indexOf(":")), l.slice(l.indexOf(":") + 1).trim()]),
);

describe("catalogKind", () => {
	test("category → catalogue", () => {
		assert.equal(catalogKind("book"), "book");
		assert.equal(catalogKind("bd"), "book");
		assert.equal(catalogKind("game"), "game");
		assert.equal(catalogKind("series"), "series");
		assert.equal(catalogKind("anime"), "anime");
		assert.equal(catalogKind("movie"), "film");
	});
});

describe("buildNewNote", () => {
	test("a book in the vault's book format", () => {
		const text = buildNewNote({ config: BOOK_CONFIG, category: "book", candidate: cand(), status: "wishlist", cover: "https://c/1.jpg" });
		const fm = fmOf(text);
		assert.equal(fm.category, "book");
		assert.equal(fm.title, '"The Final Empire"');
		assert.equal(fm.author, '"Brandon Sanderson"');
		assert.equal(fm.cover, '"https://c/1.jpg"');
		assert.equal(fm.status, "wishlist");
		assert.equal(fm.pages_read, "0");
		assert.equal(fm.pages_total, "541");
		assert.equal(fm.isbn, '"9780765311788"');
		assert.equal(fm.series, "");
		assert.equal(fm.shelf, '"[[Reading]]"');
		assert.match(text, /\n# 📖 The Final Empire\n/);
		assert.match(text, /\n## Reading log\n/);
	});

	test("several authors become a list; a BD gets its own heading and tag", () => {
		const text = buildNewNote({ config: BOOK_CONFIG, category: "bd", candidate: cand({ title: "Shin Zero", creators: ["Mathieu Bablet", "Guillaume Singelin"] }), status: "backlog", cover: null });
		const fm = fmOf(text);
		assert.equal(fm.author, '["Mathieu Bablet", "Guillaume Singelin"]');
		assert.equal(fm.tags, '["bd"]');
		assert.equal(fm.cover, "");
		assert.match(text, /# 📗 Shin Zero/);
	});

	test("a game records the platform, no page fields, games tags", () => {
		const text = buildNewNote({ config: GAME_CONFIG, category: "game", candidate: cand({ source: "steam", title: "Hades", creators: [], total: null, isbn: null }), status: "backlog", platform: "Switch", cover: "https://s/h.jpg" });
		const fm = fmOf(text);
		assert.equal(fm.platform, '"Switch"');
		assert.equal(fm.pages_read, undefined);
		assert.equal(fm.tags, '["log", "game"]');
		assert.equal(fm.shelf, '"[[Video Games]]"');
		assert.doesNotMatch(text, /Reading log/);
	});

	test("a series gets episode fields; a film doesn't", () => {
		const series = fmOf(buildNewNote({ config: WATCHING_CONFIG, category: "series", candidate: cand({ title: "Severance", creators: ["Apple TV"], total: 19 }), status: "backlog", cover: null }));
		assert.equal(series.episodes_watched, "0");
		assert.equal(series.episodes_total, "19");
		assert.equal(series.network, '"Apple TV"');
		const film = fmOf(buildNewNote({ config: WATCHING_CONFIG, category: "movie", candidate: cand({ title: "Dune: Part Two", creators: [], total: null }), status: "backlog", cover: null }));
		assert.equal(film.episodes_total, undefined);
	});

	test("titles with quotes stay valid YAML", () => {
		const fm = fmOf(buildNewNote({ config: BOOK_CONFIG, category: "book", candidate: cand({ title: 'The "Best" Book' }), status: "wishlist", cover: null }));
		assert.equal(JSON.parse(fm.title), 'The "Best" Book');
	});
});

describe("file names", () => {
	test("safe names", () => {
		assert.equal(safeFileName("Dune: Part Two"), "Dune - Part Two");
		assert.equal(safeFileName('What? "Why" / How*'), "What Why How");
	});
	test("unique: year first, then a counter", () => {
		const taken = new Set(["Silo", "Silo (2023)"]);
		assert.equal(uniqueFileName("Dune", 2021, (n) => taken.has(n)), "Dune");
		assert.equal(uniqueFileName("Silo", 2023, (n) => taken.has(n)), "Silo 2");
		assert.equal(uniqueFileName("Silo", 2024, (n) => taken.has(n)), "Silo (2024)");
	});
});

describe("undo", () => {
	test("restores changed values and removes keys that didn't exist", () => {
		const fm: Record<string, unknown> = { status: "backlog", pages_read: 10 };
		const snap = snapshotFields(fm, ["status", "started", "pages_read"]);
		fm.status = "reading";
		fm.started = "2026-09-25";
		fm.pages_read = 20;
		restoreFields(fm, snap);
		assert.deepEqual(fm, { status: "backlog", pages_read: 10 });
	});

	test("the snapshot is a copy (lists aren't shared)", () => {
		const fm: Record<string, unknown> = { tags: ["a"] };
		const snap = snapshotFields(fm, ["tags"]);
		(fm.tags as string[]).push("b");
		restoreFields(fm, snap);
		assert.deepEqual(fm.tags, ["a"]);
	});

	test("removes only the last matching log line", () => {
		const c = "## Reading log\n- Started [date:: 2026-09-01]\n- Finished [date:: 2026-09-20]\n- Started [date:: 2026-09-01]\n";
		assert.equal(removeLastLogLine(c, "Started [date:: 2026-09-01]"), "## Reading log\n- Started [date:: 2026-09-01]\n- Finished [date:: 2026-09-20]\n");
		assert.equal(removeLastLogLine(c, "Not there"), c);
	});
});
