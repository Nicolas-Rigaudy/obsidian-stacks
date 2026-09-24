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
import { STATUS_BUCKETS } from "../types/mediaConfig.ts";

export interface StacksSettings {
	/** Keyed by a stable id ("book"). Key order = display order. */
	mediaTypes: Record<string, MediaTypeConfig>;
}

// Matches the live Books schema (checked 2026-09-24 against all 125 notes) and
// Reading.md's existing widgets: +10/+25 pages, "## Reading log" lines.
export const BOOK_CONFIG: MediaTypeConfig = {
	enabled: true,
	label: "Books",
	folder: "20 Personal/Hobbies/Reading/Books",
	categoryField: "category",
	categoryValues: ["book"],
	statusField: "status",
	statuses: [
		{ value: "wishlist", label: "Wishlist", bucket: "other" },
		{ value: "backlog", label: "Backlog", bucket: "backlog" },
		{ value: "reading", label: "Reading", bucket: "active" },
		{ value: "read", label: "Read", bucket: "done" },
	],
	titleField: "title",
	creatorField: "author",
	coverField: "cover",
	ratingField: "rating",
	startedField: "started",
	finishedField: "finished",
	progress: {
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

export const DEFAULT_SETTINGS: StacksSettings = {
	mediaTypes: { book: BOOK_CONFIG },
};

// Starting values when a user switches an optional group on for a library.
export const DEFAULT_PROGRESS: ProgressConfig = {
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
		folder: "",
		categoryField: "category",
		categoryValues: [],
		statusField: "status",
		statuses: [
			{ value: "backlog", label: "Backlog", bucket: "backlog" },
			{ value: "active", label: "Active", bucket: "active" },
			{ value: "done", label: "Done", bucket: "done" },
		],
		titleField: "title",
		creatorField: "",
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
	return [{ value: v.value, label: isString(v.label) ? v.label : v.value, bucket }];
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
	if (typeof over.enabled === "boolean") out.enabled = over.enabled;
	if (Array.isArray(over.categoryValues)) out.categoryValues = over.categoryValues.filter(isString);
	if (Array.isArray(over.statuses)) out.statuses = over.statuses.flatMap(parseStatus);

	out.progress = mergeGroup(base.progress, over.progress, DEFAULT_PROGRESS);
	if (out.progress && isRecord(over.progress) && Array.isArray(over.progress.quickIncrements)) {
		out.progress.quickIncrements = over.progress.quickIncrements.filter(
			(n): n is number => typeof n === "number" && Number.isFinite(n),
		);
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
export function mergeSettings(saved: unknown): StacksSettings {
	const savedTypes = isRecord(saved) && isRecord(saved.mediaTypes) ? saved.mediaTypes : {};
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
