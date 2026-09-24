// Frontmatter writes. Every change happens inside processFrontMatter, computed
// from the live value it hands us, never from a value read before an await.
// That is the fix for the old +10/+25 stale-button bug.

import type { App, TFile } from "obsidian";
import { clampProgress, nextProgress } from "../logic/progress.ts";
import { bucketOf } from "../logic/upNext.ts";
import { toNum, toStr, todayISO } from "../logic/values.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";

type Fm = Record<string, unknown>;

/**
 * Set the status. Moving into an active status stamps the started date if it's
 * empty; moving into a done status stamps the finished date if it's empty and
 * fills progress up to the total (like Reading.md's "Finish" button).
 */
export async function setStatus(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	status: string,
	today: string = todayISO(),
): Promise<void> {
	const bucket = bucketOf(status, config);
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		fm[config.statusField] = status;
		if (bucket === "active" && config.startedField && toStr(fm[config.startedField]) === null) {
			fm[config.startedField] = today;
		}
		if (bucket === "done") {
			if (config.finishedField && toStr(fm[config.finishedField]) === null) fm[config.finishedField] = today;
			const p = config.progress;
			if (p) {
				const total = toNum(fm[p.totalField]);
				if (total !== null && total > 0) fm[p.currentField] = total;
			}
		}
	});
}

/** Add `delta` to the progress field. Returns the new value, or null if the library has no progress. */
export async function bumpProgress(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	delta: number,
): Promise<number | null> {
	const p = config.progress;
	if (!p) return null;
	let result: number | null = null;
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		const next = nextProgress(fm[p.currentField], delta, fm[p.totalField]);
		fm[p.currentField] = next;
		result = next;
	});
	return result;
}

/** Set the progress field to an exact value (typed correction). Returns the stored value. */
export async function setProgress(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	value: number,
): Promise<number | null> {
	const p = config.progress;
	if (!p) return null;
	let result: number | null = null;
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		const next = clampProgress(value, fm[p.totalField]);
		fm[p.currentField] = next;
		result = next;
	});
	return result;
}
