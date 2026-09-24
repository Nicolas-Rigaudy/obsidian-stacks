// One note of a media library, normalized from its frontmatter through a MediaTypeConfig.
// Zero `obsidian` imports: views look the TFile up by `path` when they need it.

export interface MediaNote {
	path: string;
	title: string;
	/** The note's category value (e.g. "anime"), for filter chips. */
	category: string | null;
	/** The value filter chips match against (the category, or e.g. the platform). */
	facet: string | null;
	status: string | null;
	cover: string | null;
	rating: number | null;
	/** Null when the library doesn't track progress. */
	progress: { current: number; total: number | null } | null;
	/** Null when the library has no series config or the note isn't in a series. */
	series: { name: string; position: number | null; positionEnd: number | null } | null;
	/** Raw frontmatter, for display fields the engine doesn't model (author, genre...). */
	frontmatter: Record<string, unknown>;
}
