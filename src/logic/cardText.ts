// Text shown on every card: title, then "Series #N · Author". Composed from
// fields, never from the filename (titles are bare official titles).
// Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { toStr } from "./values.ts";

const unlink = (s: string) => s.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|").pop()!.trim();

/** "Eisenhorn #2", "Omnibus #4–6", or just the series name when unnumbered. */
export function seriesLabel(n: MediaNote): string | null {
	const s = n.series;
	if (!s) return null;
	if (s.position === null) return s.name;
	return s.positionEnd !== null ? `${s.name} #${s.position}–${s.positionEnd}` : `${s.name} #${s.position}`;
}

/** The creator field as display text; lists are joined, wikilink brackets dropped. */
export function creatorOf(n: MediaNote, config: MediaTypeConfig): string | null {
	if (!config.creatorField) return null;
	const raw = n.frontmatter[config.creatorField];
	const parts = (Array.isArray(raw) ? raw : [raw]).map(toStr).filter((s): s is string => s !== null).map(unlink);
	return parts.length > 0 ? parts.join(", ") : null;
}

export function secondaryLine(n: MediaNote, config: MediaTypeConfig): string {
	return [seriesLabel(n), creatorOf(n, config)].filter((s) => s !== null).join(" · ");
}

/** 0..1, or null when there's no known total. */
export function progressFraction(n: MediaNote): number | null {
	const p = n.progress;
	if (!p || p.total === null || p.total <= 0) return null;
	return Math.min(1, Math.max(0, p.current / p.total));
}
