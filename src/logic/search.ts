// Live search over a library: every word typed must appear somewhere in the
// title, creator, series or filter value. Accents and case don't matter. Pure.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";
import type { MediaNote } from "../types/mediaNote.ts";
import { creatorOf } from "./cardText.ts";

export function fold(s: string): string {
	return s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function matchesSearch(note: MediaNote, config: MediaTypeConfig, query: string): boolean {
	const words = fold(query).split(/\s+/).filter(Boolean);
	if (words.length === 0) return true;
	const hay = fold([note.title, creatorOf(note, config) ?? "", note.series?.name ?? "", note.facet ?? ""].join(" "));
	return words.every((w) => hay.includes(w));
}
