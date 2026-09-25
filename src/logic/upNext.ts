// "Up next" sequencing: which backlog items are eligible, and in what order.
// Port of Reading.md's dataviewjs, generalized from hardcoded status names to
// status buckets. One deliberate change (2026-09-24): a volume in progress no
// longer blocks the next one, so the next book of the series you're reading is
// suggested (and ranked first) before you finish the current one. Reading.md's
// rule hid it, so its "continue your series first" ordering never applied.
// Pure: zero `obsidian` imports.

import type { MediaTypeConfig, StatusBucket } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";

type Positioned = MediaNote & {
	series: { name: string; position: number; positionEnd: number | null };
};

function isPositioned(n: MediaNote): n is Positioned {
	return n.series !== null && n.series.position !== null;
}

/** Mirrors series.ts's isOrderedSeries (kept here to avoid an import cycle). */
function orderedSeries(config: MediaTypeConfig, name: string): boolean {
	const s = config.series;
	if (!s) return false;
	return s.exceptions.includes(name) ? !s.orderedByDefault : s.orderedByDefault;
}

export function bucketOf(status: string | null, config: MediaTypeConfig): StatusBucket {
	if (status === null) return "other";
	return config.statuses.find((s) => s.value === status)?.bucket ?? "other";
}

/** The first configured status in a bucket (what "Start" and "Finish" set), or null. */
export function firstStatusOf(config: MediaTypeConfig, bucket: StatusBucket): string | null {
	return config.statuses.find((s) => s.bucket === bucket)?.value ?? null;
}

/**
 * A backlog item is eligible unless an earlier volume of its series hasn't been
 * reached yet. An earlier volume is fine if it's done, in progress (active), or
 * covered by a done omnibus sibling's position..positionEnd range. Items with no
 * series or no position are always eligible.
 */
export function isEligible(note: MediaNote, all: readonly MediaNote[], config: MediaTypeConfig): boolean {
	if (!config.series || !isPositioned(note)) return true;
	const { name, position } = note.series;
	// Loose series (one universe, any order): nothing holds anything back.
	if (!orderedSeries(config, name)) return true;

	const siblings = all.filter(
		(o): o is Positioned => o.path !== note.path && isPositioned(o) && o.series.name === name,
	);
	const done = (o: MediaNote) => bucketOf(o.status, config) === "done";
	const reached = (o: MediaNote) => done(o) || bucketOf(o.status, config) === "active";
	const doneRanges = siblings
		.filter(done)
		.map((o) => [o.series.position, o.series.positionEnd ?? o.series.position] as const);
	const covered = (p: number) => doneRanges.some(([from, to]) => p >= from && p <= to);

	return siblings.every((o) => o.series.position >= position || reached(o) || covered(o.series.position));
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
