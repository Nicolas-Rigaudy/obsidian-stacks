// Settings as they shipped before 0.3 (defaults baked to one vault's layout).
// Migration only: saved data without a `version` is merged over these so an
// existing setup keeps working unchanged. Once saved at the current version
// every value is explicit and this file can go. Pure: zero `obsidian` imports.

import type { MediaTypeConfig } from "../types/mediaConfig.ts";

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
	filterField: "",
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
		orderedByDefault: true,
		exceptions: [],
	},
	starField: "buy_next",
	wishlistStatus: "wishlist",
	logSection: {
		heading: "Reading log",
		startedLine: "Started [date:: {date}]",
		finishedLine: "Finished [date:: {date}]",
		progressLine: "(pages:: {value}) [date:: {date}]",
	},
	newNotes: {
		book: { folder: "20 Personal/Hobbies/Reading/Books", extras: { type: "log", area: "personal", genre: [], tags: ["book"], shelf: "[[Reading]]" } },
		bd: { folder: "20 Personal/Hobbies/Reading/BDs", extras: { type: "log", area: "personal", genre: [], tags: ["bd"], shelf: "[[Reading]]" } },
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
	// Chips by platform (the three in the vault, checked 2026-09-25); more can be added in settings.
	categoryFilters: [
		{ value: "Switch", label: "Switch" },
		{ value: "PC", label: "PC" },
		{ value: "Miyoo", label: "Miyoo" },
	],
	filterField: "platform",
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
	// Franchises like Assassin's Creed: grouped, but each game stands alone.
	series: { seriesField: "series", positionField: "position", positionEndField: "", orderedByDefault: false, exceptions: [] },
	starField: "buy_next",
	wishlistStatus: "",
	logSection: null,
	newNotes: {
		game: { folder: "20 Personal/Hobbies/Video Games/Games", extras: { type: "log", area: "personal", hltb: null, played: null, tags: ["log", "game"], shelf: "[[Video Games]]" } },
	},
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
	filterField: "",
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
	series: { seriesField: "series", positionField: "position", positionEndField: "", orderedByDefault: true, exceptions: [] },
	starField: "buy_next",
	wishlistStatus: "",
	logSection: null,
	newNotes: {
		movie: { folder: "20 Personal/Hobbies/Media", extras: { type: "log", area: "personal", tags: ["log", "movie"], shelf: "[[Media]]" } },
		series: { folder: "20 Personal/Hobbies/Media", extras: { type: "log", area: "personal", tags: ["log", "series"], shelf: "[[Media]]" } },
		anime: { folder: "20 Personal/Hobbies/Media", extras: { type: "log", area: "personal", tags: ["log", "anime"], shelf: "[[Media]]" } },
	},
};
