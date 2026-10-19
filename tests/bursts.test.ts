import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { Bursts, type Timers } from "../src/logic/bursts.ts";
import { nextProgress } from "../src/logic/progress.ts";
import { restoreFields, snapshotFields } from "../src/logic/undo.ts";

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
	return { timers, tick, pending: () => due.size };
}

describe("Bursts (rapid progress clicks)", () => {
	test("ten quick changes settle once, with the first start and the last value", () => {
		const { timers, tick } = fakeTimers();
		const settled: Array<[string, number, number]> = [];
		const b = new Bursts<number, number>(1000, (k, f, l) => settled.push([k, f, l]), timers);
		for (let i = 0; i < 10; i++) {
			b.add("a.md", i * 10, (i + 1) * 10);
			tick(200);
		}
		assert.deepEqual(settled, []);
		tick(1000);
		assert.deepEqual(settled, [["a.md", 0, 100]]);
	});

	test("each change restarts the quiet period", () => {
		const { timers, tick } = fakeTimers();
		let count = 0;
		const b = new Bursts<number, number>(1000, () => count++, timers);
		b.add("a.md", 0, 1);
		tick(900);
		b.add("a.md", 1, 2);
		tick(900);
		assert.equal(count, 0);
		tick(100);
		assert.equal(count, 1);
	});

	test("notes are independent", () => {
		const { timers, tick } = fakeTimers();
		const settled: string[] = [];
		const b = new Bursts<number, number>(1000, (k) => settled.push(k), timers);
		b.add("a.md", 0, 1);
		b.add("b.md", 0, 1);
		tick(1000);
		assert.deepEqual(settled.sort(), ["a.md", "b.md"]);
	});

	test("flush settles now, once, and leaves no timer behind", () => {
		const { timers, tick, pending } = fakeTimers();
		let count = 0;
		const b = new Bursts<number, number>(1000, () => count++, timers);
		b.add("a.md", 0, 1);
		assert.equal(b.has("a.md"), true);
		b.flush("a.md");
		b.flush("a.md");
		tick(5000);
		assert.equal(count, 1);
		assert.equal(b.has("a.md"), false);
		assert.equal(pending(), 0);
	});

	test("flushAll settles every open burst", () => {
		const { timers } = fakeTimers();
		const settled: string[] = [];
		const b = new Bursts<number, number>(1000, (k) => settled.push(k), timers);
		b.add("a.md", 0, 1);
		b.add("b.md", 0, 1);
		b.flushAll();
		assert.deepEqual(settled.sort(), ["a.md", "b.md"]);
	});

	test("ten +10 clicks reach the expected value, one undo restores the value before them", () => {
		const fm: Record<string, unknown> = { page: 40, pages: 541 };
		const { timers, tick } = fakeTimers();
		let undo: (() => void) | null = null;
		const b = new Bursts<ReturnType<typeof snapshotFields>, number>(1000, (_k, snap) => (undo = () => restoreFields(fm, snap)), timers);
		for (let i = 0; i < 10; i++) {
			const snap = snapshotFields(fm, ["page"]); // taken inside each write, kept only for the first
			fm.page = nextProgress(fm.page, 10, fm.pages);
			b.add("a.md", snap, fm.page as number);
		}
		assert.equal(fm.page, 140);
		tick(1000);
		assert.ok(undo);
		(undo as () => void)();
		assert.equal(fm.page, 40);
	});
});
