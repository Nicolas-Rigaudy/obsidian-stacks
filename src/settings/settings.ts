// Settings schema, defaults, and the merge of saved data over defaults.
// Pure: zero `obsidian` imports.

import type {
	LogSectionConfig,
	MediaTypeConfig,
	ProgressConfig,
	SeriesConfig,
	StatusBucket,
	StatusDef,
} from "../types/mediaConfig.ts";
import { APPEARANCES, STATUS_BUCKETS } from "../types/mediaConfig.ts";

export interface StacksSettings {
	/** Keyed by a stable id ("book"). Key order = display order. */
	mediaTypes: Record<string, MediaTypeConfig>;
}

// Books and BDs in one library (user decision 2026-09-24), filtered by chips.
// Matches the live Books schema (checked 2026-09-24 against all 125 notes), the
// BD tome notes from the 2026-09-25 split, and Reading.md's existing widgets:
// +10/+25 pages (books only), "## Reading log" lines.
export const BOOK_CONFIG: MediaTypeConfig = {
	enabled: true,
	label: "Reading",
	appearance: "books",
	folder: "20 Personal/Hobbies/Reading",
	categoryField: "category",
	categoryValues: ["book", "bd"],
	categoryFilters: [
		{ value: "book", label: "Books" },
		{ value: "bd", label: "BDs" },
	],
	statusField: "status",
	statuses: [
		{ value: "wishlist", label: "Wishlist", bucket: "other", hint: "don't own it yet" },
		{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "own it, not started" },
		{ value: "reading", label: "Reading", bucket: "active" },
		{ value: "read", label: "Read", bucket: "done", hint: "finished it" },
	],
	titleField: "title",
	creatorField: "author",
	creatorLabel: "Author",
	coverField: "cover",
	ratingField: "rating",
	startedField: "started",
	finishedField: "finished",
	progress: {
		categories: [],
		currentField: "pages_read",
		totalField: "pages_total",
		unitLabel: "pages",
		quickIncrements: [10, 25],
	},
	series: {
		seriesField: "series",
		positionField: "position",
		positionEndField: "position_end",
	},
	logSection: {
		heading: "Reading log",
		startedLine: "Started [date:: {date}]",
		finishedLine: "Finished [date:: {date}]",
		progressLine: "(pages:: {value}) [date:: {date}]",
	},
};

// Video games (106 notes, checked 2026-09-24). "played" = played but not
// finished (no ending, or might return): not done, per the user.
export const GAME_CONFIG: MediaTypeConfig = {
	enabled: true,
	label: "Games",
	appearance: "games",
	folder: "20 Personal/Hobbies/Video Games/Games",
	categoryField: "category",
	categoryValues: ["game"],
	categoryFilters: [],
	statusField: "status",
	statuses: [
		{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "not started" },
		{ value: "playing", label: "Playing", bucket: "active" },
		{ value: "played", label: "Played", bucket: "other", hint: "stopped, might come back" },
		{ value: "finished", label: "Finished", bucket: "done", hint: "reached the end" },
		{ value: "dropped", label: "Dropped", bucket: "other", hint: "not going back" },
	],
	titleField: "title",
	creatorField: "platform",
	creatorLabel: "Platform",
	coverField: "cover",
	ratingField: "rating",
	startedField: "started",
	finishedField: "finished",
	progress: null,
	series: null,
	logSection: null,
};

// Films, series and anime in one library with filter chips (19 notes in Media/,
// checked 2026-09-24; Media.md, the hub, has no category and is left out).
export const WATCHING_CONFIG: MediaTypeConfig = {
	enabled: true,
	label: "Watching",
	appearance: "films",
	folder: "20 Personal/Hobbies/Media",
	categoryField: "category",
	categoryValues: ["movie", "series", "anime"],
	categoryFilters: [
		{ value: "movie", label: "Films" },
		{ value: "series", label: "Series" },
		{ value: "anime", label: "Anime" },
	],
	statusField: "status",
	statuses: [
		{ value: "backlog", label: "Backlog", bucket: "backlog", hint: "not started" },
		{ value: "watching", label: "Watching", bucket: "active" },
		{ value: "watched", label: "Watched", bucket: "done", hint: "seen it all" },
		{ value: "dropped", label: "Dropped", bucket: "other", hint: "not going back" },
	],
	titleField: "title",
	creatorField: "network",
	creatorLabel: "Network",
	coverField: "cover",
	ratingField: "rating",
	startedField: "",
	finishedField: "finished",
	// Episodes for series and anime; films are just watched or not.
	progress: {
		categories: ["series", "anime"],
		currentField: "episodes_watched",
		totalField: "episodes_total",
		unitLabel: "episodes",
		quickIncrements: [1],
	},
	series: null,
	logSection: null,
};

export const DEFAULT_SETTINGS: StacksSettings = {
	mediaTypes: { book: BOOK_CONFIG, game: GAME_CONFIG, watching: WATCHING_CONFIG },
};

// Starting values when a user switches an optional group on for a library.
export const DEFAULT_PROGRESS: ProgressConfig = {
	categories: [],
	currentField: "progress",
	totalField: "progress_total",
	unitLabel: "",
	quickIncrements: [1],
};
export const DEFAULT_SERIES: SeriesConfig = {
	seriesField: "series",
	positionField: "position",
	positionEndField: "",
};
export const DEFAULT_LOG_SECTION: LogSectionConfig = {
	heading: "Log",
	startedLine: "Started [date:: {date}]",
	finishedLine: "Finished [date:: {date}]",
	progressLine: "(progress:: {value}) [date:: {date}]",
};

/** Template for a library added from the settings tab. */
export function blankMediaTypeConfig(label: string): MediaTypeConfig {
	return {
		enabled: true,
		label,
		appearance: "books",
		folder: "",
		categoryField: "category",
		categoryValues: [],
		categoryFilters: [],
		statusField: "status",
		statuses: [
			{ value: "backlog", label: "Backlog", bucket: "backlog" },
			{ value: "active", label: "Active", bucket: "active" },
			{ value: "done", label: "Done", bucket: "done" },
		],
		titleField: "title",
		creatorField: "",
		creatorLabel: "",
		coverField: "cover",
		ratingField: "rating",
		startedField: "",
		finishedField: "",
		progress: null,
		series: null,
		logSection: null,
	};
}

type Rec = Record<string, unknown>;
const isRecord = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const isString = (v: unknown): v is string => typeof v === "string";

/** Copy string-valued keys of `over` that exist on `base`. */
function mergeStrings<T extends object>(base: T, over: Rec): T {
	const out = { ...base } as unknown as Rec;
	for (const key of Object.keys(base)) {
		if (typeof out[key] === "string" && isString(over[key])) out[key] = over[key];
	}
	return out as T;
}

function parseStatus(v: unknown): StatusDef[] {
	if (!isRecord(v) || !isString(v.value)) return [];
	const bucket = STATUS_BUCKETS.includes(v.bucket as StatusBucket) ? (v.bucket as StatusBucket) : "other";
	const def: StatusDef = { value: v.value, label: isString(v.label) ? v.label : v.value, bucket };
	if (isString(v.hint) && v.hint.trim() !== "") def.hint = v.hint;
	return [def];
}

/**
 * An optional group (progress, series, log section): explicit null in saved data
 * means "switched off"; an object is merged over the base (or the group's
 * defaults if the base has it off); anything else keeps the base.
 */
function mergeGroup<T extends object>(base: T | null, over: unknown, fallback: T): T | null {
	if (over === null) return null;
	if (!isRecord(over)) return base === null ? null : structuredClone(base);
	return mergeStrings(structuredClone(base ?? fallback), over);
}

function mergeConfig(base: MediaTypeConfig, over: unknown): MediaTypeConfig {
	const out = structuredClone(base);
	if (!isRecord(over)) return out;

	Object.assign(out, mergeStrings(out, over));
	if (!APPEARANCES.includes(out.appearance)) out.appearance = base.appearance;
	if (typeof over.enabled === "boolean") out.enabled = over.enabled;
	if (Array.isArray(over.categoryValues)) out.categoryValues = over.categoryValues.filter(isString);
	if (Array.isArray(over.statuses)) out.statuses = over.statuses.flatMap(parseStatus);
	if (Array.isArray(over.categoryFilters)) {
		out.categoryFilters = over.categoryFilters.flatMap((f) =>
			isRecord(f) && isString(f.value) ? [{ value: f.value, label: isString(f.label) ? f.label : f.value }] : [],
		);
	}

	out.progress = mergeGroup(base.progress, over.progress, DEFAULT_PROGRESS);
	if (out.progress && isRecord(over.progress)) {
		if (Array.isArray(over.progress.quickIncrements)) {
			out.progress.quickIncrements = over.progress.quickIncrements.filter(
				(n): n is number => typeof n === "number" && Number.isFinite(n),
			);
		}
		if (Array.isArray(over.progress.categories)) out.progress.categories = over.progress.categories.filter(isString);
	}
	out.series = mergeGroup(base.series, over.series, DEFAULT_SERIES);
	out.logSection = mergeGroup(base.logSection, over.logSection, DEFAULT_LOG_SECTION);
	return out;
}

/**
 * Saved data (from loadData, possibly null or from an older schema) merged over
 * DEFAULT_SETTINGS. New fields get their defaults; the user's values win;
 * libraries the user added (ids not in the defaults) are kept.
 */
/**
 * Older saved data (before BDs joined the book library, 2026-09-25): a book
 * library still on its old books-only defaults takes the new ones. Anything the
 * user changed by hand is left alone.
 */
function migrate(savedTypes: Rec): Rec {
	const book = savedTypes.book;
	if (!isRecord(book)) return savedTypes;
	const cats = book.categoryValues;
	const onOldDefaults =
		book.folder === "20 Personal/Hobbies/Reading/Books" &&
		(cats === undefined || (Array.isArray(cats) && cats.length === 1 && cats[0] === "book"));
	if (!onOldDefaults) return savedTypes;
	const next: Rec = { ...book };
	delete next.folder;
	delete next.categoryValues;
	if (next.label === "Books") delete next.label;
	if (isRecord(next.progress)) next.progress = { ...next.progress, categories: [] };
	return { ...savedTypes, book: next };
}

export function mergeSettings(saved: unknown): StacksSettings {
	const savedTypes = migrate(isRecord(saved) && isRecord(saved.mediaTypes) ? saved.mediaTypes : {});
	const mediaTypes: Record<string, MediaTypeConfig> = {};
	for (const [id, base] of Object.entries(DEFAULT_SETTINGS.mediaTypes)) {
		mediaTypes[id] = mergeConfig(base, savedTypes[id]);
	}
	for (const [id, over] of Object.entries(savedTypes)) {
		if (id in mediaTypes || !isRecord(over)) continue;
		mediaTypes[id] = mergeConfig(blankMediaTypeConfig(isString(over.label) ? over.label : id), over);
	}
	return { mediaTypes };
}
