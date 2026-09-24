// Sorting for the List view. Empty values always sort last, whatever the
// direction. Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { creatorOf } from "./cardText.ts";
import { toStr } from "./values.ts";

export type ListColumn = "title" | "series" | "creator" | "status" | "rating" | "progress" | "started" | "finished";
export type SortDir = "asc" | "desc";

type Key = string | number | null;
const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

function keyOf(n: MediaNote, config: MediaTypeConfig, column: ListColumn): Key {
	switch (column) {
		case "title":
			return n.title;
		case "series":
			return n.series ? `${n.series.name}\u0000${String(n.series.position ?? 1e9).padStart(12, "0")}` : null;
		case "creator":
			return creatorOf(n, config);
		case "status": {
			const i = config.statuses.findIndex((s) => s.value === n.status);
			return i === -1 ? null : i;
		}
		case "rating":
			return n.rating;
		case "progress": {
			const p = n.progress;
			if (!p) return null;
			return p.total !== null && p.total > 0 ? p.current / p.total : p.current > 0 ? p.current : null;
		}
		case "started":
			return config.startedField ? toStr(n.frontmatter[config.startedField]) : null;
		case "finished":
			return config.finishedField ? toStr(n.frontmatter[config.finishedField]) : null;
	}
}

function compareKeys(a: Key, b: Key): number {
	if (typeof a === "number" && typeof b === "number") return a - b;
	return collator.compare(String(a), String(b));
}

export function sortNotes(
	notes: readonly MediaNote[],
	config: MediaTypeConfig,
	column: ListColumn,
	dir: SortDir,
): MediaNote[] {
	const sign = dir === "asc" ? 1 : -1;
	return notes
		.map((n) => ({ n, k: keyOf(n, config, column) }))
		.sort((a, b) => {
			if (a.k === null || b.k === null) {
				if (a.k === b.k) return collator.compare(a.n.title, b.n.title);
				return a.k === null ? 1 : -1;
			}
			return sign * compareKeys(a.k, b.k) || collator.compare(a.n.title, b.n.title);
		})
		.map(({ n }) => n);
}
