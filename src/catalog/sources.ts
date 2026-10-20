// Which catalogues a library may query. Pure: the network lives in providers.ts.

import type { CatalogKind } from "../logic/newNote.ts";
import type { CatalogSource } from "./parse.ts";

/** Sources a user can switch off, in the order they are listed. */
export const CATALOG_SOURCES: ReadonlyArray<{ id: Exclude<CatalogSource, "manual">; label: string; covers: string }> = [
	{ id: "openlibrary", label: "Open Library", covers: "books" },
	{ id: "steam", label: "Steam", covers: "games" },
	{ id: "wikipedia", label: "Wikipedia", covers: "games and films" },
	{ id: "tvmaze", label: "TVmaze", covers: "series" },
	{ id: "kitsu", label: "Kitsu", covers: "anime and animated films" },
];

/** What each kind of item is looked up in. */
export const KIND_SOURCES: Record<CatalogKind, readonly CatalogSource[]> = {
	book: ["openlibrary"],
	game: ["steam", "wikipedia"],
	series: ["tvmaze"],
	anime: ["kitsu"],
	film: ["wikipedia", "kitsu"],
};

/** The sources a search of `kind` may use once the library's switched-off ones are removed. */
export function activeSources(kind: CatalogKind, disabled: readonly string[]): CatalogSource[] {
	return KIND_SOURCES[kind].filter((s) => !disabled.includes(s));
}

export interface CatalogOptions {
	/** Sources this search may use. */
	sources: readonly CatalogSource[];
	/** Steam store region (two letters) and language name. */
	region: string;
	language: string;
}

export const DEFAULT_REGION = "US";
export const DEFAULT_LANGUAGE = "english";

/** Options for one search: this kind's sources minus the library's switched-off ones, plus the global store choices. */
export function catalogOptionsFor(kind: CatalogKind, disabled: readonly string[], store: { steamRegion: string; steamLanguage: string }): CatalogOptions {
	return { sources: activeSources(kind, disabled), region: store.steamRegion, language: store.steamLanguage };
}
