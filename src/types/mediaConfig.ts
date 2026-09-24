// Config for one media library (books today; other libraries later).
// Zero `obsidian` imports: this module is shared with the pure logic and the tests.

/** What a status means to the engine, independent of its name ("read", "finished", "watched"...). */
export type StatusBucket = "backlog" | "active" | "done" | "other";

export const STATUS_BUCKETS: readonly StatusBucket[] = ["backlog", "active", "done", "other"];

export interface StatusDef {
	value: string;
	label: string;
	bucket: StatusBucket;
}

export interface ProgressConfig {
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
	/** Vault folder (subfolders included). Empty string = whole vault. */
	folder: string;
	categoryField: string;
	/** Notes must have one of these in `categoryField`. Empty list = no category filter. */
	categoryValues: string[];
	statusField: string;
	/** Ordered: defines kanban column order. */
	statuses: StatusDef[];
	titleField: string;
	coverField: string;
	ratingField: string;
	/** Date fields stamped on status changes. Empty string = not tracked. */
	startedField: string;
	finishedField: string;
	progress: ProgressConfig | null;
	series: SeriesConfig | null;
	logSection: LogSectionConfig | null;
}
