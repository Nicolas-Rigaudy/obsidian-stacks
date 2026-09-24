// Progress arithmetic. Callers run these inside processFrontMatter against the
// live value, never against a value read earlier (the stale-button bug).
// Pure: zero `obsidian` imports.

import { toNum } from "./values.ts";

/** Clamp to [0, total]. No upper bound when total is unknown or not positive. */
export function clampProgress(value: number, total: unknown): number {
	const t = toNum(total);
	let v = Math.max(0, value);
	if (t !== null && t > 0) v = Math.min(v, t);
	return v;
}

/** The value after adding `delta` (negative to go back) to the current one. */
export function nextProgress(current: unknown, delta: number, total: unknown): number {
	return clampProgress((toNum(current) ?? 0) + delta, total);
}
