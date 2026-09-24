// Frontmatter writes. Every change happens inside processFrontMatter, computed
// from the live value it hands us, never from a value read before an await.
// That is the fix for the old +10/+25 stale-button bug.

import type { App, TFile } from "obsidian";
import { clampProgress, nextProgress } from "../logic/progress.ts";
import { bucketOf } from "../logic/upNext.ts";
import { toNum, toStr, todayISO } from "../logic/values.ts";
import type { MediaTypeConfig } from "../types/mediaConfig.ts";

type Fm = Record<string, unknown>;

export interface ProgressChange {
	previous: number;
	value: number;
}

/**
 * Set the status and return the previous one. Moving into an active status
 * stamps the started date if it's empty; moving into a done status stamps the
 * finished date if it's empty and fills progress up to the total (like
 * Reading.md's "Finish" button). Setting the current status changes nothing.
 */
export async function setStatus(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	status: string,
	today: string = todayISO(),
): Promise<string | null> {
	const bucket = bucketOf(status, config);
	let previous: string | null = null;
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		previous = toStr(fm[config.statusField]);
		if (previous === status) return;
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
	return previous;
}

/** Add `delta` to the progress field. Null if the library has no progress. */
export async function bumpProgress(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	delta: number,
): Promise<ProgressChange | null> {
	const p = config.progress;
	if (!p) return null;
	let result: ProgressChange | null = null;
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		const previous = toNum(fm[p.currentField]) ?? 0;
		const value = nextProgress(fm[p.currentField], delta, fm[p.totalField]);
		fm[p.currentField] = value;
		result = { previous, value };
	});
	return result;
}

/** Set the progress field to an exact value (typed correction), clamped to the total. */
export async function setProgress(
	app: App,
	file: TFile,
	config: MediaTypeConfig,
	value: number,
): Promise<ProgressChange | null> {
	const p = config.progress;
	if (!p) return null;
	let result: ProgressChange | null = null;
	await app.fileManager.processFrontMatter(file, (fm: Fm) => {
		const previous = toNum(fm[p.currentField]) ?? 0;
		const next = clampProgress(value, fm[p.totalField]);
		fm[p.currentField] = next;
		result = { previous, value: next };
	});
	return result;
}
