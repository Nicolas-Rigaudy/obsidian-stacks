import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { clampProgress, nextProgress } from "../src/logic/progress.ts";

describe("nextProgress", () => {
	test("adds to the current value", () => {
		assert.equal(nextProgress(25, 10, 416), 35);
	});
	test("two bumps accumulate (the stale-button regression, at the arithmetic level)", () => {
		const once = nextProgress(0, 10, 416);
		assert.equal(nextProgress(once, 10, 416), 20);
	});
	test("clamps at the total and at zero", () => {
		assert.equal(nextProgress(410, 25, 416), 416);
		assert.equal(nextProgress(5, -10, 416), 0);
	});
	test("no upper clamp when the total is unknown (The Traitor's Hand before pages_total was set)", () => {
		assert.equal(nextProgress(225, 25, null), 250);
		assert.equal(nextProgress(225, 25, 0), 250);
	});
	test("missing or string current value", () => {
		assert.equal(nextProgress(undefined, 10, 100), 10);
		assert.equal(nextProgress("40", 10, "100"), 50);
	});
});

describe("clampProgress", () => {
	test("typed correction within bounds", () => {
		assert.equal(clampProgress(120, 416), 120);
		assert.equal(clampProgress(999, 416), 416);
		assert.equal(clampProgress(-3, 416), 0);
	});
});
