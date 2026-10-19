import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ReadyGate } from "../src/logic/readyGate.ts";

describe("ReadyGate (library loading state at startup)", () => {
	test("starts closed: views show the loading state, not a partial shelf", () => {
		assert.equal(new ReadyGate(() => {}).isOpen, false);
	});

	test("the first signal opens it and rebuilds once; later signals do nothing", () => {
		let rebuilds = 0;
		const gate = new ReadyGate(() => rebuilds++);
		assert.equal(gate.open(), true);
		assert.equal(gate.open(), false);
		assert.equal(gate.open(), false);
		assert.equal(gate.isOpen, true);
		assert.equal(rebuilds, 1);
	});

	test("it is open by the time the callback runs (views re-rendering see ready)", () => {
		let seen: boolean | null = null;
		const gate: ReadyGate = new ReadyGate(() => (seen = gate.isOpen));
		gate.open();
		assert.equal(seen, true);
	});
});
