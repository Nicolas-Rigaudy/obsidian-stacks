import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { sortNotes } from "../src/logic/listSort.ts";
import { parseNote } from "../src/logic/parseNote.ts";
import { buyNext } from "../src/logic/series.ts";
import { shelfSections } from "../src/logic/shelf.ts";
import { rankCandidates } from "../src/logic/upNext.ts";
import { PRESETS } from "../src/settings/presets.ts";

// The pure part of opening a 1,000-note library: parse, group, rank. The budget
// is generous (the screen must open in a second, including drawing); this
// catches an accidental quadratic step, not a few milliseconds.
const BUDGET_MS = 400;

describe("a library of 1,000 notes", () => {
	const config = { ...PRESETS.find((p) => p.id === "books")!.build(), folder: "Books" };
	const statuses = config.statuses.map((s) => s.value);
	const frontmatter = Array.from({ length: 1000 }, (_, i) => ({
		category: "book",
		title: `Book ${i}`,
		author: `Author ${i % 90}`,
		status: statuses[i % statuses.length],
		pages_read: i % 300,
		pages_total: 300,
		series: i % 5 === 0 ? undefined : `Series ${Math.floor(i / 5)}`,
		position: (i % 5) + 1,
		buy_next: i % 41 === 0,
	}));

	test("parse, shelf, list, up next and buy next stay within budget", () => {
		const start = performance.now();
		const notes = frontmatter.flatMap((fm, i) => parseNote(`Books/${i}.md`, `${i}`, fm, config) ?? []);
		assert.equal(notes.length, 1000);
		const sections = shelfSections(notes, config);
		assert.equal(sections.reduce((n, s) => n + s.count, 0), 1000);
		assert.equal(sortNotes(notes, config, "title", "asc").length, 1000);
		assert.ok(rankCandidates(notes, config).eligible.length > 0);
		buyNext(notes, config);
		const elapsed = performance.now() - start;
		assert.ok(elapsed < BUDGET_MS, `took ${Math.round(elapsed)} ms`);
	});
});
