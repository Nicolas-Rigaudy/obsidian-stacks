import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { toNum, toStr } from "./values.ts";

export type Frontmatter = Record<string, unknown>;

/** True if `path` sits inside `folder` (any depth). An empty folder matches everything. */
export function isInFolder(path: string, folder: string): boolean {
	const f = folder.trim().replace(/^\/+|\/+$/g, "");
	return f === "" || path.startsWith(f + "/");
}

/** The note's category: the first value that belongs to the library (any value if unfiltered). */
export function categoryOf(fm: Frontmatter, config: MediaTypeConfig): string | null {
	const raw = fm[config.categoryField];
	for (const v of Array.isArray(raw) ? raw : [raw]) {
		const s = toStr(v);
		if (s !== null && (config.categoryValues.length === 0 || config.categoryValues.includes(s))) return s;
	}
	return null;
}

function firstStr(v: unknown): string | null {
	for (const x of Array.isArray(v) ? v : [v]) {
		const s = toStr(x);
		if (s !== null) return s;
	}
	return null;
}

export function matchesCategory(fm: Frontmatter, config: MediaTypeConfig): boolean {
	return config.categoryValues.length === 0 || categoryOf(fm, config) !== null;
}

/** Normalize one note, or null if it doesn't belong to this library. */
export function parseNote(
	path: string,
	basename: string,
	fm: Frontmatter | null | undefined,
	config: MediaTypeConfig,
): MediaNote | null {
	if (!isInFolder(path, config.folder) || !fm || !matchesCategory(fm, config)) return null;

	const category = categoryOf(fm, config);
	let progress: MediaNote["progress"] = null;
	const p = config.progress;
	if (p && (p.categories.length === 0 || (category !== null && p.categories.includes(category)))) {
		progress = {
			current: toNum(fm[p.currentField]) ?? 0,
			total: toNum(fm[p.totalField]),
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
		category,
		facet: config.filterField ? firstStr(fm[config.filterField]) : category,
		status: toStr(fm[config.statusField]),
		cover: toStr(fm[config.coverField]),
		rating: toNum(fm[config.ratingField]),
		progress,
		series,
		added: null,
		frontmatter: fm,
	};
}
