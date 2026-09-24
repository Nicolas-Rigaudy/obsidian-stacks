import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { toNum, toStr } from "./values.ts";

export type Frontmatter = Record<string, unknown>;

/** True if `path` sits inside `folder` (any depth). An empty folder matches everything. */
export function isInFolder(path: string, folder: string): boolean {
	const f = folder.trim().replace(/^\/+|\/+$/g, "");
	return f === "" || path.startsWith(f + "/");
}

export function matchesCategory(fm: Frontmatter, config: MediaTypeConfig): boolean {
	if (config.categoryValues.length === 0) return true;
	const raw = fm[config.categoryField];
	const values = Array.isArray(raw) ? raw : [raw];
	return values.some((v) => {
		const s = toStr(v);
		return s !== null && config.categoryValues.includes(s);
	});
}

/** Normalize one note, or null if it doesn't belong to this library. */
export function parseNote(
	path: string,
	basename: string,
	fm: Frontmatter | null | undefined,
	config: MediaTypeConfig,
): MediaNote | null {
	if (!isInFolder(path, config.folder) || !fm || !matchesCategory(fm, config)) return null;

	let progress: MediaNote["progress"] = null;
	if (config.progress) {
		progress = {
			current: toNum(fm[config.progress.currentField]) ?? 0,
			total: toNum(fm[config.progress.totalField]),
		};
	}

	let series: MediaNote["series"] = null;
	if (config.series) {
		const name = toStr(fm[config.series.seriesField]);
		if (name !== null) {
			const position = toNum(fm[config.series.positionField]);
			let positionEnd = config.series.positionEndField
				? toNum(fm[config.series.positionEndField])
				: null;
			if (positionEnd !== null && (position === null || positionEnd < position)) positionEnd = null;
			series = { name, position, positionEnd };
		}
	}

	return {
		path,
		title: toStr(fm[config.titleField]) ?? basename,
		status: toStr(fm[config.statusField]),
		cover: toStr(fm[config.coverField]),
		rating: toNum(fm[config.ratingField]),
		progress,
		series,
		frontmatter: fm,
	};
}
