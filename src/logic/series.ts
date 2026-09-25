// Series-level views: ordered or loose, what's in the vault, what's missing,
// what to buy next. Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { compareShelfOrder } from "./shelf.ts";
import { bucketOf } from "./upNext.ts";

/** Read/played in order? The library default, flipped for series listed as exceptions. */
export function isOrderedSeries(config: MediaTypeConfig, name: string): boolean {
	const s = config.series;
	if (!s) return false;
	return s.exceptions.includes(name) ? !s.orderedByDefault : s.orderedByDefault;
}

export interface SeriesView {
	name: string;
	ordered: boolean;
	/** Volumes in the vault, in reading order. */
	volumes: MediaNote[];
	/** Positions between 1 and the highest known with no note (covering omnibus ranges). */
	gaps: number[];
	/** The position after the highest known one. */
	next: number;
	counts: { read: number; owned: number; wishlist: number };
}

export function seriesView(notes: readonly MediaNote[], config: MediaTypeConfig, name: string): SeriesView {
	const volumes = notes.filter((n) => n.series?.name === name).sort(compareShelfOrder);
	const covered = new Set<number>();
	let max = 0;
	for (const v of volumes) {
		const p = v.series?.position;
		if (p === null || p === undefined || !Number.isInteger(p)) continue;
		const end = v.series?.positionEnd ?? p;
		for (let i = p; i <= end; i++) covered.add(i);
		max = Math.max(max, end);
	}
	const gaps: number[] = [];
	for (let i = 1; i < max; i++) if (!covered.has(i)) gaps.push(i);
	return {
		name,
		ordered: isOrderedSeries(config, name),
		volumes,
		gaps,
		next: max + 1,
		counts: {
			read: volumes.filter((v) => bucketOf(v.status, config) === "done").length,
			owned: volumes.filter((v) => config.wishlistStatus !== "" && v.status !== config.wishlistStatus && bucketOf(v.status, config) !== "other").length,
			wishlist: volumes.filter((v) => config.wishlistStatus !== "" && v.status === config.wishlistStatus).length,
		},
	};
}

export interface BuyNextItem {
	note: MediaNote;
	reason: "starred" | "series";
}

/**
 * What to buy next: starred items not owned yet, then the next wishlist volume
 * of every series you own part of (the first wishlist volume after the highest
 * owned one). Starred first, then by series and position.
 */
export function buyNext(notes: readonly MediaNote[], config: MediaTypeConfig): BuyNextItem[] {
	const wish = (n: MediaNote) => config.wishlistStatus !== "" && n.status === config.wishlistStatus;
	const owned = (n: MediaNote) => config.wishlistStatus !== "" && !wish(n) && bucketOf(n.status, config) !== "other";
	const out: BuyNextItem[] = [];
	const seen = new Set<string>();
	for (const n of [...notes].filter((n) => n.starred && !owned(n)).sort(compareShelfOrder)) {
		out.push({ note: n, reason: "starred" });
		seen.add(n.path);
	}
	if (config.series && config.wishlistStatus) {
		const bySeries = new Map<string, MediaNote[]>();
		for (const n of notes) if (n.series && n.series.position !== null) bySeries.set(n.series.name, [...(bySeries.get(n.series.name) ?? []), n]);
		const follow: MediaNote[] = [];
		for (const vols of bySeries.values()) {
			const highestOwned = Math.max(0, ...vols.filter(owned).map((v) => v.series!.positionEnd ?? v.series!.position!));
			if (highestOwned === 0) continue; // you don't own any of it yet
			const next = vols.filter((v) => wish(v) && v.series!.position! > highestOwned).sort(compareShelfOrder)[0];
			if (next && !seen.has(next.path)) follow.push(next);
		}
		for (const n of follow.sort(compareShelfOrder)) out.push({ note: n, reason: "series" });
	}
	return out;
}
