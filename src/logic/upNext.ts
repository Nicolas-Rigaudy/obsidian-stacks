// "Up next" sequencing: which backlog items are eligible, and in what order.
// Port of Reading.md's dataviewjs, generalized from hardcoded status names to
// status buckets. Pure: zero `obsidian` imports.

import type { MediaTypeConfig, StatusBucket } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

type Positioned = MediaNote & {
	series: { name: string; position: number; positionEnd: number | null };
};

function isPositioned(n: MediaNote): n is Positioned {
	return n.series !== null && n.series.position !== null;
}

export function bucketOf(status: string | null, config: MediaTypeConfig): StatusBucket {
	if (status === null) return "other";
	return config.statuses.find((s) => s.value === status)?.bucket ?? "other";
}

/**
 * A backlog item is eligible unless an earlier volume of its series isn't done yet.
 * An earlier volume counts as done if its own status is done, or if a done omnibus
 * sibling's position..positionEnd range covers it. Items with no series or no
 * position are always eligible.
 */
export function isEligible(note: MediaNote, all: readonly MediaNote[], config: MediaTypeConfig): boolean {
	if (!config.series || !isPositioned(note)) return true;
	const { name, position } = note.series;

	const siblings = all.filter(
		(o): o is Positioned => o.path !== note.path && isPositioned(o) && o.series.name === name,
	);
	const done = (o: MediaNote) => bucketOf(o.status, config) === "done";
	const doneRanges = siblings
		.filter(done)
		.map((o) => [o.series.position, o.series.positionEnd ?? o.series.position] as const);
	const covered = (p: number) => doneRanges.some(([from, to]) => p >= from && p <= to);

	return siblings.every((o) => o.series.position >= position || done(o) || covered(o.series.position));
}

export interface UpNextResult {
	/** Ranked: continuing an active series first, then lowest position, then title. */
	eligible: MediaNote[];
	/** Backlog items blocked by an unfinished earlier volume. */
	heldBack: MediaNote[];
}

export function rankCandidates(all: readonly MediaNote[], config: MediaTypeConfig): UpNextResult {
	const activeSeries = new Set<string>();
	if (config.series) {
		for (const n of all) {
			if (n.series !== null && bucketOf(n.status, config) === "active") activeSeries.add(n.series.name);
		}
	}

	const eligible: MediaNote[] = [];
	const heldBack: MediaNote[] = [];
	for (const n of all) {
		if (bucketOf(n.status, config) !== "backlog") continue;
		(isEligible(n, all, config) ? eligible : heldBack).push(n);
	}

	const continuing = (n: MediaNote) => (n.series !== null && activeSeries.has(n.series.name) ? 0 : 1);
	const position = (n: MediaNote) => n.series?.position ?? Number.POSITIVE_INFINITY;
	eligible.sort(
		(a, b) =>
			continuing(a) - continuing(b) ||
			// Infinity - Infinity is NaN, which || treats as a tie.
			position(a) - position(b) ||
			a.title.localeCompare(b.title),
	);

	return { eligible, heldBack };
}
