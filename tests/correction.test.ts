import { describe, test } from "node:test";
import assert from "node:assert/strict";
import type { App, TFile } from "obsidian";
import { bumpProgress, setProgress } from "../src/data/frontmatterWriter.ts";
import { Bursts, type Timers } from "../src/logic/bursts.ts";
import { restoreFields, snapshotFields, type FieldSnapshot } from "../src/logic/undo.ts";
import { BOOK_CONFIG } from "../src/settings/legacy.ts";

/** An App whose processFrontMatter edits one in-memory frontmatter object. */
function fakeApp(fm: Record<string, unknown>): App {
	return { fileManager: { processFrontMatter: async (_f: TFile, fn: (fm: Record<string, unknown>) => void) => fn(fm) } } as unknown as App;
}

const file = { path: "Books/Mistborn.md", basename: "Mistborn" } as TFile;
const field = BOOK_CONFIG.progress?.currentField ?? "";

/** Manual clock: tick() runs whatever is due. */
function fakeTimers() {
	let now = 0;
	let id = 0;
	const due = new Map<number, { at: number; fn: () => void }>();
	const timers: Timers = {
		set: (fn, ms) => (due.set(++id, { at: now + ms, fn }), id),
		clear: (h) => void due.delete(h as number),
	};
	const tick = (ms: number) => {
		now += ms;
		for (const [k, t] of [...due].sort((a, b) => a[1].at - b[1].at)) {
			if (t.at <= now && due.delete(k)) t.fn();
		}
	};
	return { timers, tick };
}

/** What LibraryActions.correct does: snapshot inside the write, Undo only if the value changed. */
async function correct(fm: Record<string, unknown>, value: number): Promise<{ value: number; undo: (() => void) | null }> {
	let snap: FieldSnapshot | null = null;
	const change = await setProgress(fakeApp(fm), file, BOOK_CONFIG, value, (fm) => (snap = snapshotFields(fm, [field])));
	assert.ok(change && snap);
	const s: FieldSnapshot = snap;
	return { value: change.value, undo: change.value !== change.previous ? () => restoreFields(fm, s) : null };
}

describe("Typed progress correction (toast + Undo like clicks)", () => {
	test("one undo restores the value from before the correction", async () => {
		const fm: Record<string, unknown> = { pages_read: 40, pages_total: 541 };
		const r = await correct(fm, 212);
		assert.equal(fm.pages_read, 212);
		assert.ok(r.undo);
		r.undo();
		assert.equal(fm.pages_read, 40);
	});

	test("undo removes the field when the note had no progress yet", async () => {
		const fm: Record<string, unknown> = { pages_total: 541 };
		const r = await correct(fm, 30);
		assert.equal(fm.pages_read, 30);
		r.undo?.();
		assert.equal(Object.prototype.hasOwnProperty.call(fm, "pages_read"), false);
	});

	test("a value above the total is clamped, and undo still restores the original", async () => {
		const fm: Record<string, unknown> = { pages_read: 500, pages_total: 541 };
		const r = await correct(fm, 9000);
		assert.equal(r.value, 541);
		r.undo?.();
		assert.equal(fm.pages_read, 500);
	});

	test("typing the current value offers no Undo", async () => {
		const fm: Record<string, unknown> = { pages_read: 120, pages_total: 541 };
		const r = await correct(fm, 120);
		assert.equal(r.undo, null);
		assert.equal(fm.pages_read, 120);
	});

	test("ten +10 clicks then a typed correction: each has its own undo, in order", async () => {
		const fm: Record<string, unknown> = { pages_read: 40, pages_total: 541 };
		const app = fakeApp(fm);
		const { timers, tick } = fakeTimers();
		const undos: Array<() => void> = [];
		const bursts = new Bursts<FieldSnapshot, number>(1200, (_k, snap) => undos.push(() => restoreFields(fm, snap)), timers);
		for (let i = 0; i < 10; i++) {
			let snap: FieldSnapshot | null = null;
			const change = await bumpProgress(app, file, BOOK_CONFIG, 10, (f) => (snap = snapshotFields(f, [field])));
			assert.ok(change && snap);
			bursts.add(file.path, snap, change.value);
			tick(200);
		}
		assert.equal(fm.pages_read, 140);
		// The correction settles the open burst first (LibraryActions.correct flushes it).
		bursts.flush(file.path);
		assert.equal(undos.length, 1);
		const r = await correct(fm, 150);
		assert.ok(r.undo);
		undos.push(r.undo);
		tick(5000);
		assert.equal(undos.length, 2, "the burst does not settle a second time");
		undos[1]();
		assert.equal(fm.pages_read, 140);
		undos[0]();
		assert.equal(fm.pages_read, 40);
	});
});
