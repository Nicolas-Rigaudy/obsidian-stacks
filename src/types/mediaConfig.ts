// Config for one media library (books today; other libraries later).
// Zero `obsidian` imports: this module is shared with the pure logic and the tests.

/** What a status means to the engine, independent of its name ("read", "finished", "watched"...). */
export type StatusBucket = "backlog" | "active" | "done" | "other";

export const STATUS_BUCKETS: readonly StatusBucket[] = ["backlog", "active", "done", "other"];

/** How items and furniture look: books in a bookcase, game cases in a media cabinet, disc cases in a cinema cabinet. */
export type Appearance = "books" | "games" | "films";

export const APPEARANCES: readonly Appearance[] = ["books", "games", "films"];

export interface StatusDef {
	value: string;
	label: string;
	bucket: StatusBucket;
	/** What choosing it means, in plain words ("stopped, might come back"). Shown in menus. */
	hint?: string;
}

/** A filter chip over the category field, e.g. { value: "anime", label: "Anime" }. */
export interface FilterDef {
	value: string;
	label: string;
}

export interface ProgressConfig {
	/** Only notes of these categories track progress (books yes, BDs no). Empty = all. */
	categories: string[];
	currentField: string;
	totalField: string;
	unitLabel: string;
	quickIncrements: number[];
}

export interface SeriesConfig {
	seriesField: string;
	positionField: string;
	/** Omnibus editions: a note covering `position` through `positionEnd`. Empty string = unused. */
	positionEndField: string;
}

export interface LogSectionConfig {
	/** Level-2 heading text, without the `## ` prefix. */
	heading: string;
	/** Line templates. Placeholders: {date}, and {value}/{unit} for progress. */
	startedLine: string;
	finishedLine: string;
	progressLine: string;
}

export interface MediaTypeConfig {
	enabled: boolean;
	label: string;
	appearance: Appearance;
	/** Vault folder (subfolders included). Empty string = whole vault. */
	folder: string;
	categoryField: string;
	/** Notes must have one of these in `categoryField`. Empty list = no category filter. */
	categoryValues: string[];
	/** Filter chips shown in the toolbar (All / Films / Series...). Fewer than two = no chips. */
	categoryFilters: FilterDef[];
	/** Field the chips filter on (e.g. "platform"). Empty = the category field. */
	filterField: string;
	statusField: string;
	/** Ordered: defines kanban column order. */
	statuses: StatusDef[];
	titleField: string;
	/** Shown on cards next to the series (author for books). Empty string = none. */
	creatorField: string;
	/** Column/label name for the creator field ("Author", "Platform"). */
	creatorLabel: string;
	coverField: string;
	ratingField: string;
	/** Date fields stamped on status changes. Empty string = not tracked. */
	startedField: string;
	finishedField: string;
	progress: ProgressConfig | null;
	series: SeriesConfig | null;
	logSection: LogSectionConfig | null;
}
