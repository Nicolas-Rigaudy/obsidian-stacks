// Shelf layout: one bookcase per status, series with several volumes on the
// same shelf gathered into a pile. Pure: zero `obsidian` imports.

import type { MediaTypeConfig, StatusBucket, StatusDef } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

export type ShelfItem =
	| { kind: "book"; note: MediaNote }
	| { kind: "pile"; series: string; notes: MediaNote[] };

export interface ShelfSection {
	/** Null for notes whose status isn't in the settings. */
	status: StatusDef | null;
	count: number;
	items: ShelfItem[];
}

/** Bookcases read like a library visit: what you're reading, what's next, what's read, the rest. */
const BUCKET_ORDER: readonly StatusBucket[] = ["active", "backlog", "done", "other"];

const collator = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Library order: by series name (or title for standalones), then volume, then title. */
export function compareShelfOrder(a: MediaNote, b: MediaNote): number {
	return collator.compare(a.series?.name ?? a.title, b.series?.name ?? b.title) || byPosition(a, b);
}

function byPosition(a: MediaNote, b: MediaNote): number {
	const pa = a.series?.position ?? Number.POSITIVE_INFINITY;
	const pb = b.series?.position ?? Number.POSITIVE_INFINITY;
	return pa - pb || collator.compare(a.title, b.title);
}

function itemKey(item: ShelfItem): string {
	if (item.kind === "pile") return item.series;
	return item.note.series?.name ?? item.note.title;
}

function arrange(notes: MediaNote[], piles: boolean): ShelfItem[] {
	const bySeries = new Map<string, MediaNote[]>();
	const items: ShelfItem[] = [];
	for (const n of notes) {
		if (piles && n.series) {
			const list = bySeries.get(n.series.name) ?? [];
			list.push(n);
			bySeries.set(n.series.name, list);
		} else {
			items.push({ kind: "book", note: n });
		}
	}
	for (const [series, list] of bySeries) {
		list.sort(byPosition);
		if (list.length >= 2) items.push({ kind: "pile", series, notes: list });
		else items.push({ kind: "book", note: list[0] });
	}
	return items.sort(
		(a, b) =>
			collator.compare(itemKey(a), itemKey(b)) ||
			byPosition(a.kind === "pile" ? a.notes[0] : a.note, b.kind === "pile" ? b.notes[0] : b.note),
	);
}

/**
 * @param statuses optional filter: only these status values get a bookcase.
 * @param includeEmpty also return bookcases with no notes (drop targets while dragging).
 */
export function shelfSections(
	notes: readonly MediaNote[],
	config: MediaTypeConfig,
	statuses: readonly string[] | null = null,
	includeEmpty = false,
): ShelfSection[] {
	const ordered = config.statuses
		.map((s, i) => ({ s, i }))
		.sort((a, b) => BUCKET_ORDER.indexOf(a.s.bucket) - BUCKET_ORDER.indexOf(b.s.bucket) || a.i - b.i)
		.map(({ s }) => s)
		.filter((s) => statuses === null || statuses.includes(s.value));

	const known = new Set(config.statuses.map((s) => s.value));
	const sections: ShelfSection[] = [];
	const piles = config.series !== null;
	for (const status of ordered) {
		const inStatus = notes.filter((n) => n.status === status.value);
		if (inStatus.length > 0 || includeEmpty) sections.push({ status, count: inStatus.length, items: arrange(inStatus, piles) });
	}
	if (statuses === null) {
		const unsorted = notes.filter((n) => n.status === null || !known.has(n.status));
		if (unsorted.length > 0) sections.push({ status: null, count: unsorted.length, items: arrange(unsorted, piles) });
	}
	return sections;
}
